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
