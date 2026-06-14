"""
Integration tests for `agentsentry scan local` via the CLI entrypoint.

These exercise the full pipeline — provider → scanner → scorer → graph →
console/JSON output — against an isolated temp directory so they stay fast
and don't depend on the developer's real environment.
"""

from __future__ import annotations

import json

from click.testing import CliRunner

from agentsentry.cli import main


def _run(args):
    runner = CliRunner()
    return runner.invoke(main, args)


class TestScanLocal:
    def test_scan_local_runs_clean(self, tmp_path):
        result = _run(["scan", "local", "--path", str(tmp_path), "--force"])
        assert result.exit_code == 0, result.output
        assert "AGENTSENTRY" in result.output

    def test_scan_local_finds_dotenv_secret(self, tmp_path):
        (tmp_path / ".env").write_text("API_KEY=supersecretvalue123\n")
        result = _run(["scan", "local", "--path", str(tmp_path), "--force"])
        assert result.exit_code == 0, result.output
        assert ".env" in result.output

    def test_scan_local_output_json_writes_scan_result(self, tmp_path):
        out_file = tmp_path / "result.json"
        (tmp_path / ".env").write_text("DB_PASSWORD=anothersecretvalue\n")

        result = _run(
            [
                "scan",
                "local",
                "--path",
                str(tmp_path),
                "--force",
                "--json",
                str(out_file),
            ]
        )
        assert result.exit_code == 0, result.output
        assert out_file.exists()

        data = json.loads(out_file.read_text())
        assert data["provider"] == "local"
        assert "nhis" in data and "resources" in data
        assert any(n["name"].startswith(".env file:") for n in data["nhis"])
        for nhi in data["nhis"]:
            assert "risk_score" in nhi
            assert "risk_level" in nhi

    def test_scan_local_output_json_to_stdout(self, tmp_path):
        result = _run(["scan", "local", "--path", str(tmp_path), "--force", "--json"])
        assert result.exit_code == 0, result.output
        # bare --json prints the full ScanResult as a JSON object to stdout,
        # after the scanner's own "[AgentSentry/Local] ..." progress lines.
        lines = [
            line
            for line in result.output.splitlines()
            if not line.startswith("[AgentSentry")
        ]
        start = next(i for i, line in enumerate(lines) if line.strip().startswith("{"))
        data = json.loads("\n".join(lines[start:]))
        assert data["provider"] == "local"
        assert "nhis" in data and "resources" in data

    def test_scan_local_json_free_tier(self, tmp_path, license_home):
        """`scan local --json` must work for free-tier users — `local` is in
        FREE_SCAN_TARGETS and --json isn't separately gated."""
        license_home("free")
        result = _run(["scan", "local", "--path", str(tmp_path), "--force", "--json"])
        assert result.exit_code == 0, result.output
        lines = [
            line
            for line in result.output.splitlines()
            if not line.startswith("[AgentSentry")
        ]
        start = next(i for i, line in enumerate(lines) if line.strip().startswith("{"))
        data = json.loads("\n".join(lines[start:]))
        assert data["provider"] == "local"
        assert "nhis" in data and "resources" in data
