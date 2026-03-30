import type { LLMConfig } from './types.js';
import type { TestCase, Constraint } from '../types/index.js';
import { GENERATE_TEST_CASES_PROMPT } from './prompts.js';

export interface TestCaseGeneratorOptions {
  minCases: number;
  maxCases: number;
  types: Array<'happy-path' | 'edge-case' | 'error-case' | 'compliance'>;
}

interface LLMChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export async function generateTestCases(
  constraints: Constraint[],
  skillName: string,
  config: LLMConfig,
  options: Partial<TestCaseGeneratorOptions> = {}
): Promise<TestCase[]> {
  const { maxCases = 20 } = options;

  const constraintsText = constraints.map(c => `[${c.level}] ${c.description}`).join('\n');

  const prompt = GENERATE_TEST_CASES_PROMPT
    .replace('{skill_name}', skillName)
    .replace('{constraints}', constraintsText)
    .replace('{count}', maxCases.toString());

  const response = await fetch(config.apiUrl + '/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: 'You are a test engineer. Output valid JSON array only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json() as LLMChatResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return [];
  }

  try {
    const cases = JSON.parse(content);
    return cases.map((c: any, i: number) => ({
      ...c,
      case_id: c.case_id || `auto-${i.toString().padStart(3, '0')}`,
      skill: skillName,
    }));
  } catch {
    return [];
  }
}