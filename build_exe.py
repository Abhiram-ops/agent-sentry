"""
Build standalone executables for Windows, macOS, and Linux.
Run: python build_exe.py

Output: dist/agentsentry.exe (Windows) or dist/agentsentry (Mac/Linux)
"""
import subprocess
import sys
import os

APP_NAME = "agentsentry"
ENTRY   = "agentsentry/__main__.py"

cmd = [
    sys.executable, "-m", "PyInstaller",
    "--onefile",                          # single file
    "--name", APP_NAME,
    "--clean",
    "--noconfirm",
    # Include all provider modules explicitly
    "--hidden-import", "agentsentry.providers.local",
    "--hidden-import", "agentsentry.providers.aws",
    "--hidden-import", "agentsentry.providers.azure",
    "--hidden-import", "agentsentry.providers.gcp",
    "--hidden-import", "agentsentry.providers.github",
    "--hidden-import", "agentsentry.providers.k8s",
    "--hidden-import", "agentsentry.scanners.mock",
    "--hidden-import", "agentsentry.scanners.langchain_scanner",
    "--hidden-import", "agentsentry.enrichment.cisa_kev",
    "--hidden-import", "rich",
    "--hidden-import", "click",
    "--hidden-import", "pydantic",
    "--hidden-import", "networkx",
    ENTRY,
]

print(f"Building {APP_NAME} executable...")
result = subprocess.run(cmd, cwd=os.path.dirname(__file__) or ".")
if result.returncode == 0:
    print(f"\n✓ Built: dist/{APP_NAME}")
    print(f"  Share this single file — no Python needed!")
else:
    print("\n✗ Build failed")
    sys.exit(1)
