"""
Tests for the AWS scanner's IAM Access Advisor (least-privilege) logic against
a fake IAM client — no AWS credentials or boto3 session required.
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock

from agentsentry.scanners.aws import AWSScanner

NOW = datetime.now(timezone.utc)


def _bare_scanner(analyze_usage: bool = True) -> AWSScanner:
    """An AWSScanner with no real boto3 session — internals stubbed for unit use."""
    scanner = AWSScanner.__new__(AWSScanner)
    scanner._usage_cache = {}
    scanner._policy_doc_cache = {}
    scanner.analyze_usage = analyze_usage
    return scanner


def _completed_response() -> dict:
    return {
        "JobStatus": "COMPLETED",
        "ServicesLastAccessed": [
            {"ServiceNamespace": "s3", "ServiceName": "Amazon S3", "LastAuthenticated": NOW},
            {"ServiceNamespace": "ec2", "ServiceName": "Amazon EC2"},  # never used
            {"ServiceNamespace": "rds", "ServiceName": "Amazon RDS"},  # never used
        ],
    }


def test_fetch_parses_granted_and_unused():
    scanner = _bare_scanner()
    iam = MagicMock()
    iam.generate_service_last_accessed_details.return_value = {"JobId": "job-1"}
    iam.get_service_last_accessed_details.side_effect = [
        {"JobStatus": "IN_PROGRESS"},  # polling rides through this
        _completed_response(),
    ]
    scanner.iam = iam

    out = scanner._fetch_service_last_accessed("arn:aws:iam::123:role/demo")

    assert [s["namespace"] for s in out] == ["s3", "ec2", "rds"]
    unused = [s["namespace"] for s in out if not s["last_authenticated"]]
    assert unused == ["ec2", "rds"]


def test_fetch_caches_by_arn():
    """A second lookup for the same ARN must not start a new access-advisor job."""
    scanner = _bare_scanner()
    iam = MagicMock()
    iam.generate_service_last_accessed_details.return_value = {"JobId": "job-1"}
    iam.get_service_last_accessed_details.return_value = _completed_response()
    scanner.iam = iam

    arn = "arn:aws:iam::123:user/svc"
    first = scanner._fetch_service_last_accessed(arn)
    second = scanner._fetch_service_last_accessed(arn)

    assert first == second
    assert iam.generate_service_last_accessed_details.call_count == 1


def test_failed_job_yields_no_data():
    scanner = _bare_scanner()
    iam = MagicMock()
    iam.generate_service_last_accessed_details.return_value = {"JobId": "job-1"}
    iam.get_service_last_accessed_details.return_value = {"JobStatus": "FAILED"}
    scanner.iam = iam

    assert scanner._fetch_service_last_accessed("arn:aws:iam::123:role/x") == []


def test_client_error_on_generate_is_swallowed():
    from botocore.exceptions import ClientError

    scanner = _bare_scanner()
    iam = MagicMock()
    iam.generate_service_last_accessed_details.side_effect = ClientError(
        {"Error": {"Code": "AccessDenied"}}, "GenerateServiceLastAccessedDetails"
    )
    scanner.iam = iam

    # No permission for access advisor → empty, never raises (scan keeps going).
    assert scanner._fetch_service_last_accessed("arn:aws:iam::123:role/x") == []


# ═══════════════════════════════════════════════════════════════════
# Phase 3 — expanded resource coverage (Secrets Manager / RDS / DynamoDB)
# ═══════════════════════════════════════════════════════════════════


class _FakePaginator:
    def __init__(self, pages):
        self._pages = pages

    def paginate(self, **_kwargs):
        return iter(self._pages)


def test_scan_secrets_are_crown_jewels():
    scanner = _bare_scanner(analyze_usage=False)
    secrets = MagicMock()
    secrets.get_paginator.return_value = _FakePaginator([
        {"SecretList": [
            {"Name": "prod/db/password", "ARN": "arn:aws:secretsmanager:::secret:prod/db"},
            {"Name": "stripe-api-key", "ARN": "arn:aws:secretsmanager:::secret:stripe"},
        ]},
    ])
    scanner.secrets = secrets

    out = scanner._scan_secrets()
    assert [r.id for r in out] == ["secret-prod/db/password", "secret-stripe-api-key"]
    assert all(r.is_crown_jewel for r in out)
    assert all(r.resource_type == "secretsmanager_secret" for r in out)


def test_scan_rds_flags_public():
    scanner = _bare_scanner(analyze_usage=False)
    rds = MagicMock()
    rds.get_paginator.return_value = _FakePaginator([
        {"DBInstances": [
            {"DBInstanceIdentifier": "prod-db", "PubliclyAccessible": True,
             "DBInstanceArn": "arn:aws:rds:::db:prod-db"},
            {"DBInstanceIdentifier": "internal-db", "PubliclyAccessible": False,
             "DBInstanceArn": "arn:aws:rds:::db:internal-db"},
        ]},
    ])
    scanner.rds = rds

    out = scanner._scan_rds_instances()
    by_id = {r.id: r for r in out}
    assert by_id["rds-prod-db"].is_public is True
    assert "PUBLIC" in by_id["rds-prod-db"].sensitivity_tags
    assert by_id["rds-internal-db"].is_public is False
    assert all(r.is_crown_jewel for r in out)


def test_scan_dynamodb_crown_jewel_heuristic():
    scanner = _bare_scanner(analyze_usage=False)
    dynamodb = MagicMock()
    dynamodb.get_paginator.return_value = _FakePaginator([
        {"TableNames": ["prod-customers", "scratch-cache"]},
    ])
    scanner.dynamodb = dynamodb
    scanner.region = "us-east-1"

    out = scanner._scan_dynamodb_tables()
    by_id = {r.id: r for r in out}
    assert by_id["dynamodb-prod-customers"].is_crown_jewel is True
    assert by_id["dynamodb-scratch-cache"].is_crown_jewel is False


def test_secret_actions_create_graph_edges():
    """A policy granting secretsmanager:GetSecretValue should edge to secret nodes."""
    from agentsentry.core.models import (
        CloudProvider, NHIType, NonHumanIdentity, Resource, ScanResult,
    )
    scanner = _bare_scanner(analyze_usage=False)
    nhi = NonHumanIdentity(
        id="role-1", name="app-role", type=NHIType.IAM_ROLE, provider=CloudProvider.AWS,
        inline_policies=[{
            "Statement": [{
                "Effect": "Allow",
                "Action": ["secretsmanager:GetSecretValue"],
                "Resource": "*",
            }],
        }],
    )
    secret = Resource(
        id="secret-prod/db", name="prod/db", resource_type="secretsmanager_secret",
        provider=CloudProvider.AWS, is_crown_jewel=True,
    )
    scanner._last_result = ScanResult(
        scan_id="t", provider=CloudProvider.AWS, nhis=[nhi], resources=[secret],
    )

    edges = scanner.build_access_edges()
    assert ("role-1", "secret-prod/db", "secretsmanager:GetSecretValue", 4.0) in edges
