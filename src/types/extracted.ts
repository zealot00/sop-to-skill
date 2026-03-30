import { Constraint, Decision, Parameter, Source } from './skill-package.js';

export interface ExtractedData {
  constraints: Constraint[];
  decisions: Decision[];
  parameters: Parameter[];
  sources: Source[];
  roles: Record<string, { description: string; mentions: string; source: string }>;
  subjective_judgments: string[];
  ambiguity_notes: string[];
  llm_enhanced?: boolean;
}

export interface ExtractionOptions {
  extractConstraints: boolean;
  extractDecisions: boolean;
  extractRoles: boolean;
  extractBoundaries: boolean;
  confidenceThreshold: number;
}

export interface LLMEnhancement {
  enhanced_data: ExtractedData;
  suggestions: LLMSuggestion[];
  warnings: LLMWarning[];
  model: string;
  processing_time_ms: number;
}

export interface LLMSuggestion {
  type: 'step_improvement' | 'constraint_addition' | 'decision_refinement' | 'error_handling';
  target_id?: string;
  suggestion: string;
  rationale?: string;
}

export interface LLMWarning {
  type: 'ambiguity' | 'inconsistency' | 'missing_info' | 'potential_error';
  location: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}