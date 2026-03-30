export interface LLMConfig {
  apiUrl: string;
  model: string;
  apiKey?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface SemanticEnhancement {
  original_constraint: string;
  understood_meaning: string;
  condition?: string;
  action?: string;
  roles: string[];
  edge_cases: string[];
}

export interface EnhancementResult {
  semantic_constraints: SemanticEnhancement[];
  improved_descriptions: Record<string, string>;
  identified_gaps: string[];
  suggested_test_cases: Array<{
    description: string;
    type: 'happy-path' | 'edge-case' | 'error-case';
    input: Record<string, any>;
    expected: Record<string, any>;
  }>;
}