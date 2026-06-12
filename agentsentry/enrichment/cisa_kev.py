"""
CISA Known Exploited Vulnerabilities (KEV) Enrichment

Pulls the CISA KEV catalog — a free, public, daily-updated list of
vulnerabilities that are actively being exploited in the wild.

Why this matters: a CVE with a CVSS score of 9.8 that nobody is
actively exploiting is less urgent than a CVE with a CVSS of 6.5
that ransomware groups are using today. KEV tells you which is which.

API: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
Free, no authentication, updated daily.
"""

from __future__ import annotations

import json
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from agentsentry.core.models import Finding, NonHumanIdentity, RiskLevel

KEV_URL = (
    "https://www.cisa.gov/sites/default/files/feeds/"
    "known_exploited_vulnerabilities.json"
)

# Local cache path — avoids hammering the API on every scan
CACHE_PATH = Path.home() / ".agentsentry" / "kev_cache.json"
CACHE_MAX_AGE_HOURS = 24


@dataclass
class KEVEntry:
    cve_id: str
    vendor_project: str
    product: str
    vulnerability_name: str
    date_added: str
    short_description: str
    required_action: str
    due_date: str
    ransomware_use: str = "Unknown"

    @property
    def is_ransomware(self) -> bool:
        return self.ransomware_use.lower() == "known"


class CISAKEVEnricher:
    """
    Enriches NHI findings with CISA KEV data.

    For each NHI, checks whether any software products associated
    with the identity have known actively-exploited CVEs.

    Also flags if any KEV entries map to the attack patterns
    already identified in the NHI's findings (e.g. T1078 = credential abuse).
    """

    # MITRE technique → KEV product keywords that commonly exploit it
    TECHNIQUE_PRODUCT_MAP: dict[str, list[str]] = {
        "T1078.004": ["iam", "okta", "azure ad", "active directory", "identity"],
        "T1528": ["oauth", "token", "api key", "access key"],
        "T1651": ["lambda", "cloudshell", "systems manager"],
        "T1199": ["vpn", "citrix", "ivanti", "fortinet", "pulse"],
        "T1059": ["python", "powershell", "bash", "javascript"],
    }

    def __init__(self):
        self._kev: list[KEVEntry] = []
        self._loaded = False

    def load(self, force_refresh: bool = False) -> int:
        """
        Load the KEV catalog. Uses local cache if fresh, fetches otherwise.
        Returns the number of entries loaded.
        """
        if not force_refresh and self._is_cache_fresh():
            self._kev = self._load_from_cache()
        else:
            self._kev = self._fetch_from_cisa()
            self._save_cache(self._kev)

        self._loaded = True
        return len(self._kev)

    def enrich(self, nhis: list[NonHumanIdentity]) -> list[NonHumanIdentity]:
        """
        Enrich a list of NHIs with KEV data.
        Adds KEV-related findings and escalates risk level where appropriate.
        """
        if not self._loaded:
            self.load()

        for nhi in nhis:
            kev_findings = self._find_kev_matches(nhi)
            if kev_findings:
                nhi.findings.extend(kev_findings)
                # Escalate risk level if KEV finding on already-high NHI.
                # NOTE: this intentionally overrides the AI-agent score cap (scorer.py).
                # Active exploitation (KEV) is harder evidence than the heuristic ceiling —
                # a CISA-flagged CVE beats a conservative static upper bound.
                if nhi.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
                    nhi.risk_score = max(nhi.risk_score, 150.0)
                elif nhi.risk_level == RiskLevel.MEDIUM:
                    nhi.risk_score = max(nhi.risk_score, 60.0)
                    nhi.risk_level = RiskLevel.HIGH

        return nhis

    def stats(self) -> dict:
        if not self._loaded:
            self.load()
        ransomware = sum(1 for e in self._kev if e.is_ransomware)
        return {
            "total_entries": len(self._kev),
            "ransomware_campaigns": ransomware,
            "catalog_url": KEV_URL,
        }

    # ------------------------------------------------------------------
    # Matching logic
    # ------------------------------------------------------------------

    def _find_kev_matches(self, nhi: NonHumanIdentity) -> list[Finding]:
        findings = []

        # Map the NHI's MITRE techniques to KEV product keywords
        relevant_products: set[str] = set()
        for technique in nhi.mitre_techniques:
            keywords = self.TECHNIQUE_PRODUCT_MAP.get(technique, [])
            relevant_products.update(keywords)

        if not relevant_products:
            return []

        # Find KEV entries whose product matches relevant keywords
        matched_kevs = [
            entry
            for entry in self._kev
            if any(
                kw in entry.product.lower() or kw in entry.vendor_project.lower()
                for kw in relevant_products
            )
        ]

        if not matched_kevs:
            return []

        # Pick the most recent / most severe (ransomware first)
        ransomware_kevs = [e for e in matched_kevs if e.is_ransomware]
        top_kevs = (ransomware_kevs or matched_kevs)[:3]

        for kev in top_kevs:
            findings.append(
                Finding(
                    finding_id=f"KEV-{kev.cve_id}",
                    title=f"Actively Exploited CVE in Related Technology: {kev.cve_id}",
                    description=(
                        f"{kev.vulnerability_name} in {kev.vendor_project} {kev.product}. "
                        f"{kev.short_description} "
                        f"{'⚠ Used in ransomware campaigns.' if kev.is_ransomware else ''}"
                    ),
                    risk_level=(
                        RiskLevel.CRITICAL if kev.is_ransomware else RiskLevel.HIGH
                    ),
                    mitre_techniques=nhi.mitre_techniques,
                    remediation=(
                        f"CISA required action: {kev.required_action} "
                        f"(Due: {kev.due_date})"
                    ),
                    evidence={
                        "cve_id": kev.cve_id,
                        "product": kev.product,
                        "vendor": kev.vendor_project,
                        "date_added_to_kev": kev.date_added,
                        "ransomware": kev.is_ransomware,
                    },
                )
            )

        return findings

    # ------------------------------------------------------------------
    # Fetch and cache
    # ------------------------------------------------------------------

    def _fetch_from_cisa(self) -> list[KEVEntry]:
        print("[AgentSentry] Fetching CISA KEV catalog...")
        try:
            with urllib.request.urlopen(KEV_URL, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            entries = [
                KEVEntry(
                    cve_id=v.get("cveID", ""),
                    vendor_project=v.get("vendorProject", ""),
                    product=v.get("product", ""),
                    vulnerability_name=v.get("vulnerabilityName", ""),
                    date_added=v.get("dateAdded", ""),
                    short_description=v.get("shortDescription", ""),
                    required_action=v.get("requiredAction", ""),
                    due_date=v.get("dueDate", ""),
                    ransomware_use=v.get("knownRansomwareCampaignUse", "Unknown"),
                )
                for v in data.get("vulnerabilities", [])
            ]
            print(f"[AgentSentry] Loaded {len(entries)} KEV entries.")
            return entries
        except Exception as e:
            print(f"[AgentSentry] Warning: Could not fetch KEV catalog: {e}")
            return []

    def _save_cache(self, entries: list[KEVEntry]) -> None:
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(CACHE_PATH, "w") as f:
            json.dump(
                {
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                    "entries": [e.__dict__ for e in entries],
                },
                f,
            )

    def _load_from_cache(self) -> list[KEVEntry]:
        with open(CACHE_PATH) as f:
            data = json.load(f)
        return [KEVEntry(**e) for e in data["entries"]]

    def _is_cache_fresh(self) -> bool:
        if not CACHE_PATH.exists():
            return False
        try:
            with open(CACHE_PATH) as f:
                data = json.load(f)
            fetched_at = datetime.fromisoformat(data["fetched_at"])
            age_hours = (datetime.now(timezone.utc) - fetched_at).total_seconds() / 3600
            return age_hours < CACHE_MAX_AGE_HOURS
        except Exception:
            return False
