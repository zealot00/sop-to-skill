# sop-to-skill

Convert SOP documents to executable AI Agent Skills.

## Install

```bash
npm install -g sop-to-skill
# or
npm install -D sop-to-skill
```

## Quick Start

```bash
# Generate Skill Package from SOP
sop-to-skill generate ./SOP-DM-002.md --name "数据核查流程" --output ./output

# Extract structured data only
sop-to-skill extract ./SOP.md

# Enhance with LLM (requires Ollama or OpenAI API)
sop-to-skill generate ./SOP.md --name "流程" --output ./out --llm

# Validate Skill Package
sop-to-skill validate ./output
```

## Commands

| Command | Description |
|---------|-------------|
| `generate` | Generate Skill Package from SOP document |
| `extract` | Extract structured data (constraints, decisions, roles) |
| `llm-enhance` | Enhance extracted data with LLM |
| `validate` | Validate Skill Package structure |

## Options

- `--llm` - Enable LLM enhancement
- `--llm-api` - LLM API URL (default: http://localhost:11434)
- `--llm-model` - LLM model name

## Architecture

```
Parser → Extractor → LLM Enhancer → Generator → Validator
   ↓         ↓            ↓            ↓          ↓
  Markdown  Constraint   Semantic    SKILL.md   Package
  PDF       Decision      Improve     JSON Schema Validation
  DOCX      Role         Test Cases
```

## Skill Package Structure

```
skill-package/
├── SKILL.md                    # Human-readable documentation
├── skill.schema.json           # JSON Schema for AI parsing
├── skill.manifest.yaml         # Package metadata
└── test-cases/                # Test cases (future)
```

## Development

```bash
# Build
npm run build

# Test
npm test

# Run CLI
node dist/main.js --help
```

## Examples

See `examples/` directory for sample Skill Packages.