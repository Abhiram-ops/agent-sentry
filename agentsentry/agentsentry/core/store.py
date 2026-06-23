"""
Local scan-history datastore (SQLite).

Turns AgentSentry from a point-in-time scanner into a continuous monitor: every
saved scan is appended to ``~/.agentsentry/history.db`` so later runs can diff
against a stored baseline and show how an environment's risk is trending.

Storage location follows the same ``AGENTSENTRY_HOME`` convention as
``license._license_dir()`` so the test suite (and CI) stay isolated from a
developer's real history.
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

from pydantic import BaseModel

from agentsentry.core.models import ScanResult


def _store_dir() -> Path:
    override = os.environ.get("AGENTSENTRY_HOME")
    return Path(override) if override else Path.home() / ".agentsentry"


def _db_path() -> Path:
    return _store_dir() / "history.db"


_SCHEMA = """
CREATE TABLE IF NOT EXISTS scans (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    target         TEXT    NOT NULL,
    account_id     TEXT,
    scan_id        TEXT,
    timestamp      TEXT    NOT NULL,
    total_nhis     INTEGER NOT NULL DEFAULT 0,
    critical_count INTEGER NOT NULL DEFAULT 0,
    high_count     INTEGER NOT NULL DEFAULT 0,
    result_json    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scans_target_id ON scans (target, id);
"""


def _connect() -> sqlite3.Connection:
    directory = _store_dir()
    directory.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_db_path())
    conn.row_factory = sqlite3.Row
    conn.executescript(_SCHEMA)
    try:
        os.chmod(_db_path(), 0o600)
    except OSError:
        pass  # best-effort on platforms without chmod semantics
    return conn


class ScanRecord(BaseModel):
    """Lightweight metadata for one stored scan (without the full result JSON)."""

    id: int
    target: str
    account_id: str | None = None
    scan_id: str | None = None
    timestamp: str
    total_nhis: int
    critical_count: int
    high_count: int


def save_scan(result: ScanResult, target: str) -> int:
    """Persist *result* under *target* and return the new record id."""
    conn = _connect()
    try:
        cur = conn.execute(
            """
            INSERT INTO scans
                (target, account_id, scan_id, timestamp,
                 total_nhis, critical_count, high_count, result_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                target,
                result.account_id,
                result.scan_id,
                result.timestamp.isoformat(),
                result.total_nhis,
                result.critical_count,
                result.high_count,
                result.model_dump_json(),
            ),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def list_scans(target: str | None = None, limit: int = 20) -> list[ScanRecord]:
    """Most-recent-first metadata for stored scans, optionally filtered by target."""
    conn = _connect()
    try:
        if target is not None:
            rows = conn.execute(
                "SELECT * FROM scans WHERE target = ? ORDER BY id DESC LIMIT ?",
                (target, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM scans ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
        return [_record_from_row(r) for r in rows]
    finally:
        conn.close()


def load_result(record_id: int) -> ScanResult | None:
    """Rehydrate the full ScanResult for a stored record, or None if missing."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT result_json FROM scans WHERE id = ?", (record_id,)
        ).fetchone()
    finally:
        conn.close()
    if row is None:
        return None
    try:
        return ScanResult.model_validate_json(row["result_json"])
    except Exception:
        return None


def latest(target: str) -> ScanResult | None:
    """The single most recent stored ScanResult for *target*, or None."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT result_json FROM scans WHERE target = ? ORDER BY id DESC LIMIT 1",
            (target,),
        ).fetchone()
    finally:
        conn.close()
    if row is None:
        return None
    try:
        return ScanResult.model_validate_json(row["result_json"])
    except Exception:
        return None


def latest_two(target: str) -> tuple[ScanResult | None, ScanResult | None]:
    """
    The two most recent stored ScanResults for *target* as ``(previous, latest)``.

    ``latest`` is None when nothing is stored yet; ``previous`` is None on the
    very first stored scan. Shaped for ``diff_scans(prev, curr)``.
    """
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT result_json FROM scans WHERE target = ? ORDER BY id DESC LIMIT 2",
            (target,),
        ).fetchall()
    finally:
        conn.close()

    def _parse(row) -> ScanResult | None:
        try:
            return ScanResult.model_validate_json(row["result_json"])
        except Exception:
            return None

    if not rows:
        return None, None
    latest = _parse(rows[0])
    previous = _parse(rows[1]) if len(rows) > 1 else None
    return previous, latest


def _record_from_row(row: sqlite3.Row) -> ScanRecord:
    return ScanRecord(
        id=row["id"],
        target=row["target"],
        account_id=row["account_id"],
        scan_id=row["scan_id"],
        timestamp=row["timestamp"],
        total_nhis=row["total_nhis"],
        critical_count=row["critical_count"],
        high_count=row["high_count"],
    )
