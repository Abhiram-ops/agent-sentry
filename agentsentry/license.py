"""
AgentSentry license management.

Key format: AS-XXXX-XXXX-XXXX-XXXX  (X = base32 chars A-Z2-7)
Each key embeds a HMAC-SHA256 signature for offline validation.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import sys
from pathlib import Path

from rich.console import Console
from rich.panel import Panel

# Embedded signing secret — must match AS_LICENSE_SECRET on the Vercel webhook.
_SECRET: bytes = b"as-lk-v1-3m9n7q2x4p"

_LICENSE_DIR  = Path.home() / ".agentsentry"
_LICENSE_FILE = _LICENSE_DIR / "license.json"
_KEY_RE       = re.compile(r"^AS-([A-Z2-7]{4}-){3}[A-Z2-7]{4}$", re.IGNORECASE)

console = Console()


# ── Key generation (server-side only) ────────────────────────────────────────

def generate_key(purchase_id: str) -> str:
    """
    Generate a signed license key deterministically from a purchase ID.
    Same purchase_id always produces the same key.
    Call this server-side in the Gumroad webhook; never expose purchase_id to clients.
    """
    nonce = hashlib.sha256(purchase_id.encode()).digest()[:4]
    mac   = hmac.new(_SECRET, nonce, hashlib.sha256).digest()
    raw   = mac[:6] + nonce                              # 10 bytes
    enc   = base64.b32encode(raw).decode().rstrip("=")   # 16 chars
    return f"AS-{enc[:4]}-{enc[4:8]}-{enc[8:12]}-{enc[12:16]}"


# ── Validation ────────────────────────────────────────────────────────────────

def _valid_structure(key: str) -> bool:
    return bool(_KEY_RE.match(key.strip()))


def _valid_hmac(key: str) -> bool:
    """Verify the embedded HMAC without a server call."""
    payload = key.upper().replace("AS-", "").replace("-", "")   # 16 base32 chars
    try:
        padding = "=" * ((8 - len(payload) % 8) % 8)
        raw = base64.b32decode(payload + padding)
        if len(raw) < 10:
            return False
        mac_stored   = raw[:6]
        nonce        = raw[6:10]
        mac_expected = hmac.new(_SECRET, nonce, hashlib.sha256).digest()[:6]
        return hmac.compare_digest(mac_stored, mac_expected)
    except Exception:
        return False


# ── Local license store ───────────────────────────────────────────────────────

def activate(key: str) -> bool:
    """Validate and persist a license key. Returns True on success."""
    from datetime import datetime, timezone

    key = key.strip().upper()

    if not _valid_structure(key):
        console.print(
            "\n  [red]✗[/red]  Invalid key format — "
            "keys look like [bold]AS-ABCD-EFGH-IJKL-MNOP[/bold]\n"
        )
        return False

    if not _valid_hmac(key):
        console.print(
            "\n  [red]✗[/red]  Key validation failed — the key is invalid or has been tampered with.\n"
            "  If you think this is wrong, email [bold]support@agentsentry.tool[/bold]\n"
        )
        return False

    _LICENSE_DIR.mkdir(parents=True, exist_ok=True)
    _LICENSE_FILE.write_text(json.dumps({
        "key":          key,
        "plan":         "pro",
        "activated_at": datetime.now(timezone.utc).isoformat(),
    }, indent=2))
    return True


def check() -> tuple[bool, dict]:
    """Return (is_pro, license_data). Validates the stored key on every call."""
    if not _LICENSE_FILE.exists():
        return False, {}
    try:
        data = json.loads(_LICENSE_FILE.read_text())
        key  = data.get("key", "")
        if _valid_structure(key) and _valid_hmac(key):
            return True, data
    except Exception:
        pass
    return False, {}


def require_pro(feature: str) -> None:
    """Exit with an upgrade prompt if the user isn't licensed."""
    is_pro, _ = check()
    if not is_pro:
        console.print(Panel(
            f"  [bold yellow]⚡  {feature}[/bold yellow] requires [bold]AgentSentry Pro[/bold].\n\n"
            "  [dim]One-time purchase — yours forever:[/dim]\n\n"
            "  [bold #00ff88]→[/bold #00ff88]  https://agentsentry.tool/pricing\n\n"
            "  [dim]Already have a key?[/dim]  "
            "Run [bold]agentsentry activate <key>[/bold]",
            title="[yellow]⚡ Pro Feature[/yellow]",
            border_style="yellow",
            padding=(1, 2),
        ))
        sys.exit(1)
