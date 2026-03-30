export const TestCaseType = {
  HAPPY_PATH: 'happy-path',
  EDGE_CASE: 'edge-case',
  ERROR_CASE: 'error-case',
  COMPLIANCE: 'compliance',
} as const;
export type TestCaseType = typeof TestCaseType[keyof typeof TestCaseType];

export interface ExpectedOutput {
  success: boolean;
  outputPattern?: string;
  validationSteps?: string[];
  errorType?: string;
  handling?: string;
  [key: string]: any;
}

export interface Assertion {
  path: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'length_equals' | 'length_gte' | 'length_lte' | 'gte' | 'lte';
  value: any;
}

export interface TestCaseValidation {
  assertions: Assertion[];
}

export interface TestCase {
  case_id: string;
  type: TestCaseType;
  skill: string;
  description: string;
  input: Record<string, any>;
  expected: ExpectedOutput;
  tags: string[];
  validation?: TestCaseValidation;
}

export interface TestCaseManifest {
  dataset_name: string;
  version: string;
  owner: string;
  description: string;
  generated_at: string;
  skill_name: string;
  summary: {
    total_cases: number;
    happy_path: number;
    edge_cases: number;
    error_cases: number;
  };
  case_files: Array<{
    path: string;
    tags: string[];
  }>;
}
