"""AgentSentry CLI"""
from __future__ import annotations

import sys
import time
from typing import Sequence

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import box
from rich.text import Text
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
from rich.rule import Rule
from rich.columns import Columns
from rich.align import Align

from agentsentry import __version__
from agentsentry.core.graph import NHIAttackGraph
from agentsentry.core.models import RiskLevel, ScanResult
from agentsentry.core.scorer import NHIScorer

console = Console()

# ── Design tokens ─────────────────────────────────────────────────────────────

RISK_STYLES = {
    RiskLevel.CRITICAL: "bold red",
    RiskLevel.HIGH:     "bold orange1",
    RiskLevel.MEDIUM:   "bold yellow",
    RiskLevel.LOW:      "bold green",
    RiskLevel.INFO:     "dim white",
}
RISK_BADGES = {
    RiskLevel.CRITICAL: "[on red][bold white] CRITICAL [/bold white][/on red]",
    RiskLevel.HIGH:     "[on orange1][bold white] HIGH [/bold white][/on orange1]",
    RiskLevel.MEDIUM:   "[on yellow][bold black] MEDIUM [/bold black][/on yellow]",
    RiskLevel.LOW:      "[on green][bold black] LOW [/bold black][/on green]",
    RiskLevel.INFO:     "[dim] INFO [/dim]",
}
RISK_DOTS = {
    RiskLevel.CRITICAL: "[bold red]◉[/bold red]",
    RiskLevel.HIGH:     "[bold orange1]◉[/bold orange1]",
    RiskLevel.MEDIUM:   "[bold yellow]◎[/bold yellow]",
    RiskLevel.LOW:      "[bold green]○[/bold green]",
    RiskLevel.INFO:     "[dim]·[/dim]",
}

PROVIDER_CHOICES = ["mock", "local", "aws", "azure", "gcp", "github", "k8s", "agents", "all"]


# ─────────────────────────────────────────────────────────────────────────────
# CLI root
# ─────────────────────────────────────────────────────────────────────────────

@click.group()
@click.version_option(__version__, prog_name="AgentSentry")
def main():
    """AgentSentry — NHI & AI Agent Risk Auditor"""
    pass


# ── providers ────────────────────────────────────────────────────────────────

@main.command("providers")
def cmd_providers():
    """List all scan providers and whether they are ready."""
    _print_banner()
    from agentsentry.providers import registry

    table = Table(
        box=box.SIMPLE_HEAD,
        show_header=True,
        header_style="bold #00ff88",
        border_style="dim",
        title="[bold]Provider Status[/bold]",
        title_style="bold white",
        show_edge=False,
        pad_edge=True,
    )
    table.add_column("",          min_width=3,  justify="center")
    table.add_column("Provider",  min_width=10, style="bold")
    table.add_column("Name",      min_width=26)
    table.add_column("Status",    min_width=14)
    table.add_column("Next Step", min_width=44, style="dim")

    statuses = registry.detect()
    for s in statuses:
        if s.ok:
            dot    = "[bold #00ff88]●[/bold #00ff88]"
            status = "[bold #00ff88]ready[/bold #00ff88]"
        elif not s.sdk_available:
            dot    = "[dim red]●[/dim red]"
            status = "[dim]no sdk[/dim]"
        else:
            dot    = "[red]●[/red]"
            status = "[red]no creds[/red]"

        table.add_row(dot, s.provider_name, _provider_display_name(s.provider_name),
                      status, (s.message or "")[:55])

    table.add_row(
        "[bold #00ff88]●[/bold #00ff88]", "agents", "AI Agent Code Scanner",
        "[bold #00ff88]ready[/bold #00ff88]", "agentsentry scan agents --path .",
    )

    console.print()
    console.print(table)
    console.print()
    console.print("  [dim]agentsentry[/dim] [bold]permissions <provider>[/bold]  [dim]→ see what each one needs[/dim]")
    console.print("  [dim]agentsentry[/dim] [bold]scan all[/bold]               [dim]→ scan every ready provider[/dim]")
    console.print()


# ── permissions ───────────────────────────────────────────────────────────────

@main.command("permissions")
@click.argument("provider_name", metavar="PROVIDER")
def cmd_permissions(provider_name: str):
    """Show what credentials and permissions a provider requires."""
    _print_banner()
    from agentsentry.providers import registry

    provider = registry.get(provider_name)
    if provider is None:
        console.print(f"  [red]✗[/red]  Unknown provider: [bold]{provider_name}[/bold]")
        console.print(f"  Available: {', '.join(registry.all().keys())}, agents\n")
        sys.exit(1)

    status = provider.check_permissions()
    ok_str = "[bold #00ff88]ready[/bold #00ff88]" if status.ok else "[bold red]not ready[/bold red]"

    console.print(Panel(
        f"  [bold]{provider.display_name}[/bold]   {ok_str}\n\n"
        + ("  [dim]" + (status.message or "") + "[/dim]"),
        title=f"[bold]{provider_name}[/bold]  permissions",
        border_style="#00ff88" if status.ok else "red",
        padding=(1, 2),
    ))

    if provider.required_permissions:
        console.print("\n  [bold]Required[/bold]")
        for perm in provider.required_permissions:
            console.print(f"  [dim #00ff88]→[/dim #00ff88]  {perm}")

    if provider.setup_hint:
        console.print("\n  [bold]Setup[/bold]")
        for line in provider.setup_hint.splitlines():
            console.print(f"  {line}")
    console.print()


# ── scan ──────────────────────────────────────────────────────────────────────

@main.command("scan")
@click.argument("target", type=click.Choice(PROVIDER_CHOICES, case_sensitive=False))
@click.option("--visualize",    is_flag=True,  help="Generate interactive HTML attack graph")
@click.option("--output",       default="agentsentry_graph.html", show_default=True)
@click.option("--path",         default=".", show_default=True, help="Directory to scan")
@click.option("--enrich",       is_flag=True,  help="Enrich with CISA KEV threat intel")
@click.option("--json",  "output_json", is_flag=True, help="Output as JSON")
@click.option("--profile",      default=None,  help="AWS credential profile")
@click.option("--region",       default="us-east-1", show_default=True)
@click.option("--org",          default=None,  help="GitHub org")
@click.option("--namespace",    default=None,  help="K8s namespace")
@click.option("--context",      default=None,  help="K8s kubeconfig context")
@click.option("--force",        is_flag=True,  help="Skip permission check")
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

    if not force and provider is not None:
        status = provider.check_permissions()
        if not status.ok:
            console.print(Panel(
                f"[red]{status}[/red]\n\n"
                + (f"[dim]{provider.setup_hint}[/dim]" if provider.setup_hint else ""),
                title="[red]permission check failed[/red]",
                border_style="red",
            ))
            console.print("  [dim]pass --force to skip this check[/dim]\n")
            sys.exit(1)
        console.print(f"  [bold #00ff88]✓[/bold #00ff88]  {status.message}\n")

    with Progress(
        SpinnerColumn(spinner_name="dots2", style="#00ff88"),
        TextColumn("[bold]{task.description}[/bold]"),
        TimeElapsedColumn(),
        console=console,
        transient=True,
    ) as progress:
        task = progress.add_task(f"scanning {target}…", total=None)
        result = scanner.scan()
        progress.update(task, completed=True)

    _finalise_and_print(result, scanner, enrich=enrich, visualize=visualize,
                        output=output, output_json=output_json)


# ── blast ─────────────────────────────────────────────────────────────────────

@main.command("blast")
@click.argument("nhi_name")
@click.option("--provider", "target", default="mock",
              type=click.Choice(PROVIDER_CHOICES[:-1], case_sensitive=False))
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

    target_nhi = next((n for n in result.nhis if nhi_name.lower() in n.name.lower()), None)
    if not target_nhi:
        console.print(f"\n  [red]✗[/red]  '{nhi_name}' not found\n")
        for n in result.nhis:
            console.print(f"  [dim]→[/dim]  {n.name}")
        sys.exit(1)

    br = graph.blast_radius(target_nhi.id)
    cj = br.get("crown_jewels_at_risk", [])

    console.print()
    console.print(Panel(
        f"  [bold red]{br['compromised_nhi']}[/bold red]\n\n"
        f"  [dim]reachable nodes[/dim]   [bold red]{br['reachable_count']}[/bold red]\n"
        f"  [dim]crown jewels[/dim]      [bold red]{len(cj)}[/bold red]"
        + (f"\n\n  [dim]" + "  →  ".join(cj) + "[/dim]" if cj else ""),
        title="[bold red]⚡ blast radius[/bold red]",
        border_style="red",
        padding=(1, 2),
    ))

    for cj_item, path in (br.get("attack_paths") or {}).items():
        console.print(f"\n  [red]→ {cj_item}[/red]")
        console.print(f"    [dim]{'  →  '.join(path)}[/dim]")
    console.print()


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _build_provider(target, *, path=".", profile=None, region="us-east-1",
                    org=None, namespace=None, context=None):
    from agentsentry.providers import registry
    if target == "mock":
        from agentsentry.scanners.mock import MockScanner
        console.print("  [dim]demo mode — no credentials needed[/dim]\n")
        return None, MockScanner()
    if target == "agents":
        from agentsentry.scanners.langchain_scanner import LangChainScanner
        console.print(f"  [dim]scanning AI agent code → {path}[/dim]\n")
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
        return (p := AzureProvider()), p
    if target == "gcp":
        from agentsentry.providers.gcp import GCPProvider
        return (p := GCPProvider()), p
    if target == "github":
        from agentsentry.providers.github import GitHubProvider
        return (p := GitHubProvider(org=org)), p
    if target == "k8s":
        from agentsentry.providers.k8s import KubernetesProvider
        return (p := KubernetesProvider(context=context, namespace=namespace)), p
    console.print(f"  [red]unknown target: {target}[/red]")
    sys.exit(1)


def _scan_all(*, enrich, visualize, output, output_json, force):
    from agentsentry.providers import registry
    ready = registry.detect_ready()
    if not ready:
        console.print("  [red]✗[/red]  No providers ready — run [bold]agentsentry providers[/bold]\n")
        sys.exit(1)

    console.print(f"  [bold #00ff88]auto-detected {len(ready)} provider(s):[/bold #00ff88]  "
                  + "  ".join(f"[bold]{r}[/bold]" for r in ready) + "\n")

    combined_nhis, combined_resources, all_scanners = [], [], []
    for name in ready:
        console.print(f"  [bold #00ff88]→[/bold #00ff88]  [bold]{name}[/bold]")
        provider, scanner = _build_provider(name)
        try:
            with Progress(SpinnerColumn(spinner_name="dots2", style="#00ff88"),
                          TextColumn("[dim]{task.description}[/dim]"),
                          console=console, transient=True) as p:
                t = p.add_task(f"scanning {name}…", total=None)
                result = scanner.scan()
                p.update(t, completed=True)
            combined_nhis.extend(result.nhis)
            combined_resources.extend(result.resources)
            all_scanners.append(scanner)
            console.print(f"     [#00ff88]✓[/#00ff88]  {result.total_nhis} NHIs found\n")
        except Exception as exc:
            console.print(f"     [red]✗[/red]  {exc}\n")

    from agentsentry.core.models import CloudProvider, ScanResult
    aggregate = ScanResult(scan_id="all-scan", provider=CloudProvider.LOCAL,
                           nhis=combined_nhis, resources=combined_resources)
    _finalise_and_print(aggregate, all_scanners[0] if all_scanners else None,
                        enrich=enrich, visualize=visualize, output=output, output_json=output_json)


def _finalise_and_print(result, scanner, *, enrich, visualize, output, output_json):
    scorer = NHIScorer()
    with Progress(SpinnerColumn(spinner_name="dots2", style="#00ff88"),
                  TextColumn("[dim]{task.description}[/dim]"),
                  console=console, transient=True) as p:
        t = p.add_task("computing risk scores…", total=None)
        result.nhis = scorer.score_all(result.nhis)
        p.update(t, completed=True)

    if enrich:
        from agentsentry.enrichment.cisa_kev import CISAKEVEnricher
        enricher = CISAKEVEnricher()
        enricher.load()
        result.nhis = enricher.enrich(result.nhis)
        stats = enricher.stats()
        console.print(f"  [dim]KEV catalog: {stats['total_entries']} entries · "
                      f"{stats['ransomware_campaigns']} ransomware-linked[/dim]\n")

    graph = NHIAttackGraph()
    for nhi in result.nhis:
        graph.add_nhi(nhi)
    for resource in result.resources:
        graph.add_resource(resource)
    if scanner and hasattr(scanner, "build_access_edges"):
        for from_id, to_id, perm, weight in scanner.build_access_edges():
            graph.add_access_edge(from_id, to_id, perm, weight)

    if output_json:
        import json
        console.print_json(json.dumps([n.model_dump(mode="json") for n in result.nhis], default=str))
    else:
        _print_summary(result)
        _print_nhi_table(result)
        _print_findings(result)
        _print_blast_top(result, graph)

    if visualize:
        with Progress(SpinnerColumn(spinner_name="dots2", style="#00ff88"),
                      TextColumn("[dim]generating graph…[/dim]"),
                      console=console, transient=True) as p:
            t = p.add_task("", total=None)
            graph.visualize(output)
            p.update(t, completed=True)
        console.print(f"  [bold #00ff88]✓[/bold #00ff88]  graph saved → [bold]{output}[/bold]")
        console.print("  [dim]open in any browser for the interactive view[/dim]\n")


def _print_banner():
    console.print()
    console.rule(style="dim #333333")
    console.print(
        f"  [bold #00ff88]⬡  AGENTSENTRY[/bold #00ff88]  "
        f"[dim]v{__version__}[/dim]  [dim]·[/dim]  "
        f"[dim]NHI & AI Agent Risk Scanner[/dim]  [dim]·[/dim]  "
        f"[dim]MIT · free forever[/dim]"
    )
    console.rule(style="dim #333333")
    console.print()


def _print_summary(result: ScanResult):
    c = result.critical_count
    h = result.high_count
    crit_str = f"[bold red]{c} critical[/bold red]" if c else f"[dim]{c} critical[/dim]"
    high_str = f"[bold orange1]{h} high[/bold orange1]" if h else f"[dim]{h} high[/dim]"

    console.print(
        f"  [bold white]{result.total_nhis}[/bold white] [dim]identities found[/dim]  "
        f"[dim]·[/dim]  {crit_str}  [dim]·[/dim]  {high_str}  "
        f"[dim]·[/dim]  [dim]{result.ai_agent_count} AI agents[/dim]"
    )
    console.print()


def _print_nhi_table(result: ScanResult):
    if not result.nhis:
        console.print("  [dim]no NHIs found — environment looks clean ✓[/dim]\n")
        return

    table = Table(
        box=box.SIMPLE_HEAD,
        show_header=True,
        header_style="dim",
        show_edge=False,
        pad_edge=True,
        border_style="dim",
    )
    table.add_column("",          min_width=2,  justify="center")
    table.add_column("Identity",  min_width=30, style="bold")
    table.add_column("Provider",  min_width=8)
    table.add_column("Type",      min_width=18, style="dim")
    table.add_column("Score",     min_width=7,  justify="right")
    table.add_column("Findings",  min_width=4,  justify="center")

    for nhi in sorted(result.nhis, key=lambda n: n.risk_score, reverse=True):
        dot   = RISK_DOTS[nhi.risk_level]
        score_style = RISK_STYLES[nhi.risk_level]
        table.add_row(
            dot,
            nhi.name[:38],
            nhi.provider.value,
            nhi.type.value,
            Text(f"{nhi.risk_score:.1f}", style=score_style),
            Text(str(len(nhi.findings)), style="dim" if not nhi.findings else "bold"),
        )

    console.print(table)
    console.print()


def _print_findings(result: ScanResult):
    critical = [n for n in result.nhis if n.risk_level == RiskLevel.CRITICAL]
    high     = [n for n in result.nhis if n.risk_level == RiskLevel.HIGH]

    if not critical and not high:
        return

    console.rule("[bold red]  findings  [/bold red]", style="dim red")
    console.print()

    for nhi in critical + high:
        for f in nhi.findings:
            if f.risk_level not in (RiskLevel.CRITICAL, RiskLevel.HIGH):
                continue
            badge = RISK_BADGES[f.risk_level]
            console.print(Panel(
                f"  {badge}  [bold]{f.title}[/bold]\n\n"
                f"  [dim]{f.description}[/dim]\n\n"
                f"  [bold #00ff88]fix →[/bold #00ff88]  {f.remediation}\n\n"
                f"  [dim]MITRE {', '.join(f.mitre_techniques)}[/dim]",
                subtitle=f"[dim]{nhi.name}[/dim]",
                border_style="red" if f.risk_level == RiskLevel.CRITICAL else "orange1",
                padding=(1, 2),
            ))

    console.print()


def _print_blast_top(result: ScanResult, graph: NHIAttackGraph):
    top_ids = graph.top_risk_nhis(n=3)
    if not top_ids:
        return

    console.rule("[dim]  blast radius  [/dim]", style="dim")
    console.print()
    for nhi_id in top_ids:
        br = graph.blast_radius(nhi_id)
        if not br.get("reachable_count"):
            continue
        cj = br.get("crown_jewels_at_risk", [])
        console.print(
            f"  [bold]{br['compromised_nhi']}[/bold]"
            f"  [dim]→[/dim]  [red]{br['reachable_count']} nodes[/red]"
            + (f"  [dim]→[/dim]  [bold red]{', '.join(cj)}[/bold red]" if cj else "")
        )
    console.print()


def _provider_display_name(name: str) -> str:
    return {"aws": "Amazon Web Services", "azure": "Microsoft Azure",
            "gcp": "Google Cloud Platform", "github": "GitHub",
            "k8s": "Kubernetes", "local": "Local Environment"}.get(name, name.title())


# ── interactive ───────────────────────────────────────────────────────────────

@main.command("interactive")
@click.option("--visualize", is_flag=True, help="Generate HTML attack graph after scan")
@click.option("--enrich",    is_flag=True, help="Enrich with CISA KEV threat intel")
def cmd_interactive(visualize: bool, enrich: bool):
    """Interactive mode — pick your providers and path visually."""
    from rich.prompt import Prompt, Confirm
    from agentsentry.providers import registry

    _print_banner()

    # ── Provider picker ───────────────────────────────────────────────
    console.print("  [bold]Which environments do you want to scan?[/bold]\n")

    all_providers = [
        ("mock",   "Demo mode (no credentials needed)",   True),
        ("local",  "This machine — env vars, SSH keys, files", True),
        ("aws",    "Amazon Web Services",                  False),
        ("azure",  "Microsoft Azure",                      False),
        ("gcp",    "Google Cloud Platform",                False),
        ("github", "GitHub — PATs, deploy keys, secrets", False),
        ("k8s",    "Kubernetes cluster",                   False),
        ("agents", "AI agent code (LangChain/CrewAI/AutoGen)", True),
    ]

    statuses = {s.provider_name: s.ok for s in registry.detect()}
    statuses["mock"]   = True
    statuses["agents"] = True

    console.print(f"  {'#':<4} {'Provider':<10} {'Status':<14} Description")
    console.rule(style="dim")
    for i, (name, desc, _) in enumerate(all_providers, 1):
        ok = statuses.get(name, False)
        status = "[bold #00ff88]ready[/bold #00ff88]" if ok else "[dim]needs setup[/dim]"
        dot    = "[bold #00ff88]●[/bold #00ff88]" if ok else "[dim red]●[/dim red]"
        console.print(f"  [dim]{i}[/dim]   {dot} [bold]{name:<10}[/bold] {status:<24} [dim]{desc}[/dim]")
    console.print()

    raw = Prompt.ask(
        "  [bold]Enter numbers to scan[/bold] (e.g. [cyan]1,2,5[/cyan] or [cyan]all[/cyan])",
        default="1"
    )

    if raw.strip().lower() == "all":
        chosen = [name for name, _, _ in all_providers]
    else:
        indices = []
        for part in raw.replace(" ", "").split(","):
            try:
                indices.append(int(part) - 1)
            except ValueError:
                pass
        chosen = [all_providers[i][0] for i in indices if 0 <= i < len(all_providers)]

    if not chosen:
        console.print("  [red]✗[/red]  No valid selections. Exiting.\n")
        return

    console.print(f"\n  [bold #00ff88]Scanning:[/bold #00ff88]  {', '.join(chosen)}\n")

    # ── Path for local/agents ─────────────────────────────────────────
    path = "."
    if "local" in chosen or "agents" in chosen:
        path = Prompt.ask(
            "  [bold]Path to scan[/bold]",
            default="."
        )

    # ── Run each chosen provider ──────────────────────────────────────
    combined_nhis, combined_resources, all_scanners = [], [], []

    for target in chosen:
        console.rule(f"[dim]  {target}  [/dim]", style="dim")
        provider, scanner = _build_provider(target, path=path)

        if provider is not None:
            status = provider.check_permissions()
            if not status.ok:
                console.print(f"  [red]✗[/red]  {target}: {status.message}")
                if not Confirm.ask(f"  Skip [bold]{target}[/bold] and continue?", default=True):
                    continue
                else:
                    continue

        try:
            with Progress(
                SpinnerColumn(spinner_name="dots2", style="#00ff88"),
                TextColumn("[dim]{task.description}[/dim]"),
                console=console, transient=True,
            ) as p:
                t = p.add_task(f"scanning {target}…", total=None)
                result = scanner.scan()
                p.update(t, completed=True)

            combined_nhis.extend(result.nhis)
            combined_resources.extend(result.resources)
            all_scanners.append(scanner)
            console.print(f"  [#00ff88]✓[/#00ff88]  {result.total_nhis} NHIs found\n")
        except Exception as exc:
            console.print(f"  [red]✗[/red]  {target}: {exc}\n")

    if not combined_nhis:
        console.print("  [dim]No NHIs found across selected providers.[/dim]\n")
        return

    from agentsentry.core.models import CloudProvider as CP, ScanResult as SR
    aggregate = SR(scan_id="interactive-scan", provider=CP.LOCAL,
                   nhis=combined_nhis, resources=combined_resources)

    _finalise_and_print(
        aggregate, all_scanners[0] if all_scanners else None,
        enrich=enrich, visualize=visualize,
        output="agentsentry_graph.html", output_json=False,
    )
