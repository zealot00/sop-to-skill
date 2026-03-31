import { createRolePatterns, type RoleDefinition } from './role-patterns.js';

export interface Role {
  name: string;
  description: string;
  mentions: number;
  source: string;
}

export interface RoleExtractorOptions {
  roles?: RoleDefinition[];
}

export function extractRoles(text: string, options?: RoleExtractorOptions): Record<string, Role> {
  const roleDefs = createRolePatterns(options?.roles);
  const roles: Record<string, Role> = {};

  for (const roleDef of roleDefs) {
    let count = 0;
    for (const pattern of roleDef.patterns) {
      const globalPattern = pattern.global ? pattern : new RegExp(pattern.source, pattern.flags + 'g');
      const matches = text.match(globalPattern);
      if (matches) {
        count += matches.length;
      }
    }
    if (count > 0) {
      roles[roleDef.id] = {
        name: roleDef.id,
        description: roleDef.description || roleDef.name,
        mentions: count,
        source: 'sop',
      };
    }
  }

  return roles;
}

export function extractRolesWithCount(
  text: string, 
  options?: RoleExtractorOptions
): Record<string, Role> {
  return extractRoles(text, options);
}