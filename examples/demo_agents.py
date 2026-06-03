"""
Demo AI agent definitions for AgentSentry scanning.

These are realistic patterns found in enterprise codebases.
Run: python -m agentsentry scan agents --path ./examples
"""

from langchain.agents import AgentExecutor, initialize_agent
from langchain.agents import create_react_agent
from langchain.tools import Tool

# ── Example 1: CRITICAL — Fully autonomous agent with irreversible tools ──
# No human approval gate, high iterations, destructive tools
crm_agent = AgentExecutor(
    agent=create_react_agent,
    tools=[
        query_database,
        send_email,
        delete_record,
        update_database,
        call_api,
    ],
    max_iterations=15,
    handle_parsing_errors=True,
    verbose=True,
)

# ── Example 2: HIGH — Semi-autonomous with write tools ────────────────────
email_drafter = initialize_agent(
    tools=[search_web, read_file, send_email, create_ticket],
    llm=llm,
    max_iterations=5,
    verbose=True,
)

# ── Example 3: LOW — Read-only research agent ─────────────────────────────
research_agent = AgentExecutor(
    agent=agent,
    tools=[search_web, wikipedia, calculator, read_file],
    max_iterations=3,
    verbose=False,
)
