"""
GCP Scanner

Discovers Non-Human Identities in a GCP project using read-only API
calls, at the same depth as the AWS IAM scanner:

  - Service Accounts (with disabled-state tracking)
  - User-managed SA keys → key age drives last_rotated / created_date
  - Project IAM policy: ALL roles aggregated per service account into
    attached_policies (not just the high-privilege ones)
  - GCS buckets (public-access check + crown-jewel heuristics) and
    BigQuery datasets as resources
  - build_access_edges() mapping IAM roles onto scanned resources

Not covered (requires the Policy Analyzer / Activity Analyzer APIs):
service-account last-authentication time — last_used is left unset.

Setup:
    gcloud auth application-default login
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

from agentsentry.core.models import (
    CloudProvider,
    Finding,
    NHIType,
    NonHumanIdentity,
    Resource,
    RiskLevel,
    ScanResult,
)

HIGH_PRIV_ROLES = {
    "roles/owner",
    "roles/editor",
    "roles/iam.serviceAccountAdmin",
    "roles/iam.securityAdmin",
    "roles/iam.serviceAccountTokenCreator",  # impersonation
    "roles/iam.serviceAccountKeyAdmin",  # mint new long-lived keys
    "roles/storage.admin",
    "roles/secretmanager.admin",
}

CROWN_JEWEL_KEYWORDS = [
    "prod",
    "customer",
    "pii",
    "backup",
    "secret",
    "key",
    "data",
    "model",
    "weights",
]

INTERNET_FACING_KEYWORDS = ["public", "external", "internet", "api", "web", "app"]


def _parse_gcp_time(value: str | None) -> datetime | None:
    """GCP timestamps are RFC3339 — '2024-01-15T10:00:00Z'."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


class GCPScanner:
    """
    Scans a GCP project for Non-Human Identities.

    Service clients are injectable for testing — pass pre-built fakes for
    *iam_service* / *crm_service* / *storage_service* / *bq_service*, or
    leave them None to build real discovery clients from *credentials*.
    """

    def __init__(
        self,
        credentials=None,
        project: str | None = None,
        iam_service=None,
        crm_service=None,
        storage_service=None,
        bq_service=None,
    ):
        if credentials is None and not all(
            (iam_service, crm_service, storage_service, bq_service)
        ):
            import google.auth

            credentials, detected_project = google.auth.default(
                scopes=["https://www.googleapis.com/auth/cloud-platform.read-only"]
            )
            project = project or detected_project

        self.project = project or os.environ.get("GOOGLE_CLOUD_PROJECT", "")
        self._creds = credentials
        self._iam = iam_service or self._build("iam", "v1")
        self._crm = crm_service or self._build("cloudresourcemanager", "v1")
        self._storage = storage_service or self._build("storage", "v1")
        self._bq = bq_service or self._build("bigquery", "v2")
        self._last_result: ScanResult | None = None

    def _build(self, api: str, version: str):
        from googleapiclient.discovery import build

        return build(api, version, credentials=self._creds, cache_discovery=False)

    # ------------------------------------------------------------------
    # Scan
    # ------------------------------------------------------------------

    def scan(self) -> ScanResult:
        print(f"[AgentSentry/GCP] Project: {self.project}")

        role_bindings = self._project_role_bindings()
        nhis = self._scan_service_accounts(role_bindings)
        resources = self._scan_buckets() + self._scan_bq_datasets()

        print(
            f"[AgentSentry/GCP] Done. Found {len(nhis)} NHIs, "
            f"{len(resources)} resources."
        )

        result = ScanResult(
            scan_id=(
                f"gcp-{self.project}-"
                f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
            ),
            provider=CloudProvider.GCP,
            account_id=self.project,
            nhis=nhis,
            resources=resources,
        )
        self._last_result = result
        return result

    # ------------------------------------------------------------------
    # Project IAM policy → email → [roles]
    # ------------------------------------------------------------------

    def _project_role_bindings(self) -> dict[str, list[str]]:
        """Aggregate EVERY project-level role per service-account email."""
        bindings_by_email: dict[str, list[str]] = {}
        try:
            policy = (
                self._crm.projects()
                .getIamPolicy(resource=self.project, body={})
                .execute()
            )
            for binding in policy.get("bindings", []):
                role = binding.get("role", "")
                for member in binding.get("members", []):
                    if not member.startswith("serviceAccount:"):
                        continue
                    email = member.replace("serviceAccount:", "")
                    roles = bindings_by_email.setdefault(email, [])
                    if role not in roles:
                        roles.append(role)
        except Exception as exc:
            print(f"[AgentSentry/GCP] Warning: could not read IAM policy: {exc}")
        return bindings_by_email

    # ------------------------------------------------------------------
    # Service Accounts
    # ------------------------------------------------------------------

    def _scan_service_accounts(
        self, role_bindings: dict[str, list[str]]
    ) -> list[NonHumanIdentity]:
        nhis: list[NonHumanIdentity] = []
        accounts = []
        try:
            request = (
                self._iam.projects()
                .serviceAccounts()
                .list(name=f"projects/{self.project}")
            )
            while request is not None:
                resp = request.execute()
                accounts.extend(resp.get("accounts", []))
                request = (
                    self._iam.projects().serviceAccounts().list_next(request, resp)
                )
        except Exception as exc:
            print(f"[AgentSentry/GCP] Warning: could not list service accounts: {exc}")
            accounts = []

        for sa in accounts:
            nhis.append(self._build_sa_nhi(sa, role_bindings))

        # Roles granted to SAs that the SA listing didn't return (e.g.
        # cross-project service accounts) still represent access — surface
        # them so the inventory is complete.
        listed_emails = {sa.get("email") for sa in accounts}
        for email, roles in role_bindings.items():
            if email in listed_emails:
                continue
            nhis.append(
                NonHumanIdentity(
                    id=f"gcp-sa-ext-{email.split('@')[0][:24]}",
                    name=email,
                    type=NHIType.GCP_SERVICE_ACCOUNT,
                    provider=CloudProvider.GCP,
                    attached_policies=list(roles),
                    is_cross_account=True,  # bound here, homed elsewhere
                    findings=self._role_findings(email, roles),
                )
            )

        return nhis

    def _build_sa_nhi(
        self, sa: dict, role_bindings: dict[str, list[str]]
    ) -> NonHumanIdentity:
        email = sa.get("email", "unknown")
        unique_id = sa.get("uniqueId") or email.split("@")[0][:24]
        disabled = bool(sa.get("disabled", False))
        roles = list(role_bindings.get(email, []))

        created_date, last_rotated, key_findings = self._inspect_keys(sa, email)
        findings = key_findings + self._role_findings(email, roles)

        if disabled and (roles or last_rotated):
            findings.append(
                Finding(
                    finding_id=f"gcp-sa-disabled-{unique_id[:12]}",
                    title="Disabled service account still holds roles or keys",
                    description=(
                        f"Service account {email} is disabled but still has "
                        f"{len(roles)} role binding(s) and/or user-managed keys. "
                        "Re-enabling it silently restores all of that access."
                    ),
                    risk_level=RiskLevel.MEDIUM,
                    mitre_techniques=["T1078.004"],
                    remediation=(
                        "Delete the service account (or strip its bindings and "
                        "keys) instead of leaving it disabled."
                    ),
                    evidence={"roles": roles, "disabled": True},
                )
            )

        return NonHumanIdentity(
            id=f"gcp-sa-{unique_id}",
            name=email,
            type=NHIType.GCP_SERVICE_ACCOUNT,
            provider=CloudProvider.GCP,
            arn=sa.get("name"),
            created_date=created_date,
            last_rotated=last_rotated,
            attached_policies=roles,
            is_internet_facing=any(
                kw in email.lower() for kw in INTERNET_FACING_KEYWORDS
            ),
            findings=findings,
            mitre_techniques=sorted({t for f in findings for t in f.mitre_techniques}),
        )

    def _inspect_keys(self, sa: dict, email: str):
        """
        User-managed keys ARE the credential lifecycle for a GCP SA:
        the newest key's creation time is the de-facto last rotation,
        the oldest is a creation-date proxy.
        """
        created_date = None
        last_rotated = None
        findings: list[Finding] = []

        try:
            keys_resp = (
                self._iam.projects()
                .serviceAccounts()
                .keys()
                .list(name=sa["name"], keyTypes=["USER_MANAGED"])
                .execute()
            )
            user_keys = keys_resp.get("keys", [])
        except Exception:
            return created_date, last_rotated, findings

        if not user_keys:
            return created_date, last_rotated, findings

        key_times = sorted(
            t
            for t in (_parse_gcp_time(k.get("validAfterTime")) for k in user_keys)
            if t is not None
        )
        if key_times:
            created_date = key_times[0]
            last_rotated = key_times[-1]

        findings.append(
            Finding(
                finding_id=f"gcp-sa-key-{email[:12]}",
                title=f"User-managed SA key present ({len(user_keys)} key(s))",
                description=(
                    f"Service account {email} has {len(user_keys)} user-managed "
                    "key(s). These are long-lived credentials that can be "
                    "downloaded and exfiltrated."
                ),
                risk_level=RiskLevel.HIGH,
                mitre_techniques=["T1552.001"],
                remediation=(
                    "Prefer Workload Identity Federation over SA keys. If keys "
                    "are required, rotate them every 90 days."
                ),
                evidence={
                    "key_count": len(user_keys),
                    "oldest_key": key_times[0].isoformat() if key_times else None,
                    "newest_key": key_times[-1].isoformat() if key_times else None,
                },
            )
        )

        return created_date, last_rotated, findings

    def _role_findings(self, email: str, roles: list[str]) -> list[Finding]:
        high_priv = [r for r in roles if r in HIGH_PRIV_ROLES]
        if not high_priv:
            return []
        worst_is_critical = bool({"roles/owner", "roles/editor"} & set(high_priv))
        return [
            Finding(
                finding_id=f"gcp-high-priv-{email[:12]}",
                title=f"High-privilege project role(s): {', '.join(high_priv)}",
                description=(
                    f"Service account {email} holds {', '.join(high_priv)} at the "
                    "project level. Token theft or key exfiltration hands an "
                    "attacker that entire surface."
                ),
                risk_level=RiskLevel.CRITICAL if worst_is_critical else RiskLevel.HIGH,
                mitre_techniques=["T1078.004"],
                remediation=(
                    "Replace project-level grants with the narrowest predefined "
                    "role on the specific resources this workload touches."
                ),
                evidence={"roles": roles},
            )
        ]

    # ------------------------------------------------------------------
    # Resources
    # ------------------------------------------------------------------

    def _scan_buckets(self) -> list[Resource]:
        resources: list[Resource] = []
        try:
            resp = self._storage.buckets().list(project=self.project).execute()
            buckets = resp.get("items", [])
        except Exception:
            return resources

        for bucket in buckets:
            name = bucket.get("name", "unknown")
            resources.append(
                Resource(
                    id=f"gcp-bucket-{name}",
                    name=name,
                    resource_type="gcs_bucket",
                    provider=CloudProvider.GCP,
                    is_crown_jewel=any(
                        kw in name.lower() for kw in CROWN_JEWEL_KEYWORDS
                    ),
                    is_public=self._is_bucket_public(name),
                    sensitivity_tags=["PUBLIC"] if self._is_bucket_public(name) else [],
                )
            )
        return resources

    def _is_bucket_public(self, name: str) -> bool:
        try:
            policy = self._storage.buckets().getIamPolicy(bucket=name).execute()
            for binding in policy.get("bindings", []):
                members = binding.get("members", [])
                if "allUsers" in members or "allAuthenticatedUsers" in members:
                    return True
        except Exception:
            pass
        return False

    def _scan_bq_datasets(self) -> list[Resource]:
        resources: list[Resource] = []
        try:
            resp = self._bq.datasets().list(projectId=self.project).execute()
            datasets = resp.get("datasets", [])
        except Exception:
            return resources

        for ds in datasets:
            ds_id = ds.get("datasetReference", {}).get("datasetId", "unknown")
            resources.append(
                Resource(
                    id=f"gcp-bq-{ds_id}",
                    name=ds_id,
                    resource_type="bigquery_dataset",
                    provider=CloudProvider.GCP,
                    is_crown_jewel=any(
                        kw in ds_id.lower() for kw in CROWN_JEWEL_KEYWORDS
                    ),
                )
            )
        return resources

    # ------------------------------------------------------------------
    # Attack graph edges
    # ------------------------------------------------------------------

    # role prefix → (resource id prefix, weight). Weight is attack-path
    # COST: lower = easier hop.
    ROLE_RESOURCE_MAP: dict[str, tuple[str, float]] = {
        "roles/owner": ("", 0.5),
        "roles/editor": ("", 0.5),
        "roles/storage.": ("gcp-bucket-", 0.75),
        "roles/bigquery.": ("gcp-bq-", 0.75),
        "roles/secretmanager.": ("gcp-secret-", 0.75),
    }

    def build_access_edges(self) -> list[tuple[str, str, str, float]]:
        """
        Derives NHI → resource edges from aggregated IAM roles, mirroring
        the AWS scanner's policy mapping. Returns
        (from_id, to_id, permission, weight) tuples.
        """
        if self._last_result is None:
            return []

        resource_ids = {r.id for r in self._last_result.resources}
        edges: list[tuple[str, str, str, float]] = []
        seen: set[tuple[str, str, str]] = set()

        for nhi in self._last_result.nhis:
            for role in nhi.attached_policies:
                for role_prefix, (res_prefix, weight) in self.ROLE_RESOURCE_MAP.items():
                    if not role.startswith(role_prefix):
                        continue
                    matched = (
                        [rid for rid in resource_ids if rid.startswith(res_prefix)]
                        if res_prefix
                        else list(resource_ids)
                    )
                    if not matched:
                        matched = [f"virtual-gcp-{res_prefix.rstrip('-') or 'all'}"]
                    for to_id in matched:
                        key = (nhi.id, to_id, role)
                        if key not in seen:
                            seen.add(key)
                            edges.append((nhi.id, to_id, role, weight))
                    break  # first matching prefix wins

        return edges
