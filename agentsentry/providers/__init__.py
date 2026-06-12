"""
Provider Registry — central registry of all scan providers.

Usage:
    from agentsentry.providers import registry

    # Get all registered providers
    for name, cls in registry.all().items():
        provider = cls()
        status = provider.check_permissions()
        print(name, status)

    # Auto-detect which providers are ready
    ready = registry.detect_ready()

    # Get one provider by name
    provider = registry.get("aws")
    result = provider.scan()

    # Register a custom provider
    from agentsentry.providers.base import BaseProvider
    registry.register("myenv", MyProvider)
"""

from __future__ import annotations

from typing import Type

from agentsentry.providers.base import BaseProvider, PermissionStatus


class ProviderRegistry:
    """
    Lazy registry — providers are loaded on first access so missing
    optional SDKs don't crash the import.
    """

    def __init__(self) -> None:
        self._registry: dict[str, Type[BaseProvider]] = {}
        self._loaded = False

    def register(self, name: str, cls: Type[BaseProvider]) -> None:
        """Register a provider class under a short key."""
        self._registry[name] = cls

    def _load_builtins(self) -> None:
        """Import built-in providers (lazy, so missing SDKs just skip)."""
        if self._loaded:
            return
        self._loaded = True

        # Each import is isolated — a missing optional SDK won't block others
        _safe_register(self, "aws", "agentsentry.providers.aws", "AWSProvider")
        _safe_register(self, "azure", "agentsentry.providers.azure", "AzureProvider")
        _safe_register(self, "gcp", "agentsentry.providers.gcp", "GCPProvider")
        _safe_register(self, "github", "agentsentry.providers.github", "GitHubProvider")
        _safe_register(self, "k8s", "agentsentry.providers.k8s", "KubernetesProvider")
        _safe_register(self, "local", "agentsentry.providers.local", "LocalProvider")

    def all(self) -> dict[str, Type[BaseProvider]]:
        self._load_builtins()
        return dict(self._registry)

    def get(self, name: str, **kwargs) -> BaseProvider | None:
        self._load_builtins()
        cls = self._registry.get(name)
        if cls is None:
            return None
        return cls(**kwargs)

    def detect(self) -> list[PermissionStatus]:
        """Check every provider and return their permission status."""
        self._load_builtins()
        results: list[PermissionStatus] = []
        for name, cls in self._registry.items():
            try:
                provider = cls()
                results.append(provider.check_permissions())
            except Exception as exc:
                results.append(
                    PermissionStatus(
                        ok=False,
                        provider_name=name,
                        sdk_available=False,
                        message=str(exc),
                    )
                )
        return results

    def detect_ready(self) -> list[str]:
        """Return names of providers that are ready to scan."""
        return [s.provider_name for s in self.detect() if s.ok]


def _safe_register(
    reg: ProviderRegistry, name: str, module: str, cls_name: str
) -> None:
    try:
        import importlib

        mod = importlib.import_module(module)
        cls = getattr(mod, cls_name)
        reg.register(name, cls)
    except Exception:
        pass  # SDK not installed or provider unavailable — silently skip


registry = ProviderRegistry()
