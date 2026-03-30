import type { ExtractedData, SkillSchema, SkillManifest, SkillPackage as ISkillPackage, TriggerType, Constraint, ConstraintLevel } from '../types/index.js';

export interface GeneratorOptions {
  sourceFile: string;
  framework?: string;
  llmModel?: string;
}

export async function generateSkillPackage(
  extracted: ExtractedData,
  name: string,
  options: GeneratorOptions
): Promise<ISkillPackage> {
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
    triggers: buildTriggers(extracted),
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

  const manifest: SkillManifest = {
    package: {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      version,
      type: 'skill',
    },
    source: { type: 'sop', file: options.sourceFile, parsed_at: now },
    generation: {
      method: 'sop-to-skill v1.0',
      llm_enhanced: extracted.llm_enhanced ?? false,
      llm_model: options.llmModel,
    },
    files: [
      { path: 'SKILL.md', type: 'documentation' },
      { path: 'skill.schema.json', type: 'schema' },
      { path: 'skill.manifest.yaml', type: 'manifest' },
      { path: 'test-cases/', type: 'test_cases' },
    ],
    quality: { constraint_confidence_avg: calculateAvgConfidence(extracted.constraints) },
  };

  return { schema, manifest };
}

function buildTriggers(extracted: ExtractedData) {
  return [{
    type: 'execution' as TriggerType,
    name: 'execute',
    input_schema: { type: 'object', properties: { action: { type: 'string', enum: ['execute', 'query', 'approve'] } }, required: ['action'] },
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

function calculateAvgConfidence(constraints: any[]): number {
  if (constraints.length === 0) return 0;
  return constraints.reduce((acc, c) => acc + (c.confidence || 0), 0) / constraints.length;
}

export async function generateSkillPackage(
  extracted: ExtractedData,
  name: string,
  options: GeneratorOptions
): Promise<ISkillPackage> {
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
    triggers: buildTriggers(extracted),
    steps: buildSteps(extracted),
    constraints: extracted.constraints,
    decisions: extracted.decisions as any,
    error_handling: buildErrorHandling(extracted),
  };

  const manifest: SkillManifest = {
    package: {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      version,
      type: 'skill',
    },
    source: { type: 'sop', file: options.sourceFile, parsed_at: now },
    generation: {
      method: 'sop-to-skill v1.0',
      llm_enhanced: 'llm_enhanced' in extracted ? extracted.llm_enhanced : false,
      llm_model: options.llmModel,
    },
    files: [
      { path: 'SKILL.md', type: 'documentation' },
      { path: 'skill.schema.json', type: 'schema' },
      { path: 'skill.manifest.yaml', type: 'manifest' },
      { path: 'test-cases/', type: 'test_cases' },
    ],
    quality: { constraint_confidence_avg: calculateAvgConfidence(extracted.constraints) },
  };

  return { schema, manifest };
}

function buildTriggers(extracted: ExtractedData) {
  return [{
    type: 'execution',
    name: 'execute',
    input_schema: { type: 'object', properties: { action: { type: 'string', enum: ['execute', 'query', 'approve'] } }, required: ['action'] },
  }];
}

function buildSteps(extracted: ExtractedData) {
  const mustConstraints = extracted.constraints.filter((c: any) => c.level === 'MUST');
  return mustConstraints.slice(0, 5).map((c: any, i: number) => ({
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

function calculateAvgConfidence(constraints: any[]): number {
  if (constraints.length === 0) return 0;
  return constraints.reduce((acc: number, c: any) => acc + (c.confidence || 0), 0) / constraints.length;
}