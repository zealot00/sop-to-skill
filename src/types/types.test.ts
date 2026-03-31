import { describe, it, expect } from 'vitest';
import {
  ConstraintLevel,
  TriggerType,
  TestCaseType,
  Constraint,
  Step,
  Decision,
  SkillSchema,
  TestCase,
} from './index.js';
import { generateSkillPackage } from '../generator/skill-package.js';

describe('Types', () => {
  describe('ConstraintLevel', () => {
    it('should accept valid constraint levels', () => {
      const levels: ConstraintLevel[] = ['MUST', 'SHOULD', 'MAY'];
      expect(levels).toContain('MUST');
      expect(levels).toContain('SHOULD');
      expect(levels).toContain('MAY');
    });
  });

  describe('TriggerType', () => {
    it('should accept valid trigger types', () => {
      const types: TriggerType[] = ['execution', 'query', 'approval', 'event'];
      expect(types).toContain('execution');
      expect(types).toContain('query');
    });
  });

  describe('TestCaseType', () => {
    it('should accept valid test case types', () => {
      const types: TestCaseType[] = ['happy-path', 'edge-case', 'error-case', 'compliance'];
      expect(types).toContain('happy-path');
      expect(types).toContain('edge-case');
    });
  });

  describe('Constraint', () => {
    it('should accept valid constraint objects', () => {
      const constraint: Constraint = {
        id: 'C001',
        level: 'MUST',
        description: 'Must verify data before processing',
        roles: ['operator', 'admin'],
        confidence: 0.95,
      };
      expect(constraint.id).toBe('C001');
      expect(constraint.level).toBe('MUST');
      expect(constraint.roles).toHaveLength(2);
    });

    it('should accept optional fields', () => {
      const constraint: Constraint = {
        id: 'C002',
        level: 'SHOULD',
        description: 'Should log all operations',
        condition: 'when processing',
        roles: ['operator'],
        confidence: 0.8,
      };
      expect(constraint.condition).toBe('when processing');
    });
  });

  describe('Step', () => {
    it('should accept valid step objects', () => {
      const step: Step = {
        id: 'S001',
        name: 'Verify Data',
        description: 'Verify the input data is valid',
        action: 'validate_data',
        next_step_on_success: 'S002',
        next_step_on_failure: 'S003',
      };
      expect(step.id).toBe('S001');
      expect(step.action).toBe('validate_data');
    });

    it('should accept optional input and output', () => {
      const step: Step = {
        id: 'S002',
        name: 'Process Data',
        description: 'Process the verified data',
        action: 'process_data',
        input: [
          { name: 'data', type: 'object', required: true },
        ],
        output: [
          { name: 'result', type: 'object' },
        ],
      };
      expect(step.input).toHaveLength(1);
      expect(step.output).toHaveLength(1);
    });
  });

  describe('Decision', () => {
    it('should accept valid decision objects', () => {
      const decision: Decision = {
        id: 'D001',
        name: 'Approve Request',
        inputVars: ['request_data'],
        outputVars: ['approval_result'],
        rules: [
          {
            condition: 'data.amount < 1000',
            output: { approval_result: 'approved' },
            priority: 1,
          },
        ],
      };
      expect(decision.id).toBe('D001');
      expect(decision.rules).toHaveLength(1);
    });
  });

  describe('SkillSchema', () => {
    it('should accept valid skill schema', () => {
      const schema: SkillSchema = {
        meta: {
          name: 'Data Verification Skill',
          version: '1.0.0',
          description: 'A skill for verifying data',
        },
        triggers: [
          { type: 'execution', description: 'Manual execution trigger' },
        ],
        steps: [
          {
            id: 'S001',
            name: 'Verify Data',
            description: 'Verify input data',
            action: 'verify',
          },
        ],
        constraints: [
          {
            id: 'C001',
            level: 'MUST',
            description: 'Must verify data',
            roles: ['operator'],
            confidence: 0.95,
          },
        ],
      };
      expect(schema.meta.name).toBe('Data Verification Skill');
      expect(schema.steps).toHaveLength(1);
      expect(schema.constraints).toHaveLength(1);
    });
  });

  describe('TestCase', () => {
    it('should accept valid test case objects', () => {
      const testCase: TestCase = {
        case_id: 'T001',
        skill: 'TestSkill',
        description: 'Test with valid input data',
        type: 'happy-path',
        input: { data: { amount: 100 } },
        expected: { success: true },
        tags: ['test'],
      };
      expect(testCase.case_id).toBe('T001');
      expect(testCase.type).toBe('happy-path');
    });
  });

  describe('Schema Consistency', () => {
    it('should generate schema matching SKILL.schema.json structure', async () => {
      const extracted = {
        constraints: [{
          id: 'C001',
          level: 'MUST' as const,
          description: 'Test constraint',
          roles: ['DMC'],
          confidence: 0.9
        }],
        decisions: [],
        parameters: [],
        sources: [],
        roles: {},
        subjective_judgments: [],
        ambiguity_notes: [],
      };

      const result = await generateSkillPackage(extracted, 'Test Skill', {
        sourceFile: 'test.md'
      });

      expect(result).toHaveProperty('schema');
      expect(result).toHaveProperty('manifest');
      
      expect(result.schema).toHaveProperty('meta');
      expect(result.schema).toHaveProperty('triggers');
      expect(result.schema).toHaveProperty('steps');
      expect(result.schema).toHaveProperty('constraints');
      
      expect(result.schema.meta.name).toBe('Test Skill');
      expect(result.schema.meta.version).toBe('1.0.0');
      expect(result.schema.meta.description).toBe('Generated from test.md');
      
      expect(result.schema.constraints).toHaveLength(1);
      expect(result.schema.constraints[0].id).toBe('C001');
      
      expect(result.manifest.format_version).toBe('1.0.0');
      expect(result.manifest.generator).toBe('sop-to-skill');
    });
  });
});