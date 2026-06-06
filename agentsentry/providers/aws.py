"""
AWS Provider — wraps the existing AWSScanner behind the BaseProvider interface.

Credentials: standard AWS credential chain
  - Environment: AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
  - Profile:     aws configure  (stored in ~/.aws/credentials)
  - IAM role:    EC2/Lambda/ECS instance metadata (automatic)

Required permissions (read-only):
  iam:List*, iam:Get*, sts:GetCallerIdentity,
  s3:ListAllMyBuckets, lambda:ListFunctions,
  secretsmanager:ListSecrets
"""
from __future__ import annotations

import os

from agentsentry.core.models import CloudProvider, ScanResult
from agentsentry.providers.base import BaseProvider, PermissionStatus


class AWSProvider(BaseProvider):

    def __init__(self, profile: str | None = None, region: str = "us-east-1"):
        self.profile = profile or os.environ.get("AWS_PROFILE")
        self.region  = os.environ.get("AWS_DEFAULT_REGION", region)

    @property
    def name(self) -> str:        return "aws"
    @property
    def display_name(self) -> str: return "Amazon Web Services"
    @property
    def cloud_provider(self) -> CloudProvider: return CloudProvider.AWS

    @property
    def required_permissions(self) -> list[str]:
        return [
            "iam:ListRoles", "iam:ListUsers", "iam:ListAccessKeys",
            "iam:ListAttachedRolePolicies", "iam:GetRole",
            "sts:GetCallerIdentity",
            "s3:ListAllMyBuckets",
            "lambda:ListFunctions",
            "secretsmanager:ListSecrets",
        ]

    @property
    def setup_hint(self) -> str:
        return "Run: aws configure   OR   set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY"

    def check_permissions(self) -> PermissionStatus:
        try:
            import boto3  # noqa: F401
        except ImportError:
            return PermissionStatus(
                ok=False, provider_name=self.name, sdk_available=False,
                message="boto3 not installed — run: pip install agentsentry[aws]",
            )
        try:
            import boto3
            session = boto3.Session(profile_name=self.profile, region_name=self.region)
            sts = session.client("sts")
            identity = sts.get_caller_identity()
            return PermissionStatus(
                ok=True, provider_name=self.name,
                message=f"Account: {identity['Account']}  ARN: {identity['Arn']}",
            )
        except Exception as exc:
            return PermissionStatus(
                ok=False, provider_name=self.name,
                missing_creds=["AWS credentials"],
                message=f"{exc} — {self.setup_hint}",
            )

    def scan(self) -> ScanResult:
        from agentsentry.scanners.aws import AWSScanner
        scanner = AWSScanner(profile=self.profile, region=self.region)
        self._scanner = scanner
        return scanner.scan()

    def build_access_edges(self):
        if hasattr(self, "_scanner") and hasattr(self._scanner, "build_access_edges"):
            return self._scanner.build_access_edges()
        return iter([])
