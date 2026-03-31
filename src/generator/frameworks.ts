import type { Constraint, Decision, BoundaryParameter } from '../types/index.js';

export const SUPPORTED_FRAMEWORKS = [
  'openclaw',
  'opencode',
  'codex',
  'gpts',
  'mcp',
  'claude',
  'langchain',
] as const;

export type Framework = typeof SUPPORTED_FRAMEWORKS[number];

const FRAMEWORK_ALIASES: Record<string, Framework> = {
  'open-claw': 'openclaw',
  'open_code': 'opencode',
  'open-code': 'opencode',
  'openai-codex': 'codex',
};

export interface GeneratedOutput {
  filename: string;
  content: string;
}

export interface MultiFrameworkResult {
  files: GeneratedOutput[];
  skillName: string;
  framework: Framework | 'all';
}

export function getSupportedFrameworks(): Framework[] {
  return [...SUPPORTED_FRAMEWORKS];
}

export function resolveFramework(value: string): Framework | undefined {
  const normalized = value.trim().toLowerCase();
  if ((SUPPORTED_FRAMEWORKS as readonly string[]).includes(normalized)) {
    return normalized as Framework;
  }
  return FRAMEWORK_ALIASES[normalized];
}

export function generateForFramework(
  framework: Framework,
  constraints: Constraint[],
  decisions: Decision[],
  boundaries: Record<string, BoundaryParameter>,
  skillName: string
): GeneratedOutput[] {
  switch (framework) {
    case 'openclaw':
      return generateOpenClaw(constraints, decisions, skillName);
    case 'opencode':
      return generateAgentMarkdown(constraints, decisions, skillName, 'OpenCode', 'opencode.SKILL.md');
    case 'codex':
      return generateAgentMarkdown(constraints, decisions, skillName, 'Codex', 'codex.SKILL.md');
    case 'gpts':
      return generateGPTs(constraints, decisions, skillName);
    case 'mcp':
      return generateMCP(constraints, decisions, skillName);
    case 'claude':
      return generateClaude(constraints, decisions, skillName);
    case 'langchain':
      return generateLangChain(constraints, decisions, boundaries, skillName);
    default:
      return [];
  }
}

function toPascalCase(text: string): string {
  return text.replace(/[^a-zA-Z0-9]+/g, ' ').split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function toCamelCase(text: string): string {
  const pascal = toPascalCase(text);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toSnakeCase(text: string): string {
  return text.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
}

function decisionRuleToStrings(rule: { condition?: string; output?: Record<string, string>; when?: Record<string, string>; then?: Record<string, string> }): { whenStr: string; thenStr: string } {
  const whenEntries = rule.when ? Object.entries(rule.when) : [];
  const thenEntries = rule.then ? Object.entries(rule.then) : [];
  const outputEntries = rule.output ? Object.entries(rule.output) : [];

  const whenStr = rule.condition
    ? rule.condition
    : (whenEntries.length > 0 ? whenEntries.map(([k, v]) => `${k}=${v}`).join(', ') : 'true');

  const thenStr = thenEntries.length > 0
    ? thenEntries.map(([k, v]) => `${k}=${v}`).join(', ')
    : (outputEntries.length > 0 ? outputEntries.map(([k, v]) => `${k}=${v}`).join(', ') : 'result=undefined');

  return { whenStr, thenStr };
}

function generateOpenClaw(
  constraints: Constraint[],
  decisions: Decision[],
  skillName: string
): GeneratedOutput[] {
  const lines: string[] = [];

  lines.push(`# ${skillName}`);
  lines.push('');
  lines.push('**Meta-Skill**: 自动从 SOP 文档生成的可执行 Skill。');
  lines.push('');
  lines.push('## Triggers');
  lines.push('');
  lines.push('触发条件:');
  lines.push('- 收到执行请求');

  for (const c of constraints) {
    if (c.condition) {
      lines.push(`- ${c.condition}`);
    }
  }

  for (const d of decisions) {
    lines.push(`- 当 ${d.inputVars.join(', ')} 已知时`);
  }

  lines.push('');
  lines.push('## Steps');
  lines.push('');
  lines.push('执行步骤:');
  lines.push('1. 验证约束条件');

  let stepNum = 2;
  for (const c of constraints.slice(0, 3)) {
    if (c.action) {
      lines.push(`${stepNum}. 执行: ${c.action}`);
      stepNum++;
    }
  }

  if (decisions.length > 0) {
    lines.push(`${stepNum}. 根据决策表确定结果`);
    for (const d of decisions) {
      lines.push(`   - 决策表: ${d.name}`);
    }
  }

  lines.push('');
  lines.push('## Constraints / 约束');
  lines.push('');

  const musts = constraints.filter(c => c.level === 'MUST');
  const shoulds = constraints.filter(c => c.level === 'SHOULD');
  const mays = constraints.filter(c => c.level === 'MAY');

  if (musts.length > 0) {
    lines.push('### Must (必须)');
    for (const c of musts) {
      lines.push(`- **${c.id}**: ${c.description}`);
      if (c.condition) lines.push(`  - 条件: ${c.condition}`);
      if (c.action) lines.push(`  - 操作: ${c.action}`);
    }
    lines.push('');
  }

  if (shoulds.length > 0) {
    lines.push('### Should (应当)');
    for (const c of shoulds) {
      lines.push(`- **${c.id}**: ${c.description}`);
    }
    lines.push('');
  }

  if (mays.length > 0) {
    lines.push('### May (可以)');
    for (const c of mays) {
      lines.push(`- **${c.id}**: ${c.description}`);
    }
  }

  return [{ filename: 'SKILL.md', content: lines.join('\n') }];
}

function generateAgentMarkdown(
  constraints: Constraint[],
  decisions: Decision[],
  skillName: string,
  agentName: string,
  filename: string
): GeneratedOutput[] {
  const lines: string[] = [];
  lines.push(`# ${skillName}`);
  lines.push('');
  lines.push(`Generated policy and execution guidance for ${agentName}.`);
  lines.push('');
  lines.push('## Execution Contract');
  lines.push('- Follow MUST constraints first.');
  lines.push('- Use decision tables when input variables are available.');
  lines.push('- Return explicit reason when validation fails.');
  lines.push('');

  lines.push('## Constraints');
  for (const c of constraints) {
    lines.push(`- [${c.level}] ${c.id}: ${c.description}`);
    if (c.condition) lines.push(`  - Condition: ${c.condition}`);
    if (c.action) lines.push(`  - Action: ${c.action}`);
  }
  if (constraints.length === 0) {
    lines.push('- No explicit constraints extracted from source.');
  }
  lines.push('');

  lines.push('## Decisions');
  for (const d of decisions) {
    lines.push(`- ${d.id}: ${d.name}`);
    lines.push(`  - Inputs: ${d.inputVars.join(', ') || 'N/A'}`);
    lines.push(`  - Outputs: ${d.outputVars.join(', ') || 'N/A'}`);
  }
  if (decisions.length === 0) {
    lines.push('- No explicit decisions extracted from source.');
  }

  return [{ filename, content: lines.join('\n') }];
}

function generateGPTs(
  constraints: Constraint[],
  decisions: Decision[],
  skillName: string
): GeneratedOutput[] {
  const lines: string[] = [];

  lines.push(`You are ${skillName}, an AI assistant that helps with business operations.`);
  lines.push('');
  lines.push('## Role');
  lines.push(`You are a specialized assistant trained to handle ${skillName} tasks following standardized procedures.`);
  lines.push('');
  lines.push('## Core Capabilities');
  lines.push('- Process requests according to established rules');
  lines.push('- Make decisions based on decision tables');
  lines.push('- Validate inputs against constraints');
  lines.push('- Provide clear explanations for decisions');

  if (constraints.length > 0) {
    lines.push('');
    lines.push('## Rules (规则)');
    for (const c of constraints) {
      const levelWord = c.level === 'MUST' ? '必须 (MUST)' : c.level === 'SHOULD' ? '应当 (SHOULD)' : '可以 (MAY)';
      lines.push(`\n### ${levelWord}`);
      lines.push(`- ${c.description}`);
      if (c.condition) lines.push(`  - 当满足条件: ${c.condition}`);
      if (c.action) lines.push(`  - 执行操作: ${c.action}`);
    }
  }

  if (decisions.length > 0) {
    lines.push('\n## Decision Tables (决策表)');
    for (const d of decisions) {
      lines.push(`\n### ${d.name}`);
      lines.push(`**输入**: ${d.inputVars.join(', ')}`);
      lines.push(`**输出**: ${d.outputVars.join(', ')}`);
      lines.push('\n**规则:**');
      for (const rule of d.rules) {
        const { whenStr, thenStr } = decisionRuleToStrings(rule);
        lines.push(`- 当 [${whenStr}] → 则 [${thenStr}]`);
      }
    }
  }

  lines.push('\n## Instructions for Use');
  lines.push('');
  lines.push('1. When asked to process a request, first identify the relevant constraints');
  lines.push('2. Check if the input meets all MUST constraints before proceeding');
  lines.push('3. Use decision tables to determine the appropriate response');
  lines.push('4. If a constraint is violated, explain which constraint and why');
  lines.push('5. Provide clear reasoning for any decisions made');

  const actions: Record<string, unknown>[] = [];
  for (const c of constraints) {
    if (c.action) {
      actions.push({
        name: toCamelCase(`${c.id}_${c.action}`),
        description: c.description,
        parameters: {
          type: 'object',
          properties: {
            input_data: { type: 'object', description: `输入数据，用于检查约束 ${c.id}` },
            context: { type: 'object', description: '执行上下文，包含角色等信息' },
          },
          required: ['input_data'],
        },
      });
    }
  }

  return [
    { filename: 'gpts_instructions.md', content: lines.join('\n') },
    { filename: 'gpts_actions.json', content: JSON.stringify({ actions }, null, 2) },
  ];
}

function generateMCP(
  constraints: Constraint[],
  decisions: Decision[],
  skillName: string
): GeneratedOutput[] {
  const tools: Record<string, unknown>[] = [];

  for (const c of constraints) {
    const properties: Record<string, unknown> = {
      input_data: { type: 'object', description: '待检查的输入数据' },
    };
    const required = ['input_data'];

    if (c.condition) {
      properties['condition'] = { type: 'string', description: `条件: ${c.condition}` };
    }

    tools.push({
      name: `check_${c.id}`,
      description: `[${c.level}] ${c.description}`,
      inputSchema: {
        type: 'object',
        properties,
        required,
      },
    });
  }

  for (const d of decisions) {
    const properties: Record<string, unknown> = {};
    for (const v of d.inputVars) {
      properties[v] = { type: 'string', description: `输入: ${v}` };
    }

    tools.push({
      name: `decide_${d.id}`,
      description: `决策表: ${d.name} - 输入(${d.inputVars.join(', ')}) → 输出(${d.outputVars.join(', ')})`,
      inputSchema: {
        type: 'object',
        properties,
        required: d.inputVars,
      },
    });
  }

  if (constraints.length > 0) {
    tools.push({
      name: 'validate_all',
      description: '验证输入是否满足所有约束条件',
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'object', description: '待验证的完整数据' },
        },
        required: ['data'],
      },
    });
  }

  const constraintCount = constraints.length;
  const decisionCount = decisions.length;
  tools.push({
    name: 'get_help',
    description: `获取 ${skillName} 的帮助信息，包含 ${constraintCount} 个约束规则和 ${decisionCount} 个决策表`,
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '帮助主题 (可选: rules, decisions, boundaries)' },
      },
    },
  });

  return [{ filename: 'mcp_tools.json', content: JSON.stringify({ tools }, null, 2) }];
}

function generateClaude(
  constraints: Constraint[],
  decisions: Decision[],
  skillName: string
): GeneratedOutput[] {
  const tools: Record<string, unknown>[] = [];

  for (const c of constraints) {
    const properties: Record<string, unknown> = {
      input_data: { type: 'object', description: '待检查的输入数据' },
    };
    const required = ['input_data'];

    if (c.condition) {
      properties['condition'] = { type: 'string', description: `条件: ${c.condition}` };
    }

    tools.push({
      name: `check_${c.id}`,
      description: `[${c.level}] ${c.description}`,
      input_schema: {
        type: 'object',
        properties,
        required,
      },
    });
  }

  for (const d of decisions) {
    const properties: Record<string, unknown> = {};
    for (const v of d.inputVars) {
      properties[v] = { type: 'string', description: `输入: ${v}` };
    }

    tools.push({
      name: `decide_${d.id}`,
      description: `决策表: ${d.name} - 输入(${d.inputVars.join(', ')}) → 输出(${d.outputVars.join(', ')})`,
      input_schema: {
        type: 'object',
        properties,
        required: d.inputVars,
      },
    });
  }

  if (constraints.length > 0) {
    tools.push({
      name: 'validate_all_constraints',
      description: '验证输入是否满足所有约束条件',
      input_schema: {
        type: 'object',
        properties: {
          data: { type: 'object', description: '待验证的完整数据' },
        },
        required: ['data'],
      },
    });
  }

  const constraintCount = constraints.length;
  const decisionCount = decisions.length;
  tools.push({
    name: 'get_skill_info',
    description: `获取 ${skillName} 的帮助信息和规则说明，包含 ${constraintCount} 个约束规则和 ${decisionCount} 个决策表`,
    input_schema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '帮助主题 (可选: rules, decisions, boundaries)' },
      },
    },
  });

  return [{ filename: 'claude_tools.json', content: JSON.stringify(tools, null, 2) }];
}

function generateLangChain(
  constraints: Constraint[],
  decisions: Decision[],
  boundaries: Record<string, BoundaryParameter>,
  skillName: string
): GeneratedOutput[] {
  const tools: Record<string, unknown>[] = [];

  for (const c of constraints) {
    const descriptionParts = [`[${c.level}] ${c.description}`];
    if (c.condition) descriptionParts.push(`条件: ${c.condition}`);
    if (c.action) descriptionParts.push(`操作: ${c.action}`);
    if (c.roles.length > 0) descriptionParts.push(`适用角色: ${c.roles.join(', ')}`);

    tools.push({
      name: `check_${c.id}`,
      description: descriptionParts.join(' | '),
      parameters: {
        type: 'object',
        properties: {
          input_data: { type: 'object', description: '待检查的输入数据' },
          context: { type: 'object', description: '执行上下文，包含角色等信息', default: {} },
        },
        required: ['input_data'],
      },
    });
  }

  for (const d of decisions) {
    const properties: Record<string, unknown> = {};
    for (const v of d.inputVars) {
      properties[v] = { type: 'string', description: `决策输入: ${v}` };
    }
    properties['_rules'] = { type: 'array', description: '决策规则 (可选, 如果不提供则使用默认规则)' };

    const rulesData = d.rules.map((r) => ({
      condition: r.condition || decisionRuleToStrings(r).whenStr,
      output: r.output || r.then || {},
    }));

    tools.push({
      name: `decide_${d.id}`,
      description: `决策表: ${d.name} | 输入: ${d.inputVars.join(', ')} | 输出: ${d.outputVars.join(', ')}`,
      parameters: {
        type: 'object',
        properties,
        required: d.inputVars,
        _default_rules: rulesData,
      },
    });
  }

  const pydanticModels: string[] = [];
  pydanticModels.push('from pydantic import BaseModel, Field');
  pydanticModels.push('from typing import Optional, List, Dict, Any');
  pydanticModels.push('');
  pydanticModels.push('# Auto-generated models from SOP rules');
  pydanticModels.push('');

  for (const d of decisions) {
    const modelName = toPascalCase(d.id);
    pydanticModels.push(`class ${modelName}Input(BaseModel):`);
    for (const v of d.inputVars) {
      pydanticModels.push(`    ${v}: str = Field(description="${v}")`);
    }
    pydanticModels.push('');
    pydanticModels.push(`class ${modelName}Output(BaseModel):`);
    for (const v of d.outputVars) {
      pydanticModels.push(`    ${v}: str = Field(description="${v}")`);
    }
    pydanticModels.push('');
    pydanticModels.push(`class ${modelName}Decision:`);
    pydanticModels.push(`    """决策表: ${d.name}"""`);
    pydanticModels.push('    """');
    pydanticModels.push(`    决策表: ${d.name}`);
    pydanticModels.push('    规则:');
    for (const rule of d.rules) {
      const { whenStr, thenStr } = decisionRuleToStrings(rule);
      pydanticModels.push(`      当 ${whenStr} → 则 ${thenStr}`);
    }
    pydanticModels.push('    """');
    pydanticModels.push('');
    pydanticModels.push(`    @staticmethod`);
    pydanticModels.push(`    def decide(input_data: ${modelName}Input) -> ${modelName}Output:`);
    pydanticModels.push('        """根据输入数据返回决策结果"""');
    pydanticModels.push('        pass');
    pydanticModels.push('');
  }

  if (Object.keys(boundaries).length > 0) {
    pydanticModels.push('class BoundaryParameters(BaseModel):');
    for (const [name, param] of Object.entries(boundaries)) {
      const fieldName = toSnakeCase(name);
      pydanticModels.push(`    ${fieldName}: Optional[float] = Field(None, description="${param.name}")`);
    }
  }

  return [
    { filename: 'langchain_tools.json', content: JSON.stringify({ tools, skillName, metadata: { constraint_count: constraints.length, decision_count: decisions.length, boundary_count: Object.keys(boundaries).length } }, null, 2) },
    { filename: 'langchain_models.py', content: pydanticModels.join('\n') },
  ];
}
