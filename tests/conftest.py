"""
Shared pytest fixtures.

The CLI now hard-gates every command behind a license check. To keep the suite
hermetic we point ``AGENTSENTRY_HOME`` at an isolated temp dir (so we never touch
the developer's real ~/.agentsentry) and drop in a Pro license there. Individual
tests can override the license via the ``license_home`` fixture.
"""

from __future__ import annotations

import json

import pytest


def _write_license(home, tier: str) -> None:
    home.mkdir(parents=True, exist_ok=True)
    (home / "license.json").write_text(
        json.dumps(
            {
                "code": f"AS-{tier.upper()}-TEST-0000-0000-0000",
                "tier": tier,
                "plan": tier,
                "source": "online",
            }
        )
    )


@pytest.fixture
def license_home(tmp_path, monkeypatch):
    """
    Isolated license directory. Returns a helper that writes a license of the
    given tier ('free' or 'pro') and returns the home path.
    """
    home = tmp_path / ".agentsentry"
    monkeypatch.setenv("AGENTSENTRY_HOME", str(home))

    def _set(tier: str = "pro"):
        _write_license(home, tier)
        return home

    return _set


@pytest.fixture(autouse=True)
def _default_pro_license(tmp_path_factory, monkeypatch):
    """
    Autouse: every test runs as an activated Pro device by default so the gate
    doesn't block unrelated command tests. Tests that exercise the gate itself
    use the ``license_home`` fixture to set their own tier (and override this).
    """
    home = tmp_path_factory.mktemp("agentsentry_home")
    monkeypatch.setenv("AGENTSENTRY_HOME", str(home))
    _write_license(home, "pro")
    yield
