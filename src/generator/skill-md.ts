import type { SkillSchema } from '../types/index.js';

export function generateSkillMarkdown(schema: SkillSchema): string {
  const name = schema.meta.name;
  const version = schema.meta.version;
  const description = schema.meta.description;
  const generatedAt = new Date().toISOString();
  const triggers = schema.triggers;
  const steps = schema.steps;
  const constraints = schema.constraints;

  let md = `# ${name}\n\n`;
  md += `**Version**: ${version}\n`;
  md += `**Generated**: ${generatedAt.split('T')[0]}\n`;
  md += '\n---\n\n';

  md += `## 概述\n\n`;
  md += `${description || `${name} 是一个标准操作流程 Skill。`}\n\n`;

  md += `## 触发条件\n\n`;
  md += `| 类型 | 名称 | 描述 |\n|------|------|------|\n`;
  for (const trigger of triggers) {
    md += `| ${trigger.type} | ${trigger.name || '-'} | ${trigger.description || '-'} |\n`;
  }
  md += '\n';

  if (steps.length > 0) {
    md += `## 执行步骤\n\n`;
    for (let i = 0; i < steps.length; i++) {
      md += `### Step ${i + 1}: ${steps[i].name}\n\n${steps[i].description}\n\n`;
    }
  }

  if (constraints.length > 0) {
    md += `## 约束规则\n\n`;
    const byLevel: Record<string, any[]> = { MUST: [], SHOULD: [], MAY: [] };
    for (const c of constraints) byLevel[c.level].push(c);

    for (const [level, items] of Object.entries(byLevel)) {
      if (items.length === 0) continue;
      const label = { MUST: 'MUST（必须遵守）', SHOULD: 'SHOULD（应当遵守）', MAY: 'MAY（可以遵守）' }[level];
      md += `### ${label}\n\n`;
      for (const c of items) md += `- **${c.id}**: ${c.description}\n`;
      md += '\n';
    }
  }

  return md;
}