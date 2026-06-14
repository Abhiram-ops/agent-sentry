"""
Diff two scan results to surface what changed since the last scheduled run.

The output shape mirrors ``ScanReportSummary`` in
``frontend/src/lib/db.ts`` so it can be posted directly to
``/api/cli/scan-report`` and stored verbatim.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from agentsentry.core.models import NonHumanIdentity, RiskLevel, ScanResult

# Matches the rotation-staleness threshold scorer.py treats as overdue
# (core/scorer.py: _exposure_score, > 90 days → x1.75 exposure multiplier).
ROTATION_DUE_DAYS = 90

_RISK_RANK = {
    RiskLevel.CRITICAL: 4,
    RiskLevel.HIGH: 3,
    RiskLevel.MEDIUM: 2,
    RiskLevel.LOW: 1,
    RiskLevel.INFO: 0,
}


class DiffResult(BaseModel):
    new_nhis: list[dict[str, Any]] = Field(default_factory=list)
    newly_zombie: list[dict[str, Any]] = Field(default_factory=list)
    rotation_due: list[dict[str, Any]] = Field(default_factory=list)

    @property
    def is_clean(self) -> bool:
        return not (self.new_nhis or self.newly_zombie or self.rotation_due)


def _suggestion_for(nhi: NonHumanIdentity) -> str:
    """Concrete least-privilege remediation text for a newly-detected NHI."""
    if nhi.findings:
        top = max(nhi.findings, key=lambda f: _RISK_RANK.get(f.risk_level, 0))
        return top.remediation
    return (
        f"New {nhi.type.value} '{nhi.name}' detected "
        f"({nhi.risk_level.value}, risk score {nhi.risk_score:.1f}). "
        "Review its permissions before granting broader access and apply "
        "least-privilege scoping from the start."
    )


def diff_scans(prev: ScanResult | None, curr: ScanResult) -> DiffResult:
    """
    Compare *curr* against *prev* (the previous scheduled run, or ``None`` on
    the first run) and return newly-detected identities, identities that have
    just crossed the zombie-credential threshold, and identities currently due
    for credential rotation.
    """
    prev_by_id: dict[str, NonHumanIdentity] = {n.id: n for n in (prev.nhis if prev else [])}

    new_nhis: list[dict[str, Any]] = []
    newly_zombie: list[dict[str, Any]] = []
    rotation_due: list[dict[str, Any]] = []

    for nhi in curr.nhis:
        prev_nhi = prev_by_id.get(nhi.id)

        if prev_nhi is None:
            new_nhis.append(
                {
                    "id": nhi.id,
                    "name": nhi.name,
                    "risk_score": nhi.risk_score,
                    "risk_level": nhi.risk_level.value,
                    "suggestion": _suggestion_for(nhi),
                }
            )

        was_zombie = prev_nhi.is_stale() if prev_nhi is not None else False
        if nhi.is_stale() and not was_zombie:
            newly_zombie.append(
                {
                    "id": nhi.id,
                    "name": nhi.name,
                    "days_since_use": nhi.days_since_last_use(),
                }
            )

        days_rotated = nhi.days_since_last_rotation()
        is_rotation_due = days_rotated is None or days_rotated > ROTATION_DUE_DAYS
        if prev_nhi is not None:
            prev_days_rotated = prev_nhi.days_since_last_rotation()
            was_rotation_due = prev_days_rotated is None or prev_days_rotated > ROTATION_DUE_DAYS
        else:
            was_rotation_due = False
        if is_rotation_due and not was_rotation_due:
            rotation_due.append(
                {
                    "id": nhi.id,
                    "name": nhi.name,
                    "days_since_rotation": days_rotated,
                }
            )

    return DiffResult(new_nhis=new_nhis, newly_zombie=newly_zombie, rotation_due=rotation_due)
