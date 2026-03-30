/**
 * Extracted Result Types - results from extracting data from SOP documents
 */

/**
 * Raw extracted content from an SOP document
 */
export interface ExtractedContent {
  raw_text: string;
  markdown?: string;
  sections: ExtractedSection[];
  metadata: ExtractedMetadata;
}

export interface ExtractedSection {
  id: string;
  title: string;
  level: number;
  content: string;
  subsections?: ExtractedSection[];
}

export interface ExtractedMetadata {
  source_file: string;
  source_type: 'markdown' | 'docx' | 'pdf' | 'html';
  extracted_at: string;
  page_count?: number;
  word_count?: number;
}

/**
 * Structured data extracted from SOP
 */
export interface ExtractedData {
  steps: ExtractedStep[];
  constraints: ExtractedConstraint[];
  decisions: ExtractedDecision[];
  roles: string[];
  tools: string[];
  metadata: Record<string, unknown>;
  llm_enhanced?: boolean;
}

export interface ExtractedStep {
  id?: string;
  order: number;
  name: string;
  description: string;
  action?: string;
  condition?: string;
  input_steps?: string[];
  output_steps?: string[];
  next_on_success?: string;
  next_on_failure?: string;
  confidence: number;
  raw_text?: string;
}

export interface ExtractedConstraint {
  id: string;
  level?: 'MUST' | 'SHOULD' | 'MAY';
  description: string;
  condition?: string;
  roles: string[];
  confidence: number;
  raw_text?: string;
}

export interface ExtractedDecision {
  id?: string;
  name: string;
  description: string;
  options?: string[];
  default_option?: string;
  rules?: ExtractedDecisionRule[];
  confidence: number;
  raw_text?: string;
}

export interface ExtractedDecisionRule {
  condition: string;
  option: string;
  priority?: number;
}

/**
 * Enhancement result from LLM processing
 */
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

/**
 * Extraction options
 */
export interface ExtractionOptions {
  include_raw_text?: boolean;
  include_confidence_scores?: boolean;
  extract_decisions?: boolean;
  extract_constraints?: boolean;
  language?: string;
}