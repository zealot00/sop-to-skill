#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${ORCH_BASE_URL:-http://localhost:8080}"
TOKEN="${ORCH_TOKEN:-${SOP_TO_SKILL_ORCHESTRATOR_TOKEN:-${MANAGING_UP_JWT_TOKEN:-${MANAGING_UP_TOKEN:-}}}}"
CLI_BIN="${CLI_BIN:-node ./dist/main.js}"

pass() { echo "[PASS] $1"; }
fail() { echo "[FAIL] $1"; exit 1; }

run_cli() {
  if [[ -n "$TOKEN" ]]; then
    eval "$CLI_BIN" orchestrator --base-url "$BASE_URL" --token "$TOKEN" "$@"
  else
    eval "$CLI_BIN" orchestrator --base-url "$BASE_URL" "$@"
  fi
}

if [[ ! -f ./dist/main.js ]]; then
  echo "dist/main.js not found, building..."
  npm run build >/dev/null
fi

echo "== CLI smoke against ${BASE_URL} =="

run_cli --op health >/tmp/cli-health.json
pass "orchestrator --op health"

cat > /tmp/cli-create-run.json <<'JSON'
{"skillName":"cli-smoke-skill","source":{"type":"inline_text","content":"测试文本"},"options":{"framework":"all","extraction":{"language":"zh","confidenceThreshold":0.7,"enableBoundaryDetection":true}}}
JSON

run_cli --op create-run --payload /tmp/cli-create-run.json >/tmp/cli-run.json || fail "orchestrator --op create-run"
RUN_ID="$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/tmp/cli-run.json','utf8'));process.stdout.write(d.runId||'')")"
[[ -n "$RUN_ID" ]] || fail "extract runId from cli create-run response"
pass "orchestrator --op create-run"

run_cli --op get-run --run-id "$RUN_ID" >/tmp/cli-get-run.json || fail "orchestrator --op get-run"
pass "orchestrator --op get-run"

echo "== done =="
