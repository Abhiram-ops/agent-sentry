"""
Local Environment Provider — no cloud account, no SDK, no credentials needed.

Scans the LOCAL machine for exposed NHIs:
  • Environment variables matching secret patterns
  • .env files in current + parent directories
  • SSH private keys in ~/.ssh/
  • Cloud credential files (~/.aws/credentials, ~/.kube/config, etc.)
  • Docker socket exposure and container secrets
  • Git credential helpers and stored tokens

Ask before scanning (CLI will prompt for consent).
No data leaves the machine.
"""

from __future__ import annotations

import hashlib
import os
import re
import stat
import subprocess
from datetime import datetime, timezone
from pathlib import Path

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


def _stable_id(value: str, length: int = 8) -> str:
    """Return a stable hex ID derived from *value* via SHA-256.

    Unlike ``hash()``, this is deterministic across Python processes and runs,
    so NHI IDs remain stable for deduplication and graph edge references.
    """
    return hashlib.sha256(value.encode()).hexdigest()[:length]


# Regex patterns for secret-like env var names
SECRET_NAME_PATTERNS = re.compile(
    r"(secret|password|passwd|token|api[_-]?key|access[_-]?key|auth|credential|private[_-]?key"
    r"|signing[_-]?key|client[_-]?secret|bearer|jwt|oauth)",
    re.IGNORECASE,
)

# Patterns for AWS-style key values
AWS_KEY_RE = re.compile(r"AKIA[0-9A-Z]{16}")
SECRET_RE = re.compile(r"[A-Za-z0-9/+=]{40}")

# Cloud cred file locations
CRED_FILES = [
    ("~/.aws/credentials", "aws", RiskLevel.HIGH),
    ("~/.aws/config", "aws", RiskLevel.MEDIUM),
    ("~/.kube/config", "k8s", RiskLevel.HIGH),
    ("~/.config/gcloud/credentials.db", "gcp", RiskLevel.HIGH),
    ("~/.config/gcloud/application_default_credentials.json", "gcp", RiskLevel.HIGH),
    ("~/.npmrc", "npm", RiskLevel.MEDIUM),
    ("~/.pypirc", "pypi", RiskLevel.MEDIUM),
    ("~/.docker/config.json", "docker", RiskLevel.HIGH),
    ("~/.netrc", "netrc", RiskLevel.HIGH),
]


class LocalProvider(BaseProvider):
    """
    Scans the local machine for exposed credentials and NHIs.
    Requires no credentials — reads only files the current user can access.
    """

    def __init__(
        self,
        scan_home: bool = True,
        scan_env: bool = True,
        scan_docker: bool = True,
        path: str = ".",
    ):
        self.scan_home = scan_home
        self.scan_env = scan_env
        self.scan_docker = scan_docker
        self.path = Path(path).expanduser().resolve()

    @property
    def name(self) -> str:
        return "local"

    @property
    def display_name(self) -> str:
        return "Local Environment"

    @property
    def cloud_provider(self) -> CloudProvider:
        return CloudProvider.LOCAL

    @property
    def required_permissions(self) -> list[str]:
        return [
            "Read access to environment variables (secret detection)",
            "Read access to ~/.ssh/ (SSH key inspection)",
            "Read access to ~/.aws/, ~/.kube/, ~/.config/ (credential file detection)",
            "Read access to ~/.docker/ (Docker credential inspection)",
            "Read access to .env files in current directory tree",
            "Docker socket access — optional (container enumeration)",
        ]

    @property
    def setup_hint(self) -> str:
        return "No credentials needed — runs entirely locally."

    def check_permissions(self) -> PermissionStatus:
        # Local scanner always works — worst case it finds nothing
        return PermissionStatus(
            ok=True,
            provider_name=self.name,
            message=f"Scanning: {self.path}  (no credentials required)",
        )

    def scan(self) -> ScanResult:
        nhis: list[NonHumanIdentity] = []
        resources: list[Resource] = []
        print(f"[AgentSentry/Local] Scanning {self.path}")

        if self.scan_env:
            nhis.extend(self._scan_env_vars())

        nhis.extend(self._scan_dot_env_files())
        nhis.extend(self._scan_ssh_keys())
        nhis.extend(self._scan_cred_files())

        if self.scan_docker:
            nhis.extend(self._scan_docker())

        nhis.extend(self._scan_git_credentials())
        nhis.extend(self._scan_source_files())

        return ScanResult(
            scan_id=f"local-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            provider=CloudProvider.LOCAL,
            account_id=os.environ.get("USER", os.environ.get("USERNAME", "local")),
            nhis=nhis,
            resources=resources,
        )

    # ── Environment variables ──────────────────────────────────────────

    def _scan_env_vars(self) -> list[NonHumanIdentity]:
        nhis = []
        print("[AgentSentry/Local] Checking environment variables...")
        for key, value in os.environ.items():
            if not SECRET_NAME_PATTERNS.search(key):
                continue
            if not value or len(value) < 8:
                continue

            risk = RiskLevel.HIGH
            mitre = ["T1552.007"]
            title = f"Secret-like env var: {key}"
            desc = f"Environment variable '{key}' matches a secret naming pattern and has a non-empty value."

            # Detect AWS access key pattern
            if AWS_KEY_RE.match(value):
                risk = RiskLevel.CRITICAL
                title = f"AWS Access Key ID in environment: {key}"
                desc = f"'{key}' contains what appears to be an AWS Access Key ID (AKIA...)."
                mitre = ["T1552.007", "T1078.004"]

            nhis.append(
                NonHumanIdentity(
                    id=f"local-env-{key.lower()}",
                    name=f"env:{key}",
                    type=NHIType.API_KEY,
                    provider=CloudProvider.LOCAL,
                    is_internet_facing=False,
                    findings=[
                        Finding(
                            finding_id=f"local-env-{key.lower()}",
                            title=title,
                            description=desc,
                            risk_level=risk,
                            mitre_techniques=mitre,
                            remediation=(
                                f"Move '{key}' to a secrets manager (AWS Secrets Manager, HashiCorp Vault, "
                                "1Password Secrets Automation). Never set secrets as plain environment variables in production."
                            ),
                        )
                    ],
                    mitre_techniques=mitre,
                )
            )
        return nhis

    # ── .env files ────────────────────────────────────────────────────

    def _scan_dot_env_files(self) -> list[NonHumanIdentity]:
        nhis = []
        search_dirs = [self.path] + list(self.path.parents)[:3]
        for d in search_dirs:
            for env_file in d.glob(".env*"):
                if not env_file.is_file():
                    continue
                try:
                    content = env_file.read_text(errors="ignore")
                    secrets_found = []
                    for line in content.splitlines():
                        if "=" in line and not line.startswith("#"):
                            k, _, v = line.partition("=")
                            if SECRET_NAME_PATTERNS.search(k.strip()) and v.strip():
                                secrets_found.append(k.strip())

                    if secrets_found:
                        _sid = _stable_id(str(env_file))
                        nhis.append(
                            NonHumanIdentity(
                                id=f"local-dotenv-{_sid}",
                                name=f".env file: {env_file}",
                                type=NHIType.API_KEY,
                                provider=CloudProvider.LOCAL,
                                source_file=str(env_file),
                                findings=[
                                    Finding(
                                        finding_id=f"local-dotenv-{_sid}",
                                        title=f".env file with secrets: {env_file.name}",
                                        description=(
                                            f"Found {len(secrets_found)} secret-like variable(s) in {env_file}: "
                                            + ", ".join(secrets_found[:5])
                                        ),
                                        risk_level=RiskLevel.HIGH,
                                        mitre_techniques=["T1552.001"],
                                        remediation=(
                                            "Add .env to .gitignore. Use a secrets manager for production. "
                                            "Rotate any secrets that may have been committed."
                                        ),
                                    )
                                ],
                                mitre_techniques=["T1552.001"],
                            )
                        )
                except PermissionError:
                    pass
        return nhis

    # ── SSH keys ──────────────────────────────────────────────────────

    def _scan_ssh_keys(self) -> list[NonHumanIdentity]:
        nhis = []
        ssh_dir = Path.home() / ".ssh"
        if not ssh_dir.exists():
            return nhis
        print("[AgentSentry/Local] Checking SSH keys...")

        private_key_headers = (
            b"-----BEGIN RSA PRIVATE KEY-----",
            b"-----BEGIN EC PRIVATE KEY-----",
            b"-----BEGIN OPENSSH PRIVATE KEY-----",
            b"-----BEGIN DSA PRIVATE KEY-----",
        )
        for key_file in ssh_dir.iterdir():
            if (
                key_file.suffix in (".pub", ".known_hosts")
                or key_file.name == "known_hosts"
            ):
                continue
            try:
                if key_file.stat().st_size > 500_000:  # skip suspiciously large files
                    continue
                content = key_file.read_bytes()
                if not any(
                    content.startswith(h) or h in content for h in private_key_headers
                ):
                    continue

                findings: list[Finding] = []
                # Check if key is unencrypted
                unencrypted = (
                    b"ENCRYPTED" not in content and b"Proc-Type" not in content
                )
                if unencrypted:
                    findings.append(
                        Finding(
                            finding_id=f"local-ssh-unencrypted-{key_file.name}",
                            title=f"Unencrypted SSH private key: {key_file.name}",
                            description=(
                                f"The SSH private key at {key_file} is not passphrase-protected. "
                                "If this file is accessed or leaked, the key is immediately usable."
                            ),
                            risk_level=RiskLevel.HIGH,
                            mitre_techniques=["T1552.004"],
                            remediation=f"Add a passphrase: ssh-keygen -p -f {key_file}",
                        )
                    )

                # Check file permissions
                mode = oct(stat.S_IMODE(key_file.stat().st_mode))
                if mode not in ("0o600", "0o400"):
                    findings.append(
                        Finding(
                            finding_id=f"local-ssh-perms-{key_file.name}",
                            title=f"Overly permissive SSH key: {mode}",
                            description=f"{key_file} has permissions {mode}. SSH keys should be 600 or 400.",
                            risk_level=RiskLevel.MEDIUM,
                            mitre_techniques=["T1552.004"],
                            remediation=f"chmod 600 {key_file}",
                        )
                    )

                nhis.append(
                    NonHumanIdentity(
                        id=f"local-ssh-{key_file.name}",
                        name=f"SSH key: {key_file.name}",
                        type=NHIType.SSH_KEY,
                        provider=CloudProvider.LOCAL,
                        source_file=str(key_file),
                        findings=findings,
                        mitre_techniques=["T1552.004"],
                    )
                )
            except (PermissionError, OSError):
                pass
        return nhis

    # ── Cloud credential files ────────────────────────────────────────

    def _scan_cred_files(self) -> list[NonHumanIdentity]:
        nhis = []
        print("[AgentSentry/Local] Checking credential files...")
        for path_str, provider_label, risk in CRED_FILES:
            path = Path(path_str).expanduser()
            if not path.exists():
                continue
            nhis.append(
                NonHumanIdentity(
                    id=f"local-credfile-{provider_label}-{path.name}",
                    name=f"Credential file: {path}",
                    type=NHIType.API_KEY,
                    provider=CloudProvider.LOCAL,
                    source_file=str(path),
                    findings=[
                        Finding(
                            finding_id=f"local-credfile-{provider_label}-{path.name}",
                            title=f"{provider_label.upper()} credentials stored on disk: {path.name}",
                            description=(
                                f"Cloud credentials found at {path}. "
                                "If this machine is compromised, these credentials are at risk."
                            ),
                            risk_level=risk,
                            mitre_techniques=["T1552.001"],
                            remediation=(
                                "Ensure disk encryption is enabled. "
                                "Use short-lived credentials (IAM roles, Workload Identity) "
                                "instead of long-lived key files where possible."
                            ),
                        )
                    ],
                    mitre_techniques=["T1552.001"],
                )
            )
        return nhis

    # ── Docker ────────────────────────────────────────────────────────

    def _scan_docker(self) -> list[NonHumanIdentity]:
        nhis = []
        docker_socket = Path("/var/run/docker.sock")
        if not docker_socket.exists():
            return nhis

        try:
            result = subprocess.run(
                ["docker", "ps", "--format", "{{.Names}}"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            containers = [c for c in result.stdout.strip().splitlines() if c]
        except Exception:
            return nhis

        if containers:
            nhis.append(
                NonHumanIdentity(
                    id="local-docker-socket",
                    name="Docker socket (/var/run/docker.sock)",
                    type=NHIType.SERVICE_ACCOUNT,
                    provider=CloudProvider.LOCAL,
                    is_internet_facing=False,
                    findings=[
                        Finding(
                            finding_id="local-docker-socket-access",
                            title="Docker socket accessible to current user",
                            description=(
                                f"The Docker socket is accessible. {len(containers)} container(s) running. "
                                "Access to the Docker socket is equivalent to root on the host."
                            ),
                            risk_level=RiskLevel.CRITICAL,
                            mitre_techniques=["T1611"],
                            remediation=(
                                "Remove non-root users from the 'docker' group. "
                                "Use rootless Docker or Podman. "
                                "Never mount /var/run/docker.sock into containers."
                            ),
                        )
                    ],
                    mitre_techniques=["T1611"],
                )
            )
        return nhis

    # ── Git credentials ───────────────────────────────────────────────

    def _scan_git_credentials(self) -> list[NonHumanIdentity]:
        nhis = []
        git_cred_store = Path.home() / ".git-credentials"
        if git_cred_store.exists():
            try:
                content = git_cred_store.read_text()
                count = content.count("https://")
                nhis.append(
                    NonHumanIdentity(
                        id="local-git-credentials",
                        name=f"Git credential store: ~/.git-credentials ({count} entries)",
                        type=NHIType.API_KEY,
                        provider=CloudProvider.LOCAL,
                        source_file=str(git_cred_store),
                        findings=[
                            Finding(
                                finding_id="local-git-credentials",
                                title=f"Plaintext git credentials stored on disk ({count} entries)",
                                description=(
                                    "~/.git-credentials stores git credentials in plaintext. "
                                    "This includes GitHub tokens and passwords."
                                ),
                                risk_level=RiskLevel.HIGH,
                                mitre_techniques=["T1552.001"],
                                remediation="Switch to git-credential-manager or SSH keys instead of credential store.",
                            )
                        ],
                        mitre_techniques=["T1552.001"],
                    )
                )
            except PermissionError:
                pass
        return nhis

    # ── Source file scanner ───────────────────────────────────────────────────

    def _scan_source_files(self) -> list[NonHumanIdentity]:
        """Scan source files in self.path for hardcoded secrets."""
        nhis = []
        EXTENSIONS = {
            ".py",
            ".js",
            ".ts",
            ".sh",
            ".yaml",
            ".yml",
            ".json",
            ".toml",
            ".tf",
            ".env",
            ".conf",
            ".cfg",
            ".ini",
        }

        # Patterns that look like hardcoded secrets in code
        SECRET_PATTERNS = [
            (
                re.compile(
                    r"""(?:api[_-]?key|apikey)\s*[=:]\s*["']([A-Za-z0-9_\-]{20,})["']""",
                    re.I,
                ),
                "Hardcoded API key",
                RiskLevel.CRITICAL,
            ),
            (
                re.compile(
                    r"""(?:secret|password|passwd)\s*[=:]\s*["']([^"']{8,})["']""", re.I
                ),
                "Hardcoded secret/password",
                RiskLevel.CRITICAL,
            ),
            (
                re.compile(
                    r"""(?:token)\s*[=:]\s*["']([A-Za-z0-9_\-\.]{20,})["']""", re.I
                ),
                "Hardcoded token",
                RiskLevel.HIGH,
            ),
            (re.compile(r"AKIA[0-9A-Z]{16}"), "AWS Access Key ID", RiskLevel.CRITICAL),
            (
                re.compile(r"ghp_[A-Za-z0-9]{36}"),
                "GitHub Personal Access Token",
                RiskLevel.CRITICAL,
            ),
            (re.compile(r"sk-[A-Za-z0-9]{48}"), "OpenAI API Key", RiskLevel.CRITICAL),
            (
                re.compile(r"""private[_-]?key\s*[=:]\s*["']([^"']{20,})["']""", re.I),
                "Hardcoded private key",
                RiskLevel.CRITICAL,
            ),
        ]

        MAX_FILES = 300
        MAX_DEPTH = 4
        SKIP_DIRS = {
            "node_modules",
            "__pycache__",
            "venv",
            ".venv",
            "dist",
            "build",
            ".git",
            ".svn",
            "AppData",
            "site-packages",
            "lib",
            "Lib",
            "Windows",
            "Program Files",
            "Program Files (x86)",
        }

        def iter_files(base, max_depth):
            """Yield files up to max_depth, skipping known large dirs."""
            for entry in base.iterdir():
                try:
                    if entry.is_symlink():
                        continue
                    if entry.is_dir():
                        if entry.name.startswith(".") or entry.name in SKIP_DIRS:
                            continue
                        if max_depth > 1:
                            yield from iter_files(entry, max_depth - 1)
                    elif entry.is_file():
                        yield entry
                except (PermissionError, OSError):
                    continue

        scanned = 0
        file_count = 0
        for fpath in iter_files(self.path, MAX_DEPTH):
            if file_count >= MAX_FILES:
                break
            file_count += 1
            if not fpath.is_file():
                continue
            if fpath.suffix.lower() not in EXTENSIONS:
                continue
            # Skip hidden dirs, node_modules, venvs, .git
            parts = fpath.parts
            if any(
                p.startswith(".")
                or p
                in ("node_modules", "__pycache__", "venv", ".venv", "dist", "build")
                for p in parts
            ):
                continue
            if fpath.stat().st_size > 500_000:  # skip files > 500KB
                continue

            try:
                content = fpath.read_text(errors="ignore")
                scanned += 1
            except (PermissionError, OSError):
                continue

            hits: list[tuple[str, RiskLevel, int]] = []
            for pattern, label, risk in SECRET_PATTERNS:
                for match in pattern.finditer(content):
                    line_no = content[: match.start()].count("\n") + 1
                    hits.append((label, risk, line_no))

            if not hits:
                continue

            worst_risk = max(hits, key=lambda h: list(RiskLevel).index(h[1]))[1]
            finding_desc = "\n".join(
                f"  Line {ln}: {label}" for label, _, ln in hits[:8]
            )

            _sid = _stable_id(str(fpath))
            nhis.append(
                NonHumanIdentity(
                    id=f"local-file-{_sid}",
                    name=f"file: {fpath.relative_to(self.path)}",
                    type=NHIType.API_KEY,
                    provider=CloudProvider.LOCAL,
                    source_file=str(fpath),
                    findings=[
                        Finding(
                            finding_id=f"local-file-secret-{_sid}",
                            title=f"Hardcoded secrets in {fpath.name} ({len(hits)} hit{'s' if len(hits)>1 else ''})",
                            description=f"Potential secrets found in {fpath}:\n{finding_desc}",
                            risk_level=worst_risk,
                            mitre_techniques=["T1552.001"],
                            remediation=(
                                "Move secrets to environment variables or a secrets manager. "
                                "Rotate any credentials that may have been committed. "
                                "Add this file pattern to .gitignore if it contains secrets."
                            ),
                        )
                    ],
                    mitre_techniques=["T1552.001"],
                )
            )

        return nhis
