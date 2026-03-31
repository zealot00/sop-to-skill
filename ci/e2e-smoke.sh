#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

OUT_DIR="$(mktemp -d /tmp/s2s-e2e.XXXXXX)"
trap 'rm -rf "$OUT_DIR"' EXIT

echo "[e2e] generate default package"
node dist/main.js generate integration/test-sop.md -o "$OUT_DIR/default"
node dist/main.js validate "$OUT_DIR/default"

echo "[e2e] generate package with custom config"
node dist/main.js generate integration/test-sop.md -o "$OUT_DIR/custom" --config examples/generator-config.json
node dist/main.js validate "$OUT_DIR/custom" --config examples/generator-config.json

echo "[e2e] smoke checks passed"
