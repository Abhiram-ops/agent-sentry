"""
Tests for the Automation add-on: schedule config persistence, scan diffing,
and the `agentsentry schedule add` / `run-now` CLI commands.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from click.testing import CliRunner

from agentsentry.automation import config as automation_config
from agentsentry.automation.diff import ROTATION_DUE_DAYS, diff_scans
from agentsentry.cli import main
from agentsentry.core.models import (
    CloudProvider,
    NHIType,
    NonHumanIdentity,
    RiskLevel,
    ScanResult,
)


def _run(args, input=None):
    return CliRunner().invoke(main, args, input=input)


def _nhi(nhi_id: str, **overrides) -> NonHumanIdentity:
    defaults: dict = dict(
        id=nhi_id,
        name=nhi_id,
        type=NHIType.IAM_ROLE,
        provider=CloudProvider.AWS,
        risk_score=10.0,
        risk_level=RiskLevel.LOW,
    )
    defaults.update(overrides)
    return NonHumanIdentity(**defaults)


def _result(nhis: list[NonHumanIdentity]) -> ScanResult:
    return ScanResult(scan_id="test", provider=CloudProvider.AWS, nhis=nhis)


class TestScheduleConfig:
    def test_round_trip(self, tmp_path, monkeypatch):
        monkeypatch.setenv("AGENTSENTRY_HOME", str(tmp_path))

        cfg = automation_config.load_config()
        assert cfg == {"schedules": {}}

        schedule_id = automation_config.add_schedule(
            cfg,
            target="mock",
            interval="daily",
            output_dir=str(tmp_path / "out"),
            notify_email=False,
        )
        automation_config.save_config(cfg)
        assert (tmp_path / "schedules.json").exists()

        reloaded = automation_config.load_config()
        schedule = automation_config.get_schedule(reloaded, schedule_id)
        assert schedule is not None
        assert schedule["target"] == "mock"
        assert schedule["interval"] == "daily"
        assert schedule["last_run_at"] is None

        automation_config.touch_schedule(reloaded, schedule_id)
        assert reloaded["schedules"][schedule_id]["last_run_at"] is not None

        assert automation_config.remove_schedule(reloaded, schedule_id)
        assert automation_config.get_schedule(reloaded, schedule_id) is None

    def test_api_key_round_trip(self, tmp_path, monkeypatch):
        monkeypatch.setenv("AGENTSENTRY_HOME", str(tmp_path))

        cfg = automation_config.load_config()
        assert automation_config.get_api_key(cfg) is None

        automation_config.set_api_key(cfg, "as_live_test123")
        automation_config.save_config(cfg)

        reloaded = automation_config.load_config()
        assert automation_config.get_api_key(reloaded) == "as_live_test123"


class TestDiffScans:
    def test_first_run_all_nhis_are_new_with_suggestions(self):
        curr = _result([_nhi("a"), _nhi("b")])
        diff = diff_scans(None, curr)

        assert {n["id"] for n in diff.new_nhis} == {"a", "b"}
        for n in diff.new_nhis:
            assert n["suggestion"]

    def test_no_new_nhis_when_ids_unchanged(self):
        prev = _result([_nhi("a"), _nhi("b")])
        curr = _result([_nhi("a"), _nhi("b")])

        diff = diff_scans(prev, curr)
        assert diff.new_nhis == []
        assert diff.is_clean

    def test_newly_zombie_only_reported_once(self):
        now = datetime.now(timezone.utc)
        prev = _result([_nhi("z", last_used=now - timedelta(days=10))])
        curr = _result([_nhi("z", last_used=now - timedelta(days=200))])

        diff = diff_scans(prev, curr)
        assert [n["id"] for n in diff.newly_zombie] == ["z"]

        diff_again = diff_scans(curr, curr)
        assert diff_again.newly_zombie == []

    def test_rotation_due_for_never_and_stale_rotated(self):
        now = datetime.now(timezone.utc)
        curr = _result(
            [
                _nhi("never-rotated", last_rotated=None),
                _nhi("stale-rotation", last_rotated=now - timedelta(days=ROTATION_DUE_DAYS + 1)),
                _nhi("fresh-rotation", last_rotated=now - timedelta(days=1)),
            ]
        )

        diff = diff_scans(None, curr)
        assert {n["id"] for n in diff.rotation_due} == {"never-rotated", "stale-rotation"}


class TestScheduleCli:
    def test_add_and_run_now_diffs_against_previous_scan(self, tmp_path, monkeypatch):
        monkeypatch.setenv("AGENTSENTRY_HOME", str(tmp_path / "home"))
        monkeypatch.setenv("AGENTSENTRY_SKIP_LICENSE", "1")
        monkeypatch.setattr("agentsentry.automation.scheduler_os.register", lambda *a, **k: None)
        monkeypatch.setattr("agentsentry.automation.scheduler_os.unregister", lambda *a, **k: None)

        output_dir = tmp_path / "reports"

        add_result = _run(
            [
                "schedule", "add",
                "--target", "mock",
                "--interval", "daily",
                "--output-dir", str(output_dir),
            ],
            input="y\n",
        )
        assert add_result.exit_code == 0, add_result.output

        cfg = json.loads((tmp_path / "home" / "schedules.json").read_text())
        schedule_id = next(iter(cfg["schedules"]))

        first = _run(["schedule", "run-now", schedule_id])
        assert first.exit_code == 0, first.output

        snapshot = output_dir / ".agentsentry_snapshot_mock.json"
        assert snapshot.exists()

        summary_files = sorted(output_dir.glob("agentsentry_mock_*_summary.json"))
        assert summary_files
        first_summary = json.loads(summary_files[-1].read_text())
        assert first_summary["new_nhis"]  # everything is new on the first run

        second = _run(["schedule", "run-now", schedule_id])
        assert second.exit_code == 0, second.output

        summary_files = sorted(output_dir.glob("agentsentry_mock_*_summary.json"))
        last_summary = json.loads(summary_files[-1].read_text())
        assert last_summary["new_nhis"] == []
        assert last_summary["newly_zombie"] == []

        cfg_after = json.loads((tmp_path / "home" / "schedules.json").read_text())
        assert cfg_after["schedules"][schedule_id]["last_run_at"] is not None
