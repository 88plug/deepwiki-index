#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== smoke: node script syntax ==="
shopt -s nullglob
for f in scripts/*.mjs; do
    node --check "$f" && echo "  ok: $f"
done

echo "=== smoke: REPO=all inventory (hub + 16 plugins) ==="
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const s = readFileSync('scripts/index-deepwiki.mjs', 'utf8');
const m = s.match(/const ALL = \[([\s\S]*?)\]\.map/);
if (!m) { console.error('  FAIL: could not parse const ALL'); process.exit(1); }
const names = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
if (names.length < 17) {
  console.error('  FAIL: ALL length ' + names.length + ' < 17 (hub + 16 plugins)');
  process.exit(1);
}
if (!names.includes('claude-code-plugins')) {
  console.error('  FAIL: hub claude-code-plugins missing from ALL');
  process.exit(1);
}
console.log('  ok: ALL length ' + names.length + ' (hub + plugins)');
"

echo "=== smoke: hook bash syntax ==="
for f in hooks/*.sh; do
    bash -n "$f" && echo "  ok: $f"
done

echo "=== smoke: all good ==="
