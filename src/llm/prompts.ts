export const EXTRACT_SEMANTIC_PROMPT = `你是一个企业流程专家，擅长从SOP文档中提取精确的操作规范。

分析以下约束文本，理解其精确含义，并提取结构化信息。

约束文本：
{constraint_text}

请以JSON格式输出：
{
  "understood_meaning": "你理解的精确含义",
  "condition": "触发条件（如果有）",
  "action": "执行动作",
  "roles": ["相关角色列表"],
  "edge_cases": ["可能的边缘情况"]
}`;

export const GENERATE_TEST_CASES_PROMPT = `你是一个测试工程师，擅长从SOP文档生成测试用例。

根据以下Skill定义，生成多样化的测试用例。

Skill名称：{skill_name}
约束规则：
{constraints}

请生成{count}个测试用例，包括：
- happy-path（正常流程）
- edge-case（边界情况）
- error-case（错误情况）

以JSON数组格式输出：
[{
  "case_id": "hp-001",
  "type": "happy-path",
  "description": "测试描述",
  "input": { "key": "value" },
  "expected": { "result": "expected" },
  "tags": ["tag1"]
}]`;

export const IMPROVE_SKILL_PROMPT = `你是一个Skill优化专家。

分析以下Skill定义的不足，并提出改进建议。

Skill定义：
{skill_definition}

检查方面：
1. 完整性 - 是否有遗漏的场景？
2. 清晰性 - 描述是否清晰无歧义？
3. 可执行性 - AI能否准确执行？

以JSON格式输出改进建议：
{
  "gaps": ["不足1", "不足2"],
  "suggestions": ["建议1", "建议2"],
  "clarifications": ["歧义1的澄清"]
}`;