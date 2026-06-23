"""
AWS IAM Scanner

Discovers all Non-Human Identities in an AWS account using read-only API calls.
Requires credentials with the AgentSentry read-only policy attached.

Setup:
    aws configure   # paste your Access Key ID and Secret when prompted

Usage:
    python -m agentsentry scan aws
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from agentsentry.core.models import (
    CloudProvider,
    NonHumanIdentity,
    NHIType,
    Resource,
    ScanResult,
)


# Policies that signal administrative or high-privilege access
HIGH_PRIV_POLICIES = {
    "AdministratorAccess",
    "PowerUserAccess",
    "IAMFullAccess",
    "AmazonS3FullAccess",
    "AWSLambda_FullAccess",
    "AmazonRDSFullAccess",
    "SecretsManagerReadWrite",
}


class AWSScanner:
    """
    Scans an AWS account for Non-Human Identities.

    Discovers:
      - IAM Roles (service roles, execution roles, cross-account roles)
      - IAM Users with programmatic access keys
      - Lambda execution roles
      - Known high-value resources (S3 buckets, RDS, Secrets Manager)
    """

    def __init__(
        self,
        profile: str | None = None,
        region: str = "us-east-1",
        analyze_usage: bool = False,
    ):
        session = boto3.Session(profile_name=profile, region_name=region)
        self.iam    = session.client("iam")
        self.sts    = session.client("sts")
        self.s3     = session.client("s3")
        self.lambda_ = session.client("lambda")
        self.secrets   = session.client("secretsmanager")
        self.rds       = session.client("rds")
        self.dynamodb  = session.client("dynamodb")
        self.region = region
        self._last_result = None  # populated by scan() for build_access_edges()
        # Cache managed policy documents by ARN — same policy is often attached
        # to dozens of roles; fetching it once and reusing saves many API calls.
        self._policy_doc_cache: dict[str, list[dict]] = {}
        # Opt-in least-privilege analysis via IAM Access Advisor. Off by default
        # because it runs an async job per principal (slow on large accounts).
        self.analyze_usage = analyze_usage
        # Cache access-advisor results by principal ARN — a user with multiple
        # access keys would otherwise trigger an identical job per key.
        self._usage_cache: dict[str, list[dict]] = {}

    def scan(self) -> ScanResult:
        print("[AgentSentry] Connecting to AWS...")
        account_id = self._get_account_id()
        print(f"[AgentSentry] Account: {account_id} | Region: {self.region}")

        nhis: list[NonHumanIdentity] = []
        resources: list[Resource] = []

        print("[AgentSentry] Scanning IAM roles...")
        nhis.extend(self._scan_iam_roles())

        print("[AgentSentry] Scanning IAM users with access keys...")
        nhis.extend(self._scan_iam_users())

        print("[AgentSentry] Scanning S3 buckets...")
        resources.extend(self._scan_s3_buckets())

        print("[AgentSentry] Scanning Lambda functions...")
        resources.extend(self._scan_lambda_functions())

        print("[AgentSentry] Scanning Secrets Manager secrets...")
        resources.extend(self._scan_secrets())

        print("[AgentSentry] Scanning RDS instances...")
        resources.extend(self._scan_rds_instances())

        print("[AgentSentry] Scanning DynamoDB tables...")
        resources.extend(self._scan_dynamodb_tables())

        print(f"[AgentSentry] Done. Found {len(nhis)} NHIs, {len(resources)} resources.")

        result = ScanResult(
            scan_id=f"aws-{account_id}",
            provider=CloudProvider.AWS,
            account_id=account_id,
            nhis=nhis,
            resources=resources,
        )
        self._last_result = result  # cache for build_access_edges()
        return result

    # ------------------------------------------------------------------
    # IAM Role Scanner
    # ------------------------------------------------------------------

    def _scan_iam_roles(self) -> list[NonHumanIdentity]:
        nhis = []
        paginator = self.iam.get_paginator("list_roles")

        for page in paginator.paginate():
            for role in page["Roles"]:
                nhi = self._build_role_nhi(role)
                if nhi:
                    nhis.append(nhi)

        return nhis

    def _build_role_nhi(self, role: dict) -> NonHumanIdentity | None:
        role_name = role["RoleName"]

        # Skip AWS service-linked roles — they're managed by AWS, not you
        if role_name.startswith("AWSServiceRole"):
            return None

        # Get attached policies — capture full metadata (name + ARN)
        attached_meta: list[dict] = []
        try:
            resp = self.iam.list_attached_role_policies(RoleName=role_name)
            attached_meta = resp["AttachedPolicies"]
        except ClientError:
            pass
        policy_names = [p["PolicyName"] for p in attached_meta]

        # Fetch actual policy documents for managed policies and merge with inline.
        # Scoring and edge-derivation both operate on inline_policies, so managed
        # policy documents land here too — no scorer changes needed.
        inline_policies = self._fetch_managed_policy_docs(attached_meta)

        # Get inline policies
        try:
            inline_names = self.iam.list_role_policies(RoleName=role_name)["PolicyNames"]
            for pname in inline_names:
                doc = self.iam.get_role_policy(RoleName=role_name, PolicyName=pname)
                inline_policies.append(doc["PolicyDocument"])
        except ClientError:
            pass

        # Get last used info
        try:
            detail = self.iam.get_role(RoleName=role_name)["Role"]
            last_used_info = detail.get("RoleLastUsed", {})
            last_used = last_used_info.get("LastUsedDate")
        except ClientError:
            last_used = None

        # Check trust policy for cross-account access
        trust_policy = role.get("AssumeRolePolicyDocument", {})
        is_cross_account = self._is_cross_account(trust_policy)

        # Heuristic: is this role internet-facing?
        is_internet_facing = any(
            kw in role_name.lower()
            for kw in ["public", "external", "internet", "api", "web", "lambda"]
        )

        # Least-privilege analysis (opt-in) — which granted services go unused.
        service_last_accessed = (
            self._fetch_service_last_accessed(role["Arn"])
            if self.analyze_usage
            else []
        )

        return NonHumanIdentity(
            id=role["RoleId"],
            name=role_name,
            type=NHIType.IAM_ROLE,
            provider=CloudProvider.AWS,
            arn=role["Arn"],
            created_date=role["CreateDate"],
            last_used=last_used,
            last_rotated=None,  # Roles don't rotate — credentials do
            attached_policies=policy_names,
            inline_policies=inline_policies,
            trust_policy=trust_policy,
            is_cross_account=is_cross_account,
            is_internet_facing=is_internet_facing,
            service_last_accessed=service_last_accessed,
        )

    # ------------------------------------------------------------------
    # IAM User / Access Key Scanner
    # ------------------------------------------------------------------

    def _scan_iam_users(self) -> list[NonHumanIdentity]:
        nhis = []
        paginator = self.iam.get_paginator("list_users")

        for page in paginator.paginate():
            for user in page["Users"]:
                # Only care about users with programmatic access keys
                keys = self._get_access_keys(user["UserName"])
                if not keys:
                    continue

                for key in keys:
                    nhi = self._build_key_nhi(user, key)
                    nhis.append(nhi)

        return nhis

    def _get_access_keys(self, username: str) -> list[dict]:
        try:
            resp = self.iam.list_access_keys(UserName=username)
            return resp["AccessKeyMetadata"]
        except ClientError:
            return []

    def _build_key_nhi(self, user: dict, key: dict) -> NonHumanIdentity:
        username = user["UserName"]

        attached_meta: list[dict] = []
        try:
            resp = self.iam.list_attached_user_policies(UserName=username)
            attached_meta = resp["AttachedPolicies"]
        except ClientError:
            pass
        policy_names = [p["PolicyName"] for p in attached_meta]

        # Fetch managed policy documents + user inline policies
        inline_policies = self._fetch_managed_policy_docs(attached_meta)
        try:
            inline_names = self.iam.list_user_policies(UserName=username)["PolicyNames"]
            for pname in inline_names:
                doc = self.iam.get_user_policy(UserName=username, PolicyName=pname)
                inline_policies.append(doc["PolicyDocument"])
        except ClientError:
            pass

        # Last used info for the specific key
        try:
            last_used_info = self.iam.get_access_key_last_used(
                AccessKeyId=key["AccessKeyId"]
            )["AccessKeyLastUsed"]
            last_used = last_used_info.get("LastUsedDate")
        except ClientError:
            last_used = None

        created_date = key.get("CreateDate")
        # Keys are "rotated" when they're recreated — creation date is the rotation date
        last_rotated = created_date

        # Least-privilege analysis (opt-in) — access advisor is per-user, so the
        # cache means a user's second key reuses the first key's job result.
        service_last_accessed = (
            self._fetch_service_last_accessed(user["Arn"])
            if self.analyze_usage
            else []
        )

        return NonHumanIdentity(
            id=key["AccessKeyId"],
            name=f"{username} / {key['AccessKeyId'][:8]}...",
            type=NHIType.IAM_USER_KEY,
            provider=CloudProvider.AWS,
            arn=user["Arn"],
            created_date=created_date,
            last_used=last_used,
            last_rotated=last_rotated,
            attached_policies=policy_names,
            inline_policies=inline_policies,
            is_internet_facing=True,  # Access keys are by nature external credentials
            service_last_accessed=service_last_accessed,
        )

    # ------------------------------------------------------------------
    # Resource Scanners
    # ------------------------------------------------------------------

    def _scan_s3_buckets(self) -> list[Resource]:
        resources = []
        try:
            buckets = self.s3.list_buckets().get("Buckets", [])
        except ClientError:
            return []

        for bucket in buckets:
            name = bucket["Name"]
            is_public, acl_checked = self._is_bucket_public(name)

            # Heuristic crown jewel detection based on name patterns
            is_crown_jewel = any(
                kw in name.lower()
                for kw in ["prod", "customer", "pii", "backup",
                           "secret", "key", "data", "model", "weights"]
            )

            if not acl_checked:
                tags = ["PUBLIC_STATUS_UNKNOWN"]
            elif is_public:
                tags = ["PUBLIC"]
            else:
                tags = []

            resources.append(Resource(
                id=f"s3-{name}",
                name=name,
                resource_type="s3_bucket",
                provider=CloudProvider.AWS,
                arn=f"arn:aws:s3:::{name}",
                is_crown_jewel=is_crown_jewel,
                is_public=is_public if acl_checked else False,
                sensitivity_tags=tags,
            ))

        return resources

    def _is_bucket_public(self, bucket_name: str) -> tuple[bool, bool]:
        """
        Check whether a bucket is publicly accessible via ACL.

        Returns:
            (is_public, acl_checked) — if *acl_checked* is False the caller
            should tag the resource as PUBLIC_STATUS_UNKNOWN rather than
            assuming the bucket is private (e.g. cross-region ACL denials
            look the same as a genuinely private bucket in the raw exception).
        """
        try:
            acl_resp = self.s3.get_bucket_acl(Bucket=bucket_name)
            for grant in acl_resp.get("Grants", []):
                grantee = grant.get("Grantee", {})
                if grantee.get("URI") == "http://acs.amazonaws.com/groups/global/AllUsers":
                    return True, True
            return False, True
        except ClientError:
            # Access denied (cross-region, restrictive policy, etc.) —
            # we genuinely don't know, so signal that to the caller.
            return False, False

    def _scan_lambda_functions(self) -> list[Resource]:
        resources = []
        try:
            paginator = self.lambda_.get_paginator("list_functions")
            for page in paginator.paginate():
                for fn in page["Functions"]:
                    resources.append(Resource(
                        id=f"lambda-{fn['FunctionName']}",
                        name=fn["FunctionName"],
                        resource_type="lambda_function",
                        provider=CloudProvider.AWS,
                        arn=fn["FunctionArn"],
                        is_crown_jewel="prod" in fn["FunctionName"].lower(),
                    ))
        except ClientError:
            pass

        return resources

    def _scan_secrets(self) -> list[Resource]:
        """
        Secrets Manager secrets — the highest-value crown jewels in an NHI
        attack (API keys, DB passwords, tokens). Resource ids use the ``secret-``
        prefix so the secretsmanager:* access edges in build_access_edges()
        connect to real nodes.
        """
        resources = []
        try:
            paginator = self.secrets.get_paginator("list_secrets")
            for page in paginator.paginate():
                for secret in page.get("SecretList", []):
                    name = secret.get("Name", "")
                    resources.append(Resource(
                        id=f"secret-{name}",
                        name=name,
                        resource_type="secretsmanager_secret",
                        provider=CloudProvider.AWS,
                        arn=secret.get("ARN"),
                        is_crown_jewel=True,  # secrets are crown jewels by definition
                        sensitivity_tags=["SECRET"],
                    ))
        except ClientError:
            pass
        return resources

    def _scan_rds_instances(self) -> list[Resource]:
        """RDS database instances — crown jewels by data sensitivity."""
        resources = []
        try:
            paginator = self.rds.get_paginator("describe_db_instances")
            for page in paginator.paginate():
                for db in page.get("DBInstances", []):
                    identifier = db.get("DBInstanceIdentifier", "")
                    is_public = bool(db.get("PubliclyAccessible", False))
                    resources.append(Resource(
                        id=f"rds-{identifier}",
                        name=identifier,
                        resource_type="rds_instance",
                        provider=CloudProvider.AWS,
                        arn=db.get("DBInstanceArn"),
                        is_crown_jewel=True,
                        is_public=is_public,
                        sensitivity_tags=["PUBLIC"] if is_public else [],
                    ))
        except ClientError:
            pass
        return resources

    def _scan_dynamodb_tables(self) -> list[Resource]:
        """DynamoDB tables — flagged as crown jewels by name heuristic."""
        resources = []
        try:
            paginator = self.dynamodb.get_paginator("list_tables")
            for page in paginator.paginate():
                for name in page.get("TableNames", []):
                    is_crown_jewel = any(
                        kw in name.lower()
                        for kw in ["prod", "customer", "user", "pii", "payment",
                                   "order", "account", "secret", "token"]
                    )
                    resources.append(Resource(
                        id=f"dynamodb-{name}",
                        name=name,
                        resource_type="dynamodb_table",
                        provider=CloudProvider.AWS,
                        arn=f"arn:aws:dynamodb:{self.region}:*:table/{name}",
                        is_crown_jewel=is_crown_jewel,
                    ))
        except ClientError:
            pass
        return resources

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _fetch_managed_policy_docs(
        self, attached_policies: list[dict]
    ) -> list[dict]:
        """
        Fetch the actual policy document for each managed policy.

        AWS managed policies (e.g. "DataPipelineAccess") are just names
        until you call get_policy_version — the document is what contains
        the real actions. Results are cached by PolicyArn so the same
        AWS-managed policy (attached to 50 roles) is only fetched once.

        Returns a list of PolicyDocument dicts ready to append to
        inline_policies so the scorer and build_access_edges() pick them up
        without any further changes.
        """
        docs: list[dict] = []
        for policy in attached_policies:
            arn = policy.get("PolicyArn", "")
            if not arn:
                continue
            if arn in self._policy_doc_cache:
                docs.extend(self._policy_doc_cache[arn])
                continue
            try:
                default_version = self.iam.get_policy(PolicyArn=arn)["Policy"][
                    "DefaultVersionId"
                ]
                version_resp = self.iam.get_policy_version(
                    PolicyArn=arn, VersionId=default_version
                )
                doc = version_resp["PolicyVersion"]["Document"]
                self._policy_doc_cache[arn] = [doc]
                docs.append(doc)
            except ClientError:
                # No permission to read this policy — skip, don't crash
                self._policy_doc_cache[arn] = []
        return docs

    def _fetch_service_last_accessed(self, arn: str) -> list[dict]:
        """
        Fetch IAM Access Advisor data for a principal: which services it is
        *granted* and when each was *last used*.

        AWS returns this via an async job: generate_service_last_accessed_details
        kicks off the analysis, then get_service_last_accessed_details is polled
        until the job completes. We cap the polling so a slow/stuck job can't hang
        the whole scan — a principal that doesn't return in time just yields no
        usage data (treated as "unknown", never as "unused").

        Returns a list of dicts shaped for NonHumanIdentity.service_last_accessed:
            {"namespace": "s3", "service": "Amazon S3", "last_authenticated": dt|None}
        """
        import time

        if arn in self._usage_cache:
            return self._usage_cache[arn]

        try:
            job_id = self.iam.generate_service_last_accessed_details(Arn=arn)["JobId"]
        except ClientError:
            self._usage_cache[arn] = []
            return []

        services: list[dict] = []
        for _ in range(10):  # ~ up to 10 polls; jobs usually finish in 1–2
            try:
                resp = self.iam.get_service_last_accessed_details(JobId=job_id)
            except ClientError:
                self._usage_cache[arn] = []
                return []

            status = resp.get("JobStatus")
            if status == "IN_PROGRESS":
                time.sleep(0.5)
                continue
            if status != "COMPLETED":
                self._usage_cache[arn] = []
                return []  # FAILED or unknown — no usable data

            for entry in resp.get("ServicesLastAccessed", []):
                services.append(
                    {
                        "namespace": entry.get("ServiceNamespace", ""),
                        "service": entry.get("ServiceName", ""),
                        # Absent LastAuthenticated == granted but never used.
                        "last_authenticated": entry.get("LastAuthenticated"),
                    }
                )
            self._usage_cache[arn] = services
            return services

        # Polling exhausted — cache empty so we don't re-run the job for this ARN.
        self._usage_cache[arn] = []
        return []

    def _get_account_id(self) -> str:
        try:
            return self.sts.get_caller_identity()["Account"]
        except (ClientError, NoCredentialsError) as e:
            raise RuntimeError(
                "Could not connect to AWS. Run 'aws configure' first.\n"
                f"Error: {e}"
            )

    def _is_cross_account(self, trust_policy: dict) -> bool:
        """Check if this role's trust policy allows external accounts to assume it."""
        for statement in trust_policy.get("Statement", []):
            if statement.get("Effect") != "Allow":
                continue
            principal = statement.get("Principal", {})
            if isinstance(principal, dict):
                aws_principals = principal.get("AWS", [])
                if isinstance(aws_principals, str):
                    aws_principals = [aws_principals]
                for p in aws_principals:
                    # External account if it contains an account ID that isn't ours
                    # We check for ARN patterns with account IDs
                    if re.search(r"\d{12}", str(p)):
                        return True
        return False

    def build_access_edges(self) -> list[tuple[str, str, str, float]]:
        """
        Derives access edges between IAM roles/users and AWS resources
        based on attached managed-policy names and inline-policy Action prefixes.

        Returns (from_id, to_id, permission, weight) tuples suitable for
        populating the attack graph.
        """
        if not hasattr(self, "_last_result") or self._last_result is None:
            return []

        edges: list[tuple[str, str, str, float]] = []

        # Map managed-policy name → (resource_type_prefix, edge_label, weight)
        POLICY_RESOURCE_MAP: dict[str, tuple[str, str, float]] = {
            "AmazonS3FullAccess":          ("s3-",      "s3:*",            9.0),
            "AmazonS3ReadOnlyAccess":      ("s3-",      "s3:GetObject",    2.0),
            "AWSLambda_FullAccess":        ("lambda-",  "lambda:*",        7.0),
            "AmazonRDSFullAccess":         ("rds-",     "rds:*",           7.0),
            "SecretsManagerReadWrite":     ("secret-",  "secretsmanager:*",8.0),
            "AdministratorAccess":         ("",         "*",               10.0),
            "PowerUserAccess":             ("",         "power:*",         9.0),
            "IAMFullAccess":               ("iam-",     "iam:*",           9.0),
        }

        # Service prefix → resource id prefix (for inline policy Action matching)
        SERVICE_RESOURCE_PREFIX: dict[str, str] = {
            "s3":              "s3-",
            "lambda":          "lambda-",
            "rds":             "rds-",
            "secretsmanager":  "secret-",
            "dynamodb":        "dynamodb-",
            "ec2":             "ec2-",
            "iam":             "iam-",
        }

        resource_ids = {r.id for r in self._last_result.resources}

        for nhi in self._last_result.nhis:
            from_id = nhi.id

            # ── Managed policies ────────────────────────────────────────────
            for policy in nhi.attached_policies:
                if policy not in POLICY_RESOURCE_MAP:
                    continue
                res_prefix, label, weight = POLICY_RESOURCE_MAP[policy]
                # Connect to all matching scanned resources
                matched = [rid for rid in resource_ids if rid.startswith(res_prefix)] if res_prefix else list(resource_ids)
                if matched:
                    for to_id in matched:
                        edges.append((from_id, to_id, label, weight))
                else:
                    # No matching scanned resources — add a virtual node
                    virtual_id = f"virtual-{res_prefix.rstrip('-') or 'all'}"
                    edges.append((from_id, virtual_id, label, weight))

            # ── Policy documents (inline + fetched managed) ─────────────────
            # Managed policy docs are now in inline_policies too — one loop
            # handles both. Weight = attack-path cost: lower = easier pivot.
            for policy_doc in nhi.inline_policies:
                for stmt in policy_doc.get("Statement", []):
                    if stmt.get("Effect") != "Allow":
                        continue
                    actions = stmt.get("Action", [])
                    if isinstance(actions, str):
                        actions = [actions]
                    for action in actions:
                        if action in ("*", "*:*"):
                            # Full wildcard — touches everything scanned
                            for to_id in resource_ids:
                                edges.append((from_id, to_id, action, 1.0))
                        elif action.endswith(":*"):
                            # Service wildcard e.g. s3:* — touches all resources of that service
                            prefix = action.split(":")[0].lower()
                            res_prefix = SERVICE_RESOURCE_PREFIX.get(prefix, "")
                            matched = [r for r in resource_ids if r.startswith(res_prefix)] if res_prefix else []
                            for to_id in matched:
                                edges.append((from_id, to_id, action, 1.5))
                        else:
                            # Specific action e.g. s3:GetObject
                            prefix = action.split(":")[0].lower()
                            res_prefix = SERVICE_RESOURCE_PREFIX.get(prefix, "")
                            matched = [r for r in resource_ids if r.startswith(res_prefix)] if res_prefix else []
                            for to_id in matched:
                                edges.append((from_id, to_id, action, 4.0))

        # Deduplicate (same from/to/permission)
        seen: set[tuple[str, str, str]] = set()
        deduped = []
        for e in edges:
            key = (e[0], e[1], e[2])
            if key not in seen:
                seen.add(key)
                deduped.append(e)

        return deduped
