"""
Tests for the local scan-history datastore (agentsentry/core/store.py) and the
save → history → diff flow through the CLI.

AGENTSENTRY_HOME is pointed at a temp dir by the autouse conftest fixture, so the
SQLite database is isolated per test and never touches a real ~/.agentsentry.
"""

from __future__ import annotations

from datetime import datetime, timezone

from click.testing import CliRunner

from agentsentry.cli import main
from agentsentry.core import store
from agentsentry.core.models import (
    CloudProvider,
    NHIType,
    NonHumanIdentity,
    RiskLevel,
    ScanResult,
)


def _result(scan_id: str, nhis: list[NonHumanIdentity]) -> ScanResult:
    return ScanResult(
        scan_id=scan_id,
        provider=CloudProvider.AWS,
        account_id="123456789012",
        timestamp=datetime.now(timezone.utc),
        nhis=nhis,
    )


def _nhi(id_: str, level: RiskLevel = RiskLevel.LOW) -> NonHumanIdentity:
    return NonHumanIdentity(
        id=id_, name=id_, type=NHIType.IAM_ROLE, provider=CloudProvider.AWS,
        risk_level=level,
    )


class TestStore:
    def test_save_and_load_roundtrip(self):
        result = _result("s1", [_nhi("r1", RiskLevel.CRITICAL), _nhi("r2")])
        rid = store.save_scan(result, "aws")
        assert rid > 0

        loaded = store.load_result(rid)
        assert loaded is not None
        assert {n.id for n in loaded.nhis} == {"r1", "r2"}

    def test_list_scans_orders_newest_first_and_filters_target(self):
        store.save_scan(_result("a1", [_nhi("r1")]), "aws")
        store.save_scan(_result("g1", [_nhi("g")]), "github")
        store.save_scan(_result("a2", [_nhi("r1"), _nhi("r2")]), "aws")

        aws = store.list_scans(target="aws")
        assert [r.scan_id for r in aws] == ["a2", "a1"]  # newest first
        assert all(r.target == "aws" for r in aws)

        everything = store.list_scans()
        assert len(everything) == 3

    def test_metadata_counts_persisted(self):
        result = _result("s1", [_nhi("r1", RiskLevel.CRITICAL), _nhi("r2", RiskLevel.HIGH)])
        store.save_scan(result, "aws")
        rec = store.list_scans(target="aws")[0]
        assert rec.total_nhis == 2
        assert rec.critical_count == 1
        assert rec.high_count == 1

    def test_latest_two(self):
        prev, latest = store.latest_two("aws")
        assert prev is None and latest is None  # nothing stored yet

        store.save_scan(_result("a1", [_nhi("r1")]), "aws")
        prev, latest = store.latest_two("aws")
        assert latest is not None and latest.scan_id == "a1"
        assert prev is None  # only one stored

        store.save_scan(_result("a2", [_nhi("r1"), _nhi("r2")]), "aws")
        prev, latest = store.latest_two("aws")
        assert latest.scan_id == "a2"
        assert prev.scan_id == "a1"

    def test_load_missing_returns_none(self):
        assert store.load_result(9999) is None


class TestHistoryAndDiffCLI:
    def test_scan_save_then_history(self):
        runner = CliRunner()
        r = runner.invoke(main, ["scan", "mock", "--save"])
        assert r.exit_code == 0, r.output

        h = runner.invoke(main, ["history"])
        assert h.exit_code == 0
        assert "mock" in h.output

    def test_history_empty_message(self):
        runner = CliRunner()
        r = runner.invoke(main, ["history", "aws"])
        assert r.exit_code == 0
        assert "no saved scans" in r.output

    def test_diff_first_run_is_baseline(self):
        runner = CliRunner()
        r = runner.invoke(main, ["diff", "mock"])
        assert r.exit_code == 0
        assert "baseline" in r.output

    def test_diff_second_run_reports_clean(self):
        runner = CliRunner()
        runner.invoke(main, ["diff", "mock"])          # baseline
        r = runner.invoke(main, ["diff", "mock"])      # same mock data again
        assert r.exit_code == 0
        # mock scanner is deterministic → no new identities the second time
        assert "no changes" in r.output
