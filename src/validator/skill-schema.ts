import { z } from 'zod';

export const StepInputSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  default: z.any().optional(),
}).strict();

export const StepOutputSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
}).strict();

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
}).strict();

export const ConstraintSchema = z.object({
  id: z.string().regex(/^CONST-[A-Z0-9]+$/),
  level: z.enum(['MUST', 'SHOULD', 'MAY']),
  description: z.string().min(1),
  condition: z.string().optional(),
  action: z.string().optional(),
  validation: z.string().optional(),
  roles: z.array(z.string()).min(1),
  confidence: z.number().min(0).max(1),
}).strict();

export const DecisionRuleSchema = z.object({
  condition: z.string(),
  output: z.record(z.string(), z.any()),
  priority: z.number().optional(),
}).strict();

export const DecisionSchema = z.object({
  id: z.string().regex(/^DEC-[A-Z0-9]+$/),
  name: z.string().min(1),
  inputVars: z.array(z.string()),
  outputVars: z.array(z.string()),
  rules: z.array(DecisionRuleSchema).min(1),
}).strict();

export const ErrorStrategySchema = z.object({
  error_type: z.string().min(1),
  action: z.string().min(1),
  recovery_step: z.string().optional(),
}).strict();

export const ErrorHandlingSchema = z.object({
  strategies: z.array(ErrorStrategySchema).optional(),
  fallback_steps: z.array(z.string()).optional(),
}).strict();

export const TriggerSchema = z.object({
  type: z.enum(['execution', 'query', 'approval', 'event']),
  description: z.string().optional(),
  condition: z.string().optional(),
}).strict();

export const SkillMetaSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1).max(500),
  author: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  icon: z.string().optional(),
}).strict();

export const ManifestSchema = z.object({
  format_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  generated_at: z.string().datetime(),
  generator: z.string(),
  source_sop: z.string().optional(),
  validation_status: z.enum(['pending', 'validated', 'failed']).optional(),
  test_cases_count: z.number().optional(),
}).strict();

export const SkillSchemaSchema = z.object({
  meta: SkillMetaSchema,
  triggers: z.array(TriggerSchema).min(1),
  steps: z.array(StepSchema).min(1),
  constraints: z.array(ConstraintSchema),
  decisions: z.array(DecisionSchema).optional(),
  error_handling: ErrorHandlingSchema.optional(),
}).strict();

export const SkillPackageSchema = z.object({
  schema: SkillSchemaSchema,
  manifest: ManifestSchema,
}).strict();

export type ValidatedSkillPackage = z.infer<typeof SkillPackageSchema>;
