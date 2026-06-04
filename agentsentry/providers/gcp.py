"""
GCP Provider — scans Service Accounts, keys, and IAM bindings.

Credentials (any of these):
  - Application Default: gcloud auth application-default login
  - Service Account key: GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
  - Metadata server:     automatic inside GCE / Cloud Run / GKE

Install SDK:  pip install agentsentry[gcp]
"""
from __future__ import annotations

import os
from datetime import datetime, timezone

from agentsentry.core.models import (
    CloudProvider, NHIType, NonHumanIdentity,
    Resource, RiskLevel, ScanResult, Finding,
)
from agentsentry.providers.base import BaseProvider, PermissionStatus

_GCP_OK = False
_GCP_ERR: Exception | None = None
try:
    from google.oauth2 import credentials as _gc  # noqa: F401
    from googleapiclient.discovery import build as _gbuild  # noqa: F401
    import google.auth
    _GCP_OK = True
except ImportError as _e:
    _GCP_ERR = _e

HIGH_PRIV_ROLES = {
    "roles/owner", "roles/editor",
    "roles/iam.serviceAccountAdmin",
    "roles/iam.securityAdmin",
    "roles/storage.admin",
    "roles/secretmanager.admin",
}


class GCPProvider(BaseProvider):

    @property
    def name(self) -> str:         return "gcp"
    @property
    def display_name(self) -> str: return "Google Cloud Platform"
    @property
    def cloud_provider(self) -> CloudProvider: return CloudProvider.GCP

    @property
    def required_permissions(self) -> list[str]:
        return [
            "iam.serviceAccounts.list",
            "iam.serviceAccountKeys.list",
            "resourcemanager.projects.getIamPolicy",
            "iam.roles.list",
        ]

    @property
    def setup_hint(self) -> str:
        return (
            "Option A: gcloud auth application-default login\n"
            "Option B: GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json"
        )

    def check_permissions(self) -> PermissionStatus:
        if not _GCP_OK:
            return PermissionStatus(
                ok=False, provider_name=self.name, sdk_available=False,
                message="Run: pip install agentsentry[gcp]",
            )
        try:
            import google.auth
            creds, project = google.auth.default(
                scopes=["https://www.googleapis.com/auth/cloud-platform.read-only"]
            )
            self._creds = creds
            self._project = project or os.environ.get("GOOGLE_CLOUD_PROJECT", "")
            return PermissionStatus(
                ok=True, provider_name=self.name,
                message=f"Project: {self._project}",
            )
        except Exception as exc:
            return PermissionStatus(
                ok=False, provider_name=self.name,
                missing_creds=["GCP application default credentials"],
                message=f"{exc}\n{self.setup_hint}",
            )

    def scan(self) -> ScanResult:
        if not _GCP_OK:
            raise RuntimeError("GCP SDK not installed. Run: pip install agentsentry[gcp]")

        import google.auth
        from googleapiclient.discovery import build

        creds, project = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform.read-only"]
        )
        if not project:
            project = os.environ.get("GOOGLE_CLOUD_PROJECT", "")

        print(f"[AgentSentry/GCP] Project: {project}")
        nhis: list[NonHumanIdentity] = []
        resources: list[Resource] = []

        # ── Service Accounts ──────────────────────────────────────────
        iam_svc = build("iam", "v1", credentials=creds, cache_discovery=False)
        try:
            resp = iam_svc.projects().serviceAccounts().list(
                name=f"projects/{project}"
            ).execute()
            for sa in resp.get("accounts", []):
                email = sa.get("email", "unknown")
                disabled = sa.get("disabled", False)

                # Check service account keys
                key_findings: list[Finding] = []
                try:
                    keys_resp = iam_svc.projects().serviceAccounts().keys().list(
                        name=sa["name"], keyTypes=["USER_MANAGED"]
                    ).execute()
                    user_keys = keys_resp.get("keys", [])
                    if user_keys:
                        key_findings.append(Finding(
                            finding_id=f"gcp-sa-key-{email[:12]}",
                            title=f"User-managed SA key present ({len(user_keys)} key(s))",
                            description=(
                                f"Service account {email} has {len(user_keys)} user-managed key(s). "
                                "These are long-lived credentials that can be downloaded and exfiltrated."
                            ),
                            risk_level=RiskLevel.HIGH,
                            mitre_techniques=["T1552.001"],
                            remediation="Prefer Workload Identity Federation over SA keys. If keys are required, rotate them every 90 days.",
                        ))
                except Exception:
                    pass

                nhis.append(NonHumanIdentity(
                    id=f"gcp-sa-{email[:20]}",
                    name=email,
                    type=NHIType.SERVICE_ACCOUNT,
                    provider=CloudProvider.GCP,
                    arn=sa.get("name"),
                    findings=key_findings,
                    mitre_techniques=["T1552.001"] if key_findings else [],
                ))
        except Exception as exc:
            print(f"[AgentSentry/GCP] Warning: could not list service accounts: {exc}")

        # ── IAM policy (project-level role bindings) ───────────────────
        try:
            crm = build("cloudresourcemanager", "v1", credentials=creds, cache_discovery=False)
            policy_resp = crm.projects().getIamPolicy(
                resource=project, body={}
            ).execute()
            for binding in policy_resp.get("bindings", []):
                role = binding.get("role", "")
                if role in HIGH_PRIV_ROLES:
                    for member in binding.get("members", []):
                        if member.startswith("serviceAccount:"):
                            sa_email = member.replace("serviceAccount:", "")
                            # Find existing NHI or create a note
                            existing = next(
                                (n for n in nhis if n.name == sa_email), None
                            )
                            f = Finding(
                                finding_id=f"gcp-high-priv-{sa_email[:12]}",
                                title=f"High-privilege project role: {role}",
                                description=f"Service account {sa_email} has role {role} at project level.",
                                risk_level=RiskLevel.CRITICAL if "owner" in role or "editor" in role else RiskLevel.HIGH,
                                mitre_techniques=["T1078.004"],
                                remediation=f"Scope {role} to specific resources instead of the whole project.",
                            )
                            if existing:
                                existing.findings.append(f)
                                existing.attached_policies.append(role)
        except Exception as exc:
            print(f"[AgentSentry/GCP] Warning: could not read IAM policy: {exc}")

        # ── Resources (buckets) ────────────────────────────────────────
        try:
            storage = build("storage", "v1", credentials=creds, cache_discovery=False)
            buckets_resp = storage.buckets().list(project=project).execute()
            for bucket in buckets_resp.get("items", []):
                resources.append(Resource(
                    id=f"gcp-bucket-{bucket['name']}",
                    name=bucket["name"],
                    resource_type="gcs_bucket",
                    provider=CloudProvider.GCP,
                    is_crown_jewel=False,
                ))
        except Exception:
            pass

        return ScanResult(
            scan_id=f"gcp-{project}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            provider=CloudProvider.GCP,
            account_id=project,
            nhis=nhis,
            resources=resources,
        )
