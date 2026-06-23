"""
AgentSentry license management.

Activation is server-validated: `activate()` POSTs the code to the AgentSentry
license server (`/api/cli/activate`), which returns the user's tier. The tier is
cached in ``~/.agentsentry/license.json`` and the CLI gates commands against it
locally on every run (no network call after activation).

Legacy offline HMAC keys are still accepted as a fallback so existing installs
keep working without a network round-trip:

Key formats:
  Free (HMAC):  AF-XXXX-XXXX-XXXX-XXXX     (X = base32 A-Z2-7)
  Pro  (HMAC):  AS-XXXX-XXXX-XXXX-XXXX
  Server codes: AS-FREE-… / AS-PRO-…       (validated by the license server)

Tiers:
  free → scan local, scan mock
  pro  → everything (all cloud scanners, blast radius, advanced flags)
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# ── Secrets (offline HMAC fallback) ───────────────────────────────────────────
_FREE_SECRET: bytes = b"as-fr-v1-7k2m9p4n"  # free tier
_PRO_SECRET: bytes = b"as-lk-v1-3m9n7q2x4p"  # pro tier

# ── URLs ──────────────────────────────────────────────────────────────────────
_DEFAULT_API_BASE = "https://agent-sentry-beta.vercel.app"
SIGNUP_URL = "https://agent-sentry-beta.vercel.app/signup"
DASHBOARD_URL = "https://agent-sentry-beta.vercel.app/dashboard"
TERMS_URL = "https://agentsentry.org/terms"
PRIVACY_URL = "https://agentsentry.org/privacy"
# Back-compat alias: the old /claim page was removed; point legacy callers at /signup.
CLAIM_URL = SIGNUP_URL

# Version of the Terms/Privacy the user consents to at activation. Keep in sync
# with the "Last updated" date on the web /terms and /privacy pages and with
# frontend/src/lib/policy.ts POLICY_VERSION.
POLICY_VERSION = "2026-06-23"


def _activate_url() -> str:
    """Resolve the activation endpoint at call time so AGENTSENTRY_API is honoured."""
    base = os.environ.get("AGENTSENTRY_API", _DEFAULT_API_BASE).rstrip("/")
    return f"{base}/api/cli/activate"


# ── Tier policy ───────────────────────────────────────────────────────────────
FREE_SCAN_TARGETS = {"local", "mock"}

# ── Key regexes ───────────────────────────────────────────────────────────────
_FREE_RE = re.compile(r"^AF-([A-Z2-7]{4}-){3}[A-Z2-7]{4}$", re.IGNORECASE)
_PRO_RE = re.compile(r"^AS-([A-Z2-7]{4}-){3}[A-Z2-7]{4}$", re.IGNORECASE)
# Simple format issued by the website claim API: AS-FREE-XXXX-XXXX (hex)
_SIMPLE_FREE_RE = re.compile(r"^AS-FREE-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}$", re.IGNORECASE)


# ── Storage ───────────────────────────────────────────────────────────────────
def _license_dir() -> Path:
    """
    Directory holding license.json. Overridable via ``AGENTSENTRY_HOME`` so the
    test suite (and CI) can isolate license state from the developer's real home.
    """
    override = os.environ.get("AGENTSENTRY_HOME")
    return Path(override) if override else Path.home() / ".agentsentry"


def _license_file() -> Path:
    return _license_dir() / "license.json"


# ── Offline HMAC validation ───────────────────────────────────────────────────
def _decode_key(key: str, secret: bytes) -> bool:
    """Return True if the key's HMAC validates against the given secret."""
    b32 = key.upper().split("-", 1)[1].replace("-", "")
    pad = (8 - len(b32) % 8) % 8
    try:
        raw = base64.b32decode(b32 + "=" * pad)
    except Exception:
        return False
    if len(raw) < 10:
        return False
    mac_bytes = raw[:6]
    nonce = raw[6:10]
    expected = hmac.new(secret, nonce, hashlib.sha256).digest()[:6]
    return hmac.compare_digest(mac_bytes, expected)


def _validate_key(key: str) -> str | None:
    """Validate an offline key and return its tier: 'free', 'pro', or None."""
    key = key.strip().upper()
    if _SIMPLE_FREE_RE.match(key):
        return "free"
    if _FREE_RE.match(key) and _decode_key(key, _FREE_SECRET):
        return "free"
    if _PRO_RE.match(key) and _decode_key(key, _PRO_SECRET):
        return "pro"
    return None


def _make_key(secret: bytes, prefix: str, nonce: bytes | None = None) -> str:
    """Generate a key from a nonce (random if not provided)."""
    if nonce is None:
        nonce = os.urandom(4)
    mac = hmac.new(secret, nonce, hashlib.sha256).digest()
    raw = mac[:6] + nonce  # 10 bytes
    enc = base64.b32encode(raw).decode().rstrip("=")  # 16 chars
    return f"{prefix}-{enc[:4]}-{enc[4:8]}-{enc[8:12]}-{enc[12:16]}"


def generate_free_key(email: str) -> str:
    """Generate a deterministic free key from an email (server-side use)."""
    nonce = hashlib.sha256(email.lower().encode()).digest()[:4]
    return _make_key(_FREE_SECRET, "AF", nonce)


def generate_pro_key(purchase_id: str) -> str:
    """Generate a deterministic pro key from a purchase ID (server-side use)."""
    nonce = hashlib.sha256(purchase_id.encode()).digest()[:4]
    return _make_key(_PRO_SECRET, "AS", nonce)


# ── Online activation ─────────────────────────────────────────────────────────
class NetworkError(Exception):
    """Raised when the license server could not be reached (vs. a rejected code)."""


def _activate_online(code: str, consent: dict | None = None) -> str | None:
    """
    POST the code to the license server. Returns the tier ('free'/'pro') on a
    200 response, or None when the server authoritatively rejects the code (404).

    *consent*, when provided, is recorded server-side as the user's CLI consent
    to the Terms/Privacy (type, version, timestamp) for the legal audit trail.

    Raises NetworkError when the server can't be reached or returns a transient
    error (5xx / timeout), retrying a few times first to ride out Vercel cold
    starts. This lets callers tell "wrong code" apart from "no connection".
    """
    try:
        import httpx
    except ImportError as exc:
        raise NetworkError("httpx is not installed") from exc

    payload: dict = {"activation_code": code}
    if consent is not None:
        payload["consent"] = consent

    last_error: Exception | None = None
    for attempt in range(3):
        try:
            resp = httpx.post(_activate_url(), json=payload, timeout=15.0)
        except Exception as exc:  # network/DNS/timeout
            last_error = exc
            continue

        if resp.status_code == 200:
            try:
                tier = resp.json().get("tier")
            except Exception:
                return None
            return tier if tier in ("free", "pro") else None

        # 404 = the server looked and the code does not exist → genuinely invalid.
        if resp.status_code == 404:
            return None

        # 4xx (other) = bad request, treat as invalid; 5xx = transient, retry.
        if resp.status_code < 500:
            return None
        last_error = RuntimeError(f"server returned {resp.status_code}")

    raise NetworkError(str(last_error) if last_error else "could not reach license server")


def _store(code: str, tier: str, source: str, consent: dict | None = None) -> None:
    directory = _license_dir()
    directory.mkdir(parents=True, exist_ok=True)
    data = {
        # legacy keys kept for backward compatibility with older readers
        "key": code,
        "plan": tier,
        # current schema
        "code": code,
        "tier": tier,
        "source": source,
        "activated_at": datetime.now(timezone.utc).isoformat(),
    }
    if consent is not None:
        # Local record of the user's consent (kept even for offline activations
        # where it can't be recorded server-side).
        data["consent"] = consent
    path = _license_file()
    path.write_text(json.dumps(data, indent=2))
    os.chmod(path, 0o600)


# ── Public API ────────────────────────────────────────────────────────────────
def activate(code: str, consent: bool = False) -> tuple[bool, str]:
    """
    Validate and store a license code.

    Tries the license server first (authoritative for AS-FREE-/AS-PRO- codes),
    then falls back to offline HMAC validation for legacy AF-/AS- keys. Returns
    (success, tier) where tier is 'free' or 'pro' on success, and on failure is
    'invalid' (server rejected the code) or 'network' (server unreachable).

    *consent* records that the user accepted the Terms/Privacy at the CLI
    consent prompt. When True, the consent (version + timestamp) is stored
    locally and, for online activations, also sent to the license server for
    the audit trail. The CLI is responsible for obtaining consent before
    calling this.
    """
    code = code.strip()

    consent_record: dict | None = None
    if consent:
        consent_record = {
            "document": "terms_and_privacy",
            "version": POLICY_VERSION,
            "accepted_at": datetime.now(timezone.utc).isoformat(),
            "source": "cli_activation",
        }

    network_failed = False
    try:
        tier = _activate_online(code, consent=consent_record)
    except NetworkError:
        tier = None
        network_failed = True

    if tier:
        _store(code, tier, source="online", consent=consent_record)
        return True, tier

    offline_tier = _validate_key(code)
    if offline_tier:
        _store(code.upper(), offline_tier, source="offline", consent=consent_record)
        return True, offline_tier

    return False, "network" if network_failed else "invalid"


def check() -> tuple[str | None, dict]:
    """
    Read and validate the stored license.

    Online activations are trusted as-is (the server already validated them).
    Offline activations are re-validated against the HMAC secrets on every call.
    Returns (tier, data) where tier is 'free', 'pro', or None (unactivated).
    """
    path = _license_file()
    if not path.exists():
        return None, {}
    try:
        data = json.loads(path.read_text())
    except Exception:
        return None, {}

    tier = data.get("tier") or data.get("plan")
    if data.get("source") == "online":
        return (tier, data) if tier in ("free", "pro") else (None, {})

    # offline (or legacy) entry → re-validate the HMAC key
    key = data.get("key") or data.get("code", "")
    offline_tier = _validate_key(key)
    return (offline_tier, data) if offline_tier else (None, {})


# ── Gate enforcement ──────────────────────────────────────────────────────────
def _console():
    from rich.console import Console

    return Console(legacy_windows=False)


def _block_unregistered() -> None:
    from rich.panel import Panel

    _console().print(
        Panel(
            "  [bold red]Unregistered device.[/bold red]\n\n"
            f"  Please sign up at:\n  [bold #00ff88]{SIGNUP_URL}[/bold #00ff88]\n\n"
            "  Then activate this machine:\n"
            "  [bold green]agentsentry activate <code>[/bold green]",
            title="[bold red]Activation Required[/bold red]",
            border_style="red",
            padding=(1, 2),
        )
    )


def _block_pro(feature: str) -> None:
    from rich.panel import Panel

    _console().print(
        Panel(
            "  [bold red]Access Denied: This command requires AgentSentry Pro.[/bold red]\n\n"
            f"  [dim]{feature}[/dim] is a Pro feature.\n"
            "  Free includes [bold]scan local[/bold] and [bold]scan mock[/bold].\n\n"
            f"  Upgrade at:\n  [bold cyan]{SIGNUP_URL}[/bold cyan]",
            title="[bold red]Pro Required[/bold red]",
            border_style="yellow",
            padding=(1, 2),
        )
    )


def enforce(command: str, scan_target: str | None = None) -> None:
    """
    Pre-flight license gate, called before any gated command executes.

    * No valid license  → block the CLI (exit 1).
    * Pro license       → allow everything.
    * Free license      → allow only ``scan local`` / ``scan mock``; everything
      else is blocked as Pro-only.

    Set ``AGENTSENTRY_SKIP_LICENSE=1`` to bypass (CI / automated environments).
    """
    if os.environ.get("AGENTSENTRY_SKIP_LICENSE"):
        return

    tier, _ = check()
    if tier is None:
        _block_unregistered()
        sys.exit(1)
    if tier == "pro":
        return

    # free tier
    if command == "scan" and scan_target in FREE_SCAN_TARGETS:
        return

    feature = f"scan {scan_target}" if command == "scan" else command
    _block_pro(feature)
    sys.exit(1)


# ── Automation add-on gate ─────────────────────────────────────────────────────


def _block_automation() -> None:
    from rich.panel import Panel

    _console().print(
        Panel(
            "  [bold red]Access Denied: this requires the Automation add-on.[/bold red]\n\n"
            "  Scheduled scans are a $9/month add-on for Pro accounts —\n"
            "  link your account and subscribe from the dashboard:\n\n"
            f"  [bold cyan]{DASHBOARD_URL}[/bold cyan]\n\n"
            "  [dim]If you've just subscribed, run this command again — the\n"
            "  CLI re-checks your subscription at most once every 24h.[/dim]",
            title="[bold red]Automation Subscription Required[/bold red]",
            border_style="yellow",
            padding=(1, 2),
        )
    )


def _check_subscription_status(api_key: str) -> bool:
    """Best-effort GET /api/cli/subscription-status — returns False on any error."""
    try:
        import httpx
    except ImportError:
        return False

    base = os.environ.get("AGENTSENTRY_API", _DEFAULT_API_BASE).rstrip("/")
    try:
        resp = httpx.get(
            f"{base}/api/cli/subscription-status",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=15.0,
        )
    except Exception:
        return False

    if resp.status_code != 200:
        return False
    try:
        return bool(resp.json().get("active"))
    except Exception:
        return False


def _require_automation() -> None:
    """
    Pre-flight gate for Automation add-on commands (``schedule add``, etc.).

    Checks the cached subscription status in ``schedules.json`` first
    (re-checking the server at most once every 24h), so scheduled runs don't
    need a network round-trip every time. Exits 1 with an upgrade message if
    no account is linked or the subscription is not active.

    Set ``AGENTSENTRY_SKIP_LICENSE=1`` to bypass (CI / automated environments).
    """
    if os.environ.get("AGENTSENTRY_SKIP_LICENSE"):
        return

    from agentsentry.automation import config as automation_config

    cfg = automation_config.load_config()

    cache = automation_config.get_subscription_cache(cfg)
    if cache is not None:
        try:
            checked_at = datetime.fromisoformat(cache["checked_at"])
            age_hours = (datetime.now(timezone.utc) - checked_at).total_seconds() / 3600
        except Exception:
            age_hours = None
        if age_hours is not None and age_hours < 24:
            if cache.get("active"):
                return
            _block_automation()
            sys.exit(1)

    api_key = automation_config.get_api_key(cfg)
    if not api_key:
        _block_automation()
        sys.exit(1)

    active = _check_subscription_status(api_key)
    automation_config.set_subscription_cache(cfg, active)
    automation_config.save_config(cfg)

    if not active:
        _block_automation()
        sys.exit(1)


# ── Legacy helpers (retained for backward compatibility) ──────────────────────
def require_free(feature: str) -> None:
    """Require at least a free license. Exit with claim prompt if unactivated."""
    tier, _ = check()
    if tier in ("free", "pro"):
        return
    _block_unregistered()
    sys.exit(1)


def require_pro(feature: str) -> None:
    """Require a Pro license. Exit with upgrade prompt if free or unactivated."""
    tier, _ = check()
    if tier == "pro":
        return
    if tier is None:
        _block_unregistered()
    else:
        _block_pro(feature)
    sys.exit(1)
