"""
LangChain / CrewAI / AutoGen AI Agent Scanner

Statically analyzes Python codebases to find AI agent definitions,
extract their tools and autonomy configuration, and compute the
AI-Amplification Factor (A) from the AgentSentry scoring model.

This is the academically novel scanner — no existing security tool
performs static analysis of AI agent permission boundaries.

Supports:
  - LangChain (AgentExecutor, initialize_agent, create_react_agent)
  - CrewAI (Agent, Task, Crew)
  - AutoGen (AssistantAgent, UserProxyAgent)
  - Generic: any class with a 'tools' parameter

Usage:
    python -m agentsentry scan agents --path ./src
"""

from __future__ import annotations

import ast
import hashlib
import os
from dataclasses import dataclass, field
from pathlib import Path


def _stable_id(value: str, length: int = 12) -> str:
    """Return a stable hex ID from *value* via SHA-256 (deterministic across runs)."""
    return hashlib.sha256(value.encode()).hexdigest()[:length]

from agentsentry.core.models import (
    AutonomyLevel,
    CloudProvider,
    NonHumanIdentity,
    NHIType,
    Resource,
    ScanResult,
)


# ---------------------------------------------------------------------------
# Known tool name → blast score mapping
# Extend this as new tool ecosystems emerge
# ---------------------------------------------------------------------------

KNOWN_TOOL_BLAST = {
    # Email / communication
    "send_email":           3.0,
    "send_message":         2.5,
    "send_slack_message":   2.0,
    "post_tweet":           2.0,
    # Data modification
    "write_file":           2.5,
    "delete_file":          4.0,
    "update_database":      3.5,
    "delete_record":        4.5,
    "insert_record":        3.0,
    # Code execution
    "execute_code":         5.0,
    "run_python":           5.0,
    "bash":                 5.5,
    "terminal":             5.5,
    "shell":                5.5,
    # API / web
    "call_api":             3.0,
    "http_request":         3.0,
    "web_request":          3.0,
    # Finance
    "transfer_funds":       6.0,
    "create_payment":       6.0,
    "stripe_charge":        6.0,
    # Deployment
    "deploy":               5.0,
    "create_lambda":        5.0,
    "push_to_github":       4.5,
    # Read-only (low blast)
    "search_web":           1.0,
    "google_search":        1.0,
    "read_file":            1.0,
    "query_database":       1.5,
    "get_weather":          1.0,
    "wikipedia":            1.0,
    "calculator":           1.0,
}

IRREVERSIBLE_TOOL_KEYWORDS = {
    "send", "delete", "remove", "destroy", "execute",
    "deploy", "push", "transfer", "payment", "charge",
    "bash", "shell", "terminal", "post", "publish",
}

# AST patterns that indicate agent construction
AGENT_CONSTRUCTOR_NAMES = {
    # LangChain
    "AgentExecutor",
    "initialize_agent",
    "create_react_agent",
    "create_openai_tools_agent",
    "create_structured_chat_agent",
    "create_json_agent",
    "create_csv_agent",
    # CrewAI
    "Agent",
    "Crew",
    # AutoGen
    "AssistantAgent",
    "UserProxyAgent",
    "ConversableAgent",
    "GroupChat",
}

# Parameter names that signal human oversight
HUMAN_GATE_PARAMS = {
    "human_approval",
    "human_input_mode",
    "approval_callback",
    "require_approval",
    "confirm_before_run",
}

# Parameter names that signal full autonomy
AUTONOMOUS_PARAMS = {
    "handle_parsing_errors",  # LangChain — usually set when running headless
}


# ---------------------------------------------------------------------------
# Data class for a discovered agent (pre-NHI conversion)
# ---------------------------------------------------------------------------

@dataclass
class DiscoveredAgent:
    source_file: str
    line_number: int
    constructor: str
    raw_tools: list[str] = field(default_factory=list)
    max_iterations: int | None = None
    has_memory: bool = False
    has_human_gate: bool = False
    autonomy_level: AutonomyLevel = AutonomyLevel.SEMI_AUTONOMOUS
    framework: str = "unknown"


# ---------------------------------------------------------------------------
# Main scanner
# ---------------------------------------------------------------------------

class LangChainScanner:
    """
    Recursively walks a directory, parses every .py file with the AST,
    and extracts AI agent definitions and their security-relevant config.
    """

    def __init__(self, scan_path: str = "."):
        self.scan_path = Path(scan_path)
        self._last_result = None  # populated by scan() for build_access_edges()

    def scan(self) -> ScanResult:
        agents = self._discover_agents()
        nhis = [self._agent_to_nhi(a) for a in agents]

        print(f"[AgentSentry] Scanned {self.scan_path}")
        print(f"[AgentSentry] Found {len(nhis)} AI agent(s)")

        result = ScanResult(
            scan_id=f"langchain-{self.scan_path.name}",
            provider=CloudProvider.LOCAL,
            account_id=str(self.scan_path.resolve()),
            nhis=nhis,
            resources=[],
        )
        self._last_result = result  # cache for build_access_edges()
        return result

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------

    def _discover_agents(self) -> list[DiscoveredAgent]:
        agents = []
        py_files = list(self.scan_path.rglob("*.py"))

        if not py_files:
            print(f"[AgentSentry] No Python files found in {self.scan_path}")
            return []

        seen = set()  # (filepath, line_number) dedup key

        for py_file in py_files:
            # Skip virtual environments and installed packages
            parts = py_file.parts
            if any(skip in parts for skip in
                   ("venv", ".venv", "env", "site-packages", "__pycache__", ".git")):
                continue

            try:
                source = py_file.read_text(encoding="utf-8", errors="ignore")
                tree = ast.parse(source, filename=str(py_file))
                found = self._extract_agents_from_tree(tree, str(py_file))
                for agent in found:
                    key = (agent.source_file, agent.line_number)
                    if key not in seen:
                        seen.add(key)
                        agents.append(agent)
            except SyntaxError:
                pass  # Skip files with syntax errors

        return agents

    def _extract_agents_from_tree(
        self, tree: ast.AST, filepath: str
    ) -> list[DiscoveredAgent]:
        agents = []

        for node in ast.walk(tree):
            # Pattern 1: agent = SomeAgentClass(...)
            if isinstance(node, ast.Call):
                constructor_name = self._get_call_name(node)
                if constructor_name in AGENT_CONSTRUCTOR_NAMES:
                    agent = self._parse_agent_call(node, filepath, constructor_name)
                    if agent:
                        agents.append(agent)

            # Pattern 2: agent = initialize_agent(tools=[...], ...)
            elif isinstance(node, ast.Assign):
                if isinstance(node.value, ast.Call):
                    constructor_name = self._get_call_name(node.value)
                    if constructor_name in AGENT_CONSTRUCTOR_NAMES:
                        agent = self._parse_agent_call(
                            node.value, filepath, constructor_name
                        )
                        if agent:
                            agents.append(agent)

        return agents

    def _parse_agent_call(
        self, node: ast.Call, filepath: str, constructor: str
    ) -> DiscoveredAgent | None:
        agent = DiscoveredAgent(
            source_file=filepath,
            line_number=node.lineno,
            constructor=constructor,
            framework=self._detect_framework(constructor),
        )

        for keyword in node.keywords:
            name = keyword.arg
            value = keyword.value

            if name == "tools":
                agent.raw_tools = self._extract_tool_names(value)

            elif name == "max_iterations":
                if isinstance(value, ast.Constant) and isinstance(value.value, int):
                    agent.max_iterations = value.value

            elif name == "memory" and not isinstance(value, ast.Constant):
                agent.has_memory = True

            elif name in HUMAN_GATE_PARAMS:
                agent.has_human_gate = True

            elif name == "human_input_mode":
                # AutoGen: NEVER = fully autonomous, ALWAYS = human in loop
                if isinstance(value, ast.Constant):
                    if str(value.value).upper() == "NEVER":
                        agent.autonomy_level = AutonomyLevel.FULLY_AUTONOMOUS
                    elif str(value.value).upper() == "ALWAYS":
                        agent.autonomy_level = AutonomyLevel.HUMAN_IN_LOOP

            elif name == "verbose":
                pass  # Not security relevant

        # Determine autonomy level from collected signals
        agent.autonomy_level = self._assess_autonomy(agent)

        return agent

    # ------------------------------------------------------------------
    # Tool extraction
    # ------------------------------------------------------------------

    def _extract_tool_names(self, node: ast.expr) -> list[str]:
        """
        Extracts tool names from the tools=[...] argument.
        Handles: lists of names, list of calls, list of strings.
        """
        tools = []

        if isinstance(node, ast.List):
            for elt in node.elts:
                name = self._tool_node_to_name(elt)
                if name:
                    tools.append(name)

        elif isinstance(node, ast.Name):
            # tools=my_tools_list — we can't resolve the variable statically
            # Record as unknown variable reference
            tools.append(f"<variable:{node.id}>")

        return tools

    def _tool_node_to_name(self, node: ast.expr) -> str | None:
        """Convert an AST node representing a tool to a name string."""
        if isinstance(node, ast.Name):
            # tools=[search_tool, email_tool]
            return node.id.lower()
        elif isinstance(node, ast.Call):
            # tools=[SearchTool(), EmailTool()]
            name = self._get_call_name(node)
            return name.lower() if name else None
        elif isinstance(node, ast.Constant) and isinstance(node.value, str):
            # tools=["search", "email"]
            return node.value.lower()
        elif isinstance(node, ast.Attribute):
            # tools=[tools.search, tools.email]
            return node.attr.lower()
        return None

    # ------------------------------------------------------------------
    # Autonomy assessment
    # ------------------------------------------------------------------

    def _assess_autonomy(self, agent: DiscoveredAgent) -> AutonomyLevel:
        """
        Determines autonomy level from static signals.

        Fully autonomous indicators:
          - No human gate parameter
          - max_iterations set high (>5) or not set at all
          - Has irreversible tools
          - AutoGen human_input_mode=NEVER

        Human-in-loop indicators:
          - human_approval or approval_callback present
          - AutoGen human_input_mode=ALWAYS
          - max_iterations=1
        """
        if agent.has_human_gate:
            return AutonomyLevel.HUMAN_IN_LOOP

        # Already set by AutoGen human_input_mode parsing
        if agent.autonomy_level == AutonomyLevel.FULLY_AUTONOMOUS:
            return AutonomyLevel.FULLY_AUTONOMOUS
        if agent.autonomy_level == AutonomyLevel.HUMAN_IN_LOOP:
            return AutonomyLevel.HUMAN_IN_LOOP

        has_irreversible = any(
            any(kw in tool for kw in IRREVERSIBLE_TOOL_KEYWORDS)
            for tool in agent.raw_tools
            if not tool.startswith("<variable:")
        )

        # High iteration count + irreversible tools = fully autonomous
        if has_irreversible and (agent.max_iterations is None or
                                  agent.max_iterations > 10):
            return AutonomyLevel.FULLY_AUTONOMOUS

        # Has irreversible tools but limited iterations, OR no irreversible tools
        return AutonomyLevel.SEMI_AUTONOMOUS

    # ------------------------------------------------------------------
    # NHI conversion
    # ------------------------------------------------------------------

    def _agent_to_nhi(self, agent: DiscoveredAgent) -> NonHumanIdentity:
        """Convert a DiscoveredAgent into a NonHumanIdentity for scoring."""
        rel_path = self._relative_path(agent.source_file)
        name = f"{agent.framework}-agent@{rel_path}:{agent.line_number}"

        # Resolve tool names — strip variable references for scoring
        resolved_tools = [
            t for t in agent.raw_tools
            if not t.startswith("<variable:")
        ]

        return NonHumanIdentity(
            id=f"agent-{_stable_id(agent.source_file + str(agent.line_number))}",
            name=name,
            type=NHIType.AI_AGENT,
            provider=CloudProvider.LOCAL,
            autonomy_level=agent.autonomy_level,
            agent_tools=resolved_tools,
            has_memory=agent.has_memory,
            source_file=agent.source_file,
            is_internet_facing=any(
                kw in t for t in resolved_tools
                for kw in ("web", "search", "http", "api", "request")
            ),
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_call_name(self, node: ast.Call) -> str:
        if isinstance(node.func, ast.Name):
            return node.func.id
        elif isinstance(node.func, ast.Attribute):
            return node.func.attr
        return ""

    def _detect_framework(self, constructor: str) -> str:
        langchain = {"AgentExecutor", "initialize_agent", "create_react_agent",
                     "create_openai_tools_agent", "create_structured_chat_agent"}
        crewai = {"Agent", "Crew", "Task"}
        autogen = {"AssistantAgent", "UserProxyAgent", "ConversableAgent", "GroupChat"}

        if constructor in langchain:
            return "langchain"
        elif constructor in crewai:
            return "crewai"
        elif constructor in autogen:
            return "autogen"
        return "unknown"

    def _relative_path(self, filepath: str) -> str:
        try:
            return str(Path(filepath).relative_to(self.scan_path))
        except ValueError:
            return Path(filepath).name

    def build_access_edges(self) -> list[tuple[str, str, str, float]]:
        """
        Synthesizes capability resource nodes from each agent's tool list and
        returns access edges connecting agents to the capabilities their tools grant.

        Edge weight is derived from KNOWN_TOOL_BLAST. Irreversible tools are
        tagged as crown-jewel / IRREVERSIBLE capability nodes so the graph
        renderer can highlight the most dangerous paths.

        Returns (from_id, to_id, permission, weight) tuples.
        """
        if not hasattr(self, "_last_result") or self._last_result is None:
            return []

        edges: list[tuple[str, str, str, float]] = []

        for nhi in self._last_result.nhis:
            for tool in nhi.agent_tools:
                blast = KNOWN_TOOL_BLAST.get(tool, 1.5)
                is_irreversible = any(
                    kw in tool for kw in IRREVERSIBLE_TOOL_KEYWORDS
                )
                # Stable capability node ID — same tool always gets the same ID
                cap_id = f"capability-{_stable_id(tool)}"
                label = f"tool:{tool}"
                if is_irreversible:
                    label = f"tool:{tool} [IRREVERSIBLE]"
                edges.append((nhi.id, cap_id, label, blast))

        # Deduplicate
        seen: set[tuple[str, str, str]] = set()
        deduped = []
        for e in edges:
            key = (e[0], e[1], e[2])
            if key not in seen:
                seen.add(key)
                deduped.append(e)

        return deduped
