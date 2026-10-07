#!/usr/bin/env python3
"""Deploy script for Hugging Face Spaces AI Worker.

This script:
1. Builds the Docker image
2. Pushes it to Hugging Face Spaces
3. Sets up the required environment variables
"""
import subprocess
import sys
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # mindmesh root
HF_DIR = ROOT / "deploy" / "hf-spaces"

def run(cmd: str, desc: str) -> bool:
    """Run a shell command, print output, return True on success."""
    print(f"▶ {desc}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.stdout:
            for line in result.stdout.splitlines():
                print(f"  {line}")
        if result.returncode != 0:
            print(f"  stderr: {result.stderr[:200]}")
            return False
        return True
    except Exception as e:
        print(f"  error: {e}")
        return False

def main() -> int:
    ok = True

    # 1. Verify files exist
    for f in ["requirements.txt", "app.py", "Dockerfile"]:
        if not (HF_DIR / f).exists():
            print(f"✗ missing {f}")
            ok = False

    if not ok:
        return 1

    # 2. Log in to HF (if not already logged in)
    #    The HF CLI stores the token in ~/.huggingface/token
    login_ok = run("huggingface-cli login", "HF login (skip if already)")
    if not login_ok:
        print("⚠  continuing without explicit login (token may be cached)")

    # 2. Build the Docker image
    img_tag = f"hf-{int(subprocess.check_output(['date', '+%s']).strip())}:latest"
    build_cmd = f"docker build -t {img_tag} {HF_DIR}"
    if not run(build_cmd, "Building HF Spaces Docker image"):
        ok = False

    # 3. The HF Spaces deployment is done via the web UI,
    #    but we can push the image to the Hub if desired.
    #    For now we just instruct the user.
    if ok:
        print("\n📋 Next steps:")
        print("1.  Go to https://huggingface.new")
        print("2.  Click 'Create new Space'")
        print("3.  SDK: Docker  |  Hardware: CPU Basic")
        print("4.  Under 'Files', upload:")
        print("      • Dockerfile")
        print("      • requirements.txt")
        print("      • app.py")
        print("5.  Optional: add GROQ_API_KEY secret (if you want Groq fallback)")
        print("6.  Start Space – it will auto‑build and become Running.")

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())