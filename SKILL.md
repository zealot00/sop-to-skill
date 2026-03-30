# Skill Format Specification

## Overview

A **Skill** is a machine-readable representation of a Standard Operating Procedure (SOP) that can be executed by an AI Agent. This specification defines the structure, components, and validation rules for Skills.

---

## File Structure

A Skill Package consists of:

```
skill-package/
├── SKILL.md           # Human-readable specification
├── SKILL.schema.json  # JSON Schema for validation
├── schema.json        # Skill schema definition
├── test-suite.json    # Test cases (optional)
└── manifest.json      # Package metadata
```

---

## Skill Schema

### Top-Level Structure

```json
{
  "schema": {
    "meta": { ... },
    "triggers": [ ... ],
    "steps": [ ... ],
    "constraints": [ ... ],
    "decisions": [ ... ],
    "error_handling": { ... }
  },
  "manifest": {
    "format_version": "1.0.0",
    "generated_at": "ISO-8601 timestamp",
    "generator": "sop-to-skill",
    "source_sop": "original file path"
  }
}
```

---

## Core Components

### 1. Meta

Metadata about the skill.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Skill name |
| version | string | Yes | Semantic version (x.y.z) |
| description | string | Yes | Brief description |
| author | string | No | Author name |
| created_at | string | No | ISO-8601 timestamp |
| updated_at | string | No | ISO-8601 timestamp |
| tags | string[] | No | Tags for categorization |
| icon | string | No | Icon identifier |

### 2. Triggers

Define when the skill should be invoked.

```json
{
  "triggers": [
    {
      "type": "execution" | "query" | "approval" | "event",
      "description": "optional description",
      "condition": "optional condition expression"
    }
  ]
}
```

**Trigger Types:**
- `execution`: Manual or programmatic invocation
- `query`: Request for information
- `approval`: Awaiting approval to proceed
- `event`: Triggered by an event

### 3. Steps

Ordered sequence of actions to execute.

```json
{
  "steps": [
    {
      "id": "STEP-001",
      "name": "Step Name",
      "description": "What this step does",
      "action": "action_identifier",
      "condition": "optional condition",
      "input": [
        { "name": "varName", "type": "string", "required": true }
      ],
      "output": [
        { "name": "result", "type": "object" }
      ],
      "next_step_on_success": "STEP-002",
      "next_step_on_failure": "STEP-ERROR"
    }
  ]
}
```

**Step Fields:**
- `id`: Unique identifier (format: STEP-XXX)
- `name`: Human-readable name
- `description`: Detailed description
- `action`: Action to execute
- `condition`: Optional execution condition
- `input`: Input variables
- `output`: Output variables
- `next_step_on_success`: Next step on success
- `next_step_on_failure`: Next step on failure

### 4. Constraints

Rules that must be satisfied during execution.

```json
{
  "constraints": [
    {
      "id": "CONST-001",
      "level": "MUST" | "SHOULD" | "MAY",
      "description": "Constraint description",
      "condition": "optional condition",
      "action": "optional action",
      "validation": "optional validation",
      "roles": ["role1", "role2"],
      "confidence": 0.95
    }
  ]
}
```

**Constraint Levels:**
- `MUST`: Must be satisfied (hard constraint)
- `SHOULD`: Should be satisfied if possible
- `MAY`: Optional constraint

### 5. Decisions

Decision points with rules.

```json
{
  "decisions": [
    {
      "id": "DEC-001",
      "name": "Decision Name",
      "inputVars": ["input1", "input2"],
      "outputVars": ["output1"],
      "rules": [
        {
          "condition": "input1 > 100",
          "output": { "output1": "high" },
          "priority": 1
        }
      ]
    }
  ]
}
```

### 6. Error Handling

Define error handling strategies.

```json
{
  "error_handling": {
    "strategies": [
      {
        "error_type": "validation_error",
        "action": "log_and_report",
        "recovery_step": "STEP-RECOVER"
      }
    ],
    "fallback_steps": ["STEP-FALLBACK"]
  }
}
```

---

## Test Cases

### Test Case Structure

```json
{
  "id": "TEST-001",
  "name": "Test Name",
  "description": "Test description",
  "type": "happy-path" | "edge-case" | "error-case" | "compliance",
  "enabled": true,
  "steps": ["STEP-001", "STEP-002"],
  "input_variables": [
    { "name": "data", "value": { ... }, "type": "object" }
  ],
  "expected_results": [
    { "field": "result.status", "operator": "equals", "value": "success" }
  ],
  "timeout": 30000,
  "retry_count": 3
}
```

### Test Case Types

- `happy-path`: Normal successful execution
- `edge-case`: Boundary conditions
- `error-case`: Error handling scenarios
- `compliance`: Regulatory compliance checks

---

## Validation

### Required Validation Rules

1. All `MUST` constraints must be satisfied
2. All steps must have valid `id` and `action`
3. Step references (`next_step_on_success`, etc.) must exist
4. Decision rules must cover all cases or have a default
5. Test cases must reference valid steps

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-30 | Initial specification |

---

## Examples

See `examples/` directory for complete skill examples.

---

## License

MIT