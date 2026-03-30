import type { ExtractedData, SkillSchema, TriggerType, Constraint, ConstraintLevel } from '../types/index.js';

export interface GeneratorOptions {
  sourceFile: string;
  framework?: string;
  llmModel?: string;
}

export async function generateSkillPackage(
  extracted: ExtractedData,
  name: string,
  options: GeneratorOptions
): Promise<{ schema: SkillSchema; manifest: any }> {
  const version = '1.0.0';
  const now = new Date().toISOString();

  const schema: SkillSchema = {
    meta: {
      name,
      version,
      description: `Generated from ${options.sourceFile}`,
      source: options.sourceFile,
      generated_at: now,
    },
    triggers: buildTriggers(),
    steps: buildSteps(extracted),
    constraints: extracted.constraints.map((c) => ({
      id: c.id || `constraint_${Math.random().toString(36).substr(2, 9)}`,
      level: (c.level || 'SHOULD') as ConstraintLevel,
      description: c.description,
      condition: c.condition,
      roles: c.roles,
      confidence: c.confidence,
    })) as Constraint[],
    decisions: extracted.decisions as any,
    error_handling: buildErrorHandling(extracted),
  };

  const manifest = {
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

function buildSteps(extracted: ExtractedData) {
  const mustConstraints = extracted.constraints.filter((c) => c.level === 'MUST');
  return mustConstraints.slice(0, 5).map((c, i) => ({
    id: `step_${i + 1}`,
    name: c.condition || `执行约束 ${c.id}`,
    description: c.description,
    action: `validate_${c.id}`,
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
