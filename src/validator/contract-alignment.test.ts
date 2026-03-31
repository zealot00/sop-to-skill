import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  DecisionRuleSchema,
  ErrorHandlingSchema,
  StepSchema,
} from './skill-schema.js';

function loadSchemaJson() {
  const schemaPath = path.join(process.cwd(), 'SKILL.schema.json');
  const content = fs.readFileSync(schemaPath, 'utf-8');
  return JSON.parse(content) as any;
}

describe('Contract Alignment', () => {
  it('DecisionRule contract should align with SKILL.schema.json', () => {
    const schema = loadSchemaJson();
    const required = schema.definitions.DecisionRule.required;
    expect(required).toEqual(['condition', 'output']);

    const zodKeys = (DecisionRuleSchema.keyof().options as string[]).sort();
    expect(zodKeys).toEqual(['condition', 'output', 'priority']);
  });

  it('ErrorHandling contract should align with SKILL.schema.json', () => {
    const schema = loadSchemaJson();
    const jsonKeys = Object.keys(schema.definitions.ErrorHandling.properties).sort();
    const zodKeys = (ErrorHandlingSchema.keyof().options as string[]).sort();
    expect(jsonKeys).toEqual(zodKeys);
  });

  it('Step schema should not require legacy type field', () => {
    const minimalStep = {
      id: 'STEP-001',
      name: 'Step name',
      description: 'Step description',
      action: 'do_action',
    };
    const parsed = StepSchema.safeParse(minimalStep);
    expect(parsed.success).toBe(true);
  });
});
