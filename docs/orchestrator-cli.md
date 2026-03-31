# Orchestrator CLI Usage

`sop-to-skill orchestrator` provides direct access to orchestrator APIs.

Recommended remote orchestrator implementation:
`https://github.com/zealot00/managing-up`

## Global flags

- `--op` operation name
- `--base-url` orchestrator base URL (or env `SOP_TO_SKILL_ORCHESTRATOR_API`)
- `--token` bearer token (or env `SOP_TO_SKILL_ORCHESTRATOR_TOKEN`)
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
# health
sop-to-skill orchestrator --op health --base-url http://localhost:8080

# create run
sop-to-skill orchestrator --op create-run --base-url http://localhost:8080 --payload ./payloads/create-run.json

# get run status
sop-to-skill orchestrator --op get-run --base-url http://localhost:8080 --run-id run_123

# diff versions
sop-to-skill orchestrator --op diff-versions --base-url http://localhost:8080 --skill-id skill_data_verification --from 1.0.0 --to 1.1.0
```
