# Orchestrator CLI Usage

`sop-to-skill orchestrator` provides direct access to orchestrator APIs.

Recommended remote orchestrator implementation:
`https://github.com/zealot00/managing-up`

## Global flags

- `--op` operation name
- `--base-url` orchestrator base URL (env fallback: `SOP_TO_SKILL_ORCHESTRATOR_API`, `MANAGING_UP_BASE_URL`)
- `--token` bearer token (env fallback: `SOP_TO_SKILL_ORCHESTRATOR_TOKEN`, `MANAGING_UP_JWT_TOKEN`, `MANAGING_UP_TOKEN`)
- `--timeout-ms` request timeout
- `--payload` JSON payload file path
- `--idempotency-key` idempotency key for write APIs

## Operations

- `health`
- `create-run`, `get-run`, `list-artifacts`
- `create-version`, `list-versions`, `get-version`, `diff-versions`, `rollback`, `promote`
- `create-test`, `get-test`, `get-report`
- `evaluate-gate`

## Examples

```bash
# use env-based JWT auth
export MANAGING_UP_BASE_URL=http://localhost:8080
export MANAGING_UP_JWT_TOKEN=<your-jwt-token>

# health
sop-to-skill orchestrator --op health

# create run
sop-to-skill orchestrator --op create-run --payload ./payloads/create-run.json

# get run status
sop-to-skill orchestrator --op get-run --run-id run_123

# diff versions
sop-to-skill orchestrator --op diff-versions --skill-id skill_data_verification --from 1.0.0 --to 1.1.0
```
