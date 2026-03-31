export interface RoleDefinition {
  id: string;
  name: string;
  patterns: RegExp[];
  description?: string;
}

export const DEFAULT_ROLE_PATTERNS: RoleDefinition[] = [];

export function createRolePatterns(customRoles?: RoleDefinition[]): RoleDefinition[] {
  return customRoles || DEFAULT_ROLE_PATTERNS;
}