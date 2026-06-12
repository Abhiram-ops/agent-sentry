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

    def __init__(self, profile: str | None = None, region: str = "us-east-1"):
        session = boto3.Session(profile_name=profile, region_name=region)
        self.iam    = session.client("iam")
        self.sts    = session.client("sts")
        self.s3     = session.client("s3")
        self.lambda_ = session.client("lambda")
        self.region = region
        self._last_result = None  # populated by scan() for build_access_edges()

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

        # Get attached policies
        try:
            attached = self.iam.list_attached_role_policies(RoleName=role_name)
            policy_names = [p["PolicyName"] for p in attached["AttachedPolicies"]]
        except ClientError:
            policy_names = []

        # Get inline policies
        inline_policies = []
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

        try:
            attached = self.iam.list_attached_user_policies(UserName=username)
            policy_names = [p["PolicyName"] for p in attached["AttachedPolicies"]]
        except ClientError:
            policy_names = []

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
            is_internet_facing=True,  # Access keys are by nature external credentials
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

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

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
        # Weight = attack-path COST (lower = easier to traverse / more dangerous).
        # nx.shortest_path uses weight as cost, so high-privilege policies must
        # have LOW weights so the algorithm routes through them, not around them.
        POLICY_RESOURCE_MAP: dict[str, tuple[str, str, float]] = {
            "AdministratorAccess":         ("",         "*",               1.0),
            "PowerUserAccess":             ("",         "power:*",         1.5),
            "IAMFullAccess":               ("iam-",     "iam:*",           2.0),
            "SecretsManagerReadWrite":     ("secret-",  "secretsmanager:*",2.0),
            "AmazonS3FullAccess":          ("s3-",      "s3:*",            2.5),
            "AWSLambda_FullAccess":        ("lambda-",  "lambda:*",        3.0),
            "AmazonRDSFullAccess":         ("rds-",     "rds:*",           3.0),
            "AmazonS3ReadOnlyAccess":      ("s3-",      "s3:GetObject",    8.0),
        }

        # Service prefix → resource id prefix (for inline policy Action matching)
        SERVICE_RESOURCE_PREFIX: dict[str, str] = {
            "s3":              "s3-",
            "lambda":          "lambda-",
            "rds":             "rds-",
            "secretsmanager":  "secret-",
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

            # ── Inline policies ─────────────────────────────────────────────
            for policy_doc in nhi.inline_policies:
                for stmt in policy_doc.get("Statement", []):
                    if stmt.get("Effect") != "Allow":
                        continue
                    actions = stmt.get("Action", [])
                    if isinstance(actions, str):
                        actions = [actions]
                    for action in actions:
                        prefix = action.split(":")[0].lower()
                        res_prefix = SERVICE_RESOURCE_PREFIX.get(prefix, "")
                        matched = [rid for rid in resource_ids if rid.startswith(res_prefix)] if res_prefix else []
                        # wildcard action = easiest path (cost 1.0); specific action = harder (cost 4.0)
                        weight = 1.0 if action in ("*", "*:*") else 4.0
                        for to_id in matched:
                            edges.append((from_id, to_id, action, weight))

        # Deduplicate (same from/to/permission)
        seen: set[tuple[str, str, str]] = set()
        deduped = []
        for e in edges:
            key = (e[0], e[1], e[2])
            if key not in seen:
                seen.add(key)
                deduped.append(e)

        return deduped
