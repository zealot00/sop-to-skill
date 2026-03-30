export interface Role {
  name: string;
  description: string;
  mentions: number;
  source: string;
}

export function extractRoles(text: string): Record<string, Role> {
  const roles: Record<string, Role> = {};

  const ROLE_DEFINITIONS: Record<string, { description: string; patterns: RegExp[] }> = {
    'DMC': {
      description: '数据监查员',
      patterns: [/数据监查员|DMC|Data Monitor/],
    },
    '数据经理': {
      description: '数据管理经理',
      patterns: [/数据经理|Data Manager/],
    },
    'QA': {
      description: '质量保证人员',
      patterns: [/质量保证|QA|Quality Assurance/],
    },
    'DM': {
      description: '数据管理员',
      patterns: [/数据管理员|Data Manager/],
    },
    '项目经理': {
      description: '项目经理',
      patterns: [/项目经理|Project Manager/],
    },
    '医学监查员': {
      description: '医学监查员',
      patterns: [/医学监查员|Medical Monitor/],
    },
    '统计师': {
      description: '统计分析师',
      patterns: [/统计师|Statistician/],
    },
    '伦理委员会': {
      description: '伦理审查委员会',
      patterns: [/伦理委员会|伦理审查/],
    },
    '系统管理员': {
      description: '系统管理员',
      patterns: [/系统管理员|System Administrator/],
    },
  };

  for (const [name, def] of Object.entries(ROLE_DEFINITIONS)) {
    for (const pattern of def.patterns) {
      if (pattern.test(text)) {
        if (!roles[name]) {
          roles[name] = { name, description: def.description, mentions: 0, source: 'sop' };
        }
        roles[name].mentions += (text.match(pattern) || []).length;
      }
    }
  }

  return roles;
}