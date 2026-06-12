"""
Tests for the NHI Attack Graph (agentsentry/core/graph.py),
focused on NHI → NHI lateral movement (sts:AssumeRole chains).
"""

from __future__ import annotations

import pytest

from agentsentry.core.graph import (
    LATERAL_MOVEMENT_EDGE_WEIGHT,
    NHIAttackGraph,
)
from agentsentry.core.models import (
    CloudProvider,
    NHIType,
    NonHumanIdentity,
    Resource,
)

ACCT = "123456789012"


def role(rid: str, name: str, trust: dict | None = None) -> NonHumanIdentity:
    return NonHumanIdentity(
        id=rid,
        name=name,
        type=NHIType.IAM_ROLE,
        provider=CloudProvider.AWS,
        arn=f"arn:aws:iam::{ACCT}:role/{name}",
        trust_policy=trust,
    )


@pytest.fixture()
def chain_graph():
    """A: plain role. B trusts A's ARN. C trusts the account root.
    D trusts an external account. E only has Deny / non-assume / service
    statements. B can reach a crown jewel."""
    a = role("role-a", "ci-runner")
    b = role(
        "role-b",
        "deploy-role",
        trust={
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": f"arn:aws:iam::{ACCT}:role/ci-runner"},
                    "Action": "sts:AssumeRole",
                }
            ]
        },
    )
    c = role(
        "role-c",
        "audit-role",
        trust={
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": f"arn:aws:iam::{ACCT}:root"},
                    "Action": ["sts:AssumeRole"],
                }
            ]
        },
    )
    d = role(
        "role-d",
        "external-trusting",
        trust={
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "arn:aws:iam::999988887777:root"},
                    "Action": "sts:AssumeRole",
                }
            ]
        },
    )
    e = role(
        "role-e",
        "no-assume",
        trust={
            "Statement": [
                {
                    "Effect": "Deny",
                    "Principal": {"AWS": f"arn:aws:iam::{ACCT}:role/ci-runner"},
                    "Action": "sts:AssumeRole",
                },
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": f"arn:aws:iam::{ACCT}:role/ci-runner"},
                    "Action": "sts:GetCallerIdentity",
                },
                {
                    "Effect": "Allow",
                    "Principal": {"Service": "lambda.amazonaws.com"},
                    "Action": "sts:AssumeRole",
                },
            ]
        },
    )

    nhis = [a, b, c, d, e]
    g = NHIAttackGraph()
    for n in nhis:
        g.add_nhi(n)
    g.add_resource(
        Resource(
            id="res-jewel",
            name="prod-secrets",
            resource_type="secretsmanager",
            provider=CloudProvider.AWS,
            is_crown_jewel=True,
        )
    )
    g.add_access_edge("role-b", "res-jewel", "secretsmanager:GetSecretValue", 1.0)
    added = g.build_lateral_movement_edges(nhis)
    return g, nhis, added


def lateral_edges(g: NHIAttackGraph) -> dict:
    return {
        (u, v): data
        for u, v, data in g.G.edges(data=True)
        if data.get("edge_type") == "lateral_movement"
    }


class TestLateralMovement:
    def test_exact_arn_principal_match(self, chain_graph):
        g, _, _ = chain_graph
        assert ("role-a", "role-b") in lateral_edges(g)

    def test_account_root_fans_in_from_all_account_nhis(self, chain_graph):
        g, _, _ = chain_graph
        edges = lateral_edges(g)
        for src in ("role-a", "role-b", "role-d", "role-e"):
            assert (src, "role-c") in edges

    def test_no_self_edges(self, chain_graph):
        g, _, _ = chain_graph
        assert ("role-c", "role-c") not in lateral_edges(g)

    def test_external_account_produces_no_edge(self, chain_graph):
        g, _, _ = chain_graph
        assert not any(v == "role-d" for (u, v) in lateral_edges(g))

    def test_deny_non_assume_and_service_principals_ignored(self, chain_graph):
        g, _, _ = chain_graph
        assert not any(v == "role-e" for (u, v) in lateral_edges(g))

    def test_edge_weight_and_permission(self, chain_graph):
        g, _, _ = chain_graph
        data = lateral_edges(g)[("role-a", "role-b")]
        assert data["weight"] == LATERAL_MOVEMENT_EDGE_WEIGHT == 0.3
        assert data["permission"] == "sts:AssumeRole"

    def test_edge_count_returned(self, chain_graph):
        g, _, added = chain_graph
        assert added == len(lateral_edges(g)) == 5

    def test_blast_radius_traverses_assume_chain(self, chain_graph):
        g, _, _ = chain_graph
        br = g.blast_radius("role-a")
        assert "prod-secrets" in br["crown_jewels_at_risk"]
        assert br["reachable_count"] == 3  # role-b, role-c, jewel
        assert br["attack_paths"]["prod-secrets"] == [
            "ci-runner",
            "deploy-role",
            "prod-secrets",
        ]

    def test_idempotent_rebuild(self, chain_graph):
        g, nhis, _ = chain_graph
        g.build_lateral_movement_edges(nhis)
        assert len(lateral_edges(g)) == 5

    def test_nhis_without_trust_policy_are_safe(self):
        g = NHIAttackGraph()
        n = role("solo", "solo-role")
        g.add_nhi(n)
        assert g.build_lateral_movement_edges([n]) == 0

    def test_crown_jewels_sorted_deterministically(self, chain_graph):
        g, _, _ = chain_graph
        g.add_resource(
            Resource(
                id="res-alpha",
                name="alpha-db",
                resource_type="rds_instance",
                provider=CloudProvider.AWS,
                is_crown_jewel=True,
            )
        )
        g.add_access_edge("role-b", "res-alpha", "rds:*", 1.0)
        br = g.blast_radius("role-a")
        assert br["crown_jewels_at_risk"] == sorted(br["crown_jewels_at_risk"])
