"""
AgentSentry CLI

Usage:
    agentsentry scan mock              # Run against mock environment (no creds needed)
    agentsentry scan mock --visualize  # Also generate interactive HTML graph
    agentsentry scan aws               # Scan real AWS account (needs credentials)
    agentsentry blast <nhi-name>       # Show blast radius for a specific NHI
"""

from __future__ import annotations

import sys

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import box
from rich.text import Text

from agentsentry import __version__
from agentsentry.core.graph import NHIAttackGraph
from agentsentry.core.models import RiskLevel
from agentsentry.core.scorer import NHIScorer

console = Console()

RISK_STYLES = {
    RiskLevel.CRITICAL: "bold red",
    RiskLevel.HIGH:     "bold yellow",
    RiskLevel.MEDIUM:   "yellow",
    RiskLevel.LOW:      "green",
    RiskLevel.INFO:     "dim",
}

RISK_ICONS = {
    RiskLevel.CRITICAL: "● CRITICAL",
    RiskLevel.HIGH:     "● HIGH    ",
    RiskLevel.MEDIUM:   "◐ MEDIUM  ",
    RiskLevel.LOW:      "○ LOW     ",
    RiskLevel.INFO:     "· INFO    ",
}


@click.group()
@click.version_option(__version__, prog_name="AgentSentry")
def main():
    """AgentSentry — NHI & AI Agent Risk Auditor"""
    pass


# ---------------------------------------------------------------------------
# scan command
# ---------------------------------------------------------------------------

@main.command()
@click.argument("target", type=click.Choice(["mock", "aws", "azure", "gcp", "agents"]))
@click.option("--visualize", is_flag=True, default=False,
              help="Generate interactive HTML attack graph")
@click.option("--output", default="agentsentry_graph.html",
              help="Path for the HTML visualization output")
@click.option("--path", default=".", show_default=True,
              help="Directory to scan (used with 'agents' target)")
@click.option("--json", "output_json", is_flag=True, default=False,
              help="Output findings as JSON instead of terminal table")
def scan(target: str, visualize: bool, output: str, path: str, output_json: bool):
    """Scan an environment for NHI and AI agent risks."""

    _print_banner()

    # ── Load scanner ──────────────────────────────────────────────────
    if target == "mock":
        from agentsentry.scanners.mock import MockScanner
        scanner = MockScanner()
        console.print("[dim]Running against mock environment — no credentials needed[/dim]\n")
    elif target == "aws":
        try:
            from agentsentry.scanners.aws import AWSScanner
            scanner = AWSScanner()
        except ImportError:
            console.print("[red]AWS scanner not yet implemented. Use 'mock' target.[/red]")
            sys.exit(1)
    elif target == "agents":
        from agentsentry.scanners.langchain_scanner import LangChainScanner
        scanner = LangChainScanner(scan_path=path)
        console.print(f"[dim]Scanning Python files for AI agent definitions in: {path}[/dim]\n")
    else:
        console.print(f"[red]Scanner for '{target}' coming soon. Use 'mock' for now.[/red]")
        sys.exit(1)

    # ── Run scan ──────────────────────────────────────────────────────
    with console.status("[bold green]Scanning environment...[/bold green]"):
        result = scanner.scan()

    # ── Score NHIs ────────────────────────────────────────────────────
    scorer = NHIScorer()
    with console.status("[bold green]Computing risk scores...[/bold green]"):
        result.nhis = scorer.score_all(result.nhis)

    # ── Build attack graph ────────────────────────────────────────────
    graph = NHIAttackGraph()
    for nhi in result.nhis:
        graph.add_nhi(nhi)
    for resource in result.resources:
        graph.add_resource(resource)

    if hasattr(scanner, "build_access_edges"):
        for from_id, to_id, perm, weight in scanner.build_access_edges():
            graph.add_access_edge(from_id, to_id, perm, weight)

    # ── Output ────────────────────────────────────────────────────────
    if output_json:
        import json
        data = [n.model_dump(mode="json") for n in result.nhis]
        console.print_json(json.dumps(data, default=str))
    else:
        _print_summary(result)
        _print_nhi_table(result)
        _print_findings(result)
        _print_blast_radius_top(result, graph)

    if visualize:
        with console.status(f"[bold green]Generating graph → {output}[/bold green]"):
            graph.visualize(output)
        console.print(f"\n[bold green]✓ Graph saved:[/bold green] {output}")
        console.print("[dim]  Open this file in any browser for the interactive view.[/dim]")


# ---------------------------------------------------------------------------
# blast command — analyse a single NHI's blast radius
# ---------------------------------------------------------------------------

@main.command()
@click.argument("nhi_name")
def blast(nhi_name: str):
    """Show blast radius for a specific NHI in the mock environment."""
    from agentsentry.scanners.mock import MockScanner
    scanner = MockScanner()
    result = scanner.scan()
    scorer = NHIScorer()
    result.nhis = scorer.score_all(result.nhis)

    graph = NHIAttackGraph()
    for nhi in result.nhis:
        graph.add_nhi(nhi)
    for resource in result.resources:
        graph.add_resource(resource)
    for from_id, to_id, perm, weight in scanner.build_access_edges():
        graph.add_access_edge(from_id, to_id, perm, weight)

    # Find the NHI by name
    target = next((n for n in result.nhis if nhi_name.lower() in n.name.lower()), None)
    if not target:
        console.print(f"[red]NHI '{nhi_name}' not found. Available:[/red]")
        for n in result.nhis:
            console.print(f"  • {n.name}")
        sys.exit(1)

    br = graph.blast_radius(target.id)

    console.print(Panel(
        f"[bold]Compromised Identity:[/bold] {br['compromised_nhi']}\n"
        f"[bold]Reachable Nodes:[/bold]      {br['reachable_count']}\n"
        f"[bold]Crown Jewels at Risk:[/bold] {', '.join(br['crown_jewels_at_risk']) or 'None'}\n"
        f"[bold]Blast Radius Score:[/bold]   {br['blast_radius_score']}",
        title="[red]Blast Radius Analysis[/red]",
        border_style="red",
    ))

    if br.get("attack_paths"):
        console.print("\n[bold]Attack Paths to Crown Jewels:[/bold]")
        for cj, path in br["attack_paths"].items():
            console.print(f"  → [red]{cj}[/red]")
            console.print(f"    {'  →  '.join(path)}")


# ---------------------------------------------------------------------------
# Display helpers
# ---------------------------------------------------------------------------

def _print_banner():
    console.print(Panel(
        "[bold cyan]AgentSentry[/bold cyan]  [dim]v" + __version__ + "[/dim]\n"
        "[dim]Non-Human Identity & AI Agent Risk Auditor[/dim]",
        border_style="cyan",
        padding=(0, 2),
    ))
    console.print()


def _print_summary(result):
    critical = result.critical_count
    high     = result.high_count

    console.print(
        f" [bold]NHIs Discovered:[/bold] {result.total_nhis}   "
        f"[bold red]Critical: {critical}[/bold red]   "
        f"[bold yellow]High: {high}[/bold yellow]   "
        f"[bold]AI Agents: {result.ai_agent_count}[/bold]"
    )
    console.print()


def _print_nhi_table(result):
    table = Table(
        box=box.ROUNDED,
        title="Non-Human Identity Inventory",
        title_style="bold",
        show_header=True,
        header_style="bold cyan",
    )
    table.add_column("Identity",       style="bold", min_width=28)
    table.add_column("Type",           min_width=14)
    table.add_column("Risk",           min_width=12)
    table.add_column("Score",          justify="right", min_width=7)
    table.add_column("Findings",       justify="center", min_width=8)
    table.add_column("Last Used",      min_width=12)

    sorted_nhis = sorted(result.nhis, key=lambda n: n.risk_score, reverse=True)

    for nhi in sorted_nhis:
        icon  = RISK_ICONS[nhi.risk_level]
        style = RISK_STYLES[nhi.risk_level]
        last  = (f"{nhi.days_since_last_use()}d ago"
                 if nhi.days_since_last_use() is not None else "Never")

        table.add_row(
            nhi.name,
            nhi.type.value,
            Text(icon, style=style),
            f"{nhi.risk_score:.1f}",
            str(len(nhi.findings)),
            last,
        )

    console.print(table)
    console.print()


def _print_findings(result):
    critical_nhis = [n for n in result.nhis if n.risk_level == RiskLevel.CRITICAL]
    if not critical_nhis:
        return

    console.print("[bold red]Critical Findings[/bold red]")
    console.print()
    for nhi in critical_nhis:
        for finding in nhi.findings:
            if finding.risk_level != RiskLevel.CRITICAL:
                continue
            console.print(Panel(
                f"[bold]{finding.title}[/bold]\n\n"
                f"{finding.description}\n\n"
                f"[bold cyan]Remediation:[/bold cyan] {finding.remediation}\n\n"
                f"[dim]MITRE: {', '.join(finding.mitre_techniques)}[/dim]",
                title=f"[red]⚠  {nhi.name}[/red]",
                border_style="red",
                padding=(1, 2),
            ))
    console.print()


def _print_blast_radius_top(result, graph: NHIAttackGraph):
    top_ids = graph.top_risk_nhis(n=3)
    if not top_ids:
        return

    console.print("[bold]Top Blast Radius Analysis[/bold]")
    console.print()

    for nhi_id in top_ids:
        br = graph.blast_radius(nhi_id)
        if br.get("reachable_count", 0) == 0:
            continue
        console.print(
            f"  [bold]{br['compromised_nhi']}[/bold]  →  "
            f"[red]{br['reachable_count']} nodes reachable[/red],  "
            f"[bold red]{len(br['crown_jewels_at_risk'])} crown jewel(s)[/bold red]"
        )
        if br["crown_jewels_at_risk"]:
            console.print(
                f"    [dim]Crown jewels: {', '.join(br['crown_jewels_at_risk'])}[/dim]"
            )
    console.print()
