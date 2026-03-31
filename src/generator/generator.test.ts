import { describe, it, expect } from 'vitest';
import { generateSkillPackage } from './skill-package.js';
import { generateSkillMarkdown } from './skill-md.js';

describe('Skill Package Generation', () => {
  const mockExtracted = {
    constraints: [
      { id: 'C001', level: 'MUST' as const, description: 'Must verify data', roles: ['DMC'], confidence: 0.9 },
      { id: 'C002', level: 'SHOULD' as const, description: 'Should review weekly', roles: ['QA'], confidence: 0.85 },
    ],
    decisions: [
      {
        id: 'D001',
        name: 'Test Decision',
        inputVars: ['error_rate'],
        outputVars: ['action'],
        rules: [{ when: { error_rate: '> 5' }, then: { action: 'report' }, priority: 1 }],
      },
    ],
    parameters: [],
    sources: [{ type: 'sop' as const, fileName: 'test SOP' }],
    roles: { DMC: { name: 'DMC', description: 'Data Monitor', mentions: 1, source: 'sop' } },
    subjective_judgments: [],
    ambiguity_notes: [],
  };

  it('should generate valid skill package', async () => {
    const result = await generateSkillPackage(mockExtracted as any, 'Test Skill', {
      sourceFile: 'test.md',
    });

    expect(result.schema.meta.name).toBe('Test Skill');
    expect(result.schema.meta.version).toBe('1.0.0');
    expect(result.schema.triggers).toBeDefined();
    expect(result.schema.steps).toBeDefined();
    expect(result.schema.constraints).toHaveLength(2);
  });

  it('should generate markdown documentation', async () => {
    const result = await generateSkillPackage(mockExtracted as any, 'Test Skill', {
      sourceFile: 'test.md',
    });

    const md = generateSkillMarkdown(result.schema);
    
    expect(md).toContain('# Test Skill');
    expect(md).toContain('## 概述');
    expect(md).toContain('## 触发条件');
    expect(md).toContain('## 执行步骤');
    expect(md).toContain('## 约束规则');
  });

  it('should have correct constraint levels', async () => {
    const result = await generateSkillPackage(mockExtracted as any, 'Test Skill', {
      sourceFile: 'test.md',
    });

    const must = result.schema.constraints.filter(c => c.level === 'MUST');
    const should = result.schema.constraints.filter(c => c.level === 'SHOULD');
    
    expect(must).toHaveLength(1);
    expect(should).toHaveLength(1);
  });
});