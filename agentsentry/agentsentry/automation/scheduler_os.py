"""
OS-native registration of the recurring scan task.

Windows uses Task Scheduler (``schtasks``); Linux/macOS use the current
user's crontab via ``python-crontab``. Each entry is tagged with the
schedule's id so it can be cleanly found and removed later.
"""

from __future__ import annotations

import subprocess
import sys

TASK_PREFIX = "AgentSentry_"
CRON_COMMENT_PREFIX = "agentsentry:"

_SCHTASKS_INTERVAL = {
    "hourly": "HOURLY",
    "daily": "DAILY",
    "weekly": "WEEKLY",
}

# minute hour day-of-month month day-of-week
_CRON_SCHEDULE = {
    "hourly": "0 * * * *",
    "daily": "0 9 * * *",
    "weekly": "0 9 * * 1",
}


def _run_command(schedule_id: str) -> str:
    return f'"{sys.executable}" -m agentsentry _run-scheduled {schedule_id}'


def register(schedule_id: str, interval: str) -> None:
    """Register the OS-native recurring task for *schedule_id*."""
    if sys.platform == "win32":
        _register_windows(schedule_id, interval)
    else:
        _register_unix(schedule_id, interval)


def unregister(schedule_id: str) -> None:
    """Remove the OS-native recurring task for *schedule_id*, if present."""
    if sys.platform == "win32":
        _unregister_windows(schedule_id)
    else:
        _unregister_unix(schedule_id)


# ── Windows (Task Scheduler) ─────────────────────────────────────────────────


def _register_windows(schedule_id: str, interval: str) -> None:
    task_name = f"{TASK_PREFIX}{schedule_id}"
    sc = _SCHTASKS_INTERVAL.get(interval, "DAILY")
    subprocess.run(
        [
            "schtasks", "/Create",
            "/TN", task_name,
            "/TR", _run_command(schedule_id),
            "/SC", sc,
            "/F",
        ],
        check=True,
        capture_output=True,
        text=True,
    )


def _unregister_windows(schedule_id: str) -> None:
    task_name = f"{TASK_PREFIX}{schedule_id}"
    subprocess.run(
        ["schtasks", "/Delete", "/TN", task_name, "/F"],
        check=False,
        capture_output=True,
        text=True,
    )


# ── Unix (cron) ───────────────────────────────────────────────────────────────


def _register_unix(schedule_id: str, interval: str) -> None:
    from crontab import CronTab

    _unregister_unix(schedule_id)  # avoid duplicates if re-registering

    cron = CronTab(user=True)
    job = cron.new(command=_run_command(schedule_id), comment=f"{CRON_COMMENT_PREFIX}{schedule_id}")
    minute, hour, dom, month, dow = _CRON_SCHEDULE.get(interval, _CRON_SCHEDULE["daily"]).split()
    job.setall(minute, hour, dom, month, dow)
    cron.write()


def _unregister_unix(schedule_id: str) -> None:
    from crontab import CronTab

    cron = CronTab(user=True)
    cron.remove_all(comment=f"{CRON_COMMENT_PREFIX}{schedule_id}")
    cron.write()
