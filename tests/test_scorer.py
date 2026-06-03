"""
Tests for the NHI Risk Scoring Engine.

Run with: pytest tests/ -v
"""

from datetime import datetime, timezone, timedelta

import pytest

from agentsentry.core.models import (
    AutonomyLevel,
    CloudProvider,
    NonHumanIdentity,
    NHIType,
    RiskLevel,
)
from agentsentry.core.scorer import NHIScorer


def _dt(days_ago: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days_ago)


@pytest.fixture
def scorer():
    return NHIScorer()


# ---------------------------------------------------------------------------
# Privilege scoring
# ---------------------------------------------------------------------------

def test_admin_policy_gives_max_privilege(scorer):
    nhi = NonHumanIdentity(
        id="test-1", name="admin-role", type=NHIType.IAM_ROLE,
        attached_policies=["AdministratorAccess"],
    )
    nhi = scorer.score(nhi)
    assert nhi.privilege_score == 10.0


def test_readonly_policy_gives_low_privilege(scorer):
    nhi = NonHumanIdentity(
        id="test-2", name="readonly-role", type=NHIType.IAM_ROLE,
        attached_policies=["ReadOnlyAccess"],
    )
    nhi = scorer.score(nhi)
    assert nhi.privilege_score <= 2.0


def test_cross_account_compounds_privilege(scorer):
    base_nhi = NonHumanIdentity(
        id="test-3a", name="role-a", type=NHIType.IAM_ROLE,
        attached_policies=["SecurityAudit"],
        is_cross_account=False,
    )
    cross_nhi = NonHumanIdentity(
        id="test-3b", name="role-b", type=NHIType.IAM_ROLE,
        attached_policies=["SecurityAudit"],
        is_cross_account=True,
    )
    base_nhi = scorer.score(base_nhi)
    cross_nhi = scorer.score(cross_nhi)
    assert cross_nhi.privilege_score > base_nhi.privilege_score


# ---------------------------------------------------------------------------
# AI-Amplification Factor (the novel contribution)
# ---------------------------------------------------------------------------

def test_non_ai_nhi_has_amplification_of_one(scorer):
    nhi = NonHumanIdentity(
        id="test-4", name="plain-role", type=NHIType.IAM_ROLE,
    )
    nhi = scorer.score(nhi)
    assert nhi.ai_amplification_factor == 1.0


def test_fully_autonomous_agent_with_irreversible_tools_is_critical(scorer):
    nhi = NonHumanIdentity(
        id="test-5", name="dangerous-agent", type=NHIType.AI_AGENT,
        attached_policies=["secretsmanager:GetSecretValue"],
        autonomy_level=AutonomyLevel.FULLY_AUTONOMOUS,
        agent_tools=["query_database", "send_email", "delete_record"],
        is_internet_facing=False,
        last_used=_dt(1),
        last_rotated=_dt(30),
        created_date=_dt(60),
    )
    nhi = scorer.score(nhi)
    assert nhi.ai_amplification_factor > 1.0
    assert nhi.risk_level == RiskLevel.CRITICAL


def test_human_in_loop_agent_has_lower_amplification(scorer):
    human_loop = NonHumanIdentity(
        id="test-6a", name="supervised-agent", type=NHIType.AI_AGENT,
        autonomy_level=AutonomyLevel.HUMAN_IN_LOOP,
        agent_tools=["send_email"],
    )
    full_auto = NonHumanIdentity(
        id="test-6b", name="autonomous-agent", type=NHIType.AI_AGENT,
        autonomy_level=AutonomyLevel.FULLY_AUTONOMOUS,
        agent_tools=["send_email"],
    )
    human_loop = scorer.score(human_loop)
    full_auto   = scorer.score(full_auto)
    assert full_auto.ai_amplification_factor > human_loop.ai_amplification_factor


# ---------------------------------------------------------------------------
# Exposure scoring
# ---------------------------------------------------------------------------

def test_never_rotated_credential_has_high_exposure(scorer):
    nhi = NonHumanIdentity(
        id="test-7", name="old-key", type=NHIType.API_KEY,
        last_rotated=None,
        last_used=_dt(10),
    )
    nhi = scorer.score(nhi)
    assert nhi.exposure_score >= 3.0


def test_recently_rotated_credential_has_low_exposure(scorer):
    nhi = NonHumanIdentity(
        id="test-8", name="fresh-key", type=NHIType.API_KEY,
        last_rotated=_dt(15),
        last_used=_dt(1),
    )
    nhi = scorer.score(nhi)
    assert nhi.exposure_score <= 1.5


# ---------------------------------------------------------------------------
# Finding generation
# ---------------------------------------------------------------------------

def test_admin_role_generates_overprivileged_finding(scorer):
    nhi = NonHumanIdentity(
        id="test-9", name="admin-role", type=NHIType.IAM_ROLE,
        attached_policies=["AdministratorAccess"],
    )
    nhi = scorer.score(nhi)
    finding_ids = [f.finding_id for f in nhi.findings]
    assert "NHI-001" in finding_ids


def test_autonomous_agent_generates_nhi004_finding(scorer):
    nhi = NonHumanIdentity(
        id="test-10", name="auto-agent", type=NHIType.AI_AGENT,
        autonomy_level=AutonomyLevel.FULLY_AUTONOMOUS,
        agent_tools=["send_email", "delete_record"],
    )
    nhi = scorer.score(nhi)
    finding_ids = [f.finding_id for f in nhi.findings]
    assert "NHI-004" in finding_ids


# ---------------------------------------------------------------------------
# Risk level classification
# ---------------------------------------------------------------------------

def test_risk_score_above_100_is_critical(scorer):
    assert scorer._risk_level(150.0) == RiskLevel.CRITICAL

def test_risk_score_60_is_high(scorer):
    assert scorer._risk_level(60.0) == RiskLevel.HIGH

def test_risk_score_5_is_low(scorer):
    assert scorer._risk_level(5.0) == RiskLevel.LOW
