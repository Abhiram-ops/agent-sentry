"""
GitHub Provider — scans Actions secrets, PATs, Deploy Keys, GitHub Apps.

Credentials:
  - GITHUB_TOKEN env var  (classic PAT or fine-grained token)
  - Requires scopes: repo, read:org, admin:org (for org-level secrets)

Install SDK:  pip install agentsentry[github]   (or just requests — stdlib)
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

import requests

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

GITHUB_API = "https://api.github.com"

# PAT scope patterns that indicate high privilege
HIGH_PRIV_SCOPES = {"admin:org", "delete_repo", "admin:repo_hook", "admin:enterprise"}


class GitHubProvider(BaseProvider):

    def __init__(self, token: str | None = None, org: str | None = None):
        self.token = token or os.environ.get("GITHUB_TOKEN", "")
        self.org = org or os.environ.get("GITHUB_ORG", "")

    @property
    def name(self) -> str:
        return "github"

    @property
    def display_name(self) -> str:
        return "GitHub"

    @property
    def cloud_provider(self) -> CloudProvider:
        return CloudProvider.GITHUB

    @property
    def required_permissions(self) -> list[str]:
        return [
            "repo (read access to repos)",
            "read:org (list org members and secrets)",
            "read:user (list user tokens/keys)",
        ]

    @property
    def setup_hint(self) -> str:
        return "Set GITHUB_TOKEN=<your-pat>  (github.com/settings/tokens)"

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    def check_permissions(self) -> PermissionStatus:
        if not self.token:
            return PermissionStatus(
                ok=False,
                provider_name=self.name,
                missing_creds=["GITHUB_TOKEN"],
                message=self.setup_hint,
            )
        try:
            resp = requests.get(
                f"{GITHUB_API}/user", headers=self._headers(), timeout=10
            )
            resp.raise_for_status()
            user = resp.json()
            # Check token scopes from response header
            scopes = resp.headers.get("X-OAuth-Scopes", "")
            return PermissionStatus(
                ok=True,
                provider_name=self.name,
                message=f"Authenticated as: {user.get('login')}  Scopes: {scopes or 'fine-grained'}",
            )
        except requests.HTTPError as exc:
            return PermissionStatus(
                ok=False,
                provider_name=self.name,
                missing_creds=["Valid GITHUB_TOKEN"],
                message=f"Token invalid or expired: {exc}",
            )
        except Exception as exc:
            return PermissionStatus(
                ok=False,
                provider_name=self.name,
                message=str(exc),
            )

    def scan(self) -> ScanResult:
        nhis: list[NonHumanIdentity] = []
        resources: list[Resource] = []
        headers = self._headers()

        # ── Authenticated user info ────────────────────────────────────
        user_resp = requests.get(f"{GITHUB_API}/user", headers=headers, timeout=10)
        user_resp.raise_for_status()
        user = user_resp.json()
        login = user.get("login", "unknown")
        print(f"[AgentSentry/GitHub] User: {login}")

        # Check token scopes
        scopes_header = user_resp.headers.get("X-OAuth-Scopes", "")
        scopes = (
            {s.strip() for s in scopes_header.split(",")} if scopes_header else set()
        )
        high_scopes = scopes & HIGH_PRIV_SCOPES

        token_findings: list[Finding] = []
        if high_scopes:
            token_findings.append(
                Finding(
                    finding_id="github-token-high-scopes",
                    title=f"Token has high-privilege scopes: {', '.join(high_scopes)}",
                    description=(
                        f"The scanned GitHub token has scopes: {scopes_header}. "
                        f"High-privilege scopes ({', '.join(high_scopes)}) allow org-level or destructive actions."
                    ),
                    risk_level=RiskLevel.HIGH,
                    mitre_techniques=["T1528"],
                    remediation="Create a fine-grained token with only the minimum required permissions.",
                )
            )

        nhis.append(
            NonHumanIdentity(
                id=f"github-token-{login}",
                name=f"PAT / {login}",
                type=NHIType.API_KEY,
                provider=CloudProvider.GITHUB,
                attached_policies=list(scopes),
                is_internet_facing=True,
                findings=token_findings,
                mitre_techniques=["T1528"],
            )
        )

        # ── SSH / GPG keys on account ──────────────────────────────────
        try:
            keys_resp = requests.get(
                f"{GITHUB_API}/user/keys", headers=headers, timeout=10
            )
            for key in keys_resp.json():
                nhis.append(
                    NonHumanIdentity(
                        id=f"github-sshkey-{key.get('id')}",
                        name=f"SSH key: {key.get('title', 'unnamed')}",
                        type=NHIType.SSH_KEY,
                        provider=CloudProvider.GITHUB,
                        created_date=_parse_dt(key.get("created_at")),
                        is_internet_facing=True,
                        findings=[],
                    )
                )
        except Exception:
            pass

        # ── Deploy keys across repos ───────────────────────────────────
        repos = self._list_repos(headers, login)
        for repo in repos[:50]:  # cap at 50 repos
            resources.append(
                Resource(
                    id=f"github-repo-{repo['full_name']}",
                    name=repo["full_name"],
                    resource_type="github_repository",
                    provider=CloudProvider.GITHUB,
                    is_crown_jewel=repo.get("private", False),
                )
            )
            # Deploy keys
            try:
                dk_resp = requests.get(
                    f"{GITHUB_API}/repos/{repo['full_name']}/keys",
                    headers=headers,
                    timeout=10,
                )
                if dk_resp.status_code in (403, 429):
                    print(
                        f"[AgentSentry/GitHub] Rate-limited on deploy keys (HTTP {dk_resp.status_code}). Stopping."
                    )
                    break
                dk_data = dk_resp.json()  # parse once
                for dk in (dk_data if isinstance(dk_data, list) else []):
                    findings: list[Finding] = []
                    if dk.get("read_only") is False:
                        findings.append(
                            Finding(
                                finding_id=f"github-deploy-key-rw-{dk.get('id')}",
                                title="Deploy key has write access",
                                description=f"Deploy key '{dk.get('title')}' on {repo['full_name']} has read/write access.",
                                risk_level=RiskLevel.HIGH,
                                mitre_techniques=["T1552.004"],
                                remediation="Use read-only deploy keys unless write access is strictly required.",
                            )
                        )
                    nhis.append(
                        NonHumanIdentity(
                            id=f"github-dk-{dk.get('id')}",
                            name=f"Deploy key: {dk.get('title', 'unnamed')} ({repo['name']})",
                            type=NHIType.SSH_KEY,
                            provider=CloudProvider.GITHUB,
                            created_date=_parse_dt(dk.get("created_at")),
                            is_internet_facing=True,
                            findings=findings,
                        )
                    )
            except Exception:
                pass

        # ── Org-level secrets (if org provided) ───────────────────────
        if self.org:
            try:
                secrets_resp = requests.get(
                    f"{GITHUB_API}/orgs/{self.org}/actions/secrets",
                    headers=headers,
                    timeout=10,
                )
                for secret in secrets_resp.json().get("secrets", []):
                    nhis.append(
                        NonHumanIdentity(
                            id=f"github-secret-{secret['name']}",
                            name=f"Actions secret: {secret['name']} (org: {self.org})",
                            type=NHIType.GITHUB_SECRET,
                            provider=CloudProvider.GITHUB,
                            is_internet_facing=True,
                            findings=[],
                        )
                    )
            except Exception:
                pass

        return ScanResult(
            scan_id=f"github-{login}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            provider=CloudProvider.GITHUB,
            account_id=login,
            nhis=nhis,
            resources=resources,
        )

    def _list_repos(self, headers: dict, login: str) -> list[dict]:
        try:
            resp = requests.get(
                f"{GITHUB_API}/user/repos?per_page=100&affiliation=owner",
                headers=headers,
                timeout=15,
            )
            if resp.status_code in (403, 429):
                print(
                    f"[AgentSentry/GitHub] Rate-limited listing repos (HTTP {resp.status_code}). Skipping."
                )
                return []
            data = resp.json()  # parse once
            return data if isinstance(data, list) else []
        except Exception:
            return []


def _parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None
