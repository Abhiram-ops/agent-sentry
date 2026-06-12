"""
Kubernetes Provider — scans ServiceAccounts, RBAC bindings, mounted secrets.

Credentials:
  - kubeconfig:         ~/.kube/config  (kubectl context)
  - In-cluster:         automatic inside a Pod (uses ServiceAccount token)
  - KUBECONFIG env var: path to a custom kubeconfig file

Install SDK:  pip install agentsentry[k8s]
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

from agentsentry.core.models import (
    CloudProvider,
    NHIType,
    NonHumanIdentity,
    Resource,
    RiskLevel,
    ScanResult,
    Finding,
)
from agentsentry.providers.base import BaseProvider, PermissionStatus

_K8S_OK = False
_K8S_ERR: Exception | None = None
try:
    from kubernetes import client as k8s_client, config as k8s_config

    _K8S_OK = True
except ImportError as _e:
    _K8S_ERR = _e

# Cluster roles that grant near-admin access
HIGH_PRIV_CLUSTER_ROLES = {
    "cluster-admin",
    "admin",
    "system:masters",
}

DANGEROUS_VERBS = {"*", "escalate", "bind", "impersonate"}
SENSITIVE_RESOURCES = {"secrets", "serviceaccounts/token", "pods/exec", "pods/attach"}


class KubernetesProvider(BaseProvider):

    def __init__(self, context: str | None = None, namespace: str | None = None):
        self.context = context or os.environ.get("KUBECONTEXT")
        self.namespace = namespace or os.environ.get(
            "K8S_NAMESPACE"
        )  # None = all namespaces

    @property
    def name(self) -> str:
        return "k8s"

    @property
    def display_name(self) -> str:
        return "Kubernetes"

    @property
    def cloud_provider(self) -> CloudProvider:
        return CloudProvider.K8S

    @property
    def required_permissions(self) -> list[str]:
        return [
            "serviceaccounts: list (all namespaces)",
            "clusterrolebindings: list",
            "rolebindings: list (all namespaces)",
            "clusterroles: list",
            "roles: list (all namespaces)",
            "secrets: list (all namespaces)",
        ]

    @property
    def setup_hint(self) -> str:
        return "kubectl is configured. Run: kubectl config get-contexts"

    def check_permissions(self) -> PermissionStatus:
        if not _K8S_OK:
            return PermissionStatus(
                ok=False,
                provider_name=self.name,
                sdk_available=False,
                message="Run: pip install agentsentry[k8s]",
            )
        try:
            self._load_config()
            v1 = k8s_client.CoreV1Api()
            v1.list_namespace(_request_timeout=5)
            ctx = self.context or os.environ.get("KUBECONFIG", "default kubeconfig")
            return PermissionStatus(
                ok=True,
                provider_name=self.name,
                message=f"Context: {ctx}",
            )
        except Exception as exc:
            return PermissionStatus(
                ok=False,
                provider_name=self.name,
                missing_creds=["Kubernetes credentials / kubeconfig"],
                message=str(exc),
            )

    def _load_config(self) -> None:
        try:
            k8s_config.load_incluster_config()
        except Exception:
            k8s_config.load_kube_config(context=self.context)

    def scan(self) -> ScanResult:
        if not _K8S_OK:
            raise RuntimeError(
                "Kubernetes SDK not installed. Run: pip install agentsentry[k8s]"
            )

        self._load_config()
        v1 = k8s_client.CoreV1Api()
        rbac = k8s_client.RbacAuthorizationV1Api()

        nhis: list[NonHumanIdentity] = []
        resources: list[Resource] = []

        print("[AgentSentry/K8s] Listing ServiceAccounts...")

        # ── ServiceAccounts ───────────────────────────────────────────
        sa_list = (
            v1.list_namespaced_service_account(self.namespace)
            if self.namespace
            else v1.list_service_account_for_all_namespaces()
        )

        for sa in sa_list.items:
            ns = sa.metadata.namespace
            name = sa.metadata.name
            findings: list[Finding] = []

            # Check automount
            if sa.automount_service_account_token is True:
                findings.append(
                    Finding(
                        finding_id=f"k8s-automount-{ns}-{name}",
                        title="automountServiceAccountToken: true",
                        description=(
                            f"ServiceAccount {ns}/{name} automatically mounts its token into every pod. "
                            "If any pod is compromised, the attacker gains this SA's credentials."
                        ),
                        risk_level=RiskLevel.MEDIUM,
                        mitre_techniques=["T1552.007"],
                        remediation="Set automountServiceAccountToken: false on the SA and opt-in per Pod.",
                    )
                )

            nhis.append(
                NonHumanIdentity(
                    id=f"k8s-sa-{ns}-{name}",
                    name=f"{ns}/{name}",
                    type=NHIType.K8S_SERVICE_ACCOUNT,
                    provider=CloudProvider.K8S,
                    created_date=sa.metadata.creation_timestamp,
                    findings=findings,
                    mitre_techniques=["T1552.007"] if findings else [],
                )
            )

        print("[AgentSentry/K8s] Listing ClusterRoleBindings...")

        # ── ClusterRoleBindings ───────────────────────────────────────
        crbs = rbac.list_cluster_role_binding()
        for crb in crbs.items:
            role_ref = crb.role_ref.name if crb.role_ref else ""
            is_high_priv = role_ref in HIGH_PRIV_CLUSTER_ROLES

            for subject in crb.subjects or []:
                if subject.kind != "ServiceAccount":
                    continue
                sa_id = f"k8s-sa-{subject.namespace}-{subject.name}"
                existing = next((n for n in nhis if n.id == sa_id), None)

                if is_high_priv:
                    f = Finding(
                        finding_id=f"k8s-crb-{crb.metadata.name}-{subject.name}",
                        title=f"ServiceAccount bound to ClusterRole: {role_ref}",
                        description=(
                            f"{subject.namespace}/{subject.name} is bound to cluster role '{role_ref}' "
                            f"via ClusterRoleBinding '{crb.metadata.name}'. This is near-admin access."
                        ),
                        risk_level=(
                            RiskLevel.CRITICAL
                            if role_ref == "cluster-admin"
                            else RiskLevel.HIGH
                        ),
                        mitre_techniques=["T1078.004"],
                        remediation=f"Replace the '{role_ref}' binding with a least-privilege Role scoped to the required namespace.",
                    )
                    if existing:
                        existing.findings.append(f)
                        existing.attached_policies.append(f"ClusterRole:{role_ref}")

        # ── Namespaces as resources ────────────────────────────────────
        for ns in v1.list_namespace().items:
            resources.append(
                Resource(
                    id=f"k8s-ns-{ns.metadata.name}",
                    name=ns.metadata.name,
                    resource_type="k8s_namespace",
                    provider=CloudProvider.K8S,
                    is_crown_jewel=ns.metadata.name
                    in ("kube-system", "production", "prod"),
                )
            )

        context_name = self.context or "default"
        return ScanResult(
            scan_id=f"k8s-{context_name}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            provider=CloudProvider.K8S,
            account_id=context_name,
            nhis=nhis,
            resources=resources,
        )
