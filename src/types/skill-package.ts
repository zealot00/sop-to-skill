/**
 * Constraint Level - defines how strictly a constraint must be followed
 */
export type ConstraintLevel = 'MUST' | 'SHOULD' | 'MAY';

/**
 * Trigger Type - defines what kind of event triggers the skill
 */
export type TriggerType = 'execution' | 'query' | 'approval' | 'event';

/**
 * Constraint - a rule or condition that must be satisfied
 */
export interface Constraint {
  id: string;
  level: ConstraintLevel;
  description: string;
  condition?: string;
  action?: string;
  validation?: string;
  roles: string[];
  confidence: number;
}

/**
 * Decision - a decision point with input variables, output variables, and rules
 */
export interface Decision {
  id: string;
  name: string;
  inputVars: string[];
  outputVars: string[];
  rules: DecisionRule[];
}

/**
 * Decision Rule - a single rule within a decision
 */
export interface DecisionRule {
  when: Record<string, string>;
  then: Record<string, string>;
  priority?: number;
}

export interface Parameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  description: string;
  minValue?: number;
  maxValue?: number;
  defaultValue?: any;
  unit?: string;
}

export interface Source {
  type: 'sop' | 'policy' | 'guideline';
  fileName: string;
  section?: string;
  url?: string;
}

/**
 * Step Input - input variables for a step
 */
export interface StepInput {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  default?: unknown;
}

/**
 * Step Output - output variables from a step
 */
export interface StepOutput {
  name: string;
  type: string;
  description?: string;
}

/**
 * Step - a single step in the skill workflow
 * Compatible with SEH engine: id, type, tool_ref, condition
 */
export interface Step {
  id: string;
  name: string;
  description: string;
  type: 'tool' | 'approval' | 'condition';
  tool_ref?: string;
  condition?: string;
  approver_group?: string;
  message?: string;
  input?: StepInput[] | Record<string, unknown>;
  output?: StepOutput[] | Record<string, unknown>;
  on_failure?: string;
}

/**
 * Error Handling - defines how errors should be handled
 */
export interface ErrorHandling {
  rules: ErrorRule[];
  fallback_steps?: string[];
}

export interface ErrorRule {
  condition: string;
  actions: ErrorAction[];
}

export interface ErrorAction {
  type: string;
  description?: string;
  roles?: string[];
}

/**
 * SkillSchema - the main schema defining the skill structure
 * Aligned with SKILL.schema.json: nested structure with meta, triggers, steps, constraints
 */
export interface SkillSchema {
  // Top-level structure (aligned with SKILL.schema.json)
  meta: SkillMeta;
  triggers: Trigger[];
  steps: Step[];
  constraints: Constraint[];
  
  // Optional extended fields
  decisions?: Decision[];
  error_handling?: ErrorHandling;
}

export interface Input {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface OnFailure {
  action: string;
}

export interface SkillMeta {
  name: string;
  version: string;
  description: string;
  source?: string;
  generated_at?: string;
  author?: string;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  icon?: string;
}

export interface Trigger {
  type: TriggerType;
  name?: string;
  description?: string;
  condition?: string;
  input_schema?: Record<string, unknown>;
}

/**
 * SkillPackage - the complete skill package with schema and manifest
 */
export interface SkillPackage {
  schema: SkillSchema;
  manifest: Manifest;
}

export interface Manifest {
  format_version: string;
  generated_at: string;
  generator: string;
  source_sop: string;
  validation_status?: 'pending' | 'validated' | 'failed';
  test_cases_count?: number;
}

/**
 * Package metadata in manifest
 */
export interface ManifestPackage {
  name: string;
  version: string;
  type: 'skill';
}

/**
 * Source information in manifest
 */
export interface ManifestSource {
  type: 'sop';
  file: string;
  parsed_at: string;
}

/**
 * Generation metadata in manifest
 */
export interface ManifestGeneration {
  method: string;
  llm_enhanced: boolean;
  llm_model?: string;
}

/**
 * File entry in manifest
 */
export interface ManifestFile {
  path: string;
  type: 'documentation' | 'schema' | 'manifest' | 'test_cases';
}

/**
 * Quality metrics in manifest
 */
export interface ManifestQuality {
  constraint_confidence_avg: number;
}

/**
 * Extended Manifest structure for skill packages
 */
export interface SkillManifest {
  package: ManifestPackage;
  source: ManifestSource;
  generation: ManifestGeneration;
  files: ManifestFile[];
  quality: ManifestQuality;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}