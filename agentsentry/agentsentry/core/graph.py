"""
NHI Attack Graph

Builds a directed graph where:
  - Nodes = NHIs, Resources, AI Agents
  - Edges = access relationships (IAM grants, API calls, trust policies)

Uses NetworkX for graph algorithms and Pyvis for interactive visualization.
The blast_radius() method is the core output: given a compromised NHI,
what can an attacker reach and how quickly?
"""

from __future__ import annotations

import re
from pathlib import Path

import networkx as nx

from agentsentry.core.models import NonHumanIdentity, NHIType, Resource, RiskLevel


RISK_COLORS = {
    RiskLevel.CRITICAL: "#e74c3c",
    RiskLevel.HIGH:     "#e67e22",
    RiskLevel.MEDIUM:   "#f1c40f",
    RiskLevel.LOW:      "#2ecc71",
    RiskLevel.INFO:     "#95a5a6",
}

# Edge weight for NHI → NHI lateral movement (sts:AssumeRole chains).
# Weights are attack-path COST (lower = easier to traverse), so 0.3 marks
# role assumption as one of the cheapest, most dangerous pivots available.
LATERAL_MOVEMENT_EDGE_WEIGHT = 0.3

# Trust-policy actions that let a principal become another identity.
_ASSUME_ACTIONS = {
    "sts:assumerole",
    "sts:assumerolewithsaml",
    "sts:assumerolewithwebidentity",
    "sts:*",
    "*",
}


class NHIAttackGraph:
    """
    Directed graph of NHIs, resources, and their access relationships.

    Build the graph by calling:
        graph.add_nhi(nhi)
        graph.add_resource(resource)
        graph.add_access_edge(nhi_id, resource_id, permission)

    Then query it:
        graph.blast_radius(nhi_id)
        graph.visualize("output.html")
    """

    def __init__(self):
        self.G: nx.DiGraph = nx.DiGraph()

    # ------------------------------------------------------------------
    # Graph construction
    # ------------------------------------------------------------------

    def add_nhi(self, nhi: NonHumanIdentity) -> None:
        self.G.add_node(
            nhi.id,
            label=nhi.name,
            node_type="nhi",
            nhi_type=nhi.type.value,
            risk_score=nhi.risk_score,
            risk_level=nhi.risk_level.value,
            color=RISK_COLORS.get(nhi.risk_level, "#95a5a6"),
            size=self._node_size(nhi.risk_score),
            title=self._nhi_tooltip(nhi),
        )

    def add_resource(self, resource: Resource) -> None:
        color = "#8e44ad" if resource.is_crown_jewel else "#2980b9"
        size = 30 if resource.is_crown_jewel else 15
        self.G.add_node(
            resource.id,
            label=resource.name,
            node_type="resource",
            resource_type=resource.resource_type,
            is_crown_jewel=resource.is_crown_jewel,
            color=color,
            size=size,
            title=f"{'👑 CROWN JEWEL: ' if resource.is_crown_jewel else ''}{resource.name}\nType: {resource.resource_type}",
        )

    def add_access_edge(
        self,
        from_id: str,
        to_id: str,
        permission: str,
        weight: float = 1.0,
        edge_type: str = "access",
    ) -> None:
        """
        Add a directed edge: from_id CAN ACCESS to_id via permission.
        Weight represents attack path cost (lower = easier to traverse).
        """
        self.G.add_edge(
            from_id,
            to_id,
            permission=permission,
            weight=weight,
            edge_type=edge_type,
            title=f"Permission: {permission}",
        )

    # ------------------------------------------------------------------
    # Lateral Movement (NHI → NHI edges from trust policies)
    # ------------------------------------------------------------------

    def build_lateral_movement_edges(
        self, nhis: list[NonHumanIdentity]
    ) -> int:
        """
        Parse each NHI's trust_policy and add NHI → NHI lateral-movement
        edges for sts:AssumeRole chains.

        If role B's trust policy allows principal A to assume it, an
        attacker who compromises A can pivot to B — so the edge points
        A → B with weight LATERAL_MOVEMENT_EDGE_WEIGHT (0.3): role
        assumption is a single API call, making it one of the cheapest
        attack-path hops in the graph.

        Principal resolution:
          - Exact ARN match → edge from that specific NHI.
          - Account-root ARN (arn:aws:iam::<acct>:root) → edge from every
            scanned NHI in that account, because root delegates to any
            principal the account chooses.
          - Wildcard / service / unresolvable principals add no edge —
            they have no in-graph source node (cross-account exposure is
            already captured by the NHI-005 finding).

        NHIs must already be in the graph via add_nhi(). Returns the
        number of edges added.
        """
        # ARN → NHI ids (an IAM user with two access keys shares one ARN)
        arn_index: dict[str, list[str]] = {}
        # Account id → NHI ids, for account-root principals
        account_index: dict[str, list[str]] = {}

        for nhi in nhis:
            if not nhi.arn:
                continue
            arn_index.setdefault(nhi.arn, []).append(nhi.id)
            account = self._arn_account_id(nhi.arn)
            if account:
                account_index.setdefault(account, []).append(nhi.id)

        edges_added = 0
        for target in nhis:
            if not target.trust_policy or target.id not in self.G:
                continue

            for principal_arn in self._assumable_principals(target.trust_policy):
                source_ids: list[str] = []

                if principal_arn.endswith(":root"):
                    account = self._arn_account_id(principal_arn)
                    source_ids = account_index.get(account or "", [])
                else:
                    source_ids = arn_index.get(principal_arn, [])

                for source_id in source_ids:
                    if source_id == target.id or source_id not in self.G:
                        continue
                    self.add_access_edge(
                        source_id,
                        target.id,
                        "sts:AssumeRole",
                        weight=LATERAL_MOVEMENT_EDGE_WEIGHT,
                        edge_type="lateral_movement",
                    )
                    edges_added += 1

        return edges_added

    def _assumable_principals(self, trust_policy: dict) -> list[str]:
        """
        Extract AWS principal ARNs from Allow statements whose Action
        permits role assumption. Service principals (lambda.amazonaws.com)
        and bare wildcards are excluded — they never map to a scanned NHI.
        """
        principals: list[str] = []

        for statement in trust_policy.get("Statement", []):
            if not isinstance(statement, dict):
                continue
            if statement.get("Effect") != "Allow":
                continue

            actions = statement.get("Action", [])
            if isinstance(actions, str):
                actions = [actions]
            if not any(str(a).lower() in _ASSUME_ACTIONS for a in actions):
                continue

            principal = statement.get("Principal", {})
            if not isinstance(principal, dict):
                continue  # "Principal": "*" — unresolvable, skip
            aws_principals = principal.get("AWS", [])
            if isinstance(aws_principals, str):
                aws_principals = [aws_principals]

            for p in aws_principals:
                p = str(p)
                if p == "*":
                    continue
                principals.append(p)

        return principals

    @staticmethod
    def _arn_account_id(arn: str) -> str | None:
        """Pull the 12-digit account id out of an ARN, if present."""
        match = re.search(r"^arn:aws:[^:]*::(\d{12}):", arn)
        return match.group(1) if match else None

    # ------------------------------------------------------------------
    # Blast Radius Analysis
    # ------------------------------------------------------------------

    def blast_radius(self, nhi_id: str) -> dict:
        """
        Given a compromised NHI, compute what an attacker can reach.

        Returns a dict with:
          - reachable_count: total nodes reachable
          - crown_jewels: high-value targets reachable
          - attack_paths: shortest path to each crown jewel
          - blast_radius_score: composite severity score
        """
        if nhi_id not in self.G:
            return {"error": f"NHI '{nhi_id}' not found in graph"}

        reachable = nx.descendants(self.G, nhi_id)

        # Find crown jewels in reachable set (sorted — descendants() returns
        # a set, and CLI/report output must be deterministic run to run)
        crown_jewels = sorted(
            node for node in reachable
            if self.G.nodes[node].get("is_crown_jewel", False)
        )

        # Shortest attack paths to each crown jewel
        attack_paths = {}
        for cj in crown_jewels:
            try:
                path = nx.shortest_path(self.G, nhi_id, cj, weight="weight")
                attack_paths[self.G.nodes[cj]["label"]] = [
                    self.G.nodes[n]["label"] for n in path
                ]
            except nx.NetworkXNoPath:
                pass

        blast_score = len(reachable) * max(len(crown_jewels), 1)

        return {
            "compromised_nhi": self.G.nodes[nhi_id].get("label", nhi_id),
            "reachable_count": len(reachable),
            "crown_jewels_at_risk": [
                self.G.nodes[cj]["label"] for cj in crown_jewels
            ],
            "attack_paths": attack_paths,
            "blast_radius_score": blast_score,
        }

    def top_risk_nhis(self, n: int = 10) -> list[str]:
        """Return the n NHI node IDs with the highest risk scores."""
        nhi_nodes = [
            (node, data["risk_score"])
            for node, data in self.G.nodes(data=True)
            if data.get("node_type") == "nhi"
        ]
        nhi_nodes.sort(key=lambda x: x[1], reverse=True)
        return [node for node, _ in nhi_nodes[:n]]

    # ------------------------------------------------------------------
    # Visualization
    # ------------------------------------------------------------------

    def visualize(self, output_path: str = "agentsentry_graph.html") -> str:
        """
        Generates an interactive HTML graph using Pyvis.
        Open the output file in any browser — no server needed.
        """
        try:
            from pyvis.network import Network
        except ImportError:
            raise ImportError("Install pyvis: pip install pyvis")

        net = Network(
            height="750px",
            width="100%",
            directed=True,
            bgcolor="#1a1a2e",
            font_color="#ffffff",
        )
        net.from_nx(self.G)

        # Physics for better layout
        net.set_options("""
        {
          "physics": {
            "forceAtlas2Based": {
              "gravitationalConstant": -50,
              "springLength": 100
            },
            "solver": "forceAtlas2Based"
          }
        }
        """)

        net.save_graph(output_path)
        return output_path

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _node_size(self, risk_score: float) -> int:
        if risk_score >= 100:
            return 40
        elif risk_score >= 50:
            return 30
        elif risk_score >= 20:
            return 20
        return 12

    def _nhi_tooltip(self, nhi: NonHumanIdentity) -> str:
        lines = [
            f"Name: {nhi.name}",
            f"Type: {nhi.type.value}",
            f"Risk Score: {nhi.risk_score:.1f} ({nhi.risk_level.value})",
            f"Privilege: {nhi.privilege_score:.1f}",
            f"Reachability: {nhi.reachability_score:.1f}",
            f"Exposure: {nhi.exposure_score:.1f}",
        ]
        if nhi.type == NHIType.AI_AGENT:
            lines.append(f"AI Amplification: {nhi.ai_amplification_factor:.1f}x")
        if nhi.findings:
            lines.append(f"Findings: {len(nhi.findings)}")
        return "\n".join(lines)

    def __len__(self) -> int:
        return self.G.number_of_nodes()

    def __repr__(self) -> str:
        return (
            f"NHIAttackGraph("
            f"nodes={self.G.number_of_nodes()}, "
            f"edges={self.G.number_of_edges()})"
        )
