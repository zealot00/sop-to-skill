export interface RoleDefinition {
  id: string;
  name: string;
  patterns: RegExp[];
  description?: string;
}

export const DEFAULT_ROLE_PATTERNS: RoleDefinition[] = [
  {
    id: 'DMC',
    name: '数据监查员',
    patterns: [/数据监查员|DMC|Data Monitor/],
    description: '数据监查员',
  },
  {
    id: '数据经理',
    name: '数据管理经理',
    patterns: [/数据经理/],
    description: '数据管理经理',
  },
  {
    id: 'QA',
    name: '质量保证人员',
    patterns: [/质量保证|QA|Quality Assurance/],
    description: '质量保证人员',
  },
  {
    id: 'DM',
    name: '数据管理员',
    patterns: [/数据管理员|Data Manager/],
    description: '数据管理员',
  },
  {
    id: '项目经理',
    name: '项目经理',
    patterns: [/项目经理|项目负责人|PI/],
    description: '项目经理',
  },
  {
    id: '医学监查员',
    name: '医学监查员',
    patterns: [/医学监查员|医学监查|医学人员/],
    description: '医学监查员',
  },
  {
    id: '统计师',
    name: '统计分析师',
    patterns: [/统计师|统计人员|生物统计/],
    description: '统计分析师',
  },
  {
    id: '伦理委员会',
    name: '伦理审查委员会',
    patterns: [/伦理委员会|伦理审查/],
    description: '伦理审查委员会',
  },
  {
    id: '系统管理员',
    name: '系统管理员',
    patterns: [/系统管理员|管理员/],
    description: '系统管理员',
  },
  {
    id: '数据录入员',
    name: '数据录入员',
    patterns: [/数据录入员/],
    description: '数据录入员',
  },
  {
    id: '申办方',
    name: '申办方',
    patterns: [/申办方|sponsor|Sponsor/],
    description: '申办方',
  },
  {
    id: 'CRO',
    name: '合同研究组织',
    patterns: [/CRO|合同研究组织/],
    description: '合同研究组织',
  },
];

export function createRolePatterns(customRoles?: RoleDefinition[]): RoleDefinition[] {
  return customRoles || DEFAULT_ROLE_PATTERNS;
}