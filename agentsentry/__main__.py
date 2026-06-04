import sys

def _fix_path():
    """Add Python Scripts dir to user PATH permanently (Windows only)."""
    if sys.platform != "win32":
        print("PATH is managed automatically on Mac/Linux.")
        return
    import subprocess, os
    from pathlib import Path
    scripts = Path(sys.executable).parent / "Scripts"
    # Read current user PATH
    result = subprocess.run(
        ['reg', 'query', 'HKCU\\Environment', '/v', 'PATH'],
        capture_output=True, text=True
    )
    current = ""
    for line in result.stdout.splitlines():
        if "PATH" in line and "REG_" in line:
            current = line.split(None, 2)[-1].strip()
            break
    if str(scripts) in current:
        print(f"✓ Already on PATH: {scripts}")
        return
    new_path = f"{current};{scripts}" if current else str(scripts)
    subprocess.run(['setx', 'PATH', new_path], check=True)
    print(f"✓ Added to PATH: {scripts}")
    print("  Close and reopen your terminal — 'agentsentry' will work directly.")

if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--install-path":
        _fix_path()
    else:
        from agentsentry.cli import main
        main()
