"""
Mock Scanner — realistic fake environment for demos and testing.

Run this without any cloud credentials to see AgentSentry in action.
The mock environment is designed to demonstrate all risk levels and
finding types, including AI agent findings.

Usage:
    agentsentry scan mock
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta

from agentsentry.core.models import (
    AutonomyLevel,
    CloudProvider,
    NonHumanIdentity,
    NHIType,
    Resource,
    ScanResult,
)


def _dt(days_ago: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days_ago)


class MockScanner:
    """Returns a realistic fake environment — safe to run anywhere."""

    def scan(self) -> ScanResult:
        nhis = self._build_nhis()
        resources = self._build_resources()
        return ScanResult(
            scan_id="mock-scan-001",
            provider=CloudProvider.LOCAL,
            account_id="123456789012",
            nhis=nhis,
            resources=resources,
        )

    def _build_nhis(self) -> list[NonHumanIdentity]:
        return [
            # ── CRITICAL: over-permissioned ML pipeline role ──────────────
            NonHumanIdentity(
                id="role-ml-pipeline",
                name="ml-pipeline-executor",
                type=NHIType.IAM_ROLE,
                provider=CloudProvider.AWS,
                arn="arn:aws:iam::123456789012:role/ml-pipeline-executor",
                created_date=_dt(400),
                last_used=_dt(2),
                last_rotated=None,  # Never rotated
                attached_policies=["AdministratorAccess"],
                is_cross_account=True,
                trust_policy={
                    "Statement": [{
                        "Effect": "Allow",
                        "Principal": {"AWS": "arn:aws:iam::999999999:root"},
                        "Action": "sts:AssumeRole",
                    }]
                },
            ),

            # ── CRITICAL: GitHub Actions deploy key ───────────────────────
            NonHumanIdentity(
                id="key-github-deploy",
                name="github-actions-prod-deploy",
                type=NHIType.GITHUB_SECRET,
                provider=CloudProvider.AWS,
                created_date=_dt(500),
                last_used=_dt(1),
                last_rotated=_dt(500),
                attached_policies=["s3:PutObject", "lambda:UpdateFunctionCode",
                                   "iam:PassRole"],
                is_internet_facing=True,
            ),

            # ── CRITICAL: Fully autonomous AI agent ───────────────────────
            NonHumanIdentity(
                id="agent-crm-langchain",
                name="langchain-crm-agent",
                type=NHIType.AI_AGENT,
                provider=CloudProvider.LOCAL,
                created_date=_dt(60),
                last_used=_dt(0),
                autonomy_level=AutonomyLevel.FULLY_AUTONOMOUS,
                agent_tools=["query_database", "send_email",
                             "update_database", "delete_record",
                             "call_api"],
                has_memory=True,
                source_file="src/agents/crm_agent.py",
            ),

            # ── HIGH: Zombie IAM user key ─────────────────────────────────
            NonHumanIdentity(
                id="key-old-svc-acct",
                name="legacy-reporting-service-key",
                type=NHIType.IAM_USER_KEY,
                provider=CloudProvider.AWS,
                arn="arn:aws:iam::123456789012:user/legacy-reporting-svc",
                created_date=_dt(730),
                last_used=_dt(200),
                last_rotated=_dt(730),
                attached_policies=["secretsmanager:GetSecretValue",
                                   "s3:GetObject", "rds:DescribeDBInstances"],
            ),

            # ── HIGH: Semi-autonomous agent with write tools ───────────────
            NonHumanIdentity(
                id="agent-email-drafter",
                name="autogen-email-drafter",
                type=NHIType.AI_AGENT,
                provider=CloudProvider.LOCAL,
                created_date=_dt(30),
                last_used=_dt(1),
                autonomy_level=AutonomyLevel.SEMI_AUTONOMOUS,
                agent_tools=["search_web", "read_file",
                             "send_email", "create_ticket"],
                has_memory=False,
                source_file="src/agents/email_agent.py",
            ),

            # ── MEDIUM: Service account, rotated but stale ────────────────
            NonHumanIdentity(
                id="sa-k8s-monitor",
                name="k8s-monitoring-sa",
                type=NHIType.SERVICE_ACCOUNT,
                provider=CloudProvider.AWS,
                created_date=_dt(180),
                last_used=_dt(95),
                last_rotated=_dt(120),
                attached_policies=["ec2:DescribeInstances",
                                   "cloudwatch:GetMetricData"],
            ),

            # ── LOW: Read-only, recently rotated ──────────────────────────
            NonHumanIdentity(
                id="role-readonly-audit",
                name="security-audit-readonly",
                type=NHIType.IAM_ROLE,
                provider=CloudProvider.AWS,
                arn="arn:aws:iam::123456789012:role/security-audit-readonly",
                created_date=_dt(90),
                last_used=_dt(3),
                last_rotated=_dt(30),
                attached_policies=["SecurityAudit", "ReadOnlyAccess"],
                is_internet_facing=False,
            ),
        ]

    def _build_resources(self) -> list[Resource]:
        return [
            Resource(
                id="res-customer-db",
                name="prod-customer-database",
                resource_type="rds_instance",
                provider=CloudProvider.AWS,
                is_crown_jewel=True,
                sensitivity_tags=["PII", "PCI"],
                is_public=False,
            ),
            Resource(
                id="res-model-weights",
                name="ml-model-weights-bucket",
                resource_type="s3_bucket",
                provider=CloudProvider.AWS,
                is_crown_jewel=True,
                sensitivity_tags=["IP", "ML"],
            ),
            Resource(
                id="res-secrets-mgr",
                name="prod-secrets-manager",
                resource_type="secretsmanager",
                provider=CloudProvider.AWS,
                is_crown_jewel=True,
                sensitivity_tags=["SECRETS"],
            ),
            Resource(
                id="res-lambda-prod",
                name="prod-api-lambda",
                resource_type="lambda_function",
                provider=CloudProvider.AWS,
                is_crown_jewel=False,
            ),
            Resource(
                id="res-internal-vpc",
                name="prod-internal-vpc",
                resource_type="vpc",
                provider=CloudProvider.AWS,
                is_crown_jewel=False,
            ),
        ]

    def build_access_edges(self) -> list[tuple[str, str, str, float]]:
        """
        Returns (from_id, to_id, permission, weight) tuples
        representing access relationships.
        """
        return [
            ("role-ml-pipeline",    "res-customer-db",   "rds:*",                    0.5),
            ("role-ml-pipeline",    "res-model-weights", "s3:*",                     0.5),
            ("role-ml-pipeline",    "res-secrets-mgr",   "secretsmanager:*",         0.5),
            ("role-ml-pipeline",    "res-internal-vpc",  "ec2:*",                    0.5),
            ("key-github-deploy",   "res-lambda-prod",   "lambda:UpdateFunctionCode", 1.0),
            ("key-github-deploy",   "res-model-weights", "s3:PutObject",             1.0),
            ("agent-crm-langchain", "res-customer-db",   "query_database",           1.0),
            ("agent-crm-langchain", "res-customer-db",   "update_database",          1.0),
            ("agent-crm-langchain", "res-customer-db",   "delete_record",            1.0),
            ("key-old-svc-acct",    "res-secrets-mgr",   "secretsmanager:GetSecretValue", 1.5),
            ("key-old-svc-acct",    "res-customer-db",   "rds:DescribeDBInstances",  2.0),
            ("sa-k8s-monitor",      "res-internal-vpc",  "ec2:DescribeInstances",    3.0),
        ]
