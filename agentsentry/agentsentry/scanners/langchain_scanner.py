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
from dataclasses import dataclass, field
from pathlib import Path

from agentsentry.core.models import (
    AutonomyLevel,
    CloudProvider,
    NonHumanIdentity,
    NHIType,
    ScanResult,
)


def _stable_id(value: str, length: int = 12) -> str:
    """Return a stable hex ID from *value* via SHA-256 (deterministic across runs)."""
    return hashlib.sha256(value.encode()).hexdigest()[:length]


# ---------------------------------------------------------------------------
# Known tool name → blast score mapping
# Extend this as new tool ecosystems emerge
# ---------------------------------------------------------------------------

KNOWN_TOOL_BLAST = {
    # Email / communication
    "send_email": 3.0,
    "send_message": 2.5,
    "send_slack_message": 2.0,
    "post_tweet": 2.0,
    # Data modification
    "write_file": 2.5,
    "delete_file": 4.0,
    "update_database": 3.5,
    "delete_record": 4.5,
    "insert_record": 3.0,
    # Code execution
    "execute_code": 5.0,
    "run_python": 5.0,
    "bash": 5.5,
    "terminal": 5.5,
    "shell": 5.5,
    # API / web
    "call_api": 3.0,
    "http_request": 3.0,
    "web_request": 3.0,
    # Finance
    "transfer_funds": 6.0,
    "create_payment": 6.0,
    "stripe_charge": 6.0,
    # Deployment
    "deploy": 5.0,
    "create_lambda": 5.0,
    "push_to_github": 4.5,
    # Read-only (low blast)
    "search_web": 1.0,
    "google_search": 1.0,
    "read_file": 1.0,
    "query_database": 1.5,
    "get_weather": 1.0,
    "wikipedia": 1.0,
    "calculator": 1.0,
    "scrape_website": 1.5,
    "generate_image": 1.5,
    # Agent-to-agent delegation (CrewAI allow_delegation, AutoGen group chat)
    "delegate_to_agent": 2.5,
}

IRREVERSIBLE_TOOL_KEYWORDS = {
    "send",
    "delete",
    "remove",
    "destroy",
    "execute",
    "deploy",
    "push",
    "transfer",
    "payment",
    "charge",
    "bash",
    "shell",
    "terminal",
    "post",
    "publish",
}

# Framework tool CLASSES → canonical tool names used by the scoring tables.
# Keys are lowercase, as produced by _tool_node_to_name. Without this map,
# CrewAI's `tools=[SerperDevTool()]` would score as the unknown tool
# "serperdevtool" instead of the known-read-only "search_web".
TOOL_CLASS_CANONICAL: dict[str, str] = {
    # CrewAI — search (read-only)
    "serperdevtool": "search_web",
    "bravesearchtool": "search_web",
    "tavilysearchtool": "search_web",
    "exasearchtool": "search_web",
    "websitesearchtool": "search_web",
    "githubsearchtool": "search_web",
    "youtubechannelsearchtool": "search_web",
    "youtubevideosearchtool": "search_web",
    "codedocssearchtool": "search_web",
    # CrewAI — scraping (read-only, external reach)
    "scrapewebsitetool": "scrape_website",
    "seleniumscrapingtool": "scrape_website",
    "firecrawlscrapewebsitetool": "scrape_website",
    "firecrawlcrawlwebsitetool": "scrape_website",
    "browserbaseloadtool": "scrape_website",
    "spidertool": "scrape_website",
    # CrewAI — file / document access
    "filereadtool": "read_file",
    "directoryreadtool": "read_file",
    "directorysearchtool": "read_file",
    "csvsearchtool": "read_file",
    "jsonsearchtool": "read_file",
    "docxsearchtool": "read_file",
    "mdxsearchtool": "read_file",
    "pdfsearchtool": "read_file",
    "txtsearchtool": "read_file",
    "xmlsearchtool": "read_file",
    "visiontool": "read_file",
    "filewritertool": "write_file",
    "filewritetool": "write_file",
    # CrewAI — databases
    "pgsearchtool": "query_database",
    "mysqlsearchtool": "query_database",
    "nl2sqltool": "update_database",
    # CrewAI — code execution / APIs / generation
    "codeinterpretertool": "execute_code",
    "apifyactorstool": "call_api",
    "composiotool": "call_api",
    "dalletool": "generate_image",
    # AutoGen (AgentChat) tool classes
    "pythoncodeexecutiontool": "execute_code",
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
    "Task",
    # AutoGen
    "AssistantAgent",
    "UserProxyAgent",
    "ConversableAgent",
    "GroupChat",
}

# Generic class names that only count as agents when the file imports the
# matching framework OR the call carries that framework's signature kwargs.
# Without this gate, every `Task(...)` in a Celery codebase and every
# `Agent(...)` in an unrelated SDK would be reported as a CrewAI agent.
AMBIGUOUS_CONSTRUCTORS: dict[str, set[str]] = {
    "Agent": {"role", "goal", "backstory", "allow_delegation", "allow_code_execution"},
    "Task": {"expected_output", "agent", "human_input", "async_execution"},
    "Crew": {"agents", "tasks", "process", "manager_llm", "manager_agent"},
}

# import root → framework key, used both for gating ambiguous constructors
# and for correct framework attribution.
FRAMEWORK_IMPORT_ROOTS: dict[str, str] = {
    "langchain": "langchain",
    "langchain_core": "langchain",
    "langchain_community": "langchain",
    "langchain_openai": "langchain",
    "langgraph": "langchain",
    "crewai": "crewai",
    "crewai_tools": "crewai",
    "autogen": "autogen",
    "autogen_agentchat": "autogen",
    "autogen_core": "autogen",
    "autogen_ext": "autogen",
    "pyautogen": "autogen",
    "ag2": "autogen",
}

# AutoGen tool-registration surfaces (classic API). Tools wired through
# these never appear in a `tools=` kwarg, so the constructor parse alone
# misses them.
AUTOGEN_REGISTRATION_METHODS = {
    "register_for_llm",
    "register_for_execution",
    "register_function",
}

# Parameter names whose PRESENCE signals human oversight.
# NOTE: human_input_mode is deliberately absent — its VALUE decides
# (NEVER = fully autonomous, ALWAYS = human in loop) and it is parsed
# explicitly in _parse_agent_call.
HUMAN_GATE_PARAMS = {
    "human_approval",
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
    # CrewAI hierarchical process / AutoGen NEVER — a manager LLM or
    # headless loop drives execution with no human turn-taking.
    is_hierarchical: bool = False
    autonomy_level: AutonomyLevel = AutonomyLevel.SEMI_AUTONOMOUS
    # Set when human_input_mode / human_input was parsed explicitly —
    # explicit configuration beats heuristic autonomy assessment.
    autonomy_explicit: bool = False
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
            if any(
                skip in parts
                for skip in (
                    "venv",
                    ".venv",
                    "env",
                    "site-packages",
                    "__pycache__",
                    ".git",
                )
            ):
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
        frameworks = self._imported_frameworks(tree)

        agents: list[DiscoveredAgent] = []
        var_to_agent: dict[str, DiscoveredAgent] = {}
        # (variable_name | None, tool_name) — resolved after the full walk
        # so registration order in the source never matters.
        registrations: list[tuple[str | None, str]] = []
        handled_calls: set[int] = set()

        for node in ast.walk(tree):
            # Pattern 1: agent = SomeAgentClass(...) — capture the variable
            # name so later register_function(...) calls can be attributed.
            if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call):
                call = node.value
                handled_calls.add(id(call))
                agent = self._maybe_parse_agent(call, filepath, frameworks)
                if agent:
                    agents.append(agent)
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            var_to_agent[target.id] = agent

            # Pattern 2: decorator-registered AutoGen tools
            #   @user_proxy.register_for_execution()
            #   @assistant.register_for_llm(description="...")
            #   def run_sql(query: str): ...
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for deco in node.decorator_list:
                    if not isinstance(deco, ast.Call):
                        continue
                    handled_calls.add(id(deco))
                    reg = self._parse_registration_call(deco, default_tool=node.name)
                    registrations.extend(reg)

            # Pattern 3: bare constructor or registration call
            elif isinstance(node, ast.Call) and id(node) not in handled_calls:
                handled_calls.add(id(node))

                # agent.register_for_llm(name="x")(fn) — the outer call wraps
                # the registration; resolve the tool from the inner call and
                # fall back to the wrapped function's name.
                if isinstance(node.func, ast.Call):
                    inner = node.func
                    handled_calls.add(id(inner))
                    default = None
                    if node.args and isinstance(node.args[0], ast.Name):
                        default = node.args[0].id
                    registrations.extend(
                        self._parse_registration_call(inner, default_tool=default)
                    )
                    continue

                reg = self._parse_registration_call(node)
                if reg:
                    registrations.extend(reg)
                    continue

                agent = self._maybe_parse_agent(node, filepath, frameworks)
                if agent:
                    agents.append(agent)

        # Attach registered tools to the agents they were registered on
        for var_name, tool in registrations:
            tool = TOOL_CLASS_CANONICAL.get(tool, tool)
            if var_name is None:
                continue
            agent = var_to_agent.get(var_name)
            if agent and tool not in agent.raw_tools:
                agent.raw_tools.append(tool)

        # Autonomy is assessed only after every tool surface (constructor
        # kwargs + registrations) has been collected.
        for agent in agents:
            agent.autonomy_level = self._assess_autonomy(agent)

        return agents

    def _maybe_parse_agent(
        self, call: ast.Call, filepath: str, frameworks: set[str]
    ) -> DiscoveredAgent | None:
        constructor_name = self._get_call_name(call)
        if constructor_name not in AGENT_CONSTRUCTOR_NAMES:
            return None

        # Gate ambiguous names: `Agent`/`Task`/`Crew` only count when the
        # file imports CrewAI or the call carries CrewAI-signature kwargs.
        if constructor_name in AMBIGUOUS_CONSTRUCTORS and "crewai" not in frameworks:
            signature_kwargs = AMBIGUOUS_CONSTRUCTORS[constructor_name]
            present = {kw.arg for kw in call.keywords if kw.arg}
            if not (present & signature_kwargs):
                return None

        return self._parse_agent_call(call, filepath, constructor_name)

    def _imported_frameworks(self, tree: ast.AST) -> set[str]:
        """Map a file's imports to the agent frameworks they belong to."""
        frameworks: set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                roots = [alias.name.split(".")[0] for alias in node.names]
            elif isinstance(node, ast.ImportFrom):
                roots = [node.module.split(".")[0]] if node.module else []
            else:
                continue
            for root in roots:
                fw = FRAMEWORK_IMPORT_ROOTS.get(root)
                if fw:
                    frameworks.add(fw)
        return frameworks

    def _parse_registration_call(
        self, call: ast.Call, default_tool: str | None = None
    ) -> list[tuple[str | None, str]]:
        """
        Parse an AutoGen tool-registration call into (agent_var, tool_name)
        pairs. Handles both surfaces:

          autogen.register_function(fn, caller=assistant, executor=proxy, name="x")
          @assistant.register_for_llm(name="x") / @proxy.register_for_execution()

        Returns [] when the call is not a registration.
        """
        func = call.func
        target_vars: list[str | None] = []

        if (
            isinstance(func, ast.Attribute)
            and func.attr in AUTOGEN_REGISTRATION_METHODS
        ):
            # Method style: the receiving agent is the attribute's base.
            if isinstance(func.value, ast.Name):
                base = func.value.id
                # autogen.register_function(...) — module, not an agent var:
                # fall through to caller=/executor= resolution below.
                if base in ("autogen", "ag2", "pyautogen"):
                    target_vars = []
                else:
                    target_vars = [base]
            else:
                target_vars = [None]
        elif isinstance(func, ast.Name) and func.id in AUTOGEN_REGISTRATION_METHODS:
            target_vars = []
        else:
            return []

        tool_name = default_tool
        for kw in call.keywords:
            if (
                kw.arg == "name"
                and isinstance(kw.value, ast.Constant)
                and isinstance(kw.value.value, str)
            ):
                tool_name = kw.value.value.lower()
            elif kw.arg in ("caller", "executor") and isinstance(kw.value, ast.Name):
                target_vars.append(kw.value.id)
            elif kw.arg == "function_map" and isinstance(kw.value, ast.Dict):
                # proxy.register_function(function_map={"run": fn})
                pairs = []
                for key in kw.value.keys:
                    if isinstance(key, ast.Constant) and isinstance(key.value, str):
                        pairs.extend(
                            (var, key.value.lower()) for var in (target_vars or [None])
                        )
                return pairs

        # Positional function argument: register_function(fn, ...)
        if tool_name is None and call.args and isinstance(call.args[0], ast.Name):
            tool_name = call.args[0].id.lower()

        if not tool_name:
            return []
        return [(var, tool_name.lower()) for var in target_vars or []]

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

            # LangChain max_iterations / CrewAI max_iter /
            # AutoGen max_consecutive_auto_reply — all cap the action loop
            elif name in ("max_iterations", "max_iter", "max_consecutive_auto_reply"):
                if isinstance(value, ast.Constant) and isinstance(value.value, int):
                    agent.max_iterations = value.value

            elif name == "memory":
                # memory=True (CrewAI) and memory=SomeMemoryObject(...)
                # (LangChain) both count; memory=False/None do not.
                if isinstance(value, ast.Constant):
                    agent.has_memory = bool(value.value)
                else:
                    agent.has_memory = True

            elif name in HUMAN_GATE_PARAMS:
                agent.has_human_gate = True

            elif name == "human_input_mode":
                # AutoGen: NEVER = fully autonomous, ALWAYS = human in loop
                if isinstance(value, ast.Constant):
                    if str(value.value).upper() == "NEVER":
                        agent.autonomy_level = AutonomyLevel.FULLY_AUTONOMOUS
                        agent.autonomy_explicit = True
                    elif str(value.value).upper() == "ALWAYS":
                        agent.autonomy_level = AutonomyLevel.HUMAN_IN_LOOP
                        agent.autonomy_explicit = True

            # CrewAI Task(human_input=True) — a human reviews the output
            elif name == "human_input":
                if isinstance(value, ast.Constant) and value.value:
                    agent.has_human_gate = True

            # CrewAI Agent(allow_code_execution=True) — the agent can run
            # arbitrary generated code; model it as an execute_code tool
            elif name == "allow_code_execution":
                if isinstance(value, ast.Constant) and value.value:
                    if "execute_code" not in agent.raw_tools:
                        agent.raw_tools.append("execute_code")

            # CrewAI Agent(allow_delegation=True) — agent-to-agent lateral
            # movement inside the crew
            elif name == "allow_delegation":
                if isinstance(value, ast.Constant) and value.value:
                    if "delegate_to_agent" not in agent.raw_tools:
                        agent.raw_tools.append("delegate_to_agent")

            # AutoGen UserProxyAgent(code_execution_config={...}) — any
            # non-False config means generated code gets executed locally
            elif name == "code_execution_config":
                is_disabled = isinstance(value, ast.Constant) and not value.value
                if not is_disabled:
                    if "execute_code" not in agent.raw_tools:
                        agent.raw_tools.append("execute_code")

            # AutoGen function/tool schemas inside llm_config
            elif name == "llm_config" and isinstance(value, ast.Dict):
                for tool in self._extract_llm_config_tools(value):
                    if tool not in agent.raw_tools:
                        agent.raw_tools.append(tool)

            # AutoGen classic: function_map={"tool_name": callable}
            elif name == "function_map" and isinstance(value, ast.Dict):
                for key in value.keys:
                    if isinstance(key, ast.Constant) and isinstance(key.value, str):
                        tool = key.value.lower()
                        if tool not in agent.raw_tools:
                            agent.raw_tools.append(tool)

            # CrewAI Crew(process=Process.hierarchical) — a manager LLM
            # delegates work with no human turn-taking
            elif name == "process":
                if isinstance(value, ast.Attribute) and value.attr == "hierarchical":
                    agent.is_hierarchical = True
                elif (
                    isinstance(value, ast.Constant)
                    and str(value.value).lower() == "hierarchical"
                ):
                    agent.is_hierarchical = True

            elif name == "verbose":
                pass  # Not security relevant

        # NOTE: autonomy is finalized in _extract_agents_from_tree after
        # registered tools (AutoGen register_function et al.) are attached.
        return agent

    def _extract_llm_config_tools(self, config: ast.Dict) -> list[str]:
        """
        Pull tool names out of an AutoGen llm_config dict literal:

          llm_config={"functions": [{"name": "run_sql", ...}]}
          llm_config={"tools": [{"type": "function",
                                 "function": {"name": "send_mail", ...}}]}
        """
        tools: list[str] = []

        def dict_get(d: ast.Dict, key: str) -> ast.expr | None:
            for k, v in zip(d.keys, d.values):
                if isinstance(k, ast.Constant) and k.value == key:
                    return v
            return None

        for section in ("functions", "tools"):
            entries = dict_get(config, section)
            if not isinstance(entries, ast.List):
                continue
            for elt in entries.elts:
                if not isinstance(elt, ast.Dict):
                    continue
                # OpenAI tool format nests the schema under "function"
                schema = dict_get(elt, "function")
                target = schema if isinstance(schema, ast.Dict) else elt
                name_node = dict_get(target, "name")
                if isinstance(name_node, ast.Constant) and isinstance(
                    name_node.value, str
                ):
                    tools.append(name_node.value.lower())

        return tools

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
        """Convert an AST node representing a tool to a canonical name."""
        name: str | None = None

        if isinstance(node, ast.Name):
            # tools=[search_tool, email_tool]
            name = node.id.lower()
        elif isinstance(node, ast.Call):
            # tools=[SearchTool(), EmailTool()]
            # Prefer an explicit name= kwarg — Tool(name="send_email", ...)
            # and FunctionTool(fn, name="run_sql") carry the real tool name
            # there, while the class name ("tool") is meaningless.
            for kw in node.keywords:
                if (
                    kw.arg == "name"
                    and isinstance(kw.value, ast.Constant)
                    and isinstance(kw.value.value, str)
                ):
                    name = kw.value.value.lower()
                    break
            if name is None:
                call_name = self._get_call_name(node)
                name = call_name.lower() if call_name else None
        elif isinstance(node, ast.Constant) and isinstance(node.value, str):
            # tools=["search", "email"]
            name = node.value.lower()
        elif isinstance(node, ast.Attribute):
            # tools=[tools.search, tools.email]
            name = node.attr.lower()

        if name is None:
            return None
        # Map framework tool classes (serperdevtool, codeinterpretertool…)
        # onto the canonical names the blast tables understand.
        return TOOL_CLASS_CANONICAL.get(name, name)

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
          - AutoGen human_input_mode=ALWAYS / CrewAI human_input=True
          - max_iterations=1
        """
        if agent.has_human_gate:
            return AutonomyLevel.HUMAN_IN_LOOP

        # Explicit configuration (AutoGen human_input_mode) wins outright
        if agent.autonomy_explicit:
            return agent.autonomy_level

        # CrewAI hierarchical process: a manager LLM plans and delegates
        # without human turn-taking
        if agent.is_hierarchical:
            return AutonomyLevel.FULLY_AUTONOMOUS

        has_irreversible = any(
            any(kw in tool for kw in IRREVERSIBLE_TOOL_KEYWORDS)
            for tool in agent.raw_tools
            if not tool.startswith("<variable:")
        )

        # High iteration count + irreversible tools = fully autonomous
        if has_irreversible and (
            agent.max_iterations is None or agent.max_iterations > 10
        ):
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
        resolved_tools = [t for t in agent.raw_tools if not t.startswith("<variable:")]

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
                kw in t
                for t in resolved_tools
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
        langchain = {
            "AgentExecutor",
            "initialize_agent",
            "create_react_agent",
            "create_openai_tools_agent",
            "create_structured_chat_agent",
            "create_json_agent",
            "create_csv_agent",
        }
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
                is_irreversible = any(kw in tool for kw in IRREVERSIBLE_TOOL_KEYWORDS)
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
