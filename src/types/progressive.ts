/**
 * Progressive Disclosure Types
 * 
 * Core principle: Agent sees minimal core data, details available on-demand.
 * This enables clean context for AI Agents while preserving full information for humans.
 */

export interface ProgressiveConfig {
  enabled: boolean;
  detailLevel: 'minimal' | 'summary' | 'full';
  generateFullDoc: boolean;
  generateConstraintFiles: boolean;
  constraintDir: string;
}

export const DEFAULT_PROGRESSIVE_CONFIG: ProgressiveConfig = {
  enabled: true,
  detailLevel: 'minimal',
  generateFullDoc: true,
  generateConstraintFiles: true,
  constraintDir: 'constraints',
};

export interface StepCore {
  id: string;
  action: string;
  condition?: string;
  next_step_on_success?: string;
  next_step_on_failure?: string;
}

export interface ConstraintCore {
  id: string;
  level: 'MUST' | 'SHOULD' | 'MAY';
  summary: string;
  semantic?: string;
  source_ref?: string;
}

export interface DecisionCore {
  id: string;
  name: string;
  inputVars: string[];
  outputVars: string[];
  ruleSummary: string;
}

export interface ProgressiveSkill {
  meta: {
    name: string;
    version: string;
    description: string;
  };
  triggers: Array<{
    type: string;
    name?: string;
    description?: string;
  }>;
  steps: StepCore[];
  constraints: ConstraintCore[];
  decisions: DecisionCore[];
  _progressive: {
    enabled: true;
    full_doc_ref: string;
    constraints_ref_prefix: string;
  };
}

export interface ConstraintDetail {
  id: string;
  level: 'MUST' | 'SHOULD' | 'MAY';
  original: string;
  semantic: string;
  condition?: string;
  action?: string;
  roles?: string[];
  source?: {
    file: string;
    section?: string;
    line?: number;
  };
}
