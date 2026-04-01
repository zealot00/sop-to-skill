# sop-to-skill

> *把枯燥的流程文档，变成能跑的 AI Agent Skill。*

---

## TL;DR

`sop-to-skill` 是一个**只干实事**的 CLI 工具，专注于：**解析 → 提取 → 生成**。

它把 SOP（标准操作流程）文档变成结构化的 Skill 包，让 AI Agent 能够理解和执行。

```
┌─────────────────────────────────────────────────────────┐
│                    SOP 文档 (静态的)                       │
│                                                          │
│   "数据录入员必须在5个工作日内完成审批..."                   │
│   "如果金额超过10000，则必须经理审批..."                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              sop-to-skill (转换器)                        │
│                                                          │
│   "收到老板，我来解析"                                     │
│   ✓ 解析 Markdown/PDF/DOCX                                │
│   ✓ 提取约束/决策/角色                                    │
│   ✓ 生成 Skill 包（渐进式披露）                            │
│   ✓ 验证输出结构                                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Skill Package (渐进式披露)                     │
│                                                          │
│   SKILL.md              ← Agent 用 — 精简核心            │
│   SKILL.full.md         ← 人类用 — 完整文档               │
│   constraints/           ← 约束详情（按需获取）             │
│   skill.schema.json     ← 机器可读结构                    │
└─────────────────────────────────────────────────────────┘
```

---

## 它是谁的"打工人"？

`sop-to-skill` 的产出会交给 [skill-eval-harness (SEH)](https://github.com/zealot00/skill-eval-harness) 来评测质量。

| skill-eval-harness (评测者) | sop-to-skill (打工人) |
|-----------------------------|----------------------|
| "我来跑评测" | "我给你准备好 Skill 包" |
| "我来打分" | "我验证好结构" |
| "我来门禁判断" | "我提取好约束规则" |
| "展示 Dashboard" | "生成文档" |

**本质上**：sop-to-skill 负责生产，SEH 负责质检。两者配合，让 SOP → Skill → 评测 的流程自动化。

---

## 中文简介

`sop-to-skill` 是一个**只转换**的工具。

它不关心你的 Skill 怎么执行，它只关心：
- 你的 SOP 能不能被正确解析
- 约束/决策/角色能不能被准确提取
- 输出的 Skill 包符不符合规范
- **Agent 上下文是否干净（渐进式披露）**

---

## 核心能力

- **多格式解析** — Markdown、PDF、DOCX 一网打尽
- **结构化提取** — 约束（MUST/SHOULD/MAY）、决策、角色分类提取
- **渐进式披露** — Agent 只加载精简核心，详情按需获取
- **规范输出** — 生成符合 SKILL.schema.json 的 Skill 包
- **多语言支持** — 中文、英文 SOP 都能处理
- **配置化扩展** — 角色模式、约束模式可配置

### 支持的文件格式

| 格式 | 说明 | 依赖 |
|------|------|------|
| Markdown | `.md` / `.markdown` | 内置解析器 |
| PDF | `.pdf` | `pdf-parse` |
| DOCX | `.docx` | `mammoth` |
| 纯文本 | 其他格式 | 兜底处理 |

### 提取能力

| 提取类型 | 说明 | 关键词示例 |
|----------|------|-----------|
| **MUST** | 必须遵守的约束 | 必须、应当、需要、不得 |
| **SHOULD** | 应当遵守的约束 | 建议、推荐、应该 |
| **MAY** | 可以遵守的约束 | 可以、允许、酌情 |
| **Decision** | 决策规则 | 如果...则... |
| **Role** | 角色定义 | 可配置模式 |

---

## 快速开始

```bash
# 1. 安装
npm install -g sop-to-skill

# 2. 构建（开发时）
npm run build

# 3. 生成 Skill 包（默认启用渐进式披露）
sop-to-skill generate ./SOP-DM-002.md --name "数据核查流程" --output ./output

# 4. 验证输出
sop-to-skill validate ./output

# 5. 提取结构化数据（不生成包）
sop-to-skill extract ./SOP.md
```

---

## 常用命令

```bash
sop-to-skill generate <input> --name "xxx" --output <dir>   # 生成 Skill 包（默认渐进式）
sop-to-skill generate <input> --name "xxx" --output <dir> --progressive legacy   # 传统格式
sop-to-skill generate <input> --name "xxx" --output <dir> --framework codex       # 生成指定 Agent 框架产物
sop-to-skill generate <input> --name "xxx" --output <dir> --framework all          # 生成全部框架产物
sop-to-skill generate <input> --name "xxx" --output <dir> --config ./generator.json # 配置化输出文件名/元数据
sop-to-skill generate <input> --name "xxx" --output <dir> --config ./generator.json --lenient-config # 配置异常时降级默认
sop-to-skill generate <input> --output <dir> --extract-language zh --extract-threshold 0.8 # 覆盖提取策略
sop-to-skill generate <input> --output <dir> --orchestrator-api http://host:port --api-strategy remote_first # 远端增强 + 本地回退
sop-to-skill extract <input>                                  # 提取数据
sop-to-skill extract <input> --config ./generator.json --role-config ./role-config.json # 提取层配置化
sop-to-skill llm-enhance <input> --llm-api http://xxx         # LLM 增强（预留）
sop-to-skill llm-enhance <input> --extract-language en --no-boundary # LLM增强前提取控制
sop-to-skill validate <dir> --config ./generator.json         # 按相同配置验证包结构
sop-to-skill validate <dir> --config ./generator.json --lenient-config # 配置异常时降级默认校验
sop-to-skill orchestrator --op health --base-url http://host:port      # 直接调用 orchestrator API
sop-to-skill version                                          # 版本信息
```

### 配置化控制（推荐）

`--config` 支持三类关键控制：

- `extraction`：控制语言、置信阈值、角色配置路径、是否启用边界提取
- `progressive`：控制是否默认启用渐进式、是否输出 `SKILL.full.md`、是否输出 `constraints/` 细节目录
- `framework`：控制 `--framework all` 时允许输出的框架白名单
- `output`：控制核心产物文件名（`skillFileName` / `schemaFileName` / `manifestFileName` 等）

默认是**严格配置校验**：配置文件存在但格式非法时直接报错（防止静默生成错误产物）。  
只有显式传 `--lenient-config` 才会自动回退到默认配置。

### 远端增强与降级

`generate` / `extract` / `llm-enhance` 新增：

- `--orchestrator-api` / `--orchestrator-token`
- `--api-strategy local_only|remote_first|remote_only`（默认 `local_only`）
- `--api-timeout-ms`

Orchestrator 地址与 JWT Token 支持以下环境变量（按顺序回退）：
- Base URL: `SOP_TO_SKILL_ORCHESTRATOR_API` 或 `MANAGING_UP_BASE_URL`
- Token: `SOP_TO_SKILL_ORCHESTRATOR_TOKEN` 或 `MANAGING_UP_JWT_TOKEN` 或 `MANAGING_UP_TOKEN`

示例：
```bash
export MANAGING_UP_BASE_URL=http://localhost:8080
export MANAGING_UP_JWT_TOKEN=<your-jwt-token>
sop-to-skill generate ./examples/sample.md -o ./out --api-strategy remote_first
```

策略说明：
- `local_only`：仅本地能力（当前默认能力）
- `remote_first`：优先远端增强，失败自动降级本地
- `remote_only`：只走远端，失败即报错

这保证了 **不使用 API 时 CLI 能力不变**，并且可按需启用远端增强。

---

## CI 与契约

- CI 会执行：`typecheck` + `unit tests` + `build` + `generate+validate` 端到端 smoke
- 契约测试会检查 `SKILL.schema.json` 与运行时校验器（Zod）在关键字段上的一致性（DecisionRule / ErrorHandling / Step）
- 本地 API 烟测：`npm run test:api-smoke`（默认请求 `http://localhost:8080`，可用 `ORCH_BASE_URL` 与 `ORCH_TOKEN` 覆盖）
- 本地 CLI 调用 API 烟测：`npm run test:cli-api-smoke`（通过 `sop-to-skill orchestrator` 验证 JWT 链路，支持 `ORCH_BASE_URL` / `ORCH_TOKEN`）

---

## Agent 集成

完整集成指南见：`docs/agent-integration.md`

远端 API 平台（Orchestrator）对接项目：`https://github.com/zealot00/managing-up`

---

## 渐进式披露

默认启用，Agent 只加载精简核心，详情按需获取。

### 输出结构

```
skill-package/
├── SKILL.md              # Agent 用 — 精简核心
├── SKILL.full.md         # 人类用 — 完整文档
├── constraints/           # 约束详情（按需获取）
│   ├── CONST-C001.md
│   └── CONST-C002.md
├── skill.schema.json     # 机器可读结构
└── skill.manifest.yaml   # 包元数据
```

### Agent 视角 (SKILL.md)

```markdown
## Steps

### STEP-001
**Action**: verify_data_completeness
**When**: before_submission
**Next**: STEP-002 [✓]

## Constraints

| ID | Level | Summary |
|----|-------|---------|
| CONST-001 | MUST | 核实数据完整性 |

> 📎 Details: `./constraints/`
> 📖 Full: `./SKILL.full.md`
```

### 人类视角 (SKILL.full.md)

完整原始描述、角色、语义、来源引用等。

---

## SKILL.schema.json 结构

```json
{
  "schema": {
    "meta": {
      "name": "数据核查流程",
      "version": "1.0.0",
      "description": "Generated from SOP-DM-002.md"
    },
    "triggers": [
      { "type": "execution", "description": "执行数据核查" }
    ],
    "steps": [
      { "id": "STEP-001", "name": "数据录入检查", "action": "validate_constraint_C001" }
    ],
    "constraints": [
      { "id": "CONST-C001", "level": "MUST", "description": "数据录入员必须核实数据完整性" }
    ]
  },
  "manifest": {
    "format_version": "1.0.0",
    "generated_at": "2026-03-31T00:00:00Z",
    "generator": "sop-to-skill"
  }
}
```

---

## 架构

```
输入文件
   ↓
Parser (解析器)
  ├── Markdown 解析器
  ├── PDF 解析器 (表格结构保留)
  └── DOCX 解析器
   ↓
Extractor (提取器)
  ├── 约束提取 (patterns.ts 可配置)
  ├── 决策提取
  └── 角色提取 (role-patterns.ts 可配置)
   ↓
Generator (生成器)
  ├── progressive-md.ts    # 渐进式 Markdown
  ├── skill-md.ts         # 传统 Markdown
  ├── skill.schema.json  # 结构化数据
  └── manifest.yaml      # 元数据
   ↓
Validator (验证器)
  └── Zod Schema 验证
```

---

## 开发

```bash
# 构建
npm run build

# 类型检查
npm run typecheck

# 测试
npm test

# Lint
npm run lint

# 运行 CLI
node dist/main.js generate <file> --name "xxx" --output <dir>
```

---

## FAQ

**Q: `sop-to-skill` 能直接执行 Skill 吗？**

A: 不能。它只负责转换。执行是 [skill-eval-harness](https://github.com/zealot00/skill-eval-harness) 的活儿。

**Q: 什么是渐进式披露？**

A: Agent 默认只加载精简核心（Action/When/Next），完整详情在 `SKILL.full.md` 和 `constraints/` 目录中，按需获取。这保持 Agent 上下文干净，避免信息过载。

**Q: 如何禁用渐进式披露？**

A: 使用 `--progressive legacy` 参数生成传统格式的 Skill 包。

**Q: LLM 增强功能什么时候能用？**

A: 目前是预留接口。LLM 增强需要接入 API Server，在另一个项目中实现。

**Q: 支持英文 SOP 吗？**

A: 支持。约束提取支持中英文关键词模式。

---

## 项目结构

```
sop-to-skill/
├── src/
│   ├── commands/          # CLI 命令
│   │   ├── generate.ts   # 生成命令
│   │   ├── extract.ts    # 提取命令
│   │   ├── llm-enhance.ts# LLM 增强（预留）
│   │   └── validate.ts   # 验证命令
│   ├── parser/           # 解析器
│   │   ├── factory.ts    # 解析器工厂
│   │   ├── markdown.ts   # Markdown 解析
│   │   └── table-parser.ts# 表格解析
│   ├── extractor/        # 提取器
│   │   ├── constraint.ts # 约束提取
│   │   ├── decision.ts  # 决策提取
│   │   ├── role.ts      # 角色提取
│   │   ├── patterns.ts   # 约束模式配置
│   │   └── role-patterns.ts# 角色模式配置
│   ├── generator/        # 生成器
│   │   ├── skill-package.ts# Skill 包生成
│   │   ├── progressive-md.ts# 渐进式 Markdown
│   │   ├── skill-md.ts  # SKILL.md 生成
│   │   └── manifest.ts  # manifest 生成
│   ├── validator/        # 验证器
│   │   ├── index.ts     # 验证入口
│   │   └── skill-schema.ts# Zod Schema
│   ├── llm/              # LLM 集成（预留）
│   │   ├── enhancer.ts   # LLM 增强接口
│   │   └── prompts.ts   # Prompt 模板（支持 i18n）
│   └── types/            # 类型定义
│       ├── progressive.ts# 渐进式披露类型
│       └── ...
├── SKILL.schema.json     # Skill JSON Schema
├── SKILL.md             # Skill 格式规范
└── docs/
    └── plans/           # 优化计划
```

---

## 文档

- [优化计划](docs/plans/2026-03-31-sop-to-skill-optimization.md) — 详细改进路线图

---

## English

*For our international friends who skipped the Chinese part above:*

`sop-to-skill` is a **CLI tool** that converts SOP (Standard Operating Procedure) documents into structured Skill packages for AI Agents.

Think of it as:
- **Input**: Static SOP documents (Markdown, PDF, DOCX)
- **Output**: Progressive Skill packages (minimal for Agent, full for humans)
- **Consumer**: [skill-eval-harness (SEH)](https://github.com/zealot00/skill-eval-harness) for evaluation

Key capabilities:
- Multi-format parsing (Markdown, PDF, DOCX)
- Structured extraction (MUST/SHOULD/MAY constraints, decisions, roles)
- **Progressive disclosure** — Agent sees minimal core, details on-demand
- Schema-compliant output (SKILL.schema.json)
- Multi-language support (Chinese + English)
- Configurable patterns for extensibility

`sop-to-skill` doesn't execute Skills—it just makes them. Execution is handled by SEH.

---

*"We transform, therefore they can execute."* — sop-to-skill, probably
