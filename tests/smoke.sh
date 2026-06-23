#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== smoke: node script syntax ==="
shopt -s nullglob
for f in scripts/*.mjs; do
    node --check "$f" && echo "  ok: $f"
done

echo "=== smoke: hook bash syntax ==="
for f in hooks/*.sh; do
    bash -n "$f" && echo "  ok: $f"
done

echo "=== smoke: all good ==="
