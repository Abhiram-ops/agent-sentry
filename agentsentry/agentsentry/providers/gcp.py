"""
GCP Provider — wraps the GCPScanner behind the BaseProvider interface.

Credentials (any of these):
  - Application Default: gcloud auth application-default login
  - Service Account key: GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
  - Metadata server:     automatic inside GCE / Cloud Run / GKE

Install SDK:  pip install agentsentry[gcp]
"""

from __future__ import annotations

import os

from agentsentry.core.models import CloudProvider, ScanResult
from agentsentry.providers.base import BaseProvider, PermissionStatus

_GCP_OK = False
_GCP_ERR: Exception | None = None
try:
    from google.oauth2 import credentials as _gc  # noqa: F401
    from googleapiclient.discovery import build as _gbuild  # noqa: F401
    import google.auth  # noqa: F401

    _GCP_OK = True
except ImportError as _e:
    _GCP_ERR = _e


class GCPProvider(BaseProvider):

    def __init__(self):
        self._creds = None
        self._project = ""
        self._scanner = None

    @property
    def name(self) -> str:
        return "gcp"

    @property
    def display_name(self) -> str:
        return "Google Cloud Platform"

    @property
    def cloud_provider(self) -> CloudProvider:
        return CloudProvider.GCP

    @property
    def required_permissions(self) -> list[str]:
        return [
            "iam.serviceAccounts.list",
            "iam.serviceAccountKeys.list",
            "resourcemanager.projects.getIamPolicy",
            "storage.buckets.list",
            "bigquery.datasets.get",
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
                ok=False,
                provider_name=self.name,
                sdk_available=False,
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
                ok=True,
                provider_name=self.name,
                message=f"Project: {self._project}",
            )
        except Exception as exc:
            return PermissionStatus(
                ok=False,
                provider_name=self.name,
                missing_creds=["GCP application default credentials"],
                message=f"{exc}\n{self.setup_hint}",
            )

    def scan(self) -> ScanResult:
        if not _GCP_OK:
            raise RuntimeError(
                "GCP SDK not installed. Run: pip install agentsentry[gcp]"
            )
        from agentsentry.scanners.gcp import GCPScanner

        self._scanner = GCPScanner(
            credentials=self._creds, project=self._project or None
        )
        return self._scanner.scan()

    def build_access_edges(self):
        if self._scanner is not None:
            return self._scanner.build_access_edges()
        return iter([])
