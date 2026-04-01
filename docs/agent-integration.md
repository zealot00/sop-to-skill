# Agent Integration Guide

This project is a **Skill Builder CLI**. Agents should call it as a tool to convert SOP files into skill packages.

Remote API platform for orchestration and enhancement:
`https://github.com/zealot00/managing-up`

## Core Contract

1. Run `generate` to produce package artifacts.
2. Run `validate` on the generated directory.
3. Treat non-zero exit as hard failure.

## Recommended Invocation

```bash
sop-to-skill generate <sop-file> -o <output-dir> --config <config.json>
sop-to-skill validate <output-dir> --config <config.json>
```

## Controllable Inputs

Use `--config` for stable behavior. Key sections:

- `extraction`
  - `language`: `auto|zh|en`
  - `confidenceThreshold`: extraction threshold
  - `roleConfigPath`: custom role pattern config
  - `enableBoundaryDetection`: on/off boundary extraction
- `framework`
  - `enabledFrameworks`: controls what `--framework all` can emit
- `progressive`
  - controls `SKILL.full.md` and constraint-detail generation
- `output`
  - controls output filenames and constraint directory name

## Runtime Overrides

If an agent needs one-off behavior, override extraction options directly:

```bash
sop-to-skill generate <sop-file> -o <out> \
  --extract-language zh \
  --extract-threshold 0.8 \
  --role-config ./role-config.json \
  --no-boundary
```

These overrides apply to `generate`, `extract`, and `llm-enhance`.

## Orchestrator Enhancement Strategy

Commands also support orchestrator enhancement:

- `--orchestrator-api`
- `--orchestrator-token`
- `--api-strategy local_only|remote_first|remote_only`
- `--api-timeout-ms`

Env fallback for API/JWT:
- `SOP_TO_SKILL_ORCHESTRATOR_API` or `MANAGING_UP_BASE_URL`
- `SOP_TO_SKILL_ORCHESTRATOR_TOKEN` or `MANAGING_UP_JWT_TOKEN` or `MANAGING_UP_TOKEN`

Recommended for production: `remote_first`.
This preserves local fallback and avoids hard downtime when remote API is unavailable.

## Failure Handling

- Invalid config: exits non-zero by default.
- To fallback to defaults: add `--lenient-config`.
- Validation failure: inspect reported missing files or schema issues.

## Framework Exports

```bash
sop-to-skill generate <sop-file> -o <out> --framework codex --config <config.json>
sop-to-skill generate <sop-file> -o <out> --framework all --config <config.json>
```

`--framework all` is filtered by `framework.enabledFrameworks`.
