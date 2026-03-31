# sop-to-skill 优化计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复核心缺陷：Schema 不一致、提取质量、角色扩展、多语言支持、测试覆盖

**Architecture:** 
- 修复 Schema 生成器使其输出符合 SKILL.schema.json 定义的结构
- 改进约束提取逻辑，支持多种自然语言和更复杂的句式
- 将角色提取从硬编码改为可配置模式
- PDF 解析保留表格结构
- 使用 Zod 替代手动验证
- Prompt 模板支持 i18n
- 补充测试覆盖

**Tech Stack:** TypeScript, Zod, pdf-parse, mammoth, clipanion

---

## Task 1: 修复 Schema 生成不一致

**Files:**
- Modify: `src/generator/skill-package.ts` — 重构生成逻辑
- Modify: `src/types/skill-package.ts` — 对齐类型定义
- Test: `src/types/types.test.ts` — 添加 schema 验证测试

**Step 1: 阅读 SKILL.schema.json 结构**

```bash
cat src/generator/skill-package.ts | head -60
```

确认 schema 期望的结构：
```json
{
  "schema": {
    "meta": { "name", "version", "description" },
    "triggers": [{ "type": "execution"|"query"|"approval"|"event" }],
    "steps": [{ "id", "name", "description", "action", "input", "output" }],
    "constraints": [{ "id", "level", "description", "roles", "confidence" }]
  },
  "manifest": { "format_version", "generated_at", "generator", "source_sop" }
}
```

**Step 2: 重写 skill-package.ts 的 generateSkillPackage 函数**

```typescript
export async function generateSkillPackage(
  extracted: ExtractedData,
  name: string,
  options: GeneratorOptions
): Promise<{ schema: SkillSchema; manifest: Manifest }> {
  const version = '1.0.0';
  const now = new Date().toISOString();

  // 修复：输出符合 schema 的嵌套结构
  const schema: SkillSchema = {
    meta: {
      name,
      version,
      description: `Generated from ${options.sourceFile}`,
    },
    triggers: buildTriggers(),
    steps: buildSteps(extracted),
    constraints: extracted.constraints.map((c) => ({
      id: c.id || `CONST-${Math.random().toString(36).substr(2, 9)}`,
      level: c.level || 'SHOULD',
      description: c.description,
      condition: c.condition,
      action: c.action,
      roles: c.roles,
      confidence: c.confidence || 0.85,
    })),
    decisions: extracted.decisions,
    error_handling: buildErrorHandling(extracted),
  };

  const manifest: Manifest = {
    format_version: '1.0.0',
    generated_at: now,
    generator: 'sop-to-skill',
    source_sop: options.sourceFile,
  };

  return { schema, manifest };
}
```

**Step 3: 更新 types/skill-package.ts 类型定义**

```typescript
// 确保 SkillSchema 是嵌套结构
export interface SkillSchema {
  meta: SkillMeta;
  triggers: Trigger[];
  steps: Step[];
  constraints: Constraint[];
  decisions?: Decision[];
  error_handling?: ErrorHandling;
}

export interface Manifest {
  format_version: string;
  generated_at: string;
  generator: string;
  source_sop: string;
  validation_status?: 'pending' | 'validated' | 'failed';
  test_cases_count?: number;
}
```

**Step 4: 写测试验证 schema 一致性**

```typescript
// src/types/types.test.ts
import { describe, it, expect } from 'vitest';
import { generateSkillPackage } from '../generator/skill-package.js';

describe('Schema Consistency', () => {
  it('should generate schema matching SKILL.schema.json structure', async () => {
    const extracted = {
      constraints: [{
        id: 'C001',
        level: 'MUST' as const,
        description: 'Test constraint',
        roles: ['DMC'],
        confidence: 0.9
      }],
      decisions: [],
      parameters: [],
      sources: [],
      roles: {},
      subjective_judgments: [],
      ambiguity_notes: [],
    };

    const result = await generateSkillPackage(extracted, 'Test Skill', {
      sourceFile: 'test.md'
    });

    // 验证顶层结构
    expect(result).toHaveProperty('schema');
    expect(result).toHaveProperty('manifest');
    
    // 验证 schema 结构
    expect(result.schema).toHaveProperty('meta');
    expect(result.schema).toHaveProperty('triggers');
    expect(result.schema).toHaveProperty('steps');
    expect(result.schema).toHaveProperty('constraints');
    
    // 验证 meta
    expect(result.schema.meta.name).toBe('Test Skill');
    expect(result.schema.meta.version).toBe('1.0.0');
  });
});
```

**Step 5: 运行测试**

```bash
npm test -- src/types/types.test.ts
```

**Step 6: 提交**

```bash
git add src/generator/skill-package.ts src/types/skill-package.ts src/types/types.test.ts
git commit -m "fix: align skill-package output with SKILL.schema.json structure"
```

---

## Task 2: 改进约束提取逻辑

**Files:**
- Modify: `src/extractor/constraint.ts` — 改进提取算法
- Create: `src/extractor/patterns.ts` — 提取模式配置
- Test: `src/extractor/extractor.test.ts` — 添加更多测试用例

**Step 1: 创建 patterns.ts 配置文件**

```typescript
// src/extractor/patterns.ts

export interface ConstraintPattern {
  level: 'MUST' | 'SHOULD' | 'MAY';
  patterns: RegExp[];
  // 支持多语言
  languages: ('zh' | 'en')[];
}

export const CONSTRAINT_PATTERNS: ConstraintPattern[] = [
  {
    level: 'MUST',
    languages: ['zh'],
    patterns: [
      /必须|应当|需要|不得|严禁|不准|不得超过|不得少于|强制/,
    ],
  },
  {
    level: 'SHOULD',
    languages: ['zh'],
    patterns: [
      /建议|推荐|应该|宜|可以考虑|一般应该|通常应当|推荐/,
    ],
  },
  {
    level: 'MAY',
    languages: ['zh'],
    patterns: [
      /可以|允许|酌情|根据情况|视情况|可选/,
    ],
  },
  {
    level: 'MUST',
    languages: ['en'],
    patterns: [
      /\bmust\b|\bshall\b|\bhave to\b|\bis required to\b|\bneeds to\b/i,
    ],
  },
  {
    level: 'SHOULD',
    languages: ['en'],
    patterns: [
      /\bshould\b|\bought to\b|\brecommend\b|\bits recommended\b/i,
    ],
  },
  {
    level: 'MAY',
    languages: ['en'],
    patterns: [
      /\bmay\b|\bmight\b|\bcan\b|\bcould\b|\boptional\b/i,
    ],
  },
];

export interface IfThenPattern {
  ifKeywords: string[];
  thenKeywords: string[];
}

export const IF_THEN_PATTERNS: IfThenPattern[] = [
  { ifKeywords: ['如果', '当', '一旦', '若是', '假如', '若'], thenKeywords: ['则', '那么', '应', '必须', '就'] },
  { ifKeywords: ['if', 'when', 'whenever', 'in case'], thenKeywords: ['then', 'must', 'shall', 'should', '=>'] },
];
```

**Step 2: 重写 extractConstraints 函数**

```typescript
// src/extractor/constraint.ts
import { CONSTRAINT_PATTERNS, IF_THEN_PATTERNS, type ConstraintPattern } from './patterns.js';

export function extractConstraints(
  text: string,
  options?: { language?: 'zh' | 'en'; confidenceThreshold?: number }
): Constraint[] {
  const constraints: Constraint[] = [];
  const language = options?.language || detectLanguage(text);
  const threshold = options?.confidenceThreshold || 0.7;
  
  const sentences = splitSentences(text, language);
  let counter = 1;

  for (const sentence of sentences) {
    if (sentence.length < 5) continue;

    // 尝试 if-then 模式
    const ifThen = extractIfThen(sentence, language, counter);
    if (ifThen) {
      constraints.push(ifThen);
      counter++;
      continue;
    }

    // 尝试关键词模式
    const keyword = extractByKeyword(sentence, language, counter);
    if (keyword && keyword.confidence >= threshold) {
      constraints.push(keyword);
      counter++;
    }
  }

  return constraints;
}

function detectLanguage(text: string): 'zh' | 'en' {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const words = text.split(/\s+/).length;
  return chineseChars > words * 0.3 ? 'zh' : 'en';
}

function splitSentences(text: string, language: 'zh' | 'en'): string[] {
  if (language === 'zh') {
    return text.split(/[。；\n]/).filter(s => s.trim().length > 0);
  }
  return text.split(/[.;\n]/).filter(s => s.trim().length > 0);
}

function extractIfThen(sentence: string, language: 'zh' | 'en', counter: number): Constraint | null {
  for (const pattern of IF_THEN_PATTERNS) {
    if (language === 'zh' && !pattern.ifKeywords.some(k => sentence.includes(k))) continue;
    if (language === 'en' && !pattern.ifKeywords.some(k => sentence.toLowerCase().includes(k))) continue;
    
    const ifMatch = sentence.match(new RegExp(`(${pattern.ifKeywords.join('|')})(.+?)(,|，)(${pattern.thenKeywords.join('|')})(.+?)$`));
    if (ifMatch) {
      const condition = ifMatch[2].trim();
      const action = ifMatch[5].trim();
      const level = detectLevelFromAction(action, language);
      
      return {
        id: `C${counter.toString().padStart(3, '0')}`,
        level,
        description: sentence.trim(),
        condition,
        action,
        roles: extractRoles(sentence),
        confidence: 0.9,
      };
    }
  }
  return null;
}

function extractByKeyword(sentence: string, language: 'zh' | 'en', counter: number): Constraint | null {
  const patterns = CONSTRAINT_PATTERNS.filter(p => p.languages.includes(language));
  
  for (const patternGroup of patterns) {
    if (patternGroup.patterns.some(p => p.test(sentence))) {
      return {
        id: `C${counter.toString().padStart(3, '0')}`,
        level: patternGroup.level,
        description: cleanDescription(sentence.trim()),
        roles: extractRoles(sentence),
        confidence: 0.85,
      };
    }
  }
  return null;
}

function detectLevelFromAction(action: string, language: 'zh' | 'en'): ConstraintLevel {
  if (language === 'zh') {
    if (/必须|应当|需要/.test(action)) return 'MUST';
    if (/建议|推荐|应该/.test(action)) return 'SHOULD';
    if (/可以|允许/.test(action)) return 'MAY';
  } else {
    if (/\bmust\b|\bshall\b/.test(action)) return 'MUST';
    if (/\bshould\b/.test(action)) return 'SHOULD';
    if (/\bmay\b|\bcan\b/.test(action)) return 'MAY';
  }
  return 'SHOULD';
}
```

**Step 3: 清理描述**

```typescript
function cleanDescription(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
```

**Step 4: 添加测试用例**

```typescript
// 在 extractor.test.ts 添加
it('should extract constraints in English text', () => {
  const text = 'The data must be verified. You should review all entries. You may skip optional fields.';
  const constraints = extractConstraints(text, { language: 'en' });
  
  expect(constraints).toHaveLength(3);
  expect(constraints.filter(c => c.level === 'MUST')).toHaveLength(1);
  expect(constraints.filter(c => c.level === 'SHOULD')).toHaveLength(1);
  expect(constraints.filter(c => c.level === 'MAY')).toHaveLength(1);
});
```

**Step 5: 运行测试**

```bash
npm test -- src/extractor/extractor.test.ts
```

**Step 6: 提交**

```bash
git add src/extractor/constraint.ts src/extractor/patterns.ts src/extractor/extractor.test.ts
git commit -m "feat: improve constraint extraction with configurable patterns and multi-language support"
```

---

## Task 3: 角色提取可配置化

**Files:**
- Create: `src/extractor/role-patterns.ts` — 角色模式配置
- Modify: `src/extractor/role.ts` — 使用可配置模式
- Modify: `src/extractor/constraint.ts` — 复用角色提取

**Step 1: 创建 role-patterns.ts**

```typescript
// src/extractor/role-patterns.ts

export interface RoleDefinition {
  id: string;
  name: string;
  patterns: RegExp[];
  description?: string;
}

export const DEFAULT_ROLE_PATTERNS: RoleDefinition[] = [
  {
    id: 'dmc',
    name: 'DMC（数据监查员）',
    patterns: [/DMC|数据监查员|数据监视委员会/],
  },
  {
    id: 'qa',
    name: 'QA（质量保证）',
    patterns: [/QA|质量保证|质量保证人员/],
  },
  {
    id: 'dm',
    name: '数据管理员',
    patterns: [/DM|数据管理员|数据管理/],
  },
  {
    id: 'pi',
    name: '项目经理',
    patterns: [/项目经理|项目负责人|PI/],
  },
  {
    id: 'medical',
    name: '医学监查员',
    patterns: [/医学监查员|医学监查|医学人员/],
  },
  {
    id: 'statistician',
    name: '统计师',
    patterns: [/统计师|统计人员|生物统计/],
  },
  {
    id: 'ethic',
    name: '伦理委员会',
    patterns: [/伦理委员会|伦理|IRB/],
  },
  {
    id: 'sysadmin',
    name: '系统管理员',
    patterns: [/系统管理员|管理员|系统管理员/],
  },
  {
    id: 'sponsor',
    name: '申办方',
    patterns: [/申办方| sponsor|Sponsor/],
  },
  {
    id: 'cro',
    name: 'CRO',
    patterns: [/CRO|合同研究组织/],
  },
];

// 支持自定义角色
export function createRolePatterns(customRoles?: RoleDefinition[]): RoleDefinition[] {
  return customRoles || DEFAULT_ROLE_PATTERNS;
}
```

**Step 2: 重写 role.ts**

```typescript
// src/extractor/role.ts
import { createRolePatterns, type RoleDefinition } from './role-patterns.js';

export interface Role {
  description: string;
  mentions: number;
  source: string;
}

export interface RoleExtractorOptions {
  roles?: RoleDefinition[];
}

export function extractRoles(text: string, options?: RoleExtractorOptions): string[] {
  const roleDefs = createRolePatterns(options?.roles);
  const foundRoles: string[] = [];

  for (const roleDef of roleDefs) {
    for (const pattern of roleDef.patterns) {
      if (pattern.test(text)) {
        if (!foundRoles.includes(roleDef.name)) {
          foundRoles.push(roleDef.name);
        }
        break;
      }
    }
  }

  return foundRoles;
}

export function extractRolesWithCount(
  text: string, 
  options?: RoleExtractorOptions
): Record<string, Role> {
  const roleDefs = createRolePatterns(options?.roles);
  const roles: Record<string, Role> = {};

  for (const roleDef of roleDefs) {
    let count = 0;
    for (const pattern of roleDef.patterns) {
      const matches = text.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    if (count > 0) {
      roles[roleDef.id] = {
        description: roleDef.description || roleDef.name,
        mentions: count,
        source: 'sop',
      };
    }
  }

  return roles;
}
```

**Step 3: 更新 constraint.ts 导入**

```typescript
// 在 constraint.ts 顶部添加
import { extractRolesWithCount } from './role.js';
```

**Step 4: 测试**

```bash
npm test -- src/extractor/extractor.test.ts
```

**Step 5: 提交**

```bash
git add src/extractor/role-patterns.ts src/extractor/role.ts src/extractor/constraint.ts
git commit -m "feat: make role extraction configurable via role-patterns.ts"
```

---

## Task 4: PDF 解析保留表格结构

**Files:**
- Modify: `src/parser/factory.ts` — 改进 PDF 解析
- Create: `src/parser/table-parser.ts` — 表格结构解析

**Step 1: 创建 table-parser.ts**

```typescript
// src/parser/table-parser.ts

export interface Table {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export function extractTables(text: string): Table[] {
  const tables: Table[] = [];
  const lines = text.split('\n');
  
  let currentTable: Table | null = null;
  let inTable = false;
  let rowCount = 0;

  for (const line of lines) {
    // 检测表格开始（| 分隔符行）
    if (/^\|[\s\-\|]+\|$/.test(line.trim())) {
      inTable = true;
      currentTable = { headers: [], rows: [] };
      continue;
    }

    if (inTable && line.includes('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      
      // 表头行
      if (rowCount === 0 && currentTable) {
        currentTable.headers = cells;
      } else if (currentTable && cells.length > 0) {
        currentTable.rows.push(cells);
      }
      rowCount++;
    } else if (inTable && currentTable) {
      // 表格结束
      if (currentTable.rows.length > 0) {
        tables.push(currentTable);
      }
      inTable = false;
      currentTable = null;
      rowCount = 0;
    }
  }

  // 处理末尾表格
  if (currentTable && currentTable.rows.length > 0) {
    tables.push(currentTable);
  }

  return tables;
}

export function tablesToMarkdown(tables: Table[]): string {
  return tables.map(table => {
    const md: string[] = [];
    
    // 表头
    md.push(`| ${table.headers.join(' | ')} |`);
    md.push(`| ${table.headers.map(() => '---').join(' | ')} |`);
    
    // 数据行
    for (const row of table.rows) {
      md.push(`| ${row.join(' | ')} |`);
    }
    
    return md.join('\n');
  }).join('\n\n');
}
```

**Step 2: 改进 PDF 解析**

```typescript
// src/parser/factory.ts
import { extractTables, tablesToMarkdown } from './table-parser.js';

async function parsePdf(filePath: string, content: Buffer): Promise<ParsedContent> {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(content);
  
  // 提取表格结构
  const tables = extractTables(data.text);
  const tablesMd = tablesToMarkdown(tables);
  
  // 将表格转回 markdown 格式保留在 content 中
  const contentWithTables = tables.length > 0 
    ? data.text + '\n\n## 提取的表格\n\n' + tablesMd
    : data.text;

  return {
    content: contentWithTables,
    metadata: {
      fileType: 'pdf',
      tablesCount: tables.length,
    },
    sections: [],
  };
}
```

**Step 3: 测试**

```bash
npm test
```

**Step 4: 提交**

```bash
git add src/parser/factory.ts src/parser/table-parser.ts
git commit -m "feat: preserve table structure in PDF parsing"
```

---

## Task 5: 使用 Zod 进行验证

**Files:**
- Modify: `src/validator/index.ts` — 使用 Zod schema 验证
- Create: `src/validator/skill-schema.ts` — Zod schema 定义

**Step 1: 创建 Zod schema**

```typescript
// src/validator/skill-schema.ts
import { z } from 'zod';

export const StepInputSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  default: z.any().optional(),
});

export const StepOutputSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
});

export const StepSchema = z.object({
  id: z.string().regex(/^STEP-[A-Z0-9]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  action: z.string().min(1),
  condition: z.string().optional(),
  input: z.array(StepInputSchema).optional(),
  output: z.array(StepOutputSchema).optional(),
  next_step_on_success: z.string().optional(),
  next_step_on_failure: z.string().optional(),
});

export const ConstraintSchema = z.object({
  id: z.string().regex(/^CONST-[A-Z0-9]+$/),
  level: z.enum(['MUST', 'SHOULD', 'MAY']),
  description: z.string().min(1),
  condition: z.string().optional(),
  action: z.string().optional(),
  validation: z.string().optional(),
  roles: z.array(z.string()).min(1),
  confidence: z.number().min(0).max(1),
});

export const TriggerSchema = z.object({
  type: z.enum(['execution', 'query', 'approval', 'event']),
  description: z.string().optional(),
  condition: z.string().optional(),
});

export const SkillMetaSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1).max(500),
  author: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  icon: z.string().optional(),
});

export const ManifestSchema = z.object({
  format_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  generated_at: z.string().datetime(),
  generator: z.string(),
  source_sop: z.string().optional(),
  validation_status: z.enum(['pending', 'validated', 'failed']).optional(),
  test_cases_count: z.number().optional(),
});

export const SkillSchemaSchema = z.object({
  meta: SkillMetaSchema,
  triggers: z.array(TriggerSchema).min(1),
  steps: z.array(StepSchema).min(1),
  constraints: z.array(ConstraintSchema),
  decisions: z.array(z.any()).optional(),
  error_handling: z.any().optional(),
});

export const SkillPackageSchema = z.object({
  schema: SkillSchemaSchema,
  manifest: ManifestSchema,
});

export type ValidatedSkillPackage = z.infer<typeof SkillPackageSchema>;
```

**Step 2: 重写 validator**

```typescript
// src/validator/index.ts
import fs from 'fs/promises';
import path from 'path';
import { SkillPackageSchema, type ValidatedSkillPackage } from './skill-schema.js';

export interface ValidationIssue {
  type: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  issues: ValidationIssue[];
  data?: ValidatedSkillPackage;
}

const REQUIRED_FILES = ['SKILL.md', 'skill.schema.json', 'skill.manifest.yaml'];

export async function validateSkillPackage(packagePath: string): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  try {
    await fs.access(packagePath);
  } catch {
    return { valid: false, score: 0, issues: [{ type: 'missing_directory', severity: 'error', message: `Package path does not exist: ${packagePath}` }] };
  }

  const stat = await fs.stat(packagePath);
  const isDirectory = stat.isDirectory();

  if (!isDirectory) {
    if (path.extname(packagePath) === '.zip') return { valid: true, score: 1, issues: [] };
    return { valid: false, score: 0, issues: [{ type: 'invalid_format', severity: 'error', message: 'Package must be a directory or ZIP file' }] };
  }

  // 检查必需文件
  let requiredFound = 0;
  for (const file of REQUIRED_FILES) {
    try {
      await fs.access(path.join(packagePath, file));
      requiredFound++;
    } catch {
      issues.push({ type: 'missing_file', severity: 'error', message: `Required file missing: ${file}` });
    }
  }

  const schemaPath = path.join(packagePath, 'skill.schema.json');
  let skillData: any;

  try {
    const content = await fs.readFile(schemaPath, 'utf-8');
    skillData = JSON.parse(content);
  } catch (e: any) {
    issues.push({ type: 'invalid_json', severity: 'error', message: `skill.schema.json is not valid JSON: ${e.message}` });
    return { valid: false, score: requiredFound / REQUIRED_FILES.length, issues };
  }

  // Zod 验证
  const zodResult = SkillPackageSchema.safeParse(skillData);
  
  if (!zodResult.success) {
    for (const error of zodResult.error.errors) {
      issues.push({
        type: 'schema_validation',
        severity: 'error',
        message: `${error.path.join('.')}: ${error.message}`,
      });
    }
  }

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  return {
    valid: errors.length === 0 && zodResult.success,
    score: zodResult.success ? 1 : (requiredFound / REQUIRED_FILES.length) * 0.5,
    issues,
    data: zodResult.success ? zodResult.data : undefined,
  };
}
```

**Step 3: 测试**

```bash
npm test
```

**Step 4: 提交**

```bash
git add src/validator/skill-schema.ts src/validator/index.ts
git commit -m "feat: use Zod for schema validation instead of manual checks"
```

---

## Task 6: Prompt 模板多语言支持

**Files:**
- Modify: `src/llm/prompts.ts` — i18n 支持

**Step 1: 创建 i18n prompts**

```typescript
// src/llm/prompts.ts

export type Language = 'zh' | 'en';

interface PromptTemplates {
  EXTRACT_SEMANTIC: string;
  GENERATE_TEST_CASES: string;
  IMPROVE_SKILL: string;
}

const ZH_PROMPTS: PromptTemplates = {
  EXTRACT_SEMANTIC: `你是一个企业流程专家，擅长从SOP文档中提取精确的操作规范。

分析以下约束文本，理解其精确含义，并提取结构化信息。

约束文本：
{constraint_text}

请以JSON格式输出：
{
  "understood_meaning": "你理解的精确含义",
  "condition": "触发条件（如果有）",
  "action": "执行动作",
  "roles": ["相关角色列表"],
  "edge_cases": ["可能的边缘情况"]
}`,

  GENERATE_TEST_CASES: `你是一个测试工程师，擅长从SOP文档生成测试用例。

根据以下Skill定义，生成多样化的测试用例。

Skill名称：{skill_name}
约束规则：
{constraints}

请生成{count}个测试用例，包括：
- happy-path（正常流程）
- edge-case（边界情况）
- error-case（错误情况）

以JSON数组格式输出：
[{
  "case_id": "hp-001",
  "type": "happy-path",
  "description": "测试描述",
  "input": { "key": "value" },
  "expected": { "result": "expected" },
  "tags": ["tag1"]
}]`,

  IMPROVE_SKILL: `你是一个Skill优化专家。

分析以下Skill定义的不足，并提出改进建议。

Skill定义：
{skill_definition}

检查方面：
1. 完整性 - 是否有遗漏的场景？
2. 清晰性 - 描述是否清晰无歧义？
3. 可执行性 - AI能否准确执行？

以JSON格式输出改进建议：
{
  "gaps": ["不足1", "不足2"],
  "suggestions": ["建议1", "建议2"],
  "clarifications": ["歧义1的澄清"]
}`,
};

const EN_PROMPTS: PromptTemplates = {
  EXTRACT_SEMANTIC: `You are an enterprise process expert, skilled at extracting precise operational specifications from SOP documents.

Analyze the following constraint text, understand its precise meaning, and extract structured information.

Constraint text:
{constraint_text}

Please output in JSON format:
{
  "understood_meaning": "Your understanding of the precise meaning",
  "condition": "Trigger condition (if any)",
  "action": "Execution action",
  "roles": ["List of relevant roles"],
  "edge_cases": ["Possible edge cases"]
}`,

  GENERATE_TEST_CASES: `You are a test engineer skilled at generating test cases from SOP documents.

Based on the following Skill definition, generate diverse test cases.

Skill name: {skill_name}
Constraint rules:
{constraints}

Please generate {count} test cases, including:
- happy-path (normal flow)
- edge-case (boundary conditions)
- error-case (error scenarios)

Output in JSON array format:
[{
  "case_id": "hp-001",
  "type": "happy-path",
  "description": "Test description",
  "input": { "key": "value" },
  "expected": { "result": "expected" },
  "tags": ["tag1"]
}]`,

  IMPROVE_SKILL: `You are a Skill optimization expert.

Analyze the deficiencies in the following Skill definition and propose improvement suggestions.

Skill definition:
{skill_definition}

Check aspects:
1. Completeness - Are there any missing scenarios?
2. Clarity - Is the description clear and unambiguous?
3. Executability - Can AI execute it accurately?

Output improvement suggestions in JSON format:
{
  "gaps": ["Gap 1", "Gap 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "clarifications": ["Clarification of ambiguity 1"]
}`,
};

export function getPrompt(lang: Language): PromptTemplates {
  return lang === 'zh' ? ZH_PROMPTS : EN_PROMPTS;
}

export function renderPrompt(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// 保留向后兼容的默认导出
export default ZH_PROMPTS;
```

**Step 2: 更新 enhancer.ts 使用 i18n**

```typescript
// src/llm/enhancer.ts
import type { ExtractedData } from '../types/index.js';
import { getPrompt, renderPrompt, type Language } from './prompts.js';

export interface LLMConfig {
  apiUrl: string;
  model: string;
  apiKey?: string;
}

export interface EnhancementResult {
  semantic_constraints?: Array<{
    original_constraint: string;
    understood_meaning: string;
    condition?: string;
    action?: string;
  }>;
}

export interface LLMOptions {
  apiUrl: string;
  model: string;
  language?: Language;
}

export async function enhanceWithLLM(
  data: ExtractedData,
  options: LLMOptions
): Promise<{ enhanced_data: ExtractedData; suggestions: any[]; warnings: any[]; model: string; processing_time_ms: number }> {
  const lang = options.language || 'zh';
  const prompts = getPrompt(lang);
  
  // TODO: 实际调用 LLM API
  // const response = await callLLM(prompts.EXTRACT_SEMANTIC, data);
  
  return {
    enhanced_data: data,
    suggestions: [],
    warnings: [],
    model: options.model,
    processing_time_ms: 0,
  };
}
```

**Step 3: 提交**

```bash
git add src/llm/prompts.ts src/llm/enhancer.ts
git commit -m "feat: add i18n support for LLM prompts"
```

---

## Task 7: 补充测试覆盖

**Files:**
- Modify: `src/extractor/extractor.test.ts` — 添加更多测试
- Create: `src/generator/generator.test.ts` — 生成器测试
- Create: `src/validator/validator.test.ts` — 验证器测试

**Step 1: 创建 generator.test.ts**

```typescript
// src/generator/generator.test.ts
import { describe, it, expect } from 'vitest';
import { generateSkillPackage } from './generator/skill-package.js';
import { generateSkillMarkdown } from './generator/skill-md.js';
import type { ExtractedData } from './types/index.js';

describe('Skill Package Generation', () => {
  const mockExtracted: ExtractedData = {
    constraints: [
      { id: 'C001', level: 'MUST', description: 'Must verify data', roles: ['DMC'], confidence: 0.9 },
      { id: 'C002', level: 'SHOULD', description: 'Should review weekly', roles: ['QA'], confidence: 0.85 },
    ],
    decisions: [
      {
        id: 'D001',
        name: 'Test Decision',
        inputVars: ['error_rate'],
        outputVars: ['action'],
        rules: [{ condition: 'error_rate > 5', output: { action: 'report' } }],
      },
    ],
    parameters: [],
    sources: [{ type: 'sop', fileName: 'test SOP' }],
    roles: { dmc: { description: 'Data Monitor', mentions: 1, source: 'sop' } },
    subjective_judgments: [],
    ambiguity_notes: [],
  };

  it('should generate valid skill package', async () => {
    const result = await generateSkillPackage(mockExtracted, 'Test Skill', {
      sourceFile: 'test.md',
    });

    expect(result.schema.meta.name).toBe('Test Skill');
    expect(result.schema.meta.version).toBe('1.0.0');
    expect(result.schema.triggers).toBeDefined();
    expect(result.schema.steps).toBeDefined();
    expect(result.schema.constraints).toHaveLength(2);
  });

  it('should generate markdown documentation', async () => {
    const result = await generateSkillPackage(mockExtracted, 'Test Skill', {
      sourceFile: 'test.md',
    });

    const md = generateSkillMarkdown(result.schema);
    
    expect(md).toContain('# Test Skill');
    expect(md).toContain('## 概述');
    expect(md).toContain('## 触发条件');
    expect(md).toContain('## 执行步骤');
    expect(md).toContain('## 约束规则');
  });

  it('should have correct constraint levels', async () => {
    const result = await generateSkillPackage(mockExtracted, 'Test Skill', {
      sourceFile: 'test.md',
    });

    const must = result.schema.constraints.filter(c => c.level === 'MUST');
    const should = result.schema.constraints.filter(c => c.level === 'SHOULD');
    
    expect(must).toHaveLength(1);
    expect(should).toHaveLength(1);
  });
});
```

**Step 2: 创建 validator.test.ts**

```typescript
// src/validator/validator.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { validateSkillPackage } from './validator/index.js';

describe('Skill Package Validation', () => {
  const testDir = path.join(process.cwd(), 'test-output');
  
  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  it('should fail for missing directory', async () => {
    const result = await validateSkillPackage('/non/existent/path');
    expect(result.valid).toBe(false);
    expect(result.issues[0].type).toBe('missing_directory');
  });

  it('should report missing required files', async () => {
    await fs.mkdir(path.join(testDir, 'empty'), { recursive: true });
    const result = await validateSkillPackage(path.join(testDir, 'empty'));
    
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.type === 'missing_file')).toBe(true);
  });

  it('should validate a complete package', async () => {
    const pkgDir = path.join(testDir, 'valid-pkg');
    await fs.mkdir(pkgDir, { recursive: true });
    
    const schema = {
      meta: { name: 'Test', version: '1.0.0', description: 'Test skill' },
      triggers: [{ type: 'execution' }],
      steps: [{ id: 'STEP-001', name: 'Step 1', description: 'Test step', action: 'test' }],
      constraints: [],
    };
    
    await fs.writeFile(path.join(pkgDir, 'SKILL.md'), '# Test\n');
    await fs.writeFile(path.join(pkgDir, 'skill.schema.json'), JSON.stringify({ schema, manifest: { format_version: '1.0.0', generated_at: new Date().toISOString(), generator: 'test' } }));
    await fs.writeFile(path.join(pkgDir, 'skill.manifest.yaml'), 'format_version: 1.0.0\ngenerated_at: 2024-01-01T00:00:00Z\ngenerator: test');
    
    const result = await validateSkillPackage(pkgDir);
    expect(result.valid).toBe(true);
  });
});
```

**Step 3: 运行所有测试**

```bash
npm test -- --run
```

**Step 4: 提交**

```bash
git add src/generator/generator.test.ts src/validator/validator.test.ts
git commit -m "test: add comprehensive test coverage for generator and validator"
```

---

## 执行选项

**Plan complete and saved to `docs/plans/YYYY-MM-DD-sop-to-skill-optimization.md`**

**Two execution options:**

**1. Subagent-Driven (this session)** — I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
