"""
Azure Provider — wraps the AzureScanner behind the BaseProvider interface.

Credentials (any of these):
  - Service Principal:  AZURE_TENANT_ID + AZURE_CLIENT_ID + AZURE_CLIENT_SECRET
  - Azure CLI:          az login
  - Managed Identity:   automatic inside Azure VMs / App Service
  - Device code:        az login --use-device-code

Install SDK:  pip install agentsentry[azure]
"""

from __future__ import annotations

from agentsentry.core.models import CloudProvider, ScanResult
from agentsentry.providers.base import BaseProvider, PermissionStatus

_AZURE_IMPORT_ERROR: Exception | None = None
try:
    from azure.identity import DefaultAzureCredential
    from azure.mgmt.authorization import AuthorizationManagementClient  # noqa: F401
    from azure.mgmt.resource import SubscriptionClient

    _AZURE_OK = True
except ImportError as _e:
    _AZURE_OK = False
    _AZURE_IMPORT_ERROR = _e


class AzureProvider(BaseProvider):

    def __init__(self):
        self._credential = None
        self._scanner = None

    @property
    def name(self) -> str:
        return "azure"

    @property
    def display_name(self) -> str:
        return "Microsoft Azure"

    @property
    def cloud_provider(self) -> CloudProvider:
        return CloudProvider.AZURE

    @property
    def required_permissions(self) -> list[str]:
        return [
            "Microsoft.Authorization/roleAssignments/read",
            "Microsoft.Authorization/roleDefinitions/read",
            "Microsoft.ManagedIdentity/userAssignedIdentities/read",
            "Microsoft.Resources/subscriptions/resources/read",
            "Directory.Read.All (Microsoft Graph — for Service Principal detail, optional)",
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
                ok=False,
                provider_name=self.name,
                sdk_available=False,
                message="Run: pip install agentsentry[azure]",
            )
        try:
            cred = DefaultAzureCredential(logging_enable=False)
            sub_client = SubscriptionClient(cred)
            subs = list(sub_client.subscriptions.list())
            if not subs:
                return PermissionStatus(
                    ok=False,
                    provider_name=self.name,
                    missing_perms=["No accessible subscriptions found"],
                )
            self._credential = cred
            sub_names = [s.display_name for s in subs[:3]]
            return PermissionStatus(
                ok=True,
                provider_name=self.name,
                message=f"Subscriptions: {', '.join(sub_names)}",
            )
        except Exception as exc:
            return PermissionStatus(
                ok=False,
                provider_name=self.name,
                missing_creds=["Azure credentials"],
                message=f"{exc}\n{self.setup_hint}",
            )

    def scan(self) -> ScanResult:
        if not _AZURE_OK:
            raise RuntimeError(
                "Azure SDK not installed. Run: pip install agentsentry[azure]"
            )
        from agentsentry.scanners.azure import AzureScanner

        cred = self._credential or DefaultAzureCredential(logging_enable=False)
        self._scanner = AzureScanner(credential=cred)
        return self._scanner.scan()

    def build_access_edges(self):
        if self._scanner is not None:
            return self._scanner.build_access_edges()
        return iter([])
