"""
Unit tests for the PREA scoring engine (agentsentry/core/scorer.py).

    Risk = P (Privilege) × R (Reachability) × E (Exposure) × A (AI-Amplification)

Covers:
  - each factor in isolation, including boundary days and caps
  - the full PREA product
  - the AdministratorAccess / PowerUserAccess → CRITICAL (≥100.0) override
  - the pure-AI-agent cap at 99.0 (HIGH) for non-fully-autonomous agents
    with no cloud permissions
  - finding generation and MITRE mapping
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from agentsentry.core.models import (
    ZOMBIE_CREDENTIAL_THRESHOLD_DAYS,
    AutonomyLevel,
    CloudProvider,
    Finding,
    NHIType,
    NonHumanIdentity,
    RiskLevel,
)
from agentsentry.core.scorer import NHIScorer

NOW = datetime.now(timezone.utc)


def days_ago(days: int) -> datetime:
    return NOW - timedelta(days=days)


def make_nhi(**overrides) -> NonHumanIdentity:
    """A 'boring' NHI: fresh credentials, internal, no privileges.

    P=1.0, R=1.0, E=1.0, A=1.0 unless a field is overridden.
    """
    defaults = dict(
        id="nhi-test",
        name="test-identity",
        type=NHIType.IAM_ROLE,
        provider=CloudProvider.AWS,
        created_date=days_ago(100),
        last_rotated=days_ago(30),
        last_used=days_ago(5),
    )
    defaults.update(overrides)
    return NonHumanIdentity(**defaults)


@pytest.fixture()
def scorer() -> NHIScorer:
    return NHIScorer()


# ═══════════════════════════════════════════════════════════════════
# P — Privilege Score
# ═══════════════════════════════════════════════════════════════════


class TestPrivilegeScore:
    def test_no_policies_floor(self, scorer):
        nhi = scorer.score(make_nhi())
        assert nhi.privilege_score == 1.0

    def test_administrator_access_short_circuits_to_max(self, scorer):
        nhi = scorer.score(make_nhi(attached_policies=["AdministratorAccess"]))
        assert nhi.privilege_score == 10.0

    def test_power_user_access_short_circuits_to_max(self, scorer):
        nhi = scorer.score(make_nhi(attached_policies=["PowerUserAccess"]))
        assert nhi.privilege_score == 10.0

    def test_known_policy_weight(self, scorer):
        nhi = scorer.score(make_nhi(attached_policies=["sts:AssumeRole"]))
        assert nhi.privilege_score == 7.0

    def test_unknown_policy_scores_floor(self, scorer):
        nhi = scorer.score(make_nhi(attached_policies=["SomeCustomPolicy"]))
        assert nhi.privilege_score == 1.0

    def test_max_of_multiple_policies_wins(self, scorer):
        nhi = scorer.score(
            make_nhi(attached_policies=["s3:GetObject", "iam:AttachRolePolicy"])
        )
        assert nhi.privilege_score == 8.5

    def test_inline_wildcard_action(self, scorer):
        nhi = scorer.score(
            make_nhi(
                inline_policies=[{"Statement": [{"Effect": "Allow", "Action": "*"}]}]
            )
        )
        assert nhi.privilege_score == 10.0

    def test_inline_service_wildcard_action(self, scorer):
        nhi = scorer.score(
            make_nhi(
                inline_policies=[{"Statement": [{"Effect": "Allow", "Action": "s3:*"}]}]
            )
        )
        assert nhi.privilege_score == 10.0

    def test_inline_deny_statements_ignored(self, scorer):
        nhi = scorer.score(
            make_nhi(
                inline_policies=[{"Statement": [{"Effect": "Deny", "Action": "*"}]}]
            )
        )
        assert nhi.privilege_score == 1.0

    def test_inline_action_list_and_string_equivalent(self, scorer):
        as_string = scorer.score(
            make_nhi(
                inline_policies=[
                    {
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Action": "secretsmanager:GetSecretValue",
                            }
                        ]
                    }
                ]
            )
        )
        as_list = scorer.score(
            make_nhi(
                inline_policies=[
                    {
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Action": ["secretsmanager:GetSecretValue"],
                            }
                        ]
                    }
                ]
            )
        )
        assert as_string.privilege_score == as_list.privilege_score == 5.0

    def test_cross_account_multiplier(self, scorer):
        base = scorer.score(make_nhi(attached_policies=["s3:PutBucketPolicy"]))
        crossed = scorer.score(
            make_nhi(attached_policies=["s3:PutBucketPolicy"], is_cross_account=True)
        )
        assert base.privilege_score == 6.0
        assert crossed.privilege_score == 9.0  # 6.0 × 1.5

    def test_cross_account_capped_at_ten(self, scorer):
        nhi = scorer.score(make_nhi(attached_policies=["iam:*"], is_cross_account=True))
        assert nhi.privilege_score == 10.0  # 9.0 × 1.5 = 13.5 → cap

    def test_azure_owner_weight(self, scorer):
        nhi = scorer.score(
            make_nhi(
                type=NHIType.SERVICE_PRINCIPAL,
                provider=CloudProvider.AZURE,
                attached_policies=["Owner"],
            )
        )
        assert nhi.privilege_score == 10.0

    def test_gcp_editor_weight(self, scorer):
        nhi = scorer.score(
            make_nhi(
                type=NHIType.GCP_SERVICE_ACCOUNT,
                provider=CloudProvider.GCP,
                attached_policies=["roles/editor"],
            )
        )
        assert nhi.privilege_score == 9.0


# ═══════════════════════════════════════════════════════════════════
# R — Reachability Score
# ═══════════════════════════════════════════════════════════════════


class TestReachabilityScore:
    def test_internal_default(self, scorer):
        assert scorer.score(make_nhi()).reachability_score == 1.0

    def test_internet_facing(self, scorer):
        nhi = scorer.score(make_nhi(is_internet_facing=True))
        assert nhi.reachability_score == 3.0

    def test_internet_facing_beats_type(self, scorer):
        nhi = scorer.score(make_nhi(type=NHIType.API_KEY, is_internet_facing=True))
        assert nhi.reachability_score == 3.0

    @pytest.mark.parametrize("nhi_type", [NHIType.GITHUB_SECRET, NHIType.API_KEY])
    def test_semi_exposed_credential_types(self, scorer, nhi_type):
        assert scorer.score(make_nhi(type=nhi_type)).reachability_score == 2.0

    def test_ai_agent(self, scorer):
        nhi = scorer.score(make_nhi(type=NHIType.AI_AGENT))
        assert nhi.reachability_score == 2.5


# ═══════════════════════════════════════════════════════════════════
# E — Exposure Score
# ═══════════════════════════════════════════════════════════════════


class TestExposureScore:
    def test_well_managed_baseline(self, scorer):
        assert scorer.score(make_nhi()).exposure_score == 1.0

    def test_never_rotated(self, scorer):
        nhi = scorer.score(make_nhi(last_rotated=None))
        assert nhi.exposure_score == 3.0

    def test_rotation_over_a_year(self, scorer):
        nhi = scorer.score(make_nhi(last_rotated=days_ago(400)))
        assert nhi.exposure_score == 2.5

    def test_rotation_over_ninety_days(self, scorer):
        nhi = scorer.score(make_nhi(last_rotated=days_ago(91)))
        assert nhi.exposure_score == 1.75

    def test_rotation_at_ninety_days_is_fresh(self, scorer):
        nhi = scorer.score(make_nhi(last_rotated=days_ago(90)))
        assert nhi.exposure_score == 1.0

    def test_zombie_multiplier_past_threshold(self, scorer):
        nhi = scorer.score(
            make_nhi(last_used=days_ago(ZOMBIE_CREDENTIAL_THRESHOLD_DAYS + 1))
        )
        assert nhi.exposure_score == 1.5

    def test_no_zombie_multiplier_at_threshold(self, scorer):
        nhi = scorer.score(
            make_nhi(last_used=days_ago(ZOMBIE_CREDENTIAL_THRESHOLD_DAYS))
        )
        assert nhi.exposure_score == 1.0

    def test_no_zombie_multiplier_in_old_90_day_window(self, scorer):
        """Regression: the zombie threshold is 180 days, not 90."""
        nhi = scorer.score(make_nhi(last_used=days_ago(120)))
        assert nhi.exposure_score == 1.0
        assert not any(f.finding_id == "NHI-003" for f in nhi.findings)

    def test_missing_created_date_multiplier(self, scorer):
        nhi = scorer.score(make_nhi(created_date=None))
        assert nhi.exposure_score == 1.25

    def test_exposure_capped_at_five(self, scorer):
        # 3.0 (never rotated) × 1.5 (zombie) × 1.25 (no created) = 5.625
        nhi = scorer.score(
            make_nhi(last_rotated=None, last_used=days_ago(300), created_date=None)
        )
        assert nhi.exposure_score == 5.0


# ═══════════════════════════════════════════════════════════════════
# A — AI-Amplification Factor
# ═══════════════════════════════════════════════════════════════════


class TestAIAmplification:
    def test_non_agent_is_always_one(self, scorer):
        nhi = scorer.score(
            make_nhi(
                autonomy_level=AutonomyLevel.FULLY_AUTONOMOUS,
                agent_tools=["transfer_funds"],
            )
        )
        assert nhi.ai_amplification_factor == 1.0

    def test_human_in_loop_read_only(self, scorer):
        nhi = scorer.score(
            make_nhi(
                type=NHIType.AI_AGENT,
                autonomy_level=AutonomyLevel.HUMAN_IN_LOOP,
                agent_tools=["read_file"],
            )
        )
        assert nhi.ai_amplification_factor == 1.0  # 1 × 1 × 1

    def test_semi_autonomous_known_tool(self, scorer):
        nhi = scorer.score(
            make_nhi(
                type=NHIType.AI_AGENT,
                autonomy_level=AutonomyLevel.SEMI_AUTONOMOUS,
                agent_tools=["query_database"],
            )
        )
        assert nhi.ai_amplification_factor == 3.0  # 2 × 1.5 × 1

    def test_fully_autonomous_irreversible_tool(self, scorer):
        nhi = scorer.score(
            make_nhi(
                type=NHIType.AI_AGENT,
                autonomy_level=AutonomyLevel.FULLY_AUTONOMOUS,
                agent_tools=["send_email"],
            )
        )
        assert nhi.ai_amplification_factor == 30.0  # 4 × 3 × 2.5

    def test_worst_tool_sets_the_ceiling(self, scorer):
        nhi = scorer.score(
            make_nhi(
                type=NHIType.AI_AGENT,
                autonomy_level=AutonomyLevel.HUMAN_IN_LOOP,
                agent_tools=["read_file", "transfer_funds"],
            )
        )
        assert nhi.ai_amplification_factor == 15.0  # 1 × 6 × 2.5

    def test_unknown_autonomy_defaults_to_semi(self, scorer):
        nhi = scorer.score(make_nhi(type=NHIType.AI_AGENT, agent_tools=["read_file"]))
        assert nhi.ai_amplification_factor == 2.0  # 2 × 1 × 1

    def test_no_tools_conservative_default(self, scorer):
        nhi = scorer.score(
            make_nhi(
                type=NHIType.AI_AGENT, autonomy_level=AutonomyLevel.SEMI_AUTONOMOUS
            )
        )
        assert nhi.ai_amplification_factor == 3.0  # 2 × 1.5 × 1

    def test_unknown_tool_conservative_default(self, scorer):
        nhi = scorer.score(
            make_nhi(
                type=NHIType.AI_AGENT,
                autonomy_level=AutonomyLevel.SEMI_AUTONOMOUS,
                agent_tools=["mystery_tool"],
            )
        )
        assert nhi.ai_amplification_factor == 3.0  # 2 × 1.5 × 1


# ═══════════════════════════════════════════════════════════════════
# PREA product
# ═══════════════════════════════════════════════════════════════════


class TestPREAProduct:
    def test_score_is_exact_product(self, scorer):
        nhi = scorer.score(
            make_nhi(
                attached_policies=["sts:AssumeRole"],  # P = 7.0
                is_internet_facing=True,  # R = 3.0
                last_rotated=days_ago(91),  # E = 1.75
            )
        )
        assert nhi.risk_score == pytest.approx(7.0 * 3.0 * 1.75)
        assert nhi.risk_score == pytest.approx(
            nhi.privilege_score
            * nhi.reachability_score
            * nhi.exposure_score
            * nhi.ai_amplification_factor
        )

    def test_benign_identity_floor(self, scorer):
        nhi = scorer.score(make_nhi())
        assert nhi.risk_score == 1.0
        assert nhi.risk_level == RiskLevel.INFO

    def test_ai_agent_product_includes_amplification(self, scorer):
        nhi = scorer.score(
            make_nhi(
                type=NHIType.AI_AGENT,  # R = 2.5
                autonomy_level=AutonomyLevel.FULLY_AUTONOMOUS,
                agent_tools=["execute_code"],  # A = 4×5×2.5 = 50
                attached_policies=["lambda:InvokeFunction"],  # P = 4.0
            )
        )
        assert nhi.risk_score == pytest.approx(4.0 * 2.5 * 1.0 * 50.0)
        assert nhi.risk_level == RiskLevel.CRITICAL

    def test_risk_level_boundaries(self, scorer):
        assert scorer._risk_level(100.0) == RiskLevel.CRITICAL
        assert scorer._risk_level(99.99) == RiskLevel.HIGH
        assert scorer._risk_level(50.0) == RiskLevel.HIGH
        assert scorer._risk_level(49.99) == RiskLevel.MEDIUM
        assert scorer._risk_level(20.0) == RiskLevel.MEDIUM
        assert scorer._risk_level(19.99) == RiskLevel.LOW
        assert scorer._risk_level(5.0) == RiskLevel.LOW
        assert scorer._risk_level(4.99) == RiskLevel.INFO

    def test_score_all_scores_every_nhi(self, scorer):
        nhis = [make_nhi(id=f"nhi-{i}") for i in range(5)]
        scored = scorer.score_all(nhis)
        assert len(scored) == 5
        assert all(n.risk_score > 0 for n in scored)


# ═══════════════════════════════════════════════════════════════════
# AdministratorAccess override — always CRITICAL
# ═══════════════════════════════════════════════════════════════════


class TestAdministratorOverride:
    def test_admin_forces_exactly_100_for_otherwise_benign_identity(self, scorer):
        """Fresh, internal, recently used — admin alone must force 100.0."""
        nhi = scorer.score(make_nhi(attached_policies=["AdministratorAccess"]))
        # Raw product would be 10 × 1 × 1 × 1 = 10
        assert nhi.risk_score == 100.0
        assert nhi.risk_level == RiskLevel.CRITICAL

    def test_power_user_also_forces_critical(self, scorer):
        nhi = scorer.score(make_nhi(attached_policies=["PowerUserAccess"]))
        assert nhi.risk_score == 100.0
        assert nhi.risk_level == RiskLevel.CRITICAL

    def test_admin_lifts_sub_100_products_to_exactly_100(self, scorer):
        nhi = scorer.score(
            make_nhi(
                attached_policies=["AdministratorAccess"],
                is_internet_facing=True,  # R = 3
                last_rotated=None,  # E = 3
            )
        )
        # Raw product 10 × 3 × 3 = 90 → override floor lifts it to 100
        assert nhi.risk_score == 100.0
        assert nhi.risk_level == RiskLevel.CRITICAL

    def test_admin_with_high_factors_keeps_raw_score(self, scorer):
        nhi = scorer.score(
            make_nhi(
                attached_policies=["AdministratorAccess"],
                is_internet_facing=True,  # R = 3
                last_rotated=None,
                created_date=None,  # E = 3 × 1.25 = 3.75
            )
        )
        assert nhi.risk_score == pytest.approx(10.0 * 3.0 * 3.75)  # 112.5 > 100
        assert nhi.risk_level == RiskLevel.CRITICAL

    def test_admin_among_other_policies_still_triggers(self, scorer):
        nhi = scorer.score(
            make_nhi(attached_policies=["s3:GetObject", "AdministratorAccess"])
        )
        assert nhi.risk_score >= 100.0
        assert nhi.risk_level == RiskLevel.CRITICAL

    def test_non_admin_identity_is_not_forced(self, scorer):
        nhi = scorer.score(
            make_nhi(attached_policies=["iam:*"])
        )  # 9.0 — strong but not admin
        assert nhi.risk_score < 100.0

    def test_admin_ai_agent_is_critical_not_capped(self, scorer):
        """The 99.0 agent cap must never undercut the admin override."""
        nhi = scorer.score(
            make_nhi(
                type=NHIType.AI_AGENT,
                autonomy_level=AutonomyLevel.HUMAN_IN_LOOP,
                agent_tools=["read_file"],
                attached_policies=["AdministratorAccess"],
            )
        )
        assert nhi.risk_score >= 100.0
        assert nhi.risk_level == RiskLevel.CRITICAL


# ═══════════════════════════════════════════════════════════════════
# Pure AI Agent cap — ≤99.0 (HIGH) without cloud permissions
# ═══════════════════════════════════════════════════════════════════


class TestPureAIAgentCap:
    def _hot_agent(self, autonomy: AutonomyLevel, **overrides) -> NonHumanIdentity:
        """An agent whose raw PREA product far exceeds 100."""
        fields = dict(
            type=NHIType.AI_AGENT,  # R = 2.5
            autonomy_level=autonomy,
            agent_tools=["transfer_funds"],  # blast 6, irreversible 2.5
            last_rotated=None,  # E = 3.0
            attached_policies=[],
        )
        fields.update(overrides)
        return make_nhi(**fields)

    def test_semi_autonomous_pure_agent_capped_at_99(self, scorer):
        nhi = scorer.score(self._hot_agent(AutonomyLevel.SEMI_AUTONOMOUS))
        # Raw: 1 × 2.5 × 3 × (2×6×2.5=30) = 225 → capped
        assert nhi.risk_score == 99.0
        assert nhi.risk_level == RiskLevel.HIGH

    def test_human_in_loop_pure_agent_capped_at_99(self, scorer):
        nhi = scorer.score(self._hot_agent(AutonomyLevel.HUMAN_IN_LOOP))
        # Raw: 1 × 2.5 × 3 × (1×6×2.5=15) = 112.5 → capped
        assert nhi.risk_score == 99.0
        assert nhi.risk_level == RiskLevel.HIGH

    def test_fully_autonomous_pure_agent_not_capped(self, scorer):
        nhi = scorer.score(self._hot_agent(AutonomyLevel.FULLY_AUTONOMOUS))
        # Raw: 1 × 2.5 × 3 × (4×6×2.5=60) = 450
        assert nhi.risk_score == pytest.approx(450.0)
        assert nhi.risk_level == RiskLevel.CRITICAL

    def test_agent_with_cloud_permissions_not_capped(self, scorer):
        nhi = scorer.score(
            self._hot_agent(
                AutonomyLevel.SEMI_AUTONOMOUS,
                attached_policies=["secretsmanager:GetSecretValue"],  # P = 5
            )
        )
        # Raw: 5 × 2.5 × 3 × 30 = 1125 — has cloud permissions → no cap
        assert nhi.risk_score > 99.0
        assert nhi.risk_level == RiskLevel.CRITICAL

    def test_cap_does_not_raise_low_scores(self, scorer):
        nhi = scorer.score(
            make_nhi(
                type=NHIType.AI_AGENT,
                autonomy_level=AutonomyLevel.HUMAN_IN_LOOP,
                agent_tools=["read_file"],
            )
        )
        # Raw: 1 × 2.5 × 1 × 1 = 2.5 — far below the cap
        assert nhi.risk_score == pytest.approx(2.5)
        assert nhi.risk_level == RiskLevel.INFO

    def test_non_agent_never_capped(self, scorer):
        nhi = scorer.score(
            make_nhi(
                attached_policies=["iam:*"],  # P = 9
                is_internet_facing=True,  # R = 3
                last_rotated=None,  # E = 3
            )
        )
        # Raw: 9 × 3 × 3 = 81 — not an agent → no cap applied at any point
        assert nhi.risk_score == pytest.approx(81.0)
        assert nhi.risk_level == RiskLevel.HIGH


# ═══════════════════════════════════════════════════════════════════
# Findings + MITRE mapping
# ═══════════════════════════════════════════════════════════════════


class TestFindings:
    def _ids(self, nhi) -> list[str]:
        return [f.finding_id for f in nhi.findings]

    def test_over_privileged_finding(self, scorer):
        nhi = scorer.score(make_nhi(attached_policies=["iam:AttachRolePolicy"]))  # 8.5
        assert "NHI-001" in self._ids(nhi)

    def test_over_privileged_critical_at_nine(self, scorer):
        nhi = scorer.score(make_nhi(attached_policies=["iam:*"]))  # 9.0
        f = next(f for f in nhi.findings if f.finding_id == "NHI-001")
        assert f.risk_level == RiskLevel.CRITICAL

    def test_no_over_privileged_finding_below_eight(self, scorer):
        nhi = scorer.score(make_nhi(attached_policies=["sts:AssumeRole"]))  # 7.0
        assert "NHI-001" not in self._ids(nhi)

    def test_rotation_finding_when_never_rotated(self, scorer):
        nhi = scorer.score(make_nhi(last_rotated=None))
        assert "NHI-002" in self._ids(nhi)

    def test_rotation_finding_when_overdue(self, scorer):
        nhi = scorer.score(make_nhi(last_rotated=days_ago(400)))
        assert "NHI-002" in self._ids(nhi)

    def test_zombie_finding_past_180_days(self, scorer):
        nhi = scorer.score(make_nhi(last_used=days_ago(200)))
        assert "NHI-003" in self._ids(nhi)

    def test_no_zombie_finding_at_120_days(self, scorer):
        """Regression: documented threshold is 180 days, not 90."""
        nhi = scorer.score(make_nhi(last_used=days_ago(120)))
        assert "NHI-003" not in self._ids(nhi)

    def test_autonomous_agent_finding(self, scorer):
        nhi = scorer.score(
            make_nhi(
                type=NHIType.AI_AGENT,
                autonomy_level=AutonomyLevel.FULLY_AUTONOMOUS,
                agent_tools=["deploy"],
            )
        )
        assert "NHI-004" in self._ids(nhi)

    def test_no_agent_finding_when_human_gated(self, scorer):
        nhi = scorer.score(
            make_nhi(
                type=NHIType.AI_AGENT,
                autonomy_level=AutonomyLevel.HUMAN_IN_LOOP,
                agent_tools=["deploy"],
            )
        )
        assert "NHI-004" not in self._ids(nhi)

    def test_cross_account_finding(self, scorer):
        nhi = scorer.score(make_nhi(is_cross_account=True))
        assert "NHI-005" in self._ids(nhi)

    def test_mitre_techniques_aggregated_sorted_unique(self, scorer):
        nhi = scorer.score(
            make_nhi(
                attached_policies=["AdministratorAccess"],
                last_rotated=None,
                is_cross_account=True,
            )
        )
        assert nhi.mitre_techniques == sorted(set(nhi.mitre_techniques))
        assert "T1078.004" in nhi.mitre_techniques
        assert "T1528" in nhi.mitre_techniques
        assert "T1199" in nhi.mitre_techniques

    def test_preexisting_findings_are_preserved(self, scorer):
        """Provider-attached findings (e.g. from LocalProvider) must survive
        scoring alongside the generic NHI-00x findings — scorer.score()
        should append, not overwrite."""
        nhi = make_nhi(
            findings=[
                Finding(
                    finding_id="local-x",
                    title="AWS Access Key ID in environment",
                    description="found one",
                    risk_level=RiskLevel.CRITICAL,
                    mitre_techniques=["T1552.007"],
                    remediation="rotate it",
                )
            ],
            last_rotated=None,
        )
        scored = scorer.score(nhi)
        ids = self._ids(scored)
        assert "local-x" in ids
        assert "NHI-002" in ids


# ═══════════════════════════════════════════════════════════════════
# Least-privilege gap (AWS Access Advisor / service_last_accessed)
# ═══════════════════════════════════════════════════════════════════


def _svc(namespace: str, used: bool) -> dict:
    """One access-advisor entry; used=False means granted-but-never-authenticated."""
    return {
        "namespace": namespace,
        "service": namespace.upper(),
        "last_authenticated": days_ago(10) if used else None,
    }


class TestPrivilegeGapModel:
    def test_no_data_returns_none(self):
        nhi = make_nhi()
        assert nhi.privilege_gap_ratio() is None
        assert nhi.granted_service_count() == 0
        assert nhi.unused_services() == []

    def test_gap_ratio_and_unused_list(self):
        nhi = make_nhi(
            service_last_accessed=[
                _svc("s3", used=True),
                _svc("ec2", used=False),
                _svc("rds", used=False),
                _svc("lambda", used=False),
            ]
        )
        assert nhi.granted_service_count() == 4
        assert nhi.used_service_count() == 1
        assert nhi.privilege_gap_ratio() == 0.75
        assert sorted(nhi.unused_services()) == ["ec2", "lambda", "rds"]

    def test_all_used_zero_gap(self):
        nhi = make_nhi(
            service_last_accessed=[_svc("s3", used=True), _svc("ec2", used=True)]
        )
        assert nhi.privilege_gap_ratio() == 0.0
        assert nhi.unused_services() == []


class TestLeastPrivilegeFinding:
    def _ids(self, nhi):
        return [f.finding_id for f in nhi.findings]

    def test_excessive_unused_permissions_finding(self, scorer):
        nhi = scorer.score(
            make_nhi(
                service_last_accessed=[
                    _svc("s3", used=True),
                    _svc("ec2", used=False),
                    _svc("rds", used=False),
                    _svc("dynamodb", used=False),
                ]
            )
        )
        assert "NHI-006" in self._ids(nhi)
        f = next(f for f in nhi.findings if f.finding_id == "NHI-006")
        assert "ec2" in f.remediation and "rds" in f.remediation
        assert f.evidence["unused_services"]

    def test_no_finding_when_gap_below_threshold(self, scorer):
        # 1 of 4 unused = 0.25 gap, below the 0.5 trigger
        nhi = scorer.score(
            make_nhi(
                service_last_accessed=[
                    _svc("s3", used=True),
                    _svc("ec2", used=True),
                    _svc("rds", used=True),
                    _svc("dynamodb", used=False),
                ]
            )
        )
        assert "NHI-006" not in self._ids(nhi)

    def test_no_finding_when_too_few_grants(self, scorer):
        # High gap but only 2 grants — below the 4-service noise floor
        nhi = scorer.score(
            make_nhi(
                service_last_accessed=[_svc("s3", used=False), _svc("ec2", used=False)]
            )
        )
        assert "NHI-006" not in self._ids(nhi)

    def test_high_privilege_escalates_to_high(self, scorer):
        nhi = scorer.score(
            make_nhi(
                attached_policies=["iam:*"],  # privilege 9.0
                service_last_accessed=[
                    _svc("s3", used=False),
                    _svc("ec2", used=False),
                    _svc("rds", used=False),
                    _svc("lambda", used=False),
                ],
            )
        )
        f = next(f for f in nhi.findings if f.finding_id == "NHI-006")
        assert f.risk_level == RiskLevel.HIGH

    def test_severe_gap_bumps_exposure(self, scorer):
        """A severe unused-permission gap raises the exposure score (calibration)."""
        base = scorer.score(make_nhi())
        gapped = scorer.score(
            make_nhi(
                service_last_accessed=[_svc(f"svc{i}", used=False) for i in range(4)]
            )
        )
        assert gapped.exposure_score > base.exposure_score
