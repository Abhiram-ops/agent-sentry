"""
Azure Scanner

Discovers Non-Human Identities in Azure subscriptions using read-only
ARM API calls, at the same depth as the AWS IAM scanner:

  - User-assigned Managed Identities (Microsoft.ManagedIdentity)
  - Service Principals + system-assigned identities via role assignments
  - Role assignments aggregated per principal → attached_policies
  - Assignment scope tracking (subscription-wide grants are flagged)
  - Key Vaults / Storage Accounts / Resource Groups as resources,
    with crown-jewel heuristics
  - build_access_edges() mapping RBAC roles onto scanned resources

Not covered (requires Microsoft Graph, a separate permission grant):
SP credential/secret lifecycle and federated identity credentials —
last_rotated is therefore left unset for service principals.

Setup:
    az login    (or service-principal env vars — see AzureProvider)
"""

from __future__ import annotations

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

# Roles that signal high privilege
HIGH_PRIV_ROLES = {
    "Owner",
    "Contributor",
    "User Access Administrator",
    "Security Admin",
    "Key Vault Administrator",
    "Storage Blob Data Owner",
}

# Principal types that are human, not machine — out of scope for an
# NHI scanner (including them would drown the report in people)
HUMAN_PRINCIPAL_TYPES = {"user", "group"}

# Generic-resource types we surface as attack-graph resources
RESOURCE_TYPE_MAP = {
    "microsoft.keyvault/vaults": ("azure_key_vault", "azure-kv-"),
    "microsoft.storage/storageaccounts": ("azure_storage_account", "azure-st-"),
}

MANAGED_IDENTITY_RESOURCE_TYPE = "microsoft.managedidentity/userassignedidentities"

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
    "vault",
]

INTERNET_FACING_KEYWORDS = [
    "public",
    "external",
    "internet",
    "api",
    "web",
    "app",
    "func",
]


class AzureScanner:
    """
    Scans Azure subscriptions for Non-Human Identities.

    Clients are injectable for testing — pass pre-built fakes for
    *subscription_client* and the factory callables, or leave them None
    to build real SDK clients from *credential*.
    """

    def __init__(
        self,
        credential=None,
        subscription_client=None,
        auth_client_factory=None,
        resource_client_factory=None,
    ):
        if credential is None and subscription_client is None:
            from azure.identity import DefaultAzureCredential

            credential = DefaultAzureCredential(logging_enable=False)
        self.credential = credential

        if subscription_client is None:
            from azure.mgmt.subscription import SubscriptionClient

            subscription_client = SubscriptionClient(credential)
        self.subscriptions = subscription_client

        self._auth_client_factory = auth_client_factory or self._default_auth_client
        self._resource_client_factory = (
            resource_client_factory or self._default_resource_client
        )
        self._last_result: ScanResult | None = None

    def _default_auth_client(self, subscription_id: str):
        from azure.mgmt.authorization import AuthorizationManagementClient

        return AuthorizationManagementClient(self.credential, subscription_id)

    def _default_resource_client(self, subscription_id: str):
        from azure.mgmt.resource import ResourceManagementClient

        return ResourceManagementClient(self.credential, subscription_id)

    # ------------------------------------------------------------------
    # Scan
    # ------------------------------------------------------------------

    def scan(self) -> ScanResult:
        nhis: list[NonHumanIdentity] = []
        resources: list[Resource] = []

        for sub in self.subscriptions.subscriptions.list():
            sub_id = sub.subscription_id
            print(f"[AgentSentry/Azure] Subscription: {sub.display_name} ({sub_id})")

            auth_client = self._auth_client_factory(sub_id)
            res_client = self._resource_client_factory(sub_id)

            managed_identities = self._discover_managed_identities(res_client)
            principals = self._aggregate_role_assignments(auth_client, sub_id)
            nhis.extend(
                self._build_principal_nhis(sub_id, principals, managed_identities)
            )
            resources.extend(self._discover_resources(res_client))

        print(
            f"[AgentSentry/Azure] Done. Found {len(nhis)} NHIs, "
            f"{len(resources)} resources."
        )

        result = ScanResult(
            scan_id=f"azure-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            provider=CloudProvider.AZURE,
            nhis=nhis,
            resources=resources,
        )
        self._last_result = result
        return result

    # ------------------------------------------------------------------
    # Managed Identities (user-assigned)
    # ------------------------------------------------------------------

    def _discover_managed_identities(self, res_client) -> dict[str, dict]:
        """
        Returns principal_id → {name, resource_id} for every user-assigned
        managed identity, so role-assignment principals can be joined back
        to a human-readable identity.
        """
        identities: dict[str, dict] = {}
        try:
            listed = res_client.resources.list(
                filter="resourceType eq 'Microsoft.ManagedIdentity/userAssignedIdentities'"
            )
            for item in listed:
                principal_id = None
                try:
                    # resources.list() omits properties — fetch the full
                    # resource to get the identity's principalId
                    full = res_client.resources.get_by_id(item.id, "2023-01-31")
                    props = getattr(full, "properties", None) or {}
                    principal_id = props.get("principalId")
                except Exception:
                    pass
                key = principal_id or f"unresolved-{item.name}"
                identities[key] = {"name": item.name, "resource_id": item.id}
        except Exception as exc:
            print(
                f"[AgentSentry/Azure] Warning: could not list managed identities: {exc}"
            )
        return identities

    # ------------------------------------------------------------------
    # Role assignments → per-principal aggregation
    # ------------------------------------------------------------------

    def _aggregate_role_assignments(self, auth_client, sub_id: str) -> dict[str, dict]:
        """
        One Azure principal frequently has many role assignments. Aggregate
        them so each principal becomes exactly one NHI carrying ALL of its
        roles in attached_policies — mirroring how the AWS scanner attaches
        every policy to one role NHI.
        """
        principals: dict[str, dict] = {}
        role_name_cache: dict[str, str] = {}

        try:
            assignments = list(auth_client.role_assignments.list_for_subscription())
        except Exception as exc:
            print(
                f"[AgentSentry/Azure] Warning: could not list role assignments: {exc}"
            )
            return principals

        for assignment in assignments:
            principal_id = assignment.principal_id or "unknown"
            principal_type = assignment.principal_type or "ServicePrincipal"

            if principal_type.lower() in HUMAN_PRINCIPAL_TYPES:
                continue  # users/groups are not NHIs

            role_def_id = assignment.role_definition_id or ""
            if role_def_id not in role_name_cache:
                role_name_cache[role_def_id] = self._resolve_role_name(
                    auth_client, sub_id, role_def_id
                )
            role_name = role_name_cache[role_def_id]

            scope = (assignment.scope or "").lower()
            is_subscription_scope = scope == f"/subscriptions/{sub_id}".lower()
            created_on = getattr(assignment, "created_on", None)

            entry = principals.setdefault(
                principal_id,
                {
                    "principal_type": principal_type,
                    "roles": [],
                    "subscription_scope_roles": [],
                    "earliest_grant": None,
                },
            )
            if role_name not in entry["roles"]:
                entry["roles"].append(role_name)
            if (
                is_subscription_scope
                and role_name not in entry["subscription_scope_roles"]
            ):
                entry["subscription_scope_roles"].append(role_name)
            if created_on and (
                entry["earliest_grant"] is None or created_on < entry["earliest_grant"]
            ):
                entry["earliest_grant"] = created_on

        return principals

    def _resolve_role_name(self, auth_client, sub_id: str, role_def_id: str) -> str:
        try:
            rd = auth_client.role_definitions.get(
                scope=f"/subscriptions/{sub_id}",
                role_definition_id=role_def_id.split("/")[-1],
            )
            return rd.role_name or "Unknown"
        except Exception:
            return "Unknown"

    # ------------------------------------------------------------------
    # NHI construction
    # ------------------------------------------------------------------

    def _build_principal_nhis(
        self,
        sub_id: str,
        principals: dict[str, dict],
        managed_identities: dict[str, dict],
    ) -> list[NonHumanIdentity]:
        nhis = []

        for principal_id, info in principals.items():
            principal_type = info["principal_type"]
            mi = managed_identities.get(principal_id)

            if mi:
                nhi_type = NHIType.MANAGED_IDENTITY
                name = f"azure/mi/{mi['name']}"
                arn = mi["resource_id"]
            elif "managedidentity" in principal_type.lower():
                nhi_type = NHIType.MANAGED_IDENTITY
                name = f"azure/mi/{principal_id[:12]}"
                arn = None
            else:
                nhi_type = NHIType.SERVICE_PRINCIPAL
                name = f"azure/sp/{principal_id[:12]}"
                arn = None

            findings = self._principal_findings(sub_id, principal_id, info)

            nhis.append(
                NonHumanIdentity(
                    id=f"azure-{sub_id[:8]}-{principal_id[:8]}",
                    name=name,
                    type=nhi_type,
                    provider=CloudProvider.AZURE,
                    arn=arn,
                    created_date=info["earliest_grant"],
                    attached_policies=list(info["roles"]),
                    is_internet_facing=any(
                        kw in name.lower() for kw in INTERNET_FACING_KEYWORDS
                    ),
                    findings=findings,
                    mitre_techniques=sorted(
                        {t for f in findings for t in f.mitre_techniques}
                    ),
                )
            )

        # Managed identities with zero role assignments are still NHIs —
        # provisioned but unused identities are governance debt
        seen_principals = set(principals)
        for principal_id, mi in managed_identities.items():
            if principal_id in seen_principals:
                continue
            nhis.append(
                NonHumanIdentity(
                    id=f"azure-{sub_id[:8]}-{principal_id[:8]}",
                    name=f"azure/mi/{mi['name']}",
                    type=NHIType.MANAGED_IDENTITY,
                    provider=CloudProvider.AZURE,
                    arn=mi["resource_id"],
                    attached_policies=[],
                    is_internet_facing=any(
                        kw in mi["name"].lower() for kw in INTERNET_FACING_KEYWORDS
                    ),
                )
            )

        return nhis

    def _principal_findings(
        self, sub_id: str, principal_id: str, info: dict
    ) -> list[Finding]:
        findings: list[Finding] = []
        high_priv = [r for r in info["roles"] if r in HIGH_PRIV_ROLES]

        if high_priv:
            worst = "Owner" if "Owner" in high_priv else high_priv[0]
            findings.append(
                Finding(
                    finding_id=f"azure-high-priv-{principal_id[:8]}",
                    title=f"High-privilege Azure role(s): {', '.join(high_priv)}",
                    description=(
                        f"Principal {principal_id} holds "
                        f"{len(high_priv)} high-privilege role(s) "
                        f"({', '.join(high_priv)}) in subscription {sub_id}. "
                        "These grant broad write or rights-administration access."
                    ),
                    risk_level=(
                        RiskLevel.CRITICAL if worst == "Owner" else RiskLevel.HIGH
                    ),
                    mitre_techniques=["T1078.004"],
                    remediation=(
                        "Replace broad roles with built-in roles scoped to what the "
                        "workload actually touches, assigned at resource-group or "
                        "resource scope rather than the subscription."
                    ),
                    evidence={"roles": info["roles"]},
                )
            )

        sub_scope = [
            r for r in info["subscription_scope_roles"] if r in HIGH_PRIV_ROLES
        ]
        if sub_scope:
            findings.append(
                Finding(
                    finding_id=f"azure-sub-scope-{principal_id[:8]}",
                    title="Subscription-wide privilege grant",
                    description=(
                        f"Principal {principal_id} holds {', '.join(sub_scope)} at the "
                        f"SUBSCRIPTION scope — every resource group and resource in "
                        f"{sub_id} is inside its blast radius."
                    ),
                    risk_level=RiskLevel.HIGH,
                    mitre_techniques=["T1078.004", "T1098"],
                    remediation=(
                        "Re-assign the role at the narrowest scope that still works "
                        "(resource group or individual resource)."
                    ),
                    evidence={"subscription_scope_roles": sub_scope},
                )
            )

        return findings

    # ------------------------------------------------------------------
    # Resources
    # ------------------------------------------------------------------

    def _discover_resources(self, res_client) -> list[Resource]:
        resources: list[Resource] = []

        # Key Vaults and Storage Accounts — primary credential/data targets
        try:
            for item in res_client.resources.list():
                rtype = (item.type or "").lower()
                mapped = RESOURCE_TYPE_MAP.get(rtype)
                if not mapped:
                    continue
                resource_type, id_prefix = mapped
                name = item.name or "unknown"
                is_crown_jewel = (
                    resource_type == "azure_key_vault"  # vaults hold secrets
                    or any(kw in name.lower() for kw in CROWN_JEWEL_KEYWORDS)
                )
                resources.append(
                    Resource(
                        id=f"{id_prefix}{name}",
                        name=name,
                        resource_type=resource_type,
                        provider=CloudProvider.AZURE,
                        arn=item.id,
                        is_crown_jewel=is_crown_jewel,
                    )
                )
        except Exception as exc:
            print(f"[AgentSentry/Azure] Warning: could not list resources: {exc}")

        # Resource groups (kept from the original scaffold)
        try:
            for rg in res_client.resource_groups.list():
                resources.append(
                    Resource(
                        id=f"azure-rg-{rg.name}",
                        name=rg.name or "unknown",
                        resource_type="azure_resource_group",
                        provider=CloudProvider.AZURE,
                        is_crown_jewel=False,
                    )
                )
        except Exception:
            pass

        return resources

    # ------------------------------------------------------------------
    # Attack graph edges
    # ------------------------------------------------------------------

    # role → (resource id prefix, weight). Weight is attack-path COST:
    # lower = easier hop (admin roles make every target one step away).
    ROLE_RESOURCE_MAP: dict[str, tuple[str, float]] = {
        "Owner": ("", 0.5),
        "Contributor": ("", 0.5),
        "User Access Administrator": ("", 0.5),
        "Security Admin": ("", 0.75),
        "Key Vault Administrator": ("azure-kv-", 0.5),
        "Key Vault Secrets Officer": ("azure-kv-", 0.75),
        "Key Vault Secrets User": ("azure-kv-", 1.0),
        "Storage Blob Data Owner": ("azure-st-", 0.5),
        "Storage Blob Data Contributor": ("azure-st-", 0.75),
        "Storage Blob Data Reader": ("azure-st-", 1.5),
    }

    def build_access_edges(self) -> list[tuple[str, str, str, float]]:
        """
        Derives NHI → resource edges from aggregated RBAC roles, mirroring
        the AWS scanner's managed-policy mapping. Returns
        (from_id, to_id, permission, weight) tuples.
        """
        if self._last_result is None:
            return []

        resource_ids = {r.id for r in self._last_result.resources}
        edges: list[tuple[str, str, str, float]] = []
        seen: set[tuple[str, str, str]] = set()

        for nhi in self._last_result.nhis:
            for role in nhi.attached_policies:
                mapped = self.ROLE_RESOURCE_MAP.get(role)
                if not mapped:
                    continue
                prefix, weight = mapped
                matched = (
                    [rid for rid in resource_ids if rid.startswith(prefix)]
                    if prefix
                    else list(resource_ids)
                )
                if not matched:
                    matched = [f"virtual-azure-{prefix.rstrip('-') or 'all'}"]
                for to_id in matched:
                    key = (nhi.id, to_id, role)
                    if key not in seen:
                        seen.add(key)
                        edges.append((nhi.id, to_id, role, weight))

        return edges
