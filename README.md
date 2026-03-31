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
│   ✓ 生成 Skill 包                                        │
│   ✓ 验证输出结构                                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Skill Package (可执行的)                      │
│                                                          │
│   SKILL.md              ← 人类可读的文档                   │
│   skill.schema.json      ← AI 可解析的结构                  │
│   skill.manifest.yaml   ← 元数据                          │
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

**如果你在找一个"我只是转换，老板说什么我做什么"的工具，`sop-to-skill` 就是你需要的。**

---

## 核心能力

- **多格式解析** — Markdown、PDF、DOCX 一网打尽
- **结构化提取** — 约束（MUST/SHOULD/MAY）、决策、角色分类提取
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
| **Role** | 角色定义 | DMC、QA、项目经理 |

---

## 快速开始

```bash
# 1. 安装
npm install -g sop-to-skill

# 2. 构建（开发时）
npm run build

# 3. 生成 Skill 包
sop-to-skill generate ./SOP-DM-002.md --name "数据核查流程" --output ./output

# 4. 验证输出
sop-to-skill validate ./output

# 5. 提取结构化数据（不生成包）
sop-to-skill extract ./SOP.md
```

或者直接跑 demo：

```bash
npm run build
node dist/main.js generate integration/test-sop.md --name "测试流程" --output /tmp/test-skill
node dist/main.js validate /tmp/test-skill
```

---

## 常用命令

```bash
sop-to-skill generate <input> --name "xxx" --output <dir>   # 生成 Skill 包
sop-to-skill extract <input>                                  # 提取数据
sop-to-skill llm-enhance <input> --llm-api http://xxx         # LLM 增强（预留）
sop-to-skill validate <dir>                                   # 验证包结构
sop-to-skill version                                          # 版本信息
```

---

## 输出结构

```
skill-package/
├── SKILL.md              # 人类可读的 Skill 文档
├── skill.schema.json     # 机器可读的完整 Skill 定义
└── skill.manifest.yaml   # 包元数据
```

### SKILL.schema.json 结构

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
  ├── SKILL.md 生成
  ├── skill.schema.json 生成
  └── skill.manifest.yaml 生成
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

**Q: LLM 增强功能什么时候能用？**

A: 目前是预留接口。LLM 增强需要接入 API Server，在另一个项目中实现。

**Q: 支持英文 SOP 吗？**

A: 支持。约束提取支持中英文关键词模式。

**Q: 提取质量怎么样？**

A: 基于关键词匹配 + if-then 模式提取。对于规范的中文 SOP，准确率较高。对于复杂句式，可能需要 LLM 增强来提升质量。

---

## 项目结构

```
sop-to-skill/
├── src/
│   ├── commands/          # CLI 命令
│   │   ├── generate.ts    # 生成命令
│   │   ├── extract.ts     # 提取命令
│   │   ├── llm-enhance.ts # LLM 增强（预留）
│   │   └── validate.ts     # 验证命令
│   ├── parser/            # 解析器
│   │   ├── factory.ts     # 解析器工厂
│   │   ├── markdown.ts    # Markdown 解析
│   │   └── table-parser.ts# 表格解析
│   ├── extractor/         # 提取器
│   │   ├── constraint.ts  # 约束提取
│   │   ├── decision.ts    # 决策提取
│   │   ├── role.ts        # 角色提取
│   │   ├── patterns.ts    # 约束模式配置
│   │   └── role-patterns.ts# 角色模式配置
│   ├── generator/         # 生成器
│   │   ├── skill-package.ts# Skill 包生成
│   │   ├── skill-md.ts    # SKILL.md 生成
│   │   └── manifest.ts    # manifest 生成
│   ├── validator/         # 验证器
│   │   ├── index.ts       # 验证入口
│   │   └── skill-schema.ts# Zod Schema
│   ├── llm/               # LLM 集成（预留）
│   │   ├── enhancer.ts    # LLM 增强接口
│   │   └── prompts.ts     # Prompt 模板（支持 i18n）
│   └── types/             # 类型定义
│       ├── skill-package.ts
│       └── ...
├── SKILL.schema.json      # Skill JSON Schema
├── SKILL.md              # Skill 格式规范
└── docs/
    └── plans/             # 优化计划
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
- **Output**: Structured Skill packages (SKILL.md + skill.schema.json + manifest)
- **Consumer**: [skill-eval-harness (SEH)](https://github.com/zealot00/skill-eval-harness) for evaluation

Key capabilities:
- Multi-format parsing (Markdown, PDF, DOCX)
- Structured extraction (MUST/SHOULD/MAY constraints, decisions, roles)
- Schema-compliant output (SKILL.schema.json)
- Multi-language support (Chinese + English)
- Configurable patterns for extensibility

`sop-to-skill` doesn't execute Skills—it just makes them. Execution is handled by SEH.

---

*"We transform, therefore they can execute."* — sop-to-skill, probably
