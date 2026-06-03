"""
Core data models for AgentSentry.

Every NHI, AI Agent, Resource, and Risk Finding is represented here.
Pydantic models give us free validation, serialization, and type safety.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class NHIType(str, Enum):
    IAM_ROLE           = "iam_role"
    IAM_USER_KEY       = "iam_user_key"
    SERVICE_ACCOUNT    = "service_account"
    API_KEY            = "api_key"
    OAUTH_TOKEN        = "oauth_token"
    SSH_KEY            = "ssh_key"
    GITHUB_SECRET      = "github_secret"
    AI_AGENT           = "ai_agent"
    UNKNOWN            = "unknown"


class AutonomyLevel(str, Enum):
    HUMAN_IN_LOOP    = "human_in_loop"     # Requires human approval for actions
    SEMI_AUTONOMOUS  = "semi_autonomous"   # Some automated, some approved
    FULLY_AUTONOMOUS = "fully_autonomous"  # Runs without any human gate


class RiskLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH     = "HIGH"
    MEDIUM   = "MEDIUM"
    LOW      = "LOW"
    INFO     = "INFO"


class CloudProvider(str, Enum):
    AWS   = "aws"
    AZURE = "azure"
    GCP   = "gcp"
    LOCAL = "local"


# ---------------------------------------------------------------------------
# Non-Human Identity Model
# ---------------------------------------------------------------------------

class NonHumanIdentity(BaseModel):
    """
    Represents a single non-human identity discovered in the environment.

    This is a node in the NHI Attack Graph. Every service account,
    API key, IAM role, and AI agent becomes one of these.
    """

    # Identity
    id: str
    name: str
    type: NHIType
    provider: CloudProvider = CloudProvider.AWS
    arn: str | None = None                   # AWS ARN or equivalent

    # Lifecycle
    created_date: datetime | None = None
    last_used: datetime | None = None
    last_rotated: datetime | None = None

    # Permissions
    attached_policies: list[str] = Field(default_factory=list)
    inline_policies: list[dict[str, Any]] = Field(default_factory=list)
    trust_policy: dict[str, Any] | None = None   # Who can assume this role
    is_cross_account: bool = False
    is_internet_facing: bool = False

    # AI Agent specific (populated by LangChain scanner)
    autonomy_level: AutonomyLevel | None = None
    agent_tools: list[str] = Field(default_factory=list)
    has_memory: bool = False
    source_file: str | None = None

    # Risk scoring (computed by scorer.py)
    privilege_score: float = 0.0
    reachability_score: float = 0.0
    exposure_score: float = 0.0
    ai_amplification_factor: float = 1.0
    risk_score: float = 0.0
    risk_level: RiskLevel = RiskLevel.INFO

    # Findings attached to this NHI
    findings: list[Finding] = Field(default_factory=list)

    # MITRE ATT&CK techniques mapped to this NHI's risk patterns
    mitre_techniques: list[str] = Field(default_factory=list)

    def days_since_last_rotation(self) -> int | None:
        if self.last_rotated is None:
            return None
        return (datetime.now(self.last_rotated.tzinfo) - self.last_rotated).days

    def days_since_last_use(self) -> int | None:
        if self.last_used is None:
            return None
        return (datetime.now(self.last_used.tzinfo) - self.last_used).days

    def is_stale(self, threshold_days: int = 90) -> bool:
        days = self.days_since_last_use()
        return days is not None and days > threshold_days


# ---------------------------------------------------------------------------
# Resource Model (what NHIs have access TO)
# ---------------------------------------------------------------------------

class Resource(BaseModel):
    """
    A cloud resource that NHIs can access.
    These are also nodes in the attack graph — the targets.
    """
    id: str
    name: str
    resource_type: str      # e.g. "s3_bucket", "rds_instance", "lambda_function"
    provider: CloudProvider
    arn: str | None = None
    is_crown_jewel: bool = False    # High-value target (set by user or heuristic)
    sensitivity_tags: list[str] = Field(default_factory=list)
    is_public: bool = False


# ---------------------------------------------------------------------------
# Finding Model (individual risk issues)
# ---------------------------------------------------------------------------

class Finding(BaseModel):
    """
    A specific security issue identified on an NHI.
    Each Finding maps to MITRE ATT&CK technique(s) and a remediation step.
    """
    finding_id: str
    title: str
    description: str
    risk_level: RiskLevel
    mitre_techniques: list[str] = Field(default_factory=list)
    remediation: str
    evidence: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Scan Result — top-level output of a scan run
# ---------------------------------------------------------------------------

class ScanResult(BaseModel):
    """
    The complete output of one AgentSentry scan run.
    Serializable to JSON for report generation and API output.
    """
    scan_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    provider: CloudProvider
    account_id: str | None = None

    nhis: list[NonHumanIdentity] = Field(default_factory=list)
    resources: list[Resource] = Field(default_factory=list)

    # Summary stats
    @property
    def total_nhis(self) -> int:
        return len(self.nhis)

    @property
    def critical_count(self) -> int:
        return sum(1 for n in self.nhis if n.risk_level == RiskLevel.CRITICAL)

    @property
    def high_count(self) -> int:
        return sum(1 for n in self.nhis if n.risk_level == RiskLevel.HIGH)

    @property
    def ai_agent_count(self) -> int:
        return sum(1 for n in self.nhis if n.type == NHIType.AI_AGENT)
