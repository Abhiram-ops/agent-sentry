"""
Tests for the Azure and GCP scanners against fake SDK clients —
no cloud credentials or SDKs required.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace as NS

import pytest

from agentsentry.core.models import NHIType, RiskLevel
from agentsentry.core.scorer import NHIScorer

NOW = datetime.now(timezone.utc)


# ═══════════════════════════ Azure fakes ═══════════════════════════

SUB = "abcd1234-0000-0000-0000-000000000000"


class FakeSubs:
    def list(self):
        return [NS(subscription_id=SUB, display_name="Prod")]


class FakeAuth:
    def __init__(self):
        self.role_assignments = NS(list_for_subscription=self._assignments)
        self.role_definitions = NS(get=self._role_def)
        self._role_names = {
            "r1": "Owner",
            "r2": "Key Vault Secrets User",
            "r3": "Contributor",
            "r4": "Reader",
        }

    def _assignments(self):
        return [
            NS(
                principal_id="mi-principal-001",
                principal_type="ServicePrincipal",
                role_definition_id=f"/subscriptions/{SUB}/providers/Microsoft.Authorization/roleDefinitions/r1",
                scope=f"/subscriptions/{SUB}",
                created_on=NOW - timedelta(days=300),
            ),
            NS(
                principal_id="sp-principal-002",
                principal_type="ServicePrincipal",
                role_definition_id=".../r2",
                scope=f"/subscriptions/{SUB}/resourceGroups/app-rg",
                created_on=NOW - timedelta(days=90),
            ),
            NS(
                principal_id="sp-principal-002",
                principal_type="ServicePrincipal",
                role_definition_id=".../r3",
                scope=f"/subscriptions/{SUB}/resourceGroups/app-rg",
                created_on=NOW - timedelta(days=50),
            ),
            # human — must be skipped
            NS(
                principal_id="user-003",
                principal_type="User",
                role_definition_id=".../r4",
                scope=f"/subscriptions/{SUB}",
                created_on=None,
            ),
        ]

    def _role_def(self, scope, role_definition_id):
        return NS(role_name=self._role_names.get(role_definition_id, "Unknown"))


class FakeResources:
    def __init__(self):
        self.resources = NS(list=self._list, get_by_id=self._get_by_id)
        self.resource_groups = NS(list=lambda: [NS(name="prod-rg")])

    def _list(self, filter=None):
        mi = NS(
            id="/subs/.../mi-webapp",
            name="mi-webapp",
            type="Microsoft.ManagedIdentity/userAssignedIdentities",
        )
        if filter and "ManagedIdentity" in filter:
            return [mi]
        return [
            mi,  # not a mapped resource type — skipped by the resource pass
            NS(
                id="/subs/.../prod-keyvault",
                name="prod-keyvault",
                type="Microsoft.KeyVault/vaults",
            ),
            NS(
                id="/subs/.../appstorage",
                name="appstorage",
                type="Microsoft.Storage/storageAccounts",
            ),
        ]

    def _get_by_id(self, rid, api_version):
        return NS(properties={"principalId": "mi-principal-001"})


@pytest.fixture()
def azure_result():
    from agentsentry.scanners.azure import AzureScanner

    scanner = AzureScanner(
        credential="fake",
        subscription_client=NS(subscriptions=FakeSubs()),
        auth_client_factory=lambda sub: FakeAuth(),
        resource_client_factory=lambda sub: FakeResources(),
    )
    return scanner, scanner.scan()


class TestAzureScanner:
    def test_principals_aggregated_humans_skipped(self, azure_result):
        _, res = azure_result
        assert len(res.nhis) == 2  # user-003 excluded

    def test_managed_identity_resolved_and_typed(self, azure_result):
        _, res = azure_result
        mi = next(n for n in res.nhis if n.type == NHIType.MANAGED_IDENTITY)
        assert mi.name == "azure/mi/mi-webapp"
        assert mi.attached_policies == ["Owner"]
        assert mi.created_date is not None

    def test_service_principal_roles_aggregated(self, azure_result):
        _, res = azure_result
        sp = next(n for n in res.nhis if n.type == NHIType.SERVICE_PRINCIPAL)
        assert set(sp.attached_policies) == {"Key Vault Secrets User", "Contributor"}

    def test_owner_findings(self, azure_result):
        _, res = azure_result
        mi = next(n for n in res.nhis if n.type == NHIType.MANAGED_IDENTITY)
        ids = [f.finding_id for f in mi.findings]
        assert any("high-priv" in i for i in ids)
        assert any("sub-scope" in i for i in ids)
        assert any(f.risk_level == RiskLevel.CRITICAL for f in mi.findings)

    def test_rg_scope_does_not_flag_subscription_scope(self, azure_result):
        _, res = azure_result
        sp = next(n for n in res.nhis if n.type == NHIType.SERVICE_PRINCIPAL)
        assert not any("sub-scope" in f.finding_id for f in sp.findings)

    def test_resources_and_crown_jewels(self, azure_result):
        _, res = azure_result
        ids = {r.id for r in res.resources}
        assert ids == {
            "azure-kv-prod-keyvault",
            "azure-st-appstorage",
            "azure-rg-prod-rg",
        }
        kv = next(r for r in res.resources if r.id == "azure-kv-prod-keyvault")
        assert kv.is_crown_jewel

    def test_access_edges(self, azure_result):
        scanner, res = azure_result
        mi = next(n for n in res.nhis if n.type == NHIType.MANAGED_IDENTITY)
        sp = next(n for n in res.nhis if n.type == NHIType.SERVICE_PRINCIPAL)
        emap = {(e[0], e[1]): e for e in scanner.build_access_edges()}
        for rid in {r.id for r in res.resources}:
            assert (mi.id, rid) in emap  # Owner reaches everything
            assert emap[(mi.id, rid)][3] == 0.5
        assert (sp.id, "azure-kv-prod-keyvault") in emap
        assert (sp.id, "azure-st-appstorage") in emap  # Contributor

    def test_owner_scores_max_privilege(self, azure_result):
        _, res = azure_result
        scored = NHIScorer().score_all(list(res.nhis))
        mi = next(n for n in scored if n.type == NHIType.MANAGED_IDENTITY)
        assert mi.privilege_score == 10.0


# ═══════════════════════════ GCP fakes ═══════════════════════════

PROJECT = "demo-project"
SA1 = (
    f"projects/{PROJECT}/serviceAccounts/ci-deployer@{PROJECT}.iam.gserviceaccount.com"
)
SA2 = f"projects/{PROJECT}/serviceAccounts/analytics@{PROJECT}.iam.gserviceaccount.com"
T_OLD = (NOW - timedelta(days=400)).strftime("%Y-%m-%dT%H:%M:%SZ")
T_NEW = (NOW - timedelta(days=100)).strftime("%Y-%m-%dT%H:%M:%SZ")


class Req:
    def __init__(self, payload):
        self._p = payload

    def execute(self):
        return self._p


class FakeSAKeys:
    def list(self, name, keyTypes=None):
        if name == SA1:
            return Req({"keys": [{"validAfterTime": T_OLD}, {"validAfterTime": T_NEW}]})
        return Req({"keys": []})


class FakeSAs:
    def list(self, name):
        return Req(
            {
                "accounts": [
                    {
                        "name": SA1,
                        "email": f"ci-deployer@{PROJECT}.iam.gserviceaccount.com",
                        "uniqueId": "111111",
                        "disabled": False,
                    },
                    {
                        "name": SA2,
                        "email": f"analytics@{PROJECT}.iam.gserviceaccount.com",
                        "uniqueId": "222222",
                        "disabled": True,
                    },
                ]
            }
        )

    def list_next(self, req, resp):
        return None

    def keys(self):
        return FakeSAKeys()


class FakeIAM:
    def projects(self):
        return self

    def serviceAccounts(self):
        return FakeSAs()


class FakeCRM:
    def projects(self):
        return self

    def getIamPolicy(self, resource, body):
        return Req(
            {
                "bindings": [
                    {
                        "role": "roles/editor",
                        "members": [
                            f"serviceAccount:ci-deployer@{PROJECT}.iam.gserviceaccount.com",
                            "user:human@example.com",
                        ],
                    },
                    {
                        "role": "roles/storage.admin",
                        "members": [
                            f"serviceAccount:ci-deployer@{PROJECT}.iam.gserviceaccount.com"
                        ],
                    },
                    {
                        "role": "roles/bigquery.dataViewer",
                        "members": [
                            f"serviceAccount:analytics@{PROJECT}.iam.gserviceaccount.com"
                        ],
                    },
                    {
                        "role": "roles/owner",
                        "members": [
                            "serviceAccount:ext@other-proj.iam.gserviceaccount.com"
                        ],
                    },
                ]
            }
        )


class FakeBuckets:
    def list(self, project):
        return Req({"items": [{"name": "prod-data"}, {"name": "scratch"}]})

    def getIamPolicy(self, bucket):
        if bucket == "prod-data":
            return Req(
                {
                    "bindings": [
                        {"role": "roles/storage.objectViewer", "members": ["allUsers"]}
                    ]
                }
            )
        return Req({"bindings": []})


class FakeStorage:
    def buckets(self):
        return FakeBuckets()


class FakeBQ:
    def datasets(self):
        return self

    def list(self, projectId):
        return Req({"datasets": [{"datasetReference": {"datasetId": "customer_pii"}}]})


@pytest.fixture()
def gcp_result():
    from agentsentry.scanners.gcp import GCPScanner

    scanner = GCPScanner(
        credentials="fake",
        project=PROJECT,
        iam_service=FakeIAM(),
        crm_service=FakeCRM(),
        storage_service=FakeStorage(),
        bq_service=FakeBQ(),
    )
    return scanner, scanner.scan()


class TestGCPScanner:
    def test_all_roles_aggregated_per_sa(self, gcp_result):
        _, res = gcp_result
        ci = next(n for n in res.nhis if "ci-deployer" in n.name)
        assert ci.type == NHIType.GCP_SERVICE_ACCOUNT
        assert set(ci.attached_policies) == {"roles/editor", "roles/storage.admin"}

    def test_key_ages_drive_lifecycle_dates(self, gcp_result):
        _, res = gcp_result
        ci = next(n for n in res.nhis if "ci-deployer" in n.name)
        assert ci.last_rotated is not None
        assert abs((NOW - ci.last_rotated).days - 100) <= 1
        assert ci.created_date is not None
        assert abs((NOW - ci.created_date).days - 400) <= 1

    def test_key_and_high_priv_findings(self, gcp_result):
        _, res = gcp_result
        ci = next(n for n in res.nhis if "ci-deployer" in n.name)
        ids = [f.finding_id for f in ci.findings]
        assert any("sa-key" in i for i in ids)
        assert any("high-priv" in i for i in ids)
        assert any(f.risk_level == RiskLevel.CRITICAL for f in ci.findings)

    def test_disabled_sa_with_roles_flagged(self, gcp_result):
        _, res = gcp_result
        an = next(n for n in res.nhis if "analytics" in n.name)
        assert any("disabled" in f.finding_id for f in an.findings)

    def test_externally_homed_sa_marked_cross_account(self, gcp_result):
        _, res = gcp_result
        ext = next(n for n in res.nhis if "ext@" in n.name)
        assert ext.is_cross_account
        assert ext.attached_policies == ["roles/owner"]

    def test_resources_public_and_crown_jewels(self, gcp_result):
        _, res = gcp_result
        ids = {r.id for r in res.resources}
        assert ids == {
            "gcp-bucket-prod-data",
            "gcp-bucket-scratch",
            "gcp-bq-customer_pii",
        }
        prod = next(r for r in res.resources if r.id == "gcp-bucket-prod-data")
        assert prod.is_crown_jewel and prod.is_public
        pii = next(r for r in res.resources if r.id == "gcp-bq-customer_pii")
        assert pii.is_crown_jewel

    def test_access_edges_role_scoping(self, gcp_result):
        scanner, res = gcp_result
        ci = next(n for n in res.nhis if "ci-deployer" in n.name)
        edges = scanner.build_access_edges()
        triples = {(e[0], e[1], e[2]) for e in edges}
        assert (ci.id, "gcp-bq-customer_pii", "roles/editor") in triples
        assert (ci.id, "gcp-bucket-prod-data", "roles/storage.admin") in triples
        # storage.admin must not leak into BigQuery
        assert not any(
            e[2] == "roles/storage.admin" and e[1].startswith("gcp-bq-") for e in edges
        )

    def test_privilege_scores(self, gcp_result):
        _, res = gcp_result
        scored = NHIScorer().score_all(list(res.nhis))
        ci = next(n for n in scored if "ci-deployer" in n.name)
        ext = next(n for n in scored if "ext@" in n.name)
        assert ci.privilege_score == 9.0  # roles/editor
        assert ext.privilege_score == 10.0  # roles/owner ×1.5 cross-acct, capped
