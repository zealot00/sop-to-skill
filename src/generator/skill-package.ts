import type { ExtractedData, SkillSchema, TriggerType, Constraint, ConstraintLevel, Step, Manifest } from '../types/index.js';

export interface GeneratorOptions {
  sourceFile: string;
  framework?: string;
  llmModel?: string;
}

export async function generateSkillPackage(
  extracted: ExtractedData,
  name: string,
  options: GeneratorOptions
): Promise<{ schema: SkillSchema; manifest: Manifest }> {
  const version = '1.0.0';
  const now = new Date().toISOString();

  // Output nested structure aligned with SKILL.schema.json
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
      level: (c.level || 'SHOULD') as ConstraintLevel,
      description: c.description,
      condition: c.condition,
      action: c.action,
      roles: c.roles,
      confidence: c.confidence || 0.85,
    })) as Constraint[],
    decisions: extracted.decisions as any,
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

function buildTriggers() {
  return [{
    type: 'execution' as TriggerType,
    name: 'execute',
    description: 'Execute the skill',
  }];
}

function buildSteps(extracted: ExtractedData): Step[] {
  const mustConstraints = extracted.constraints.filter((c) => c.level === 'MUST');
  return mustConstraints.slice(0, 5).map((c, i): Step => ({
    id: `step_${i + 1}`,
    name: c.condition || `执行约束 ${c.id}`,
    description: c.description,
    type: 'condition',
    condition: c.condition || c.description,
    input: {},
    output: { valid: 'boolean', violations: [] },
    on_failure: i > 0 ? 'abort' : undefined,
  }));
}

function buildErrorHandling(extracted: ExtractedData) {
  const errorRules: any[] = [];
  for (const c of extracted.constraints) {
    if (c.condition?.includes('错误率') || c.condition?.includes('error')) {
      errorRules.push({
        condition: c.condition,
        actions: [{ type: 'notify', description: '报告', roles: c.roles }],
      });
    }
  }
  return { rules: errorRules };
}
