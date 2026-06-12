"""Mock Scanner — full multi-cloud demo, no credentials needed."""

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
    """Realistic fake multi-cloud environment — safe to run anywhere."""

    def scan(self) -> ScanResult:
        return ScanResult(
            scan_id="mock-scan-001",
            provider=CloudProvider.LOCAL,
            account_id="demo-account",
            nhis=self._build_nhis(),
            resources=self._build_resources(),
        )

    def _build_nhis(self) -> list[NonHumanIdentity]:
        return [
            # ── AWS ───────────────────────────────────────────────────────
            NonHumanIdentity(
                id="aws-role-ml-pipeline",
                name="aws/ml-pipeline-executor",
                type=NHIType.IAM_ROLE,
                provider=CloudProvider.AWS,
                arn="arn:aws:iam::123456789012:role/ml-pipeline-executor",
                created_date=_dt(400),
                last_used=_dt(2),
                last_rotated=None,
                attached_policies=["AdministratorAccess"],
                is_cross_account=True,
                trust_policy={
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {"AWS": "arn:aws:iam::999999999:root"},
                            "Action": "sts:AssumeRole",
                        }
                    ]
                },
            ),
            NonHumanIdentity(
                id="aws-key-legacy",
                name="aws/legacy-reporting-service-key",
                type=NHIType.IAM_USER_KEY,
                provider=CloudProvider.AWS,
                arn="arn:aws:iam::123456789012:user/legacy-reporting-svc",
                created_date=_dt(730),
                last_used=_dt(200),
                last_rotated=_dt(730),
                attached_policies=["secretsmanager:GetSecretValue", "s3:GetObject"],
            ),
            NonHumanIdentity(
                id="aws-lambda-exec",
                name="aws/prod-api-lambda-role",
                type=NHIType.IAM_ROLE,
                provider=CloudProvider.AWS,
                arn="arn:aws:iam::123456789012:role/prod-api-lambda-role",
                created_date=_dt(90),
                last_used=_dt(1),
                last_rotated=_dt(30),
                attached_policies=[
                    "AWSLambdaBasicExecutionRole",
                    "s3:GetObject",
                    "dynamodb:PutItem",
                    "dynamodb:GetItem",
                ],
                is_internet_facing=True,
            ),
            # ── Azure ─────────────────────────────────────────────────────
            NonHumanIdentity(
                id="azure-mi-webapp",
                name="azure/webapp-managed-identity",
                type=NHIType.MANAGED_IDENTITY,
                provider=CloudProvider.AZURE,
                created_date=_dt(180),
                last_used=_dt(1),
                last_rotated=_dt(180),
                attached_policies=["Contributor", "Key Vault Secrets User"],
                is_internet_facing=True,
            ),
            NonHumanIdentity(
                id="azure-sp-cicd",
                name="azure/cicd-service-principal",
                type=NHIType.SERVICE_PRINCIPAL,
                provider=CloudProvider.AZURE,
                created_date=_dt(540),
                last_used=_dt(5),
                last_rotated=_dt(540),
                attached_policies=["Owner"],
                is_cross_account=True,
            ),
            NonHumanIdentity(
                id="azure-sp-legacy",
                name="azure/legacy-data-pipeline-sp",
                type=NHIType.SERVICE_PRINCIPAL,
                provider=CloudProvider.AZURE,
                created_date=_dt(800),
                last_used=_dt(300),
                last_rotated=_dt(800),
                attached_policies=[
                    "Storage Blob Data Contributor",
                    "SQL DB Contributor",
                ],
            ),
            # ── GCP ───────────────────────────────────────────────────────
            NonHumanIdentity(
                id="gcp-sa-dataflow",
                name="gcp/dataflow-pipeline@project.iam.gserviceaccount.com",
                type=NHIType.SERVICE_ACCOUNT,
                provider=CloudProvider.GCP,
                created_date=_dt(300),
                last_used=_dt(1),
                last_rotated=_dt(300),
                attached_policies=["roles/editor", "roles/bigquery.admin"],
                is_internet_facing=False,
            ),
            NonHumanIdentity(
                id="gcp-sa-key-exposed",
                name="gcp/analytics-sa-key (downloaded key file)",
                type=NHIType.API_KEY,
                provider=CloudProvider.GCP,
                created_date=_dt(400),
                last_used=_dt(10),
                last_rotated=_dt(400),
                attached_policies=[
                    "roles/bigquery.dataViewer",
                    "roles/storage.objectViewer",
                ],
                source_file="service-account-key.json",
            ),
            # ── GitHub ────────────────────────────────────────────────────
            NonHumanIdentity(
                id="github-pat-admin",
                name="github/admin-pat (full repo access)",
                type=NHIType.GITHUB_SECRET,
                provider=CloudProvider.GITHUB,
                created_date=_dt(500),
                last_used=_dt(1),
                last_rotated=_dt(500),
                attached_policies=["repo", "admin:org", "delete_repo"],
                is_internet_facing=True,
            ),
            NonHumanIdentity(
                id="github-actions-deploy",
                name="github/actions-prod-deploy-secret",
                type=NHIType.GITHUB_SECRET,
                provider=CloudProvider.GITHUB,
                created_date=_dt(200),
                last_used=_dt(1),
                last_rotated=_dt(200),
                attached_policies=["s3:PutObject", "lambda:UpdateFunctionCode"],
                is_internet_facing=True,
            ),
            NonHumanIdentity(
                id="github-deploy-key",
                name="github/prod-repo-deploy-key",
                type=NHIType.SSH_KEY,
                provider=CloudProvider.GITHUB,
                created_date=_dt(600),
                last_used=_dt(30),
                last_rotated=_dt(600),
                attached_policies=["read-write"],
            ),
            # ── Kubernetes ────────────────────────────────────────────────
            NonHumanIdentity(
                id="k8s-sa-cluster-admin",
                name="k8s/default:cluster-admin-sa",
                type=NHIType.SERVICE_ACCOUNT,
                provider=CloudProvider.K8S,
                created_date=_dt(250),
                last_used=_dt(2),
                last_rotated=_dt(250),
                attached_policies=["cluster-admin"],
                is_internet_facing=False,
            ),
            NonHumanIdentity(
                id="k8s-sa-monitoring",
                name="k8s/monitoring:prometheus-sa",
                type=NHIType.SERVICE_ACCOUNT,
                provider=CloudProvider.K8S,
                created_date=_dt(180),
                last_used=_dt(1),
                last_rotated=_dt(90),
                attached_policies=["get", "list", "watch"],
            ),
            # ── AI Agents ─────────────────────────────────────────────────
            NonHumanIdentity(
                id="agent-crm-langchain",
                name="local/langchain-crm-agent",
                type=NHIType.AI_AGENT,
                provider=CloudProvider.LOCAL,
                created_date=_dt(60),
                last_used=_dt(0),
                autonomy_level=AutonomyLevel.FULLY_AUTONOMOUS,
                agent_tools=[
                    "query_database",
                    "send_email",
                    "update_database",
                    "delete_record",
                    "call_api",
                ],
                has_memory=True,
                source_file="src/agents/crm_agent.py",
            ),
            NonHumanIdentity(
                id="agent-email-drafter",
                name="local/autogen-email-drafter",
                type=NHIType.AI_AGENT,
                provider=CloudProvider.LOCAL,
                created_date=_dt(30),
                last_used=_dt(1),
                autonomy_level=AutonomyLevel.SEMI_AUTONOMOUS,
                agent_tools=["search_web", "read_file", "send_email", "create_ticket"],
                has_memory=False,
                source_file="src/agents/email_agent.py",
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
                id="res-keyvault",
                name="azure-prod-keyvault",
                resource_type="key_vault",
                provider=CloudProvider.AZURE,
                is_crown_jewel=True,
                sensitivity_tags=["SECRETS"],
            ),
            Resource(
                id="res-bq-dataset",
                name="gcp-analytics-dataset",
                resource_type="bigquery_dataset",
                provider=CloudProvider.GCP,
                is_crown_jewel=True,
                sensitivity_tags=["PII"],
            ),
            Resource(
                id="res-prod-cluster",
                name="prod-k8s-cluster",
                resource_type="k8s_cluster",
                provider=CloudProvider.K8S,
                is_crown_jewel=True,
                sensitivity_tags=["INFRA"],
            ),
        ]

    def build_access_edges(self) -> list[tuple[str, str, str, float]]:
        return [
            ("aws-role-ml-pipeline", "res-customer-db", "rds:*", 0.5),
            ("aws-role-ml-pipeline", "res-model-weights", "s3:*", 0.5),
            ("aws-role-ml-pipeline", "res-secrets-mgr", "secretsmanager:*", 0.5),
            ("azure-mi-webapp", "res-keyvault", "KeyVault:GetSecret", 1.0),
            ("azure-sp-cicd", "res-keyvault", "Owner", 0.5),
            ("gcp-sa-dataflow", "res-bq-dataset", "bigquery:*", 0.5),
            ("gcp-sa-key-exposed", "res-bq-dataset", "bigquery:read", 1.5),
            ("github-pat-admin", "res-secrets-mgr", "repo:read", 1.0),
            ("k8s-sa-cluster-admin", "res-prod-cluster", "cluster-admin", 0.5),
            ("agent-crm-langchain", "res-customer-db", "delete_record", 1.0),
            ("aws-key-legacy", "res-secrets-mgr", "secretsmanager:Get", 1.5),
        ]
