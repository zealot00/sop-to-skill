import { describe, it, expect } from 'vitest';
import { generateForFramework } from './frameworks.js';
import type { Constraint, Decision, BoundaryParameter } from '../types/index.js';

const mockConstraints: Constraint[] = [
  { id: 'CONST-001', level: 'MUST', description: '数据录入员必须核实数据完整性', roles: ['DMC'], confidence: 0.9 },
  { id: 'CONST-002', level: 'SHOULD', description: '应该在5个工作日内完成审批', condition: '当数据量超过100条时', roles: ['DMC', 'CRA'], confidence: 0.85 },
  { id: 'CONST-003', level: 'MAY', description: '可以申请延期处理', roles: ['CRA'], confidence: 0.7 },
];

const mockDecisions: Decision[] = [
  {
    id: 'DEC-001',
    name: '审批决策',
    inputVars: ['error_rate'],
    outputVars: ['action'],
    rules: [
      { when: { error_rate: '> 5%' }, then: { action: 'reject' }, priority: 1 },
      { when: { error_rate: '<= 5%' }, then: { action: 'approve' }, priority: 2 },
    ],
  },
];

const mockBoundaries: Record<string, BoundaryParameter> = {
  '时间限制_工作日': { name: '时间限制_工作日', maxValue: 5, unit: '工作日', confidence: 0.9 },
  '金额限制': { name: '金额限制', minValue: 10000, maxValue: 50000, unit: '元', confidence: 0.85 },
};

describe('Multi-Framework Generator', () => {
  describe('OpenClaw framework', () => {
    it('should generate SKILL.md for OpenClaw', () => {
      const result = generateForFramework('openclaw', mockConstraints, mockDecisions, mockBoundaries, '测试技能');
      
      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('SKILL.md');
      expect(result[0].content).toContain('# 测试技能');
      expect(result[0].content).toContain('## Triggers');
      expect(result[0].content).toContain('## Steps');
      expect(result[0].content).toContain('## Constraints / 约束');
      expect(result[0].content).toContain('### Must (必须)');
      expect(result[0].content).toContain('CONST-001');
    });
  });

  describe('OpenCode and Codex frameworks', () => {
    it('should generate opencode markdown output', () => {
      const result = generateForFramework('opencode', mockConstraints, mockDecisions, mockBoundaries, '测试技能');

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('opencode.SKILL.md');
      expect(result[0].content).toContain('## Execution Contract');
    });

    it('should generate codex markdown output', () => {
      const result = generateForFramework('codex', mockConstraints, mockDecisions, mockBoundaries, '测试技能');

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('codex.SKILL.md');
      expect(result[0].content).toContain('## Constraints');
    });
  });

  describe('GPTs framework', () => {
    it('should generate gpts_instructions.md and gpts_actions.json', () => {
      const result = generateForFramework('gpts', mockConstraints, mockDecisions, mockBoundaries, '测试技能');
      
      expect(result).toHaveLength(2);
      
      const instructions = result.find(f => f.filename === 'gpts_instructions.md');
      const actions = result.find(f => f.filename === 'gpts_actions.json');
      
      expect(instructions).toBeDefined();
      expect(instructions?.content).toContain('## Role');
      expect(instructions?.content).toContain('## Rules (规则)');
      expect(instructions?.content).toContain('## Decision Tables (决策表)');
      
      expect(actions).toBeDefined();
      const actionsData = JSON.parse(actions?.content || '{}');
      expect(actionsData.actions).toBeDefined();
    });
  });

  describe('MCP framework', () => {
    it('should generate mcp_tools.json', () => {
      const result = generateForFramework('mcp', mockConstraints, mockDecisions, mockBoundaries, '测试技能');
      
      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('mcp_tools.json');
      
      const data = JSON.parse(result[0].content);
      expect(data.tools).toBeDefined();
      expect(data.tools.length).toBeGreaterThan(0);
      expect(data.tools[0]).toHaveProperty('name');
      expect(data.tools[0]).toHaveProperty('description');
      expect(data.tools[0]).toHaveProperty('inputSchema');
    });
  });

  describe('Claude framework', () => {
    it('should generate claude_tools.json', () => {
      const result = generateForFramework('claude', mockConstraints, mockDecisions, mockBoundaries, '测试技能');
      
      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('claude_tools.json');
      
      const data = JSON.parse(result[0].content);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('input_schema');
    });
  });

  describe('LangChain framework', () => {
    it('should generate langchain_tools.json and langchain_models.py', () => {
      const result = generateForFramework('langchain', mockConstraints, mockDecisions, mockBoundaries, '测试技能');
      
      expect(result).toHaveLength(2);
      
      const tools = result.find(f => f.filename === 'langchain_tools.json');
      const models = result.find(f => f.filename === 'langchain_models.py');
      
      expect(tools).toBeDefined();
      const toolsData = JSON.parse(tools?.content || '{}');
      expect(toolsData.tools).toBeDefined();
      expect(toolsData.metadata).toHaveProperty('constraint_count');
      expect(toolsData.metadata).toHaveProperty('boundary_count');
      
      expect(models).toBeDefined();
      expect(models?.content).toContain('from pydantic import BaseModel');
      expect(models?.content).toContain('class DEC001Input');
      expect(models?.content).toContain('class DEC001Output');
    });
  });

  describe('empty inputs', () => {
    it('should handle empty constraints and decisions', () => {
      const result = generateForFramework('openclaw', [], [], {}, '空技能');
      
      expect(result).toHaveLength(1);
      expect(result[0].content).toContain('# 空技能');
    });

    it('should handle empty boundaries', () => {
      const result = generateForFramework('langchain', mockConstraints, mockDecisions, {}, '测试技能');
      
      const models = result.find(f => f.filename === 'langchain_models.py');
      expect(models?.content).not.toContain('class BoundaryParameters');
    });
  });

  describe('constraint level filtering', () => {
    it('should group constraints by level in OpenClaw', () => {
      const result = generateForFramework('openclaw', mockConstraints, [], {}, '测试技能');
      
      expect(result[0].content).toContain('### Must (必须)');
      expect(result[0].content).toContain('### Should (应当)');
      expect(result[0].content).toContain('### May (可以)');
    });
  });

  describe('decision table formatting', () => {
    it('should format decision rules correctly', () => {
      const result = generateForFramework('gpts', [], mockDecisions, {}, '测试技能');
      
      const instructions = result.find(f => f.filename === 'gpts_instructions.md');
      expect(instructions?.content).toContain('error_rate=> 5%');
      expect(instructions?.content).toContain('action=reject');
    });
  });
});
