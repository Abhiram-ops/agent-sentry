from datetime import datetime, timedelta, timezone
import agentsentry.core.models
import agentsentry.core.scorer

# 1. Define the real-world payload
target_identity = agentsentry.core.models.NonHumanIdentity(
    id="nhi-agent-sre-09",
    name="production-sre-copilot",
    type=agentsentry.core.models.NHIType.AI_AGENT,
    provider=agentsentry.core.models.CloudProvider.AWS,
    attached_policies=["lambda:InvokeFunction", "ec2:TerminateInstances"],
    inline_policies=[],
    is_cross_account=False,
    is_internet_facing=False,
    created_date=datetime.now(timezone.utc) - timedelta(days=200),
    last_rotated=None,
    last_used=datetime.now(timezone.utc) - timedelta(days=5),
    autonomy_level=agentsentry.core.models.AutonomyLevel.HUMAN_IN_LOOP,
    agent_tools=["read_file", "query_database"]
)

# 2. Initialize the engine
scorer = agentsentry.core.scorer.NHIScorer()

# 3. Score the identity
scored_nhi = scorer.score(target_identity)

# 4. Print the exact mathematical breakdown
print("\n=== AgentSentry Risk Score Breakdown ===")
print(f"Target:      {scored_nhi.name}")
print(f"Risk Level:  {scored_nhi.risk_level.value}")
print(f"Final Score: {scored_nhi.risk_score:.2f}")
print("----------------------------------------")
print(f"Privilege (P):    {scored_nhi.privilege_score:.2f}")
print(f"Reachability (R): {scored_nhi.reachability_score:.2f}")
print(f"Exposure (E):     {scored_nhi.exposure_score:.2f}")
print(f"AI Amp (A):       {scored_nhi.ai_amplification_factor:.2f}")
print("\nTriggered Findings:")
for finding in scored_nhi.findings:
    print(f"- [{finding.risk_level.value}] {finding.title}")