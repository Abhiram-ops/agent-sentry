"""
Local persistence for scheduled scans.

Schedules are stored in ``~/.agentsentry/schedules.json`` (mode 0o600),
following the same storage convention as ``agentsentry.license``'s
``_license_file()`` / ``_store()``.
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _config_dir() -> Path:
    """Overridable via ``AGENTSENTRY_HOME`` (mirrors ``license._license_dir()``)."""
    override = os.environ.get("AGENTSENTRY_HOME")
    return Path(override) if override else Path.home() / ".agentsentry"


def _config_file() -> Path:
    return _config_dir() / "schedules.json"


def load_config() -> dict[str, Any]:
    """Load ``schedules.json``, returning an empty config if missing or unreadable."""
    path = _config_file()
    if not path.exists():
        return {"schedules": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"schedules": {}}
    data.setdefault("schedules", {})
    return data


def save_config(config: dict[str, Any]) -> None:
    directory = _config_dir()
    directory.mkdir(parents=True, exist_ok=True)
    path = _config_file()
    path.write_text(json.dumps(config, indent=2, default=str), encoding="utf-8")
    os.chmod(path, 0o600)


def add_schedule(
    config: dict[str, Any],
    *,
    target: str,
    interval: str,
    output_dir: str,
    notify_email: bool,
    extra_args: dict[str, Any] | None = None,
) -> str:
    """Add a new schedule entry and return its generated id."""
    schedule_id = uuid.uuid4().hex[:12]
    config["schedules"][schedule_id] = {
        "target": target,
        "interval": interval,
        "output_dir": output_dir,
        "notify_email": notify_email,
        "extra_args": extra_args or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_run_at": None,
    }
    return schedule_id


def get_schedule(config: dict[str, Any], schedule_id: str) -> dict[str, Any] | None:
    return config["schedules"].get(schedule_id)


def remove_schedule(config: dict[str, Any], schedule_id: str) -> bool:
    return config["schedules"].pop(schedule_id, None) is not None


def touch_schedule(config: dict[str, Any], schedule_id: str) -> None:
    schedule = config["schedules"].get(schedule_id)
    if schedule is not None:
        schedule["last_run_at"] = datetime.now(timezone.utc).isoformat()


def get_api_key(config: dict[str, Any]) -> str | None:
    return config.get("api_key")


def set_api_key(config: dict[str, Any], api_key: str) -> None:
    config["api_key"] = api_key


def get_subscription_cache(config: dict[str, Any]) -> dict[str, Any] | None:
    return config.get("subscription_check")


def set_subscription_cache(config: dict[str, Any], active: bool) -> None:
    config["subscription_check"] = {
        "active": active,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }
