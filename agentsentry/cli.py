"""
AgentSentry CLI

Usage:
    agentsentry scan local                    # No creds — scan this machine
    agentsentry scan aws                      # Scan AWS account
    agentsentry scan azure                    # Scan Azure subscriptions
    agentsentry scan gcp                      # Scan GCP project
    agentsentry scan github                   # Scan GitHub tokens/secrets
    agentsentry scan k8s                      # Scan Kubernetes cluster
    agentsentry scan agents --path .          # Scan AI agent code (LangChain/CrewAI)
    agentsentry scan mock                     # Demo — no credentials needed
    agentsentry scan all                      # Auto-detect + scan every ready provider

    agentsentry providers                     # List all providers + their status
    agentsentry permissions aws               # Show exactly what permissions are needed
    agentsentry blast <nhi-name>              # Blast radius for a specific NHI
"""

from __future__ import annotations

import sys
from typing import Sequence

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import box
from rich.text import Text

from agentsentry import __version__
from agentsentry.core.graph import NHIAttackGraph
from agentsentry.core.models import RiskLevel, ScanResult
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

PROVIDER_CHOICES = [
    "mock", "local", "aws", "azure", "gcp", "github", "k8s", "agents", "all",
]


# ─────────────────────────────────────────────────────────────────────────────
# CLI root
# ─────────────────────────────────────────────────────────────────────────────

@click.group()
@click.version_option(__version__, prog_name="AgentSentry")
def main():
    """AgentSentry — NHI & AI Agent Risk Auditor"""
    pass


# ─────────────────────────────────────────────────────────────────────────────
# providers — list all providers and their status
# ─────────────────────────────────────────────────────────────────────────────

@main.command("providers")
def cmd_providers():
    """List all scan providers and whether they are ready."""
    _print_banner()
    from agentsentry.providers import registry

    console.print("[bold]Available Providers[/bold]\n")

    table = Table(box=box.ROUNDED, show_header=True, header_style="bold cyan",
                  title="Provider Status", title_style="bold")
    table.add_column("Provider",     min_width=10)
    table.add_column("Name",         min_width=24)
    table.add_column("Status",       min_width=10)
    table.add_column("Details",      min_width=44)

    statuses = registry.detect()
    for s in statuses:
        if s.ok:
            status_text = Text("✓  Ready", style="bold green")
        elif not s.sdk_available:
            status_text = Text("✗  No SDK", style="dim red")
        else:
            status_text = Text("✗  No Creds", style="red")

        table.add_row(
            s.provider_name,
            registry.all().get(s.provider_name, type).__name__ if False else
                _provider_display_name(s.provider_name),
            status_text,
            s.message[:60] if s.message else "",
        )

    # Also list agents scanner
    table.add_row(
        "agents",
        "AI Agent Code Scanner",
        Text("✓  Ready", style="bold green"),
        "Scans LangChain / CrewAI / AutoGen codebases",
    )

    console.print(table)
    console.print()
    console.print("[dim]Run[/dim] [bold]agentsentry permissions <provider>[/bold] [dim]to see exactly what each provider needs.[/dim]")
    console.print("[dim]Run[/dim] [bold]agentsentry scan <provider>[/bold] [dim]to start a scan.[/dim]")
    console.print("[dim]Run[/dim] [bold]agentsentry scan all[/bold] [dim]to scan every ready provider at once.[/dim]")


# ─────────────────────────────────────────────────────────────────────────────
# permissions — show what a provider needs
# ─────────────────────────────────────────────────────────────────────────────

@main.command("permissions")
@click.argument("provider_name", metavar="PROVIDER")
def cmd_permissions(provider_name: str):
    """Show what credentials and permissions a provider requires."""
    _print_banner()
    from agentsentry.providers import registry

    provider = registry.get(provider_name)
    if provider is None:
        console.print(f"[red]Unknown provider: '{provider_name}'[/red]")
        console.print(f"Available: {', '.join(registry.all().keys())} agents")
        sys.exit(1)

    status = provider.check_permissions()

    console.print(Panel(
        f"[bold]Provider:[/bold]  {provider.display_name}\n"
        f"[bold]Status:[/bold]    {'[green]Ready[/green]' if status.ok else '[red]Not Ready[/red]'}\n"
        f"[bold]Details:[/bold]   {status.message}",
        title=f"[cyan]{provider_name}[/cyan] — Permissions",
        border_style="cyan",
    ))
    console.print()

    if provider.required_permissions:
        console.print("[bold]Required Permissions:[/bold]")
        for perm in provider.required_permissions:
            console.print(f"  [dim]•[/dim] {perm}")
        console.print()

    if provider.setup_hint:
        console.print("[bold]Setup:[/bold]")
        for line in provider.setup_hint.splitlines():
            console.print(f"  {line}")


# ─────────────────────────────────────────────────────────────────────────────
# scan
# ─────────────────────────────────────────────────────────────────────────────

@main.command("scan")
@click.argument("target", type=click.Choice(PROVIDER_CHOICES, case_sensitive=False))
@click.option("--visualize",    is_flag=True, default=False,
              help="Generate interactive HTML attack graph")
@click.option("--output",       default="agentsentry_graph.html", show_default=True,
              help="Path for the HTML visualization")
@click.option("--path",         default=".", show_default=True,
              help="Directory to scan (used with 'agents' and 'local' targets)")
@click.option("--enrich",       is_flag=True, default=False,
              help="Enrich findings with CISA KEV threat intelligence")
@click.option("--json",  "output_json", is_flag=True, default=False,
              help="Output findings as JSON")
@click.option("--profile",      default=None,
              help="AWS credential profile name")
@click.option("--region",       default="us-east-1", show_default=True,
              help="AWS region (or GCP project)")
@click.option("--org",          default=None,
              help="GitHub organisation name")
@click.option("--namespace",    default=None,
              help="Kubernetes namespace (default: all namespaces)")
@click.option("--context",      default=None,
              help="Kubernetes kubeconfig context")
@click.option("--force",        is_flag=True, default=False,
              help="Skip permission pre-check and scan anyway")
def scan(target, visualize, output, path, enrich, output_json,
         profile, region, org, namespace, context, force):
    """Scan an environment for NHI and AI agent risks."""

    _print_banner()

    if target == "all":
        _scan_all(enrich=enrich, visualize=visualize, output=output,
                  output_json=output_json, force=force)
        return

    provider, scanner = _build_provider(
        target, path=path, profile=profile, region=region,
        org=org, namespace=namespace, context=context,
    )

    # ── Permission pre-check ──────────────────────────────────────────
    if not force and provider is not None:
        status = provider.check_permissions()
        if not status.ok:
            console.print(Panel(
                f"[red]{status}[/red]\n\n"
                + (f"[dim]{provider.setup_hint}[/dim]" if provider.setup_hint else ""),
                title="[red]Permission check failed[/red]",
                border_style="red",
            ))
            console.print("[dim]Pass --force to skip this check.[/dim]")
            sys.exit(1)
        console.print(f"[green]✓[/green] {status.message}\n")

    # ── Run scan ──────────────────────────────────────────────────────
    with console.status("[bold green]Scanning environment…[/bold green]"):
        result = scanner.scan()

    _finalise_and_print(result, scanner, enrich=enrich, visualize=visualize,
                        output=output, output_json=output_json)


# ─────────────────────────────────────────────────────────────────────────────
# blast
# ─────────────────────────────────────────────────────────────────────────────

@main.command("blast")
@click.argument("nhi_name")
@click.option("--provider", "target", default="mock",
              type=click.Choice(PROVIDER_CHOICES[:-1], case_sensitive=False),
              help="Which environment to use (default: mock)")
def blast(nhi_name: str, target: str):
    """Show blast radius for a specific NHI."""
    _, scanner = _build_provider(target)
    result = scanner.scan()
    scorer = NHIScorer()
    result.nhis = scorer.score_all(result.nhis)

    graph = NHIAttackGraph()
    for nhi in result.nhis:
        graph.add_nhi(nhi)
    for resource in result.resources:
        graph.add_resource(resource)
    if hasattr(scanner, "build_access_edges"):
        for from_id, to_id, perm, weight in scanner.build_access_edges():
            graph.add_access_edge(from_id, to_id, perm, weight)

    target_nhi = next(
        (n for n in result.nhis if nhi_name.lower() in n.name.lower()), None
    )
    if not target_nhi:
        console.print(f"[red]NHI '{nhi_name}' not found.[/red]")
        for n in result.nhis:
            console.print(f"  • {n.name}")
        sys.exit(1)

    br = graph.blast_radius(target_nhi.id)
    console.print(Panel(
        f"[bold]Compromised Identity:[/bold] {br['compromised_nhi']}\n"
        f"[bold]Reachable Nodes:[/bold]      {br['reachable_count']}\n"
        f"[bold]Crown Jewels at Risk:[/bold] {', '.join(br['crown_jewels_at_risk']) or 'None'}\n"
        f"[bold]Blast Radius Score:[/bold]   {br['blast_radius_score']}",
        title="[red]Blast Radius Analysis[/red]",
        border_style="red",
    ))
    for cj, path in (br.get("attack_paths") or {}).items():
        console.print(f"\n  [red]→ {cj}[/red]")
        console.print(f"    {'  →  '.join(path)}")


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _build_provider(target: str, *, path: str = ".", profile=None, region="us-east-1",
                    org=None, namespace=None, context=None):
    """Return (provider_instance_or_None, scanner_object)."""
    from agentsentry.providers import registry

    if target == "mock":
        from agentsentry.scanners.mock import MockScanner
        console.print("[dim]Running against mock environment — no credentials needed[/dim]\n")
        return None, MockScanner()

    if target == "agents":
        from agentsentry.scanners.langchain_scanner import LangChainScanner
        console.print(f"[dim]Scanning AI agent code in: {path}[/dim]\n")
        return None, LangChainScanner(scan_path=path)

    if target == "local":
        from agentsentry.providers.local import LocalProvider
        p = LocalProvider(path=path)
        return p, p

    if target == "aws":
        from agentsentry.providers.aws import AWSProvider
        p = AWSProvider(profile=profile, region=region)
        return p, p

    if target == "azure":
        from agentsentry.providers.azure import AzureProvider
        p = AzureProvider()
        return p, p

    if target == "gcp":
        from agentsentry.providers.gcp import GCPProvider
        p = GCPProvider()
        return p, p

    if target == "github":
        from agentsentry.providers.github import GitHubProvider
        p = GitHubProvider(org=org)
        return p, p

    if target == "k8s":
        from agentsentry.providers.k8s import KubernetesProvider
        p = KubernetesProvider(context=context, namespace=namespace)
        return p, p

    console.print(f"[red]Unknown target: {target}[/red]")
    sys.exit(1)


def _scan_all(*, enrich: bool, visualize: bool, output: str,
              output_json: bool, force: bool):
    """Detect all ready providers and scan them sequentially."""
    from agentsentry.providers import registry

    ready = registry.detect_ready()
    if not ready:
        console.print(
            "[red]No providers are ready.[/red]  "
            "Run [bold]agentsentry providers[/bold] to see what's missing."
        )
        sys.exit(1)

    console.print(f"[green]Auto-detected {len(ready)} ready provider(s):[/green] "
                  + ", ".join(ready) + "\n")

    combined_nhis = []
    combined_resources = []
    all_scanners = []

    for name in ready:
        console.print(f"[bold cyan]── Scanning: {name} ──[/bold cyan]")
        provider, scanner = _build_provider(name)
        try:
            with console.status(f"[green]Scanning {name}…[/green]"):
                result = scanner.scan()
            combined_nhis.extend(result.nhis)
            combined_resources.extend(result.resources)
            all_scanners.append(scanner)
            console.print(
                f"  [green]✓[/green] {name}: {result.total_nhis} NHIs found"
            )
        except Exception as exc:
            console.print(f"  [red]✗[/red] {name}: {exc}")
        console.print()

    # Build aggregate result
    from agentsentry.core.models import CloudProvider, ScanResult
    aggregate = ScanResult(
        scan_id="all-scan",
        provider=CloudProvider.LOCAL,
        nhis=combined_nhis,
        resources=combined_resources,
    )

    _finalise_and_print(aggregate, all_scanners[0] if all_scanners else None,
                        enrich=enrich, visualize=visualize, output=output,
                        output_json=output_json)


def _finalise_and_print(result: ScanResult, scanner, *, enrich: bool,
                        visualize: bool, output: str, output_json: bool):
    """Score, enrich, graph, and display a completed ScanResult."""
    scorer = NHIScorer()
    with console.status("[bold green]Computing risk scores…[/bold green]"):
        result.nhis = scorer.score_all(result.nhis)

    if enrich:
        from agentsentry.enrichment.cisa_kev import CISAKEVEnricher
        enricher = CISAKEVEnricher()
        enricher.load()
        result.nhis = enricher.enrich(result.nhis)
        stats = enricher.stats()
        console.print(
            f"[dim]KEV catalog: {stats['total_entries']} entries, "
            f"{stats['ransomware_campaigns']} linked to ransomware[/dim]\n"
        )

    graph = NHIAttackGraph()
    for nhi in result.nhis:
        graph.add_nhi(nhi)
    for resource in result.resources:
        graph.add_resource(resource)
    if scanner is not None and hasattr(scanner, "build_access_edges"):
        for from_id, to_id, perm, weight in scanner.build_access_edges():
            graph.add_access_edge(from_id, to_id, perm, weight)

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
        console.print("[dim]  Open in any browser for the interactive view.[/dim]")


def _print_banner():
    console.print(Panel(
        "[bold cyan]AgentSentry[/bold cyan]  [dim]v" + __version__ + "[/dim]\n"
        "[dim]Non-Human Identity & AI Agent Risk Auditor[/dim]",
        border_style="cyan",
        padding=(0, 2),
    ))
    console.print()


def _print_summary(result: ScanResult):
    console.print(
        f"  [bold]NHIs Discovered:[/bold] {result.total_nhis}   "
        f"[bold red]Critical: {result.critical_count}[/bold red]   "
        f"[bold yellow]High: {result.high_count}[/bold yellow]   "
        f"[bold]AI Agents: {result.ai_agent_count}[/bold]"
    )
    console.print()


def _print_nhi_table(result: ScanResult):
    table = Table(
        box=box.ROUNDED, title="NHI Inventory", title_style="bold",
        show_header=True, header_style="bold cyan",
    )
    table.add_column("Identity",  style="bold", min_width=28)
    table.add_column("Provider",  min_width=8)
    table.add_column("Type",      min_width=20)
    table.add_column("Risk",      min_width=12)
    table.add_column("Score",     justify="right", min_width=7)
    table.add_column("Findings",  justify="center", min_width=8)

    for nhi in sorted(result.nhis, key=lambda n: n.risk_score, reverse=True):
        icon  = RISK_ICONS[nhi.risk_level]
        style = RISK_STYLES[nhi.risk_level]
        table.add_row(
            nhi.name[:36],
            nhi.provider.value,
            nhi.type.value,
            Text(icon, style=style),
            f"{nhi.risk_score:.1f}",
            str(len(nhi.findings)),
        )

    console.print(table)
    console.print()


def _print_findings(result: ScanResult):
    critical_nhis = [n for n in result.nhis if n.risk_level == RiskLevel.CRITICAL]
    if not critical_nhis:
        return
    console.print("[bold red]Critical Findings[/bold red]\n")
    for nhi in critical_nhis:
        for finding in nhi.findings:
            if finding.risk_level != RiskLevel.CRITICAL:
                continue
            console.print(Panel(
                f"[bold]{finding.title}[/bold]\n\n"
                f"{finding.description}\n\n"
                f"[bold cyan]Remediation:[/bold cyan] {finding.remediation}\n\n"
                f"[dim]MITRE: {', '.join(finding.mitre_techniques)}[/dim]",
                title=f"[red]⚠  {nhi.name[:50]}[/red]",
                border_style="red",
                padding=(1, 2),
            ))
    console.print()


def _print_blast_radius_top(result: ScanResult, graph: NHIAttackGraph):
    top_ids = graph.top_risk_nhis(n=3)
    if not top_ids:
        return
    console.print("[bold]Top Blast Radius Analysis[/bold]\n")
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
            console.print(f"    [dim]{', '.join(br['crown_jewels_at_risk'])}[/dim]")
    console.print()


def _provider_display_name(name: str) -> str:
    mapping = {
        "aws": "Amazon Web Services",
        "azure": "Microsoft Azure",
        "gcp": "Google Cloud Platform",
        "github": "GitHub",
        "k8s": "Kubernetes",
        "local": "Local Environment",
    }
    return mapping.get(name, name.title())
