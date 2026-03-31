export type Language = 'zh' | 'en';

interface PromptTemplates {
  EXTRACT_SEMANTIC: string;
  GENERATE_TEST_CASES: string;
  IMPROVE_SKILL: string;
}

const ZH_PROMPTS: PromptTemplates = {
  EXTRACT_SEMANTIC: `你是一个企业流程专家，擅长从SOP文档中提取精确的操作规范。

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
}`,

  GENERATE_TEST_CASES: `你是一个测试工程师，擅长从SOP文档生成测试用例。

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
}]`,

  IMPROVE_SKILL: `你是一个Skill优化专家。

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
}`,
};

const EN_PROMPTS: PromptTemplates = {
  EXTRACT_SEMANTIC: `You are an enterprise process expert, skilled at extracting precise operational specifications from SOP documents.

Analyze the following constraint text, understand its precise meaning, and extract structured information.

Constraint text:
{constraint_text}

Please output in JSON format:
{
  "understood_meaning": "Your understanding of the precise meaning",
  "condition": "Trigger condition (if any)",
  "action": "Execution action",
  "roles": ["List of relevant roles"],
  "edge_cases": ["Possible edge cases"]
}`,

  GENERATE_TEST_CASES: `You are a test engineer skilled at generating test cases from SOP documents.

Based on the following Skill definition, generate diverse test cases.

Skill name: {skill_name}
Constraint rules:
{constraints}

Please generate {count} test cases, including:
- happy-path (normal flow)
- edge-case (boundary conditions)
- error-case (error scenarios)

Output in JSON array format:
[{
  "case_id": "hp-001",
  "type": "happy-path",
  "description": "Test description",
  "input": { "key": "value" },
  "expected": { "result": "expected" },
  "tags": ["tag1"]
}]`,

  IMPROVE_SKILL: `You are a Skill optimization expert.

Analyze the deficiencies in the following Skill definition and propose improvement suggestions.

Skill definition:
{skill_definition}

Check aspects:
1. Completeness - Are there any missing scenarios?
2. Clarity - Is the description clear and unambiguous?
3. Executability - Can AI execute it accurately?

Output improvement suggestions in JSON format:
{
  "gaps": ["Gap 1", "Gap 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "clarifications": ["Clarification of ambiguity 1"]
}`,
};

export function getPrompt(lang: Language): PromptTemplates {
  return lang === 'zh' ? ZH_PROMPTS : EN_PROMPTS;
}

export function renderPrompt(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

export default ZH_PROMPTS;