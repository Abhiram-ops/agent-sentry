"""
Tests for the AI agent code scanner (agentsentry/scanners/langchain_scanner.py):
LangChain regression plus the CrewAI- and AutoGen-specific tool extraction.
"""

from __future__ import annotations

import os

import pytest

from agentsentry.core.models import AutonomyLevel
from agentsentry.scanners.langchain_scanner import LangChainScanner

CREWAI_APP = """
from crewai import Agent, Crew, Process, Task
from crewai_tools import CodeInterpreterTool, FileWriterTool, SerperDevTool

researcher = Agent(
    role="Senior Researcher",
    goal="Find market intel",
    backstory="...",
    tools=[SerperDevTool(), FileWriterTool()],
    allow_delegation=True,
    max_iter=25,
    memory=True,
)

engineer = Agent(
    role="Automation Engineer",
    goal="Ship scripts",
    backstory="...",
    allow_code_execution=True,
)

review_task = Task(
    description="Summarize findings",
    expected_output="A report",
    agent=researcher,
    tools=[SerperDevTool()],
    human_input=True,
)

crew = Crew(
    agents=[researcher, engineer],
    tasks=[review_task],
    process=Process.hierarchical,
    memory=True,
)
"""

AUTOGEN_APP = """
import autogen
from autogen import AssistantAgent, UserProxyAgent

assistant = AssistantAgent(
    name="assistant",
    llm_config={
        "model": "gpt-4o",
        "functions": [{"name": "query_database", "description": "ro"}],
        "tools": [
            {"type": "function", "function": {"name": "send_email"}},
        ],
    },
)

user_proxy = UserProxyAgent(
    name="user_proxy",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=15,
    code_execution_config={"work_dir": "coding", "use_docker": False},
    function_map={"transfer_funds": lambda amt: amt},
)

reviewer = AssistantAgent(
    name="reviewer",
    human_input_mode="ALWAYS",
    code_execution_config=False,
)

autogen.register_function(
    run_payroll,
    caller=assistant,
    executor=user_proxy,
    name="run_payroll",
)


@user_proxy.register_for_execution()
@assistant.register_for_llm(description="Execute a SQL statement")
def execute_sql(query: str) -> str:
    return "ok"
"""

LANGCHAIN_APP = """
from langchain.agents import AgentExecutor, initialize_agent
from langchain.tools import Tool

agent = initialize_agent(
    tools=[Tool(name="send_email", func=send), search_tool],
    llm=llm,
    max_iterations=3,
    memory=memory_obj,
)
"""

FALSE_POSITIVE_APP = """
from myorm import Agent, Task

job = Task(queue="default", retries=3)
bot = Agent(host="10.0.0.1", port=8080)
squad = Crew(size=5)
"""


@pytest.fixture()
def discovered(tmp_path):
    (tmp_path / "crewai_app.py").write_text(CREWAI_APP, encoding="utf-8")
    (tmp_path / "autogen_app.py").write_text(AUTOGEN_APP, encoding="utf-8")
    (tmp_path / "langchain_app.py").write_text(LANGCHAIN_APP, encoding="utf-8")
    (tmp_path / "false_positive.py").write_text(FALSE_POSITIVE_APP, encoding="utf-8")
    scanner = LangChainScanner(scan_path=str(tmp_path))
    return scanner, scanner._discover_agents()


def pick(agents, fname: str, ctor: str):
    out = [
        a
        for a in agents
        if os.path.basename(a.source_file) == fname and a.constructor == ctor
    ]
    return sorted(out, key=lambda a: a.line_number)


class TestFalsePositives:
    def test_non_framework_agent_task_crew_ignored(self, discovered):
        _, agents = discovered
        assert not [a for a in agents if "false_positive" in a.source_file]


class TestCrewAI:
    def test_tool_classes_canonicalized(self, discovered):
        _, agents = discovered
        researcher, _ = pick(agents, "crewai_app.py", "Agent")
        assert set(researcher.raw_tools) == {
            "search_web",
            "write_file",
            "delegate_to_agent",
        }

    def test_max_iter_and_memory(self, discovered):
        _, agents = discovered
        researcher, _ = pick(agents, "crewai_app.py", "Agent")
        assert researcher.max_iterations == 25
        assert researcher.has_memory is True
        assert researcher.framework == "crewai"

    def test_allow_code_execution_becomes_tool(self, discovered):
        _, agents = discovered
        _, engineer = pick(agents, "crewai_app.py", "Agent")
        assert "execute_code" in engineer.raw_tools
        assert engineer.autonomy_level == AutonomyLevel.FULLY_AUTONOMOUS

    def test_task_tools_and_human_input_gate(self, discovered):
        _, agents = discovered
        (task,) = pick(agents, "crewai_app.py", "Task")
        assert task.raw_tools == ["search_web"]
        assert task.has_human_gate is True
        assert task.autonomy_level == AutonomyLevel.HUMAN_IN_LOOP

    def test_hierarchical_crew_fully_autonomous(self, discovered):
        _, agents = discovered
        (crew,) = pick(agents, "crewai_app.py", "Crew")
        assert crew.is_hierarchical is True
        assert crew.autonomy_level == AutonomyLevel.FULLY_AUTONOMOUS
        assert crew.has_memory is True


class TestAutoGen:
    def test_llm_config_and_registrations(self, discovered):
        _, agents = discovered
        assistant, _ = pick(agents, "autogen_app.py", "AssistantAgent")
        assert set(assistant.raw_tools) == {
            "query_database",
            "send_email",
            "run_payroll",
            "execute_sql",
        }
        assert assistant.framework == "autogen"

    def test_proxy_all_tool_surfaces(self, discovered):
        _, agents = discovered
        (proxy,) = pick(agents, "autogen_app.py", "UserProxyAgent")
        assert set(proxy.raw_tools) == {
            "execute_code",
            "transfer_funds",
            "run_payroll",
            "execute_sql",
        }
        assert proxy.max_iterations == 15

    def test_human_input_mode_never_is_fully_autonomous(self, discovered):
        _, agents = discovered
        (proxy,) = pick(agents, "autogen_app.py", "UserProxyAgent")
        assert proxy.autonomy_level == AutonomyLevel.FULLY_AUTONOMOUS

    def test_human_input_mode_always_is_human_in_loop(self, discovered):
        _, agents = discovered
        _, reviewer = pick(agents, "autogen_app.py", "AssistantAgent")
        assert reviewer.autonomy_level == AutonomyLevel.HUMAN_IN_LOOP

    def test_disabled_code_execution_adds_no_tool(self, discovered):
        _, agents = discovered
        _, reviewer = pick(agents, "autogen_app.py", "AssistantAgent")
        assert "execute_code" not in reviewer.raw_tools


class TestLangChainRegression:
    def test_tool_name_kwarg_preferred_over_class_name(self, discovered):
        _, agents = discovered
        (lc,) = pick(agents, "langchain_app.py", "initialize_agent")
        assert "send_email" in lc.raw_tools
        assert "search_tool" in lc.raw_tools
        assert "tool" not in lc.raw_tools

    def test_iterations_memory_and_autonomy(self, discovered):
        _, agents = discovered
        (lc,) = pick(agents, "langchain_app.py", "initialize_agent")
        assert lc.framework == "langchain"
        assert lc.max_iterations == 3
        assert lc.has_memory is True
        # irreversible tool but capped iterations → semi-autonomous
        assert lc.autonomy_level == AutonomyLevel.SEMI_AUTONOMOUS


class TestEndToEnd:
    def test_scan_produces_scoreable_nhis(self, discovered):
        scanner, agents = discovered
        from agentsentry.core.scorer import NHIScorer

        result = scanner.scan()
        assert len(result.nhis) == len(agents)
        scored = NHIScorer().score_all(result.nhis)
        assert all(n.risk_score > 0 for n in scored)
