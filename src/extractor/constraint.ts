import type { Constraint, ConstraintLevel } from '../types/index.js';

const CHINESE_MUST_PATTERNS = [
  /必须|应当|需要|不得|严禁|不准|不得超过|不得少于/,
];

const CHINESE_SHOULD_PATTERNS = [
  /建议|推荐|应该|宜|可以考虑|一般应该|通常应当/,
];

const CHINESE_MAY_PATTERNS = [
  /可以|允许|酌情|根据情况|视情况/,
];

export interface ConstraintExtractorOptions {
  confidenceThreshold: number;
}

export function extractConstraints(
  text: string,
  options?: ConstraintExtractorOptions
): Constraint[] {
  const constraints: Constraint[] = [];
  const sentences = text.split(/[。\n]/);

  let counter = 1;

  for (const sentence of sentences) {
    if (sentence.length < 5) continue;

    // Try if-then pattern: 如果...，则...
    const ifThenMatch = sentence.match(/如果(.+?)，则(.+?)$/);
    if (ifThenMatch) {
      const condition = ifThenMatch[1].trim();
      const action = ifThenMatch[2].trim();
      const level = detectLevel(action) || 'MUST';

      constraints.push({
        id: `C${counter.toString().padStart(3, '0')}`,
        level,
        description: `如果 ${condition}，则 ${action}`,
        condition,
        action,
        roles: extractRoles(sentence),
        confidence: 0.9,
      });
      counter++;
      continue;
    }

    // Try standalone constraint keyword
    const level = detectLevel(sentence);
    if (level) {
      constraints.push({
        id: `C${counter.toString().padStart(3, '0')}`,
        level,
        description: sentence.trim(),
        roles: extractRoles(sentence),
        confidence: 0.85,
      });
      counter++;
    }
  }

  return constraints;
}

function detectLevel(text: string): ConstraintLevel | null {
  if (CHINESE_MUST_PATTERNS.some(p => p.test(text))) return 'MUST';
  if (CHINESE_SHOULD_PATTERNS.some(p => p.test(text))) return 'SHOULD';
  if (CHINESE_MAY_PATTERNS.some(p => p.test(text))) return 'MAY';
  return null;
}

const ROLE_PATTERNS = [
  /数据录入员|DMC|QA|DM|数据经理|项目经理|医学监查员|统计师/,
  /质量保证|伦理委员会|总经理|经理|总监|主管|专员/,
  /销售员|采购员|财务|系统管理员|管理员|操作员|审批人/,
];

function extractRoles(text: string): string[] {
  const roles: string[] = [];
  for (const pattern of ROLE_PATTERNS) {
    const match = text.match(pattern);
    if (match && !roles.includes(match[0])) {
      roles.push(match[0]);
    }
  }
  return roles;
}