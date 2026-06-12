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


def _run(args):
    return CliRunner().invoke(main, args)


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
        result = _run(["activate", "NOT-A-REAL-KEY"])
        # Reaches activation logic (invalid key), not the unregistered gate.
        assert "Unregistered device" not in result.output
        assert result.exit_code == 1


class TestSkipBypass:
    def test_skip_env_bypasses_gate(self, tmp_path, monkeypatch):
        monkeypatch.setenv("AGENTSENTRY_HOME", str(tmp_path / "empty"))
        monkeypatch.setenv("AGENTSENTRY_SKIP_LICENSE", "1")
        result = _run(["scan", "local", "--path", str(tmp_path), "--force"])
        assert result.exit_code == 0, result.output
        assert os.environ["AGENTSENTRY_SKIP_LICENSE"] == "1"
