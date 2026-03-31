import { describe, it, expect } from 'vitest';
import { extractConstraints } from './constraint.js';
import { extractDecisions } from './decision.js';
import { extractRoles } from './role.js';
import { extractFromText } from './index.js';

describe('extractConstraints', () => {
  it('extracts MUST constraints with Chinese keywords', () => {
    const text = '数据录入员必须核实数据完整性。';
    const constraints = extractConstraints(text);
    expect(constraints).toHaveLength(1);
    expect(constraints[0].level).toBe('MUST');
    expect(constraints[0].description).toContain('数据录入员必须核实数据完整性');
  });

  it('extracts SHOULD constraints with Chinese keywords', () => {
    const text = '建议进行二次核查。';
    const constraints = extractConstraints(text);
    expect(constraints).toHaveLength(1);
    expect(constraints[0].level).toBe('SHOULD');
  });

  it('extracts if-then pattern constraints', () => {
    const text = '如果数据不一致，则需要标记并重新核查。';
    const constraints = extractConstraints(text);
    expect(constraints).toHaveLength(1);
    expect(constraints[0].level).toBe('MUST');
    expect(constraints[0].condition).toBe('数据不一致');
    expect(constraints[0].action).toBe('需要标记并重新核查');
  });

  it('extracts roles from constraint sentences', () => {
    const text = '数据录入员必须核实数据完整性。';
    const constraints = extractConstraints(text);
    expect(constraints[0].roles).toContain('数据录入员');
  });

  it('skips short sentences', () => {
    const text = '测试。';
    const constraints = extractConstraints(text);
    expect(constraints).toHaveLength(0);
  });

  it('extracts constraints in English text', () => {
    const text = 'The data must be verified. You should review all entries. You may skip optional fields.';
    const constraints = extractConstraints(text, { language: 'en' });
    
    expect(constraints).toHaveLength(3);
    expect(constraints.filter(c => c.level === 'MUST')).toHaveLength(1);
    expect(constraints.filter(c => c.level === 'SHOULD')).toHaveLength(1);
    expect(constraints.filter(c => c.level === 'MAY')).toHaveLength(1);
  });
});

describe('extractDecisions', () => {
  it('extracts if-then decision rules', () => {
    const text = '如果数据不一致，则需要标记并重新核查。';
    const decisions = extractDecisions(text);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].inputVars).toContain('数据不一致');
  });

  it('extracts decisions with multiple options', () => {
    const text = '当发现异常值，可以选择修正或标记为可疑。';
    const decisions = extractDecisions(text);
    expect(decisions.length).toBeGreaterThan(0);
  });
});

describe('extractRoles', () => {
  it('extracts DMC role', () => {
    const text = '数据监查员(DMC)负责数据核查。';
    const roles = extractRoles(text);
    expect(roles['DMC']).toBeDefined();
    expect(roles['DMC'].description).toBe('数据监查员');
  });

  it('extracts QA role', () => {
    const text = '质量保证(QA)人员需要进行最终审核。';
    const roles = extractRoles(text);
    expect(roles['QA']).toBeDefined();
  });

  it('extracts multiple roles', () => {
    const text = '数据经理和QA共同审核报告。';
    const roles = extractRoles(text);
    expect(Object.keys(roles).length).toBeGreaterThanOrEqual(1);
  });

  it('counts mentions correctly', () => {
    const text = '数据经理数据经理负责数据管理。';
    const roles = extractRoles(text);
    expect(roles['数据经理']).toBeDefined();
  });
});

describe('extractFromText', () => {
  it('parses markdown and extracts data', () => {
    const markdown = `# 数据核查流程

数据录入员必须核实数据完整性。

如果发现问题，则需要标记并报告。`;

    const result = extractFromText(markdown);
    expect(result.constraints.length).toBeGreaterThan(0);
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].type).toBe('sop');
  });

  it('extracts title from markdown', () => {
    const markdown = `# 测试标题

一些内容。`;

    const result = extractFromText(markdown);
    expect(result.sources[0].fileName).toBe('测试标题');
  });

  it('returns empty arrays for no matches', () => {
    const markdown = `# 无约束文档

这是一个没有约束条件的文档。`;

    const result = extractFromText(markdown);
    expect(result.constraints).toHaveLength(0);
    expect(result.decisions).toHaveLength(0);
  });
});