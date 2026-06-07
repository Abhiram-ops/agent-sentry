"""
AgentSentry license management.

Key formats:
  Free:  AF-XXXX-XXXX-XXXX-XXXX  (X = base32 A-Z2-7)
  Pro:   AS-XXXX-XXXX-XXXX-XXXX

Both use HMAC-SHA256 offline validation. No server call after activation.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import sys
from pathlib import Path

# ── Secrets ───────────────────────────────────────────────────────────────────
_FREE_SECRET: bytes = b"as-fr-v1-7k2m9p4n"   # free tier
_PRO_SECRET:  bytes = b"as-lk-v1-3m9n7q2x4p"  # pro tier

# ── Storage ───────────────────────────────────────────────────────────────────
_LICENSE_DIR  = Path.home() / ".agentsentry"
_LICENSE_FILE = _LICENSE_DIR / "license.json"

# ── Key regexes ───────────────────────────────────────────────────────────────
_FREE_RE = re.compile(r"^AF-([A-Z2-7]{4}-){3}[A-Z2-7]{4}$", re.IGNORECASE)
_PRO_RE  = re.compile(r"^AS-([A-Z2-7]{4}-){3}[A-Z2-7]{4}$", re.IGNORECASE)

CLAIM_URL = "https://agent-sentry-beta.vercel.app/claim"


# ── Internal helpers ──────────────────────────────────────────────────────────

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
    nonce     = raw[6:10]
    expected  = hmac.new(secret, nonce, hashlib.sha256).digest()[:6]
    return hmac.compare_digest(mac_bytes, expected)


def _validate_key(key: str) -> str | None:
    """
    Validate a key and return its tier: 'free', 'pro', or None if invalid.
    """
    key = key.strip().upper()
    if _FREE_RE.match(key) and _decode_key(key, _FREE_SECRET):
        return "free"
    if _PRO_RE.match(key) and _decode_key(key, _PRO_SECRET):
        return "pro"
    return None


def _make_key(secret: bytes, prefix: str, nonce: bytes | None = None) -> str:
    """Generate a key from a nonce (random if not provided)."""
    import os
    if nonce is None:
        nonce = os.urandom(4)
    mac = hmac.new(secret, nonce, hashlib.sha256).digest()
    raw = mac[:6] + nonce          # 10 bytes
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


# ── Public API ────────────────────────────────────────────────────────────────

def activate(key: str) -> tuple[bool, str]:
    """
    Validate and store a license key.
    Returns (success, tier) where tier is 'free', 'pro', or 'invalid'.
    """
    tier = _validate_key(key)
    if not tier:
        return False, "invalid"
    _LICENSE_DIR.mkdir(parents=True, exist_ok=True)
    data = {"key": key.strip().upper(), "plan": tier}
    _LICENSE_FILE.write_text(json.dumps(data, indent=2))
    return True, tier


def check() -> tuple[str | None, dict]:
    """
    Read and validate stored license.
    Returns (tier, data) where tier is 'free', 'pro', or None (trial).
    """
    if not _LICENSE_FILE.exists():
        return None, {}
    try:
        data = json.loads(_LICENSE_FILE.read_text())
    except Exception:
        return None, {}
    key = data.get("key", "")
    tier = _validate_key(key)
    if tier:
        return tier, data
    return None, {}


def require_free(feature: str) -> None:
    """
    Require at least a free license. Exit with claim prompt if trial.
    Call at the top of any command that requires account activation.
    """
    tier, _ = check()
    if tier in ("free", "pro"):
        return
    from rich.console import Console
    from rich.panel import Panel
    Console().print(
        Panel(
            f"[bold cyan]{feature}[/bold cyan] requires a [bold]free AgentSentry account[/bold].\n\n"
            f"[dim]Claim your free key in 30 seconds — no credit card:[/dim]\n"
            f"[bold #00ff88]{CLAIM_URL}[/bold #00ff88]\n\n"
            f"Already have a key? Run:\n"
            f"[bold green]  agentsentry activate AF-XXXX-XXXX-XXXX-XXXX[/bold green]",
            title="[bold yellow]Free Key Required[/bold yellow]",
            border_style="#00ff88",
        )
    )
    sys.exit(1)


def require_pro(feature: str) -> None:
    """
    Require a Pro license. Exit with upgrade prompt if free or trial.
    """
    tier, _ = check()
    if tier == "pro":
        return
    from rich.console import Console
    from rich.panel import Panel
    Console().print(
        Panel(
            f"[bold yellow]⚡ {feature}[/bold yellow] is an [bold]AgentSentry Pro[/bold] feature.\n\n"
            "[dim]Unlock with a one-time $49 license:[/dim]\n"
            "[bold cyan]https://sentryagent.gumroad.com/l/eawugx[/bold cyan]\n\n"
            "After purchase, run:\n"
            "[bold green]  agentsentry activate AS-XXXX-XXXX-XXXX-XXXX[/bold green]",
            title="[bold red]Pro License Required[/bold red]",
            border_style="yellow",
        )
    )
    sys.exit(1)
