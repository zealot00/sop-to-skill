#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${ORCH_BASE_URL:-http://localhost:8080}"
TOKEN="${ORCH_TOKEN:-${SOP_TO_SKILL_ORCHESTRATOR_TOKEN:-${MANAGING_UP_JWT_TOKEN:-${MANAGING_UP_TOKEN:-}}}}"

pass() { echo "[PASS] $1"; }
fail() { echo "[FAIL] $1"; }

extract_json_field() {
  local file="$1"
  local field="$2"
  node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const v=d[process.argv[2]];process.stdout.write(v===undefined||v===null?'':String(v));" "$file" "$field"
}

curl_with_auth() {
  if [[ -n "$TOKEN" ]]; then
    curl -sS -H "Authorization: Bearer ${TOKEN}" "$@"
  else
    curl -sS "$@"
  fi
}

call() {
  local name="$1"; shift
  local expected="$1"; shift
  local out code
  out="$(mktemp)"
  code="$(curl_with_auth -o "$out" -w "%{http_code}" "$@" || true)"
  if [[ "$code" == "$expected" ]]; then
    pass "$name ($code)"
  else
    fail "$name (got $code expected $expected)"
    echo "  body: $(cat "$out" | tr '\n' ' ' | cut -c1-220)"
  fi
  rm -f "$out"
}

echo "== API smoke against ${BASE_URL} =="

echo "== health =="
call "GET /v1/healthz" 200 "${BASE_URL}/v1/healthz"

echo "== extraction =="
cat > /tmp/req-enhance.json <<'JSON'
{"source":{"type":"inline_text","content":"如果金额超过10000，则必须经理审批。"},"options":{"language":"zh","confidenceThreshold":0.7,"enableBoundaryDetection":true}}
JSON
call "POST /v1/extraction/enhance" 200 -X POST "${BASE_URL}/v1/extraction/enhance" -H 'Content-Type: application/json' --data-binary @/tmp/req-enhance.json

echo "== runs =="
cat > /tmp/req-run.json <<'JSON'
{"skillName":"api-smoke-skill","source":{"type":"inline_text","content":"测试文本"},"options":{"framework":"all","extraction":{"language":"zh","confidenceThreshold":0.7,"enableBoundaryDetection":true}}}
JSON
RUN_RESP="$(mktemp)"
RUN_CODE="$(curl_with_auth -o "$RUN_RESP" -w "%{http_code}" -X POST "${BASE_URL}/v1/runs" -H 'Content-Type: application/json' --data-binary @/tmp/req-run.json || true)"
if [[ "$RUN_CODE" == "202" ]]; then
  pass "POST /v1/runs ($RUN_CODE)"
else
  fail "POST /v1/runs (got $RUN_CODE expected 202)"
fi
RUN_ID="$(extract_json_field "$RUN_RESP" "runId")"
if [[ -n "$RUN_ID" ]]; then
  call "GET /v1/runs/{runId}" 200 "${BASE_URL}/v1/runs/${RUN_ID}"
  call "GET /v1/runs/{runId}/artifacts" 200 "${BASE_URL}/v1/runs/${RUN_ID}/artifacts"
else
  fail "Extract runId from create-run response"
fi
rm -f "$RUN_RESP"

echo "== skills =="
cat > /tmp/req-skill.json <<'JSON'
{"skillId":"skill_api_smoke","name":"API Smoke Skill","owner":"qa"}
JSON
call "POST /v1/skills" 201 -X POST "${BASE_URL}/v1/skills" -H 'Content-Type: application/json' --data-binary @/tmp/req-skill.json

cat > /tmp/req-version.json <<'JSON'
{"version":"1.0.0","sourceHash":"sha256:abc","schemaHash":"sha256:def","artifacts":[{"kind":"schema_json","uri":"s3://x/schema.json"}],"runId":"run-smoke"}
JSON
call "POST /v1/skills/{id}/versions" 201 -X POST "${BASE_URL}/v1/skills/skill_api_smoke/versions" -H 'Content-Type: application/json' --data-binary @/tmp/req-version.json
call "GET /v1/skills/{id}/versions" 200 "${BASE_URL}/v1/skills/skill_api_smoke/versions"
call "GET /v1/skills/{id}/versions/{version}" 200 "${BASE_URL}/v1/skills/skill_api_smoke/versions/1.0.0"
call "GET /v1/skills/{id}/diff" 200 "${BASE_URL}/v1/skills/skill_api_smoke/diff?from=1.0.0&to=1.0.0"

cat > /tmp/req-rollback.json <<'JSON'
{"targetVersion":"1.0.0","reason":"smoke"}
JSON
call "POST /v1/skills/{id}/rollback" 202 -X POST "${BASE_URL}/v1/skills/skill_api_smoke/rollback" -H 'Content-Type: application/json' --data-binary @/tmp/req-rollback.json

cat > /tmp/req-promote.json <<'JSON'
{"version":"1.0.0","channel":"dev"}
JSON
call "POST /v1/skills/{id}/promote" 202 -X POST "${BASE_URL}/v1/skills/skill_api_smoke/promote" -H 'Content-Type: application/json' --data-binary @/tmp/req-promote.json

echo "== tests =="
cat > /tmp/req-test-run.json <<'JSON'
{"skillId":"skill_api_smoke","version":"1.0.0","runner":{"type":"cli","command":"echo","args":["ok"]},"datasetRef":"dataset://smoke"}
JSON
TEST_RESP="$(mktemp)"
TEST_CODE="$(curl_with_auth -o "$TEST_RESP" -w "%{http_code}" -X POST "${BASE_URL}/v1/tests/runs" -H 'Content-Type: application/json' --data-binary @/tmp/req-test-run.json || true)"
if [[ "$TEST_CODE" == "202" ]]; then
  pass "POST /v1/tests/runs ($TEST_CODE)"
else
  fail "POST /v1/tests/runs (got $TEST_CODE expected 202)"
fi
TEST_ID="$(extract_json_field "$TEST_RESP" "testRunId")"
if [[ -n "$TEST_ID" ]]; then
  call "GET /v1/tests/runs/{id}" 200 "${BASE_URL}/v1/tests/runs/${TEST_ID}"
  call "GET /v1/tests/runs/{id}/report" 200 "${BASE_URL}/v1/tests/runs/${TEST_ID}/report"
else
  fail "Extract testRunId from create-test-run response"
fi
rm -f "$TEST_RESP"

echo "== gates and policies =="
cat > /tmp/req-gate.json <<'JSON'
{"skillId":"skill_api_smoke","version":"1.0.0","policyId":"default-policy"}
JSON
call "POST /v1/gates/evaluate" 200 -X POST "${BASE_URL}/v1/gates/evaluate" -H 'Content-Type: application/json' --data-binary @/tmp/req-gate.json
call "GET /v1/policies/{policyId}" 200 "${BASE_URL}/v1/policies/default-policy"

echo "== done =="
