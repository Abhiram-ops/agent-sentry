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
SIGNUP_URL = "https://agent-sentry-beta.vercel.app/dashboard"
CLAIM_URL = "https://agent-sentry-beta.vercel.app/claim"


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
def _activate_online(code: str) -> str | None:
    """
    POST the code to the license server. Returns the tier ('free'/'pro') on a
    200 response, or None on any error (network down, invalid code, no httpx).
    """
    try:
        import httpx
    except ImportError:
        return None
    try:
        resp = httpx.post(_activate_url(), json={"activation_code": code}, timeout=10.0)
    except Exception:
        return None
    if resp.status_code != 200:
        return None
    try:
        tier = resp.json().get("tier")
    except Exception:
        return None
    return tier if tier in ("free", "pro") else None


def _store(code: str, tier: str, source: str) -> None:
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
    _license_file().write_text(json.dumps(data, indent=2))


# ── Public API ────────────────────────────────────────────────────────────────
def activate(code: str) -> tuple[bool, str]:
    """
    Validate and store a license code.

    Tries the license server first (authoritative for AS-FREE-/AS-PRO- codes),
    then falls back to offline HMAC validation for legacy AF-/AS- keys. Returns
    (success, tier) where tier is 'free', 'pro', or 'invalid'.
    """
    code = code.strip()

    tier = _activate_online(code)
    if tier:
        _store(code, tier, source="online")
        return True, tier

    offline_tier = _validate_key(code)
    if offline_tier:
        _store(code.upper(), offline_tier, source="offline")
        return True, offline_tier

    return False, "invalid"


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
