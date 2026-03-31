import type { ExtractedData, SkillSchema, TriggerType, Constraint, ConstraintLevel, Step, Manifest } from '../types/index.js';
import type { GeneratorConfig } from '../config/generator-config.js';

export interface GeneratorOptions {
  sourceFile: string;
  framework?: string;
  llmModel?: string;
  config?: Pick<GeneratorConfig, 'metadata' | 'schema'>;
}

export async function generateSkillPackage(
  extracted: ExtractedData,
  name: string,
  options: GeneratorOptions
): Promise<{ schema: SkillSchema; manifest: Manifest }> {
  const generatorConfig = options.config;
  const version = generatorConfig?.metadata.skillVersion || '1.0.0';
  const now = new Date().toISOString();

  // Output nested structure aligned with SKILL.schema.json
  const schema: SkillSchema = {
    meta: {
      name,
      version,
      description: `Generated from ${options.sourceFile}`,
    },
    triggers: buildTriggers(generatorConfig),
    steps: buildSteps(extracted, generatorConfig),
    constraints: extracted.constraints.map((c, i) => ({
      id: normalizeConstraintId(c.id || `CONST-${String(i + 1).padStart(3, '0')}`),
      level: (c.level || 'SHOULD') as ConstraintLevel,
      description: c.description,
      condition: c.condition,
      action: c.action,
      roles: c.roles.length > 0 ? c.roles : ['unspecified'],
      confidence: c.confidence || generatorConfig?.metadata.defaultConstraintConfidence || 0.85,
    })) as Constraint[],
    decisions: normalizeDecisions(extracted),
    error_handling: buildErrorHandling(extracted),
  };

  const manifest: Manifest = {
    format_version: generatorConfig?.metadata.formatVersion || '1.0.0',
    generated_at: now,
    generator: generatorConfig?.metadata.generatorName || 'sop-to-skill',
    source_sop: options.sourceFile,
  };

  return { schema, manifest };
}

function buildTriggers(config?: Pick<GeneratorConfig, 'schema'>) {
  if (config?.schema.defaultTriggers && config.schema.defaultTriggers.length > 0) {
    return config.schema.defaultTriggers;
  }
  return [{
    type: 'execution' as TriggerType,
    name: 'execute',
    description: 'Execute the skill',
  }];
}

function buildSteps(extracted: ExtractedData, config?: Pick<GeneratorConfig, 'schema'>): Step[] {
  const maxSteps = config?.schema.maxGeneratedSteps || 8;
  const sorted = [...extracted.constraints].sort((a, b) => levelWeight(b.level) - levelWeight(a.level));

  const steps = sorted.slice(0, maxSteps).map((c, i): Step => ({
    id: `STEP-${String(i + 1).padStart(3, '0')}`,
    name: c.condition || `Apply ${c.id}`,
    description: c.description,
    action: c.action || `check_constraint_${normalizeActionToken(c.id)}`,
    condition: c.condition || c.description,
    input: [],
    output: [],
  }));

  if (steps.length > 0) {
    return steps;
  }

  if (extracted.decisions.length > 0) {
    return extracted.decisions.slice(0, maxSteps).map((d, i): Step => ({
      id: `STEP-${String(i + 1).padStart(3, '0')}`,
      name: d.name,
      description: `Resolve decision ${d.id}`,
      action: `resolve_decision_${normalizeActionToken(d.id)}`,
      condition: d.inputVars.length > 0 ? `inputs: ${d.inputVars.join(', ')}` : undefined,
      input: [],
      output: [],
    }));
  }

  return [{
    id: 'STEP-001',
    name: 'Execute skill',
    description: 'Run the generated skill workflow',
    action: 'execute_skill',
    input: [],
    output: [],
  }];
}

function levelWeight(level: ConstraintLevel | undefined): number {
  if (level === 'MUST') return 3;
  if (level === 'SHOULD') return 2;
  if (level === 'MAY') return 1;
  return 0;
}

function normalizeActionToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function buildErrorHandling(extracted: ExtractedData) {
  const strategies: Array<{ error_type: string; action: string; recovery_step?: string }> = [];
  for (const c of extracted.constraints) {
    if (c.level === 'MUST') {
      strategies.push({
        error_type: `constraint_violation:${normalizeConstraintId(c.id)}`,
        action: 'halt',
      });
    }
    if (c.condition && /error|错误|异常/i.test(c.condition)) {
      strategies.push({
        error_type: 'anomaly_detected',
        action: 'notify',
        recovery_step: 'STEP-001',
      });
    }
  }
  return strategies.length > 0 ? { strategies } : undefined;
}

function normalizeConstraintId(id: string): string {
  // Ensure ID matches format CONST-XXX (uppercase, alphanumeric after dash)
  const clean = id.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.startsWith('CONST')) {
    return `CONST-${clean.slice(5) || '001'}`;
  }
  return `CONST-${clean || '001'}`;
}

function normalizeDecisionId(id: string, index: number): string {
  const clean = id.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.startsWith('DEC')) {
    return `DEC-${clean.slice(3) || String(index + 1).padStart(3, '0')}`;
  }
  return `DEC-${clean || String(index + 1).padStart(3, '0')}`;
}

function normalizeDecisions(extracted: ExtractedData) {
  if (!extracted.decisions || extracted.decisions.length === 0) {
    return undefined;
  }

  return extracted.decisions.map((decision, index) => ({
    id: normalizeDecisionId(decision.id, index),
    name: decision.name,
    inputVars: decision.inputVars,
    outputVars: decision.outputVars,
    rules: (decision.rules || []).map((rule) => ({
      condition: normalizeDecisionCondition(rule),
      output: normalizeDecisionOutput(rule),
      priority: rule.priority,
    })),
  })).filter(d => d.rules.length > 0);
}

function normalizeDecisionCondition(rule: { condition?: string; when?: Record<string, string> }): string {
  if (rule.condition) return rule.condition;
  if (rule.when && typeof rule.when === 'object') {
    const parts = Object.entries(rule.when).map(([k, v]) => `${k}=${v}`);
    return parts.length > 0 ? parts.join(', ') : 'true';
  }
  return 'true';
}

function normalizeDecisionOutput(rule: { output?: Record<string, string>; then?: Record<string, string> }): Record<string, string> {
  if (rule.output && typeof rule.output === 'object') return rule.output;
  if (rule.then && typeof rule.then === 'object') return rule.then;
  return { result: 'undefined' };
}
