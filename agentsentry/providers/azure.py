"""
Azure Provider — scans Managed Identities, Service Principals, App Registrations.

Credentials (any of these):
  - Service Principal:  AZURE_TENANT_ID + AZURE_CLIENT_ID + AZURE_CLIENT_SECRET
  - Azure CLI:          az login
  - Managed Identity:   automatic inside Azure VMs / App Service
  - Device code:        az login --use-device-code

Install SDK:  pip install agentsentry[azure]
"""
from __future__ import annotations

import os
from datetime import datetime, timezone

from agentsentry.core.models import (
    CloudProvider, NHIType, NonHumanIdentity,
    Resource, RiskLevel, ScanResult, Finding,
)
from agentsentry.providers.base import BaseProvider, PermissionStatus

_AZURE_IMPORT_ERROR: Exception | None = None
try:
    from azure.identity import DefaultAzureCredential
    from azure.mgmt.authorization import AuthorizationManagementClient
    from azure.mgmt.resource import SubscriptionClient
    _AZURE_OK = True
except ImportError as _e:
    _AZURE_OK = False
    _AZURE_IMPORT_ERROR = _e


# Roles that signal high privilege
HIGH_PRIV_ROLES = {
    "Owner", "Contributor", "User Access Administrator",
    "Security Admin", "Key Vault Administrator",
    "Storage Blob Data Owner",
}


class AzureProvider(BaseProvider):

    def __init__(self):
        self._credential = None
        self._subscription_id = os.environ.get("AZURE_SUBSCRIPTION_ID", "")

    @property
    def name(self) -> str:         return "azure"
    @property
    def display_name(self) -> str: return "Microsoft Azure"
    @property
    def cloud_provider(self) -> CloudProvider: return CloudProvider.AZURE

    @property
    def required_permissions(self) -> list[str]:
        return [
            "Microsoft.Authorization/roleAssignments/read",
            "Microsoft.ManagedIdentity/userAssignedIdentities/read",
            "Microsoft.Authorization/roleDefinitions/read",
            "Directory.Read.All (Microsoft Graph — for Service Principals)",
        ]

    @property
    def setup_hint(self) -> str:
        return (
            "Option A (CLI):            az login\n"
            "Option B (Service Principal): set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET\n"
            "Option C (Managed Identity): automatic inside Azure VMs"
        )

    def check_permissions(self) -> PermissionStatus:
        if not _AZURE_OK:
            return PermissionStatus(
                ok=False, provider_name=self.name, sdk_available=False,
                message="Run: pip install agentsentry[azure]",
            )
        try:
            cred = DefaultAzureCredential(logging_enable=False)
            sub_client = SubscriptionClient(cred)
            subs = list(sub_client.subscriptions.list())
            if not subs:
                return PermissionStatus(
                    ok=False, provider_name=self.name,
                    missing_perms=["No accessible subscriptions found"],
                )
            self._credential = cred
            sub_names = [s.display_name for s in subs[:3]]
            return PermissionStatus(
                ok=True, provider_name=self.name,
                message=f"Subscriptions: {', '.join(sub_names)}",
            )
        except Exception as exc:
            return PermissionStatus(
                ok=False, provider_name=self.name,
                missing_creds=["Azure credentials"],
                message=f"{exc}\n{self.setup_hint}",
            )

    def scan(self) -> ScanResult:
        if not _AZURE_OK:
            raise RuntimeError("Azure SDK not installed. Run: pip install agentsentry[azure]")

        cred = self._credential or DefaultAzureCredential(logging_enable=False)
        sub_client = SubscriptionClient(cred)
        nhis: list[NonHumanIdentity] = []
        resources: list[Resource] = []

        for sub in sub_client.subscriptions.list():
            sub_id = sub.subscription_id
            print(f"[AgentSentry/Azure] Subscription: {sub.display_name} ({sub_id})")
            auth_client = AuthorizationManagementClient(cred, sub_id)

            # ── Service Principals + Managed Identities via role assignments ──
            assignments = list(auth_client.role_assignments.list_for_subscription())
            role_defs: dict[str, str] = {}

            for assignment in assignments:
                role_def_id = assignment.role_definition_id or ""
                if role_def_id not in role_defs:
                    try:
                        parts = role_def_id.split("/")
                        rd = auth_client.role_definitions.get(
                            scope=f"/subscriptions/{sub_id}",
                            role_definition_id=parts[-1],
                        )
                        role_defs[role_def_id] = rd.role_name or "Unknown"
                    except Exception:
                        role_defs[role_def_id] = "Unknown"

                role_name = role_defs.get(role_def_id, "Unknown")
                principal_id = assignment.principal_id or "unknown"
                principal_type = (assignment.principal_type or "ServicePrincipal").lower()

                nhi_type = (
                    NHIType.SERVICE_ACCOUNT  # managed identity
                    if "managedidentity" in principal_type
                    else NHIType.SERVICE_ACCOUNT  # service principal
                )

                findings: list[Finding] = []
                if role_name in HIGH_PRIV_ROLES:
                    findings.append(Finding(
                        finding_id=f"azure-high-priv-{principal_id[:8]}",
                        title=f"High-privilege Azure role: {role_name}",
                        description=(
                            f"Principal {principal_id} has the '{role_name}' role "
                            f"on subscription {sub_id}. This grants broad write access."
                        ),
                        risk_level=RiskLevel.HIGH if role_name != "Owner" else RiskLevel.CRITICAL,
                        mitre_techniques=["T1078.004"],
                        remediation=f"Scope the '{role_name}' assignment to a specific resource group instead of the subscription.",
                    ))

                nhis.append(NonHumanIdentity(
                    id=f"azure-{sub_id[:8]}-{principal_id[:8]}",
                    name=f"{principal_type}/{principal_id[:12]}",
                    type=nhi_type,
                    provider=CloudProvider.AZURE,
                    attached_policies=[role_name],
                    findings=findings,
                    mitre_techniques=["T1078.004"] if findings else [],
                ))

            # ── Resource groups as crown-jewel candidates ──
            try:
                from azure.mgmt.resource import ResourceManagementClient
                res_client = ResourceManagementClient(cred, sub_id)
                for rg in res_client.resource_groups.list():
                    resources.append(Resource(
                        id=f"azure-rg-{rg.name}",
                        name=rg.name or "unknown",
                        resource_type="azure_resource_group",
                        provider=CloudProvider.AZURE,
                        is_crown_jewel=False,
                    ))
            except Exception:
                pass

        return ScanResult(
            scan_id=f"azure-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            provider=CloudProvider.AZURE,
            nhis=nhis,
            resources=resources,
        )
