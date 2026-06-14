"""
Unit tests for LocalProvider (agentsentry/providers/local.py).

Covers the cross-platform coverage fixes and score-differentiation signals:
  - Docker detection via `docker ps` regardless of socket path
  - Git credential-helper detection (osxkeychain / manager-core / wincred)
    and the XDG ~/.config/git/credentials path
  - New CRED_FILES entries (Azure, Windows gcloud, GitHub CLI, Terraform)
  - macOS Keychain / Windows Credential Manager scans (mocked subprocess,
    platform-gated)
  - SSH "overly permissive" finding suppressed on win32
  - File-mtime-derived created_date/last_rotated
  - AWS-access-key env var -> attached_policies=["iam:*"]
"""

from __future__ import annotations

from datetime import datetime, timezone

from agentsentry.core.models import NHIType, RiskLevel
from agentsentry.providers import local as local_module
from agentsentry.providers.local import LocalProvider


class _FakeCompletedProcess:
    def __init__(self, stdout: str = "", returncode: int = 0):
        self.stdout = stdout
        self.returncode = returncode


def _home_env(monkeypatch, home_path):
    """Point both POSIX and Windows expanduser/home resolution at *home_path*."""
    monkeypatch.setenv("HOME", str(home_path))
    monkeypatch.setenv("USERPROFILE", str(home_path))


# ═══════════════════════════════════════════════════════════════════
# Docker
# ═══════════════════════════════════════════════════════════════════


class TestDockerScan:
    def test_detected_when_docker_ps_succeeds(self, tmp_path, monkeypatch):
        monkeypatch.setattr(
            local_module.subprocess,
            "run",
            lambda *a, **k: _FakeCompletedProcess(stdout="web\napi\n", returncode=0),
        )
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_docker()
        assert len(nhis) == 1
        assert nhis[0].id == "local-docker-socket"
        assert nhis[0].type == NHIType.SERVICE_ACCOUNT
        assert nhis[0].findings[0].risk_level == RiskLevel.CRITICAL

    def test_detected_even_with_zero_containers(self, tmp_path, monkeypatch):
        monkeypatch.setattr(
            local_module.subprocess,
            "run",
            lambda *a, **k: _FakeCompletedProcess(stdout="", returncode=0),
        )
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_docker()
        assert len(nhis) == 1

    def test_not_detected_when_daemon_unreachable(self, tmp_path, monkeypatch):
        monkeypatch.setattr(
            local_module.subprocess,
            "run",
            lambda *a, **k: _FakeCompletedProcess(stdout="", returncode=1),
        )
        provider = LocalProvider(path=str(tmp_path))
        assert provider._scan_docker() == []

    def test_not_detected_when_docker_not_installed(self, tmp_path, monkeypatch):
        def _raise(*a, **k):
            raise FileNotFoundError("docker not found")

        monkeypatch.setattr(local_module.subprocess, "run", _raise)
        provider = LocalProvider(path=str(tmp_path))
        assert provider._scan_docker() == []


# ═══════════════════════════════════════════════════════════════════
# Git credentials
# ═══════════════════════════════════════════════════════════════════


class TestGitCredentials:
    def test_git_credentials_file_detected(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)
        (tmp_path / ".git-credentials").write_text("https://user:token@github.com\n")
        # No keychain/credential-manager helper configured.
        monkeypatch.setattr(
            local_module.subprocess,
            "run",
            lambda *a, **k: _FakeCompletedProcess(stdout="", returncode=0),
        )
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_git_credentials()
        assert any(n.source_file == str(tmp_path / ".git-credentials") for n in nhis)

    def test_xdg_git_credentials_file_detected(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)
        xdg = tmp_path / ".config" / "git"
        xdg.mkdir(parents=True)
        (xdg / "credentials").write_text("https://user:token@gitlab.com\n")
        monkeypatch.setattr(
            local_module.subprocess,
            "run",
            lambda *a, **k: _FakeCompletedProcess(stdout="", returncode=0),
        )
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_git_credentials()
        assert any(n.source_file == str(xdg / "credentials") for n in nhis)

    def test_no_findings_when_nothing_present(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)
        monkeypatch.setattr(
            local_module.subprocess,
            "run",
            lambda *a, **k: _FakeCompletedProcess(stdout="", returncode=0),
        )
        provider = LocalProvider(path=str(tmp_path))
        assert provider._scan_git_credentials() == []

    def test_credential_helper_osxkeychain_emits_nhi(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)
        monkeypatch.setattr(
            local_module.subprocess,
            "run",
            lambda *a, **k: _FakeCompletedProcess(stdout="osxkeychain\n", returncode=0),
        )
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_git_credentials()
        assert any(n.id == "local-git-credential-helper-osxkeychain" for n in nhis)
        nhi = next(n for n in nhis if n.id == "local-git-credential-helper-osxkeychain")
        assert nhi.findings[0].risk_level == RiskLevel.MEDIUM

    def test_credential_helper_manager_core_emits_nhi(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)
        monkeypatch.setattr(
            local_module.subprocess,
            "run",
            lambda *a, **k: _FakeCompletedProcess(
                stdout="manager-core\n", returncode=0
            ),
        )
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_git_credentials()
        assert any(n.id == "local-git-credential-helper-manager-core" for n in nhis)

    def test_credential_helper_wincred_emits_nhi(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)
        monkeypatch.setattr(
            local_module.subprocess,
            "run",
            lambda *a, **k: _FakeCompletedProcess(stdout="wincred\n", returncode=0),
        )
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_git_credentials()
        assert any(n.id == "local-git-credential-helper-wincred" for n in nhis)

    def test_unrecognized_helper_not_flagged(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)
        monkeypatch.setattr(
            local_module.subprocess,
            "run",
            lambda *a, **k: _FakeCompletedProcess(stdout="store\n", returncode=0),
        )
        provider = LocalProvider(path=str(tmp_path))
        assert provider._scan_git_credentials() == []

    def test_git_not_installed_does_not_crash(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)

        def _raise(*a, **k):
            raise FileNotFoundError("git not found")

        monkeypatch.setattr(local_module.subprocess, "run", _raise)
        provider = LocalProvider(path=str(tmp_path))
        assert provider._scan_git_credentials() == []


# ═══════════════════════════════════════════════════════════════════
# New CRED_FILES entries
# ═══════════════════════════════════════════════════════════════════


class TestExpandedCredFiles:
    def test_azure_cli_tokens_detected(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)
        azure_dir = tmp_path / ".azure"
        azure_dir.mkdir()
        (azure_dir / "accessTokens.json").write_text("{}")
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_cred_files()
        assert any(n.source_file == str(azure_dir / "accessTokens.json") for n in nhis)

    def test_windows_gcloud_credentials_detected(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)
        gcloud_dir = tmp_path / "AppData" / "Roaming" / "gcloud"
        gcloud_dir.mkdir(parents=True)
        (gcloud_dir / "credentials.db").write_text("")
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_cred_files()
        assert any(n.source_file == str(gcloud_dir / "credentials.db") for n in nhis)

    def test_github_cli_hosts_detected(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)
        gh_dir = tmp_path / ".config" / "gh"
        gh_dir.mkdir(parents=True)
        (gh_dir / "hosts.yml").write_text("github.com:\n  oauth_token: abc\n")
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_cred_files()
        assert any(n.source_file == str(gh_dir / "hosts.yml") for n in nhis)

    def test_windows_github_cli_hosts_detected(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)
        gh_dir = tmp_path / "AppData" / "Roaming" / "GitHub CLI"
        gh_dir.mkdir(parents=True)
        (gh_dir / "hosts.yml").write_text("github.com:\n  oauth_token: abc\n")
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_cred_files()
        assert any(n.source_file == str(gh_dir / "hosts.yml") for n in nhis)

    def test_terraform_credentials_detected(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)
        tf_dir = tmp_path / ".terraform.d"
        tf_dir.mkdir()
        (tf_dir / "credentials.tfrc.json").write_text("{}")
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_cred_files()
        assert any(n.source_file == str(tf_dir / "credentials.tfrc.json") for n in nhis)

    def test_credfile_ids_unique_across_same_filename(self, tmp_path, monkeypatch):
        """~/.config/gcloud/credentials.db and ~/AppData/Roaming/gcloud/credentials.db
        share a filename — ids must not collide (e.g. under WSL)."""
        _home_env(monkeypatch, tmp_path)
        posix_gcloud = tmp_path / ".config" / "gcloud"
        posix_gcloud.mkdir(parents=True)
        (posix_gcloud / "credentials.db").write_text("")

        win_gcloud = tmp_path / "AppData" / "Roaming" / "gcloud"
        win_gcloud.mkdir(parents=True)
        (win_gcloud / "credentials.db").write_text("")

        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_cred_files()
        ids = [n.id for n in nhis]
        assert len(ids) == len(set(ids))


# ═══════════════════════════════════════════════════════════════════
# macOS Keychain
# ═══════════════════════════════════════════════════════════════════


KEYCHAIN_DUMP = """\
keychain: "/Users/test/Library/Keychains/login.keychain-db"
version: 512
class: 0x00000010
attributes:
    0x00000007 <blob>="Docker Credentials"
    "svce"<blob>="Docker Credentials"
class: 0x00000010
attributes:
    "svce"<blob>="GitHub - api.github.com"
class: 0x00000010
attributes:
    "svce"<blob>="Safari Saved Passwords"
"""


class TestMacOSKeychain:
    def test_skipped_on_non_darwin(self, tmp_path, monkeypatch):
        monkeypatch.setattr(local_module.sys, "platform", "win32")
        provider = LocalProvider(path=str(tmp_path))
        assert provider._scan_macos_keychain() == []

    def test_matched_services_emitted_on_darwin(self, tmp_path, monkeypatch):
        monkeypatch.setattr(local_module.sys, "platform", "darwin")
        monkeypatch.setattr(
            local_module.subprocess,
            "run",
            lambda *a, **k: _FakeCompletedProcess(stdout=KEYCHAIN_DUMP, returncode=0),
        )
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_macos_keychain()
        names = {n.name for n in nhis}
        assert any("Docker Credentials" in n for n in names)
        assert any("GitHub - api.github.com" in n for n in names)
        # Non-dev-tool entries are filtered out
        assert not any("Safari" in n for n in names)
        for n in nhis:
            assert n.type == NHIType.API_KEY
            assert n.findings[0].risk_level == RiskLevel.MEDIUM

    def test_security_command_failure_returns_empty(self, tmp_path, monkeypatch):
        monkeypatch.setattr(local_module.sys, "platform", "darwin")
        monkeypatch.setattr(
            local_module.subprocess,
            "run",
            lambda *a, **k: _FakeCompletedProcess(stdout="", returncode=1),
        )
        provider = LocalProvider(path=str(tmp_path))
        assert provider._scan_macos_keychain() == []


# ═══════════════════════════════════════════════════════════════════
# Windows Credential Manager
# ═══════════════════════════════════════════════════════════════════


CMDKEY_LIST = """\
Currently stored credentials:

    Target: LegacyGeneric:target=git:https://github.com
    Type: Generic
    User: someone@example.com

    Target: Domain:batch=TERMSRV/somehost
    Type: Domain Password
    User: someuser

"""


class TestWindowsCredentialManager:
    def test_skipped_on_non_windows(self, tmp_path, monkeypatch):
        monkeypatch.setattr(local_module.sys, "platform", "darwin")
        provider = LocalProvider(path=str(tmp_path))
        assert provider._scan_windows_credential_manager() == []

    def test_matched_targets_emitted_on_windows(self, tmp_path, monkeypatch):
        monkeypatch.setattr(local_module.sys, "platform", "win32")
        monkeypatch.setattr(
            local_module.subprocess,
            "run",
            lambda *a, **k: _FakeCompletedProcess(stdout=CMDKEY_LIST, returncode=0),
        )
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_windows_credential_manager()
        names = {n.name for n in nhis}
        assert any("github.com" in n for n in names)
        # The TERMSRV domain-password entry doesn't match the dev-tool pattern
        assert not any("TERMSRV" in n for n in names)
        for n in nhis:
            assert n.type == NHIType.API_KEY
            assert n.findings[0].risk_level == RiskLevel.MEDIUM

    def test_cmdkey_failure_returns_empty(self, tmp_path, monkeypatch):
        monkeypatch.setattr(local_module.sys, "platform", "win32")
        monkeypatch.setattr(
            local_module.subprocess,
            "run",
            lambda *a, **k: _FakeCompletedProcess(stdout="", returncode=1),
        )
        provider = LocalProvider(path=str(tmp_path))
        assert provider._scan_windows_credential_manager() == []


# ═══════════════════════════════════════════════════════════════════
# SSH key permission finding — POSIX only
# ═══════════════════════════════════════════════════════════════════

UNENCRYPTED_KEY = (
    b"-----BEGIN OPENSSH PRIVATE KEY-----\n"
    b"ZmFrZWtleWRhdGFmYWtla2V5ZGF0YQ==\n"
    b"-----END OPENSSH PRIVATE KEY-----\n"
)


class TestSSHPermissionFinding:
    def _make_key(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)
        ssh_dir = tmp_path / ".ssh"
        ssh_dir.mkdir()
        key = ssh_dir / "id_ed25519"
        key.write_bytes(UNENCRYPTED_KEY)
        return key

    def test_permission_finding_present_on_posix(self, tmp_path, monkeypatch):
        self._make_key(tmp_path, monkeypatch)
        monkeypatch.setattr(local_module.sys, "platform", "linux")
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_ssh_keys()
        assert len(nhis) == 1
        finding_ids = [f.finding_id for f in nhis[0].findings]
        assert any(fid.startswith("local-ssh-perms-") for fid in finding_ids)

    def test_permission_finding_suppressed_on_windows(self, tmp_path, monkeypatch):
        self._make_key(tmp_path, monkeypatch)
        monkeypatch.setattr(local_module.sys, "platform", "win32")
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_ssh_keys()
        assert len(nhis) == 1
        finding_ids = [f.finding_id for f in nhis[0].findings]
        assert not any(fid.startswith("local-ssh-perms-") for fid in finding_ids)
        # Unencrypted finding should still be present regardless of platform
        assert any(fid.startswith("local-ssh-unencrypted-") for fid in finding_ids)


# ═══════════════════════════════════════════════════════════════════
# File-mtime-derived dates
# ═══════════════════════════════════════════════════════════════════


class TestMtimeDates:
    def test_cred_file_dates_from_mtime(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)
        aws_dir = tmp_path / ".aws"
        aws_dir.mkdir()
        cred_file = aws_dir / "credentials"
        cred_file.write_text("[default]\naws_access_key_id=AKIAEXAMPLE\n")

        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_cred_files()
        nhi = next(n for n in nhis if n.source_file == str(cred_file))
        expected = datetime.fromtimestamp(cred_file.stat().st_mtime, tz=timezone.utc)
        assert nhi.created_date == expected
        assert nhi.last_rotated == expected

    def test_ssh_key_dates_from_mtime(self, tmp_path, monkeypatch):
        _home_env(monkeypatch, tmp_path)
        ssh_dir = tmp_path / ".ssh"
        ssh_dir.mkdir()
        key = ssh_dir / "id_rsa"
        key.write_bytes(UNENCRYPTED_KEY)

        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_ssh_keys()
        nhi = nhis[0]
        expected = datetime.fromtimestamp(key.stat().st_mtime, tz=timezone.utc)
        assert nhi.created_date == expected
        assert nhi.last_rotated == expected

    def test_dotenv_file_dates_from_mtime(self, tmp_path, monkeypatch):
        env_file = tmp_path / ".env"
        env_file.write_text("API_KEY=supersecretvalue123\n")

        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_dot_env_files()
        nhi = nhis[0]
        expected = datetime.fromtimestamp(env_file.stat().st_mtime, tz=timezone.utc)
        assert nhi.created_date == expected
        assert nhi.last_rotated == expected


# ═══════════════════════════════════════════════════════════════════
# AWS key in env var -> attached_policies=["iam:*"]
# ═══════════════════════════════════════════════════════════════════


class TestEnvVarAwsKeyPrivilege:
    def test_aws_access_key_gets_iam_star_policy(self, tmp_path, monkeypatch):
        monkeypatch.setattr(
            local_module.os,
            "environ",
            {"AWS_ACCESS_KEY_ID": "AKIAABCDEFGHIJKLMNOP"},
        )
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_env_vars()
        nhi = next(n for n in nhis if n.id == "local-env-aws_access_key_id")
        assert nhi.attached_policies == ["iam:*"]

    def test_generic_secret_env_var_has_no_extra_policy(self, tmp_path, monkeypatch):
        monkeypatch.setattr(
            local_module.os,
            "environ",
            {"MY_API_TOKEN": "supersecretvalue123456"},
        )
        provider = LocalProvider(path=str(tmp_path))
        nhis = provider._scan_env_vars()
        nhi = next(n for n in nhis if n.id == "local-env-my_api_token")
        assert nhi.attached_policies == []
