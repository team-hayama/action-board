#!/usr/bin/env python3
"""Block git/gh commands that risk pushing secrets to GitHub.

Triggered as a PreToolUse hook on Bash. Blocks when:
  - `git add` / `git commit` includes a denylisted secret file
  - `git push` (any form) when the index OR commits-to-be-pushed contain a denylisted file
  - The command-line itself contains a known secret-shaped token (sk_live_, AKIA..., ghp_, etc.)

Allowlisted (templates/examples are OK): .env.example, .env.sample, .env.template, .env.*.example
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys

# Files that must never be tracked / pushed
SECRET_FILE_PATTERNS = [
    r"^\.env$",
    r"^\.env\.local$",
    r"^\.env\.production$",
    r"^\.env\.development$",
    r"^\.env\.staging$",
    r"^\.env\..*\.local$",
    r"^\.env\.sentry-build-plugin$",
    r".*\.pem$",
    r".*\.key$",
    r"^id_rsa(\..*)?$",
    r"^secrets?\.(json|ya?ml|toml)$",
    r"^credentials?\.(json|ya?ml|toml)$",
    r"^service[-_]account.*\.json$",
    r"^.*\.p12$",
]

ALLOWLIST_PATTERNS = [
    r"^\.env\.example$",
    r"^\.env\.sample$",
    r"^\.env\.template$",
    r"^\.env\..*\.example$",
    r"^\.env\.cloudflare$",  # known template with placeholders
]

# Inline secret-shaped tokens to detect in the command string itself
SECRET_TOKEN_PATTERNS = [
    (r"sk_live_[A-Za-z0-9]{16,}", "Stripe live secret key"),
    (r"sk_test_[A-Za-z0-9]{16,}", "Stripe test secret key"),
    (r"AKIA[0-9A-Z]{16}", "AWS access key"),
    (r"ghp_[A-Za-z0-9]{20,}", "GitHub personal access token"),
    (r"github_pat_[A-Za-z0-9_]{20,}", "GitHub fine-grained PAT"),
    (r"xox[baprs]-[A-Za-z0-9-]{10,}", "Slack token"),
    (r"-----BEGIN (RSA |OPENSSH |EC |DSA |PGP )?PRIVATE KEY-----", "Private key block"),
]

SECRET_RE = re.compile("|".join(f"({p})" for p in SECRET_FILE_PATTERNS))
ALLOW_RE = re.compile("|".join(f"({p})" for p in ALLOWLIST_PATTERNS))


def is_secret_path(path: str) -> bool:
    base = os.path.basename(path.strip().strip('"').strip("'"))
    if ALLOW_RE.match(base):
        return False
    return bool(SECRET_RE.match(base))


def run(cmd: list[str]) -> str:
    try:
        return subprocess.check_output(cmd, stderr=subprocess.DEVNULL, text=True)
    except Exception:
        return ""


def staged_files() -> list[str]:
    return [l for l in run(["git", "diff", "--cached", "--name-only"]).splitlines() if l]


def tracked_files() -> list[str]:
    return [l for l in run(["git", "ls-files"]).splitlines() if l]


def files_to_be_pushed() -> list[str]:
    upstream = run(["git", "rev-parse", "--abbrev-ref", "@{u}"]).strip()
    if not upstream:
        return []
    out = run(["git", "diff", "--name-only", f"{upstream}..HEAD"])
    return [l for l in out.splitlines() if l]


def block(reason: str) -> None:
    sys.stderr.write(
        "\n[block-secrets] BLOCKED: " + reason + "\n"
        "  ルール: 機密情報は絶対にGitHubに上げない (.env, *.key, credentials*, etc.).\n"
        "  対処: 当該ファイルを .gitignore に入れ、`git rm --cached <file>` で履歴から外してください。\n"
        "  どうしても必要な場合のみ、ユーザーに確認してから .claude/hooks/block-secrets.py のALLOWLIST_PATTERNSを更新。\n"
    )
    sys.exit(2)


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    if payload.get("tool_name") != "Bash":
        sys.exit(0)

    cmd = (payload.get("tool_input") or {}).get("command", "") or ""
    if not cmd:
        sys.exit(0)

    # 1. Inline secret tokens
    for pat, label in SECRET_TOKEN_PATTERNS:
        if re.search(pat, cmd):
            block(f"コマンドに {label} らしき値が含まれています: /{pat}/")

    # 2. git add / commit with secret paths in args
    if re.search(r"\bgit\s+(add|commit)\b", cmd):
        # Extract tokens that look like file paths
        tokens = re.findall(r"[\w./\-]+", cmd)
        offenders = [t for t in tokens if "/" in t or t.startswith(".env") or t.endswith((".key", ".pem"))]
        for t in offenders:
            if is_secret_path(t):
                block(f"`git add/commit` の対象に機密ファイルが含まれています: {t}")

    # 3. git push — inspect commits-to-be-pushed and current index
    if re.search(r"\bgit\s+push\b", cmd):
        candidates = set(staged_files()) | set(files_to_be_pushed())
        # Also check tracked files for any secret path that slipped in earlier
        for f in tracked_files():
            if is_secret_path(f):
                candidates.add(f)
        offenders = sorted({f for f in candidates if is_secret_path(f)})
        if offenders:
            block("push 対象/管理下に機密ファイルがあります:\n    - " + "\n    - ".join(offenders))

    # 4. gh release / gh gist with secret file uploads
    if re.search(r"\bgh\s+(release|gist)\b", cmd):
        tokens = re.findall(r"[\w./\-]+", cmd)
        for t in tokens:
            if is_secret_path(t):
                block(f"`gh` で機密ファイルをアップロードしようとしています: {t}")

    sys.exit(0)


if __name__ == "__main__":
    main()
