"""
AgentSentry Risk Scoring Engine

Implements the NHI Risk Score model:
    Risk = P (Privilege) × R (Reachability) × E (Exposure) × A (AI-Amplification)

The AI-Amplification Factor (A) is the novel academic contribution:
no existing framework accounts for how autonomous AI agents multiply
the blast radius of a compromised non-human identity.

Reference: AgentSentry paper (2026) — Section 4: The Scoring Framework
"""

from __future__ import annotations


from agentsentry.core.models import (
    NO_ROTATION_GOVERNANCE_POLICY,
    ZOMBIE_CREDENTIAL_THRESHOLD_DAYS,
    AutonomyLevel,
    Finding,
    NonHumanIdentity,
    NHIType,
    RiskLevel,
)

# ---------------------------------------------------------------------------
# Permission weight table
# Used to compute the Privilege Score (P)
# ---------------------------------------------------------------------------

PERMISSION_WEIGHTS: dict[str, float] = {
    # Destructive / irreversible
    "iam:*": 9.0,
    "sts:AssumeRole": 7.0,
    "iam:CreateUser": 8.0,
    "iam:AttachRolePolicy": 8.5,
    "iam:PassRole": 7.5,
    "s3:DeleteBucket": 5.0,
    "s3:PutBucketPolicy": 6.0,
    "ec2:TerminateInstances": 5.0,
    "lambda:InvokeFunction": 4.0,
    "lambda:UpdateFunctionCode": 6.0,
    # Write access
    "s3:PutObject": 2.5,
    "rds:CreateDBInstance": 4.0,
    "secretsmanager:GetSecretValue": 5.0,
    "secretsmanager:PutSecretValue": 6.0,
    # Read access
    "s3:GetObject": 1.0,
    "ec2:DescribeInstances": 1.0,
    "iam:ListRoles": 1.5,
    # Wildcard — always high risk
    "*": 10.0,
    # ── Azure RBAC roles (parity with the AWS table) ──────────────────
    "Owner": 10.0,
    "Contributor": 9.0,
    "User Access Administrator": 9.5,
    "Security Admin": 8.5,
    "Key Vault Administrator": 8.0,
    "Key Vault Secrets Officer": 7.0,
    "Key Vault Secrets User": 5.0,
    "Storage Blob Data Owner": 7.0,
    "Storage Blob Data Contributor": 6.0,
    "Storage Blob Data Reader": 2.0,
    "Reader": 1.5,
    # ── GCP IAM roles (parity with the AWS table) ─────────────────────
    "roles/owner": 10.0,
    "roles/editor": 9.0,
    "roles/iam.serviceAccountAdmin": 8.5,
    "roles/iam.securityAdmin": 8.5,
    "roles/iam.serviceAccountTokenCreator": 8.0,  # impersonation
    "roles/iam.serviceAccountKeyAdmin": 8.0,
    "roles/secretmanager.admin": 8.0,
    "roles/secretmanager.secretAccessor": 5.0,
    "roles/storage.admin": 7.0,
    "roles/bigquery.admin": 7.0,
    "roles/bigquery.dataViewer": 1.5,
    "roles/storage.objectViewer": 1.5,
    "roles/viewer": 1.5,
    # ── Local-machine privilege markers ───────────────────────────────
    "docker:root_equivalent": 10.0,
    "github:admin": 8.0,          # gh CLI OAuth token — broad repo + org scope
    "k8s:cluster-admin": 9.0,     # kubeconfig with cluster-admin binding
    "terraform:token": 6.0,       # Terraform Cloud/Enterprise token
    "npm:token": 4.0,             # npm publish token
    "pypi:token": 4.0,            # PyPI upload token
    "netrc:credentials": 5.0,     # plaintext .netrc (unknown scope)
}


# ---------------------------------------------------------------------------
# GitHub PAT/OAuth scope → privilege weight
# Used to compute the Privilege Score (P) for GitHub token NHIs
# ---------------------------------------------------------------------------

GITHUB_SCOPE_WEIGHTS: dict[str, float] = {
    "admin:enterprise": 10.0,
    "admin:org": 9.0,
    "delete_repo": 8.5,
    "admin:repo_hook": 8.5,
    "workflow": 8.0,
    "repo": 7.0,
    "write:packages": 6.0,
    "user": 4.0,
    "read:org": 4.0,
}


# ---------------------------------------------------------------------------
# Tool blast radius scores for AI agents
# Used in the AI-Amplification Factor (A)
# ---------------------------------------------------------------------------

TOOL_BLAST_SCORES: dict[str, float] = {
    # Irreversible / high-impact tools
    "send_email": 3.0,
    "delete_record": 4.0,
    "execute_code": 5.0,
    "deploy": 5.0,
    "transfer_funds": 6.0,
    "call_api": 3.0,
    "write_file": 2.5,
    "create_ticket": 2.0,
    "update_database": 3.5,
    "send_slack_message": 2.0,
    # Read-only tools
    "search_web": 1.0,
    "read_file": 1.0,
    "query_database": 1.5,
    "get_calendar": 1.0,
}

IRREVERSIBLE_TOOLS = {
    "send_email",
    "delete_record",
    "transfer_funds",
    "deploy",
    "execute_code",
    "send_slack_message",
}


# ---------------------------------------------------------------------------
# Scorer
# ---------------------------------------------------------------------------


class NHIScorer:
    """
    Computes risk scores for NonHumanIdentity objects.

    Usage:
        scorer = NHIScorer()
        nhi = scorer.score(nhi)  # returns nhi with scores populated
    """

    # Policies so dangerous the NHI is always CRITICAL regardless of other factors
    ALWAYS_CRITICAL_POLICIES = {"AdministratorAccess", "PowerUserAccess"}

    def score(self, nhi: NonHumanIdentity) -> NonHumanIdentity:
        """Score a single NHI. Mutates and returns the NHI."""
        nhi.privilege_score = self._privilege_score(nhi)
        nhi.reachability_score = self._reachability_score(nhi)
        nhi.exposure_score = self._exposure_score(nhi)
        nhi.ai_amplification_factor = self._ai_amplification_factor(nhi)

        nhi.risk_score = (
            nhi.privilege_score
            * nhi.reachability_score
            * nhi.exposure_score
            * nhi.ai_amplification_factor
        )

        # Override: admin-level policies are always CRITICAL — no exceptions
        has_admin_policy = any(
            p in self.ALWAYS_CRITICAL_POLICIES for p in nhi.attached_policies
        )
        if has_admin_policy:
            nhi.risk_score = max(nhi.risk_score, 100.0)

        # AI agents without cloud permissions use a scaled threshold:
        # they can't be compared directly to an IAM role with AdminAccess.
        # Cap pure AI agent scores at HIGH unless fully autonomous.
        if (
            nhi.type == NHIType.AI_AGENT
            and not nhi.attached_policies
            and nhi.autonomy_level != AutonomyLevel.FULLY_AUTONOMOUS
        ):
            nhi.risk_score = min(nhi.risk_score, 99.0)

        nhi.risk_level = self._risk_level(nhi.risk_score)
        # Append, don't overwrite: providers (e.g. LocalProvider) may have
        # already attached specific findings (e.g. "AWS Access Key ID in
        # environment", "Unencrypted SSH private key") — preserve those
        # alongside the generic NHI-00x findings generated here.
        nhi.findings = nhi.findings + self._generate_findings(nhi)
        nhi.mitre_techniques = self._map_mitre(nhi)

        return nhi

    def score_all(self, nhis: list[NonHumanIdentity]) -> list[NonHumanIdentity]:
        return [self.score(nhi) for nhi in nhis]

    # ------------------------------------------------------------------
    # P — Privilege Score
    # ------------------------------------------------------------------

    def _privilege_score(self, nhi: NonHumanIdentity) -> float:
        """
        Measures how powerful the identity's permissions are.
        Higher = more privilege = more damage if compromised.
        """
        if not nhi.attached_policies and not nhi.inline_policies:
            return 1.0

        score = 1.0

        # Check for AdministratorAccess — reuse class constant to avoid drift
        for policy in nhi.attached_policies:
            if policy in self.ALWAYS_CRITICAL_POLICIES:
                return 10.0  # Maximum privilege — short circuit
            score = max(
                score,
                PERMISSION_WEIGHTS.get(policy, 1.0),
                GITHUB_SCOPE_WEIGHTS.get(policy, 1.0),
            )

        # Scan inline policy statements
        for policy_doc in nhi.inline_policies:
            for statement in policy_doc.get("Statement", []):
                if statement.get("Effect") != "Allow":
                    continue
                actions = statement.get("Action", [])
                if isinstance(actions, str):
                    actions = [actions]
                for action in actions:
                    if action == "*" or action.endswith(":*"):
                        score = max(score, PERMISSION_WEIGHTS.get("*", 10.0))
                    else:
                        score = max(score, PERMISSION_WEIGHTS.get(action, 1.0))

        # Cross-account access compounds privilege
        if nhi.is_cross_account:
            score *= 1.5

        return min(score, 10.0)

    # ------------------------------------------------------------------
    # R — Reachability Score
    # ------------------------------------------------------------------

    def _reachability_score(self, nhi: NonHumanIdentity) -> float:
        """
        How easy is it for an attacker to reach and use this identity?
        Internet-facing identities are the highest risk.
        """
        if nhi.is_internet_facing:
            return 3.0

        # GitHub Actions secrets and API keys are often accessible
        # via public CI/CD pipelines — treat as semi-exposed
        if nhi.type in (NHIType.GITHUB_SECRET, NHIType.API_KEY):
            return 2.0

        # AI agents often have broad tool access and external communication
        if nhi.type == NHIType.AI_AGENT:
            return 2.5

        return 1.0  # Internal only

    # ------------------------------------------------------------------
    # E — Exposure Score
    # ------------------------------------------------------------------

    def _exposure_score(self, nhi: NonHumanIdentity) -> float:
        """
        How poorly managed is this identity's lifecycle?
        Stale, unrotated credentials are the most exposed.
        """
        # Local findings with zero rotation mechanism (unencrypted SSH keys,
        # plaintext .env secrets) are maximally exposed by definition.
        if NO_ROTATION_GOVERNANCE_POLICY in nhi.attached_policies:
            return 5.0

        score = 1.0

        days_since_rotation = nhi.days_since_last_rotation()
        days_since_use = nhi.days_since_last_use()

        # Rotation staleness
        if days_since_rotation is None:
            # Never rotated — worst case
            score *= 3.0
        elif days_since_rotation > 365:
            score *= 2.5
        elif days_since_rotation > 90:
            score *= 1.75

        # Unused but still active — zombie credential
        if (
            days_since_use is not None
            and days_since_use > ZOMBIE_CREDENTIAL_THRESHOLD_DAYS
        ):
            score *= 1.5

        # No governance information at all
        if nhi.created_date is None:
            score *= 1.25

        return min(score, 5.0)

    # ------------------------------------------------------------------
    # A — AI-Amplification Factor (NOVEL CONTRIBUTION)
    # ------------------------------------------------------------------

    def _ai_amplification_factor(self, nhi: NonHumanIdentity) -> float:
        """
        Computes how much an autonomous AI agent multiplies blast radius.

        This factor equals 1.0 for all non-AI identities (no amplification).
        For AI agents, it compounds autonomy, tool destructiveness, and
        action irreversibility into a single multiplier.

        This is the academically novel component of the AgentSentry
        scoring framework — no existing NHI risk model accounts for
        the amplification effect of autonomous AI tool execution.

        Formula:
            A = autonomy_weight × max_tool_blast × reversibility_factor
        """
        if nhi.type != NHIType.AI_AGENT:
            return 1.0

        # Autonomy weight
        autonomy_weights = {
            AutonomyLevel.HUMAN_IN_LOOP: 1.0,
            AutonomyLevel.SEMI_AUTONOMOUS: 2.0,
            AutonomyLevel.FULLY_AUTONOMOUS: 4.0,
        }
        autonomy = autonomy_weights.get(
            nhi.autonomy_level, 2.0  # Default: assume semi-autonomous if unknown
        )

        # Tool blast radius — worst-case tool determines ceiling
        if nhi.agent_tools:
            tool_blast = max(
                TOOL_BLAST_SCORES.get(tool, 1.5) for tool in nhi.agent_tools
            )
        else:
            tool_blast = 1.5  # Unknown tools — conservative assumption

        # Reversibility — does any tool take irreversible actions?
        has_irreversible = any(tool in IRREVERSIBLE_TOOLS for tool in nhi.agent_tools)
        reversibility_factor = 2.5 if has_irreversible else 1.0

        return autonomy * tool_blast * reversibility_factor

    # ------------------------------------------------------------------
    # Risk Level Classification
    # ------------------------------------------------------------------

    def _risk_level(self, score: float) -> RiskLevel:
        if score >= 100:
            return RiskLevel.CRITICAL
        elif score >= 50:
            return RiskLevel.HIGH
        elif score >= 20:
            return RiskLevel.MEDIUM
        elif score >= 5:
            return RiskLevel.LOW
        return RiskLevel.INFO

    # ------------------------------------------------------------------
    # Finding Generation
    # ------------------------------------------------------------------

    def _generate_findings(self, nhi: NonHumanIdentity) -> list[Finding]:
        findings = []

        # Over-privileged identity
        if nhi.privilege_score >= 8.0:
            findings.append(
                Finding(
                    finding_id="NHI-001",
                    title="Over-Privileged Identity",
                    description=(
                        f"'{nhi.name}' has a privilege score of {nhi.privilege_score:.1f}/10. "
                        "This identity has permissions far beyond what is typically required."
                    ),
                    risk_level=(
                        RiskLevel.CRITICAL
                        if nhi.privilege_score >= 9.0
                        else RiskLevel.HIGH
                    ),
                    mitre_techniques=["T1078.004"],
                    remediation=(
                        "Apply least-privilege: enumerate what this identity actually uses "
                        "via CloudTrail/access advisor, remove all other permissions. "
                        "Replace wildcard policies with specific action lists."
                    ),
                    evidence={
                        "privilege_score": nhi.privilege_score,
                        "policies": nhi.attached_policies,
                    },
                )
            )

        # Never rotated
        days = nhi.days_since_last_rotation()
        if days is None or days > 365:
            findings.append(
                Finding(
                    finding_id="NHI-002",
                    title="Credential Never Rotated or Rotation Overdue",
                    description=(
                        f"'{nhi.name}' has not had its credentials rotated "
                        f"{'ever' if days is None else f'in {days} days'}. "
                        "Long-lived credentials are a primary initial access vector."
                    ),
                    risk_level=RiskLevel.HIGH,
                    mitre_techniques=["T1528"],
                    remediation=(
                        "Implement automatic rotation via AWS Secrets Manager or equivalent. "
                        "Target rotation interval: 90 days for service accounts, "
                        "30 days for API keys with write access."
                    ),
                    evidence={"days_since_rotation": days},
                )
            )

        # Stale / zombie credential
        if nhi.is_stale(threshold_days=ZOMBIE_CREDENTIAL_THRESHOLD_DAYS):
            findings.append(
                Finding(
                    finding_id="NHI-003",
                    title="Zombie Credential — Active But Unused",
                    description=(
                        f"'{nhi.name}' has not been used in "
                        f"{nhi.days_since_last_use()} days but remains active. "
                        "Unused credentials are a silent attack surface."
                    ),
                    risk_level=RiskLevel.MEDIUM,
                    mitre_techniques=["T1078"],
                    remediation=(
                        "Disable or delete this identity. If it belongs to a decommissioned "
                        "service or pipeline, remove it entirely. "
                        "Set up quarterly access reviews to catch future zombies."
                    ),
                    evidence={"days_since_last_use": nhi.days_since_last_use()},
                )
            )

        # Autonomous AI agent with irreversible tools
        if (
            nhi.type == NHIType.AI_AGENT
            and nhi.autonomy_level == AutonomyLevel.FULLY_AUTONOMOUS
            and any(t in IRREVERSIBLE_TOOLS for t in nhi.agent_tools)
        ):
            findings.append(
                Finding(
                    finding_id="NHI-004",
                    title="Fully Autonomous AI Agent With Irreversible Tools — No Human Gate",
                    description=(
                        f"'{nhi.name}' is a fully autonomous AI agent with access to "
                        f"irreversible tools: "
                        f"{[t for t in nhi.agent_tools if t in IRREVERSIBLE_TOOLS]}. "
                        "A prompt injection or compromised orchestration layer could "
                        "trigger these tools at machine speed with no human review."
                    ),
                    risk_level=RiskLevel.CRITICAL,
                    mitre_techniques=["T1651", "T1059"],
                    remediation=(
                        "Implement a human-in-the-loop approval callback for all irreversible "
                        "tool calls. Set a max_iterations cap. Add a prompt injection "
                        "firewall to the RAG pipeline if one exists. Log all tool calls "
                        "to a tamper-evident audit trail."
                    ),
                    evidence={
                        "autonomy_level": nhi.autonomy_level,
                        "irreversible_tools": [
                            t for t in nhi.agent_tools if t in IRREVERSIBLE_TOOLS
                        ],
                        "ai_amplification_factor": nhi.ai_amplification_factor,
                    },
                )
            )

        # Cross-account trust
        if nhi.is_cross_account:
            findings.append(
                Finding(
                    finding_id="NHI-005",
                    title="Cross-Account Trust Relationship",
                    description=(
                        f"'{nhi.name}' can be assumed by principals in external AWS accounts. "
                        "Cross-account trust relationships are frequently misconfigured "
                        "and are a common lateral movement path."
                    ),
                    risk_level=RiskLevel.HIGH,
                    mitre_techniques=["T1199"],
                    remediation=(
                        "Audit the trust policy. Ensure the external account ID is correct. "
                        "Add an ExternalId condition. Restrict to specific principals, "
                        "not the entire account root."
                    ),
                    evidence={"trust_policy": nhi.trust_policy},
                )
            )

        return findings

    # ------------------------------------------------------------------
    # MITRE ATT&CK Mapping
    # ------------------------------------------------------------------

    def _map_mitre(self, nhi: NonHumanIdentity) -> list[str]:
        techniques = set()
        for finding in nhi.findings:
            techniques.update(finding.mitre_techniques)
        return sorted(techniques)
