import type { ExtractedData } from '../types/index.js';

export interface LLMConfig {
  apiUrl: string;
  model: string;
  apiKey?: string;
}

export interface EnhancementResult {
  semantic_constraints?: Array<{
    original_constraint: string;
    understood_meaning: string;
    condition?: string;
    action?: string;
  }>;
}

export interface LLMOptions {
  apiUrl: string;
  model: string;
}

interface LLMEnhancement {
  enhanced_data: ExtractedData;
  suggestions: any[];
  warnings: any[];
  model: string;
  processing_time_ms: number;
}

export async function enhanceWithLLM(
  data: ExtractedData,
  _options: LLMOptions
): Promise<LLMEnhancement> {
  return {
    enhanced_data: data,
    suggestions: [],
    warnings: [],
    model: _options.model,
    processing_time_ms: 0,
  };
}