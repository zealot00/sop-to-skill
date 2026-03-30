import type { SkillSchema } from '../types/index.js';

export function generateSkillMarkdown(schema: SkillSchema): string {
  const { meta, constraints, steps, triggers } = schema;

  let md = `# ${meta.name}\n\n`;
  md += `**Version**: ${meta.version}\n`;
  md += `**Generated**: ${meta.generated_at || new Date().toISOString().split('T')[0]}\n`;
  if (meta.source) md += `**Source**: ${meta.source}\n`;
  md += '\n---\n\n';

  md += `## 概述\n\n`;
  md += `${meta.description || `${meta.name} 是一个标准操作流程 Skill。`}\n\n`;

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