"""
BaseProvider — abstract interface every scan provider must implement.

To add a new environment, subclass BaseProvider and implement:
  - name / display_name / cloud_provider (properties)
  - check_permissions() → PermissionStatus
  - scan() → ScanResult

AgentSentry will auto-discover providers registered in the registry.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Iterator

from agentsentry.core.models import CloudProvider, ScanResult


@dataclass
class PermissionStatus:
    """
    Result of a pre-scan permission check.
    The CLI displays this before ever touching a real API.
    """

    ok: bool
    provider_name: str
    sdk_available: bool = True
    missing_creds: list[str] = field(default_factory=list)
    missing_perms: list[str] = field(default_factory=list)
    message: str = ""

    def __str__(self) -> str:
        if not self.sdk_available:
            return f"{self.provider_name}: SDK not installed — run: pip install agentsentry[{self.provider_name}]"
        if self.missing_creds:
            return f"{self.provider_name}: Missing credentials — {', '.join(self.missing_creds)}"
        if self.missing_perms:
            return f"{self.provider_name}: Insufficient permissions — {', '.join(self.missing_perms)}"
        return self.message or f"{self.provider_name}: Ready"


class BaseProvider(ABC):
    """
    Abstract base class for all AgentSentry scan providers.

    Built-in providers:
        aws       Amazon Web Services (IAM roles, access keys, Lambda)
        azure     Microsoft Azure (Managed Identities, Service Principals)
        gcp       Google Cloud Platform (Service Accounts, Workload Identity)
        github    GitHub (Actions secrets, PATs, Deploy keys)
        k8s       Kubernetes (ServiceAccounts, RBAC bindings)
        local     Local environment (env vars, .env files, SSH keys, Docker)

    Adding a custom provider:
        1. Subclass BaseProvider
        2. Implement all abstract methods
        3. Register with: registry.register("myenv", MyProvider)
        4. Run: agentsentry scan myenv
    """

    # ── Identity ──────────────────────────────────────────────────────

    @property
    @abstractmethod
    def name(self) -> str:
        """Short unique key used on the CLI (e.g. 'aws', 'k8s')."""
        ...

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable name (e.g. 'Amazon Web Services')."""
        ...

    @property
    @abstractmethod
    def cloud_provider(self) -> CloudProvider:
        """Maps to the CloudProvider enum in models.py."""
        ...

    # ── Permissions ───────────────────────────────────────────────────

    @abstractmethod
    def check_permissions(self) -> PermissionStatus:
        """
        Verify that credentials and required permissions are available.

        This is called BEFORE scan() — it should be cheap (no full API calls)
        and return a clear, actionable PermissionStatus.

        The CLI shows this status to the user and aborts if ok=False
        unless --force is passed.
        """
        ...

    @property
    def required_permissions(self) -> list[str]:
        """
        Human-readable list of permissions AgentSentry needs.
        Shown when the user runs: agentsentry permissions <provider>
        """
        return []

    @property
    def setup_hint(self) -> str:
        """One-line setup instruction shown when credentials are missing."""
        return ""

    # ── Scanning ──────────────────────────────────────────────────────

    @abstractmethod
    def scan(self) -> ScanResult:
        """
        Execute the scan and return all discovered NHIs + resources.
        Only called after check_permissions() returns ok=True.
        """
        ...

    def build_access_edges(self) -> Iterator[tuple[str, str, str, float]]:
        """
        Yield (from_nhi_id, to_resource_id, permission_name, weight) tuples
        for the attack graph. Override to add identity→resource relationships.
        """
        return iter([])
