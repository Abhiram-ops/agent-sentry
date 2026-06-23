"""
Tests for the CLI license gate (agentsentry.license + the require_license
decorator wired into the CLI commands).

These rely on the ``license_home`` fixture (conftest.py) to set the active tier,
which overrides the autouse Pro license for the duration of the test.
"""

from __future__ import annotations

import os

from click.testing import CliRunner

from agentsentry.cli import main


def _run(args, **kwargs):
    return CliRunner().invoke(main, args, **kwargs)


class TestUnregistered:
    def test_no_license_blocks_scan(self, tmp_path, monkeypatch):
        # Point at an empty home with no license.json at all.
        monkeypatch.setenv("AGENTSENTRY_HOME", str(tmp_path / "empty"))
        monkeypatch.delenv("AGENTSENTRY_SKIP_LICENSE", raising=False)
        result = _run(["scan", "local", "--path", str(tmp_path), "--force"])
        assert result.exit_code == 1
        assert "Unregistered device" in result.output

    def test_no_license_blocks_blast(self, tmp_path, monkeypatch):
        monkeypatch.setenv("AGENTSENTRY_HOME", str(tmp_path / "empty"))
        monkeypatch.delenv("AGENTSENTRY_SKIP_LICENSE", raising=False)
        result = _run(["blast", "anything"])
        assert result.exit_code == 1
        assert "Unregistered device" in result.output


class TestFreeTier:
    def test_free_allows_scan_local(self, license_home, tmp_path, monkeypatch):
        license_home("free")
        monkeypatch.delenv("AGENTSENTRY_SKIP_LICENSE", raising=False)
        result = _run(["scan", "local", "--path", str(tmp_path), "--force"])
        assert result.exit_code == 0, result.output

    def test_free_allows_scan_mock(self, license_home, monkeypatch):
        license_home("free")
        monkeypatch.delenv("AGENTSENTRY_SKIP_LICENSE", raising=False)
        result = _run(["scan", "mock"])
        assert result.exit_code == 0, result.output

    def test_free_blocks_scan_aws(self, license_home, monkeypatch):
        license_home("free")
        monkeypatch.delenv("AGENTSENTRY_SKIP_LICENSE", raising=False)
        result = _run(["scan", "aws", "--force"])
        assert result.exit_code == 1
        assert "Access Denied" in result.output

    def test_free_blocks_scan_all(self, license_home, monkeypatch):
        license_home("free")
        monkeypatch.delenv("AGENTSENTRY_SKIP_LICENSE", raising=False)
        result = _run(["scan", "all"])
        assert result.exit_code == 1
        assert "Access Denied" in result.output

    def test_free_blocks_blast(self, license_home, monkeypatch):
        license_home("free")
        monkeypatch.delenv("AGENTSENTRY_SKIP_LICENSE", raising=False)
        result = _run(["blast", "anything"])
        assert result.exit_code == 1
        assert "Access Denied" in result.output


class TestProTier:
    def test_pro_allows_scan_mock(self, license_home, monkeypatch):
        license_home("pro")
        monkeypatch.delenv("AGENTSENTRY_SKIP_LICENSE", raising=False)
        result = _run(["scan", "mock"])
        assert result.exit_code == 0, result.output


class TestActivateExempt:
    def test_activate_invalid_key_not_gated(self, tmp_path, monkeypatch):
        # activate must work even on an unregistered device (it's how you register).
        monkeypatch.setenv("AGENTSENTRY_HOME", str(tmp_path / "empty"))
        monkeypatch.delenv("AGENTSENTRY_SKIP_LICENSE", raising=False)
        # Force offline-only by pointing the API at an unroutable host.
        monkeypatch.setenv("AGENTSENTRY_API", "http://127.0.0.1:1")
        result = _run(["activate", "NOT-A-REAL-KEY", "--accept-terms"])
        # Reaches activation logic (invalid key), not the unregistered gate.
        assert "Unregistered device" not in result.output
        assert result.exit_code == 1


class TestActivateConsent:
    def test_consent_declined_aborts_activation(self, tmp_path, monkeypatch):
        monkeypatch.setenv("AGENTSENTRY_HOME", str(tmp_path / "empty"))
        monkeypatch.delenv("AGENTSENTRY_SKIP_LICENSE", raising=False)
        monkeypatch.setenv("AGENTSENTRY_API", "http://127.0.0.1:1")
        # Answer "n" to the consent prompt.
        result = _run(["activate", "AS-FREE-0000-0000"], input="n\n")
        assert result.exit_code == 1
        assert "Activation cancelled" in result.output

    def test_consent_notice_is_shown(self, tmp_path, monkeypatch):
        monkeypatch.setenv("AGENTSENTRY_HOME", str(tmp_path / "empty"))
        monkeypatch.delenv("AGENTSENTRY_SKIP_LICENSE", raising=False)
        monkeypatch.setenv("AGENTSENTRY_API", "http://127.0.0.1:1")
        result = _run(["activate", "NOT-A-REAL-KEY", "--accept-terms"])
        assert "Terms of Service" in result.output
        assert "never your scan results" in result.output

    def test_accepted_consent_recorded_in_license_file(self, tmp_path, monkeypatch):
        import json

        home = tmp_path / "home"
        monkeypatch.setenv("AGENTSENTRY_HOME", str(home))
        monkeypatch.delenv("AGENTSENTRY_SKIP_LICENSE", raising=False)
        monkeypatch.setenv("AGENTSENTRY_API", "http://127.0.0.1:1")
        # A valid offline HMAC free key so activation succeeds offline.
        from agentsentry.license import generate_free_key, POLICY_VERSION

        key = generate_free_key("consent@example.com")
        result = _run(["activate", key, "--accept-terms"])
        assert result.exit_code == 0, result.output

        data = json.loads((home / "license.json").read_text())
        assert data["consent"]["version"] == POLICY_VERSION
        assert data["consent"]["document"] == "terms_and_privacy"
        assert data["consent"]["accepted_at"]


class TestSkipBypass:
    def test_skip_env_bypasses_gate(self, tmp_path, monkeypatch):
        monkeypatch.setenv("AGENTSENTRY_HOME", str(tmp_path / "empty"))
        monkeypatch.setenv("AGENTSENTRY_SKIP_LICENSE", "1")
        result = _run(["scan", "local", "--path", str(tmp_path), "--force"])
        assert result.exit_code == 0, result.output
        assert os.environ["AGENTSENTRY_SKIP_LICENSE"] == "1"
