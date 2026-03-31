import fs from 'fs';
import path from 'path';
import type { RoleDefinition } from './role-patterns.js';

export interface RolePatternSource {
  id: string;
  name: string;
  patterns: string[];
  description?: string;
}

export interface RoleConfig {
  roles: RolePatternSource[];
}

export function loadRoleConfig(configPath?: string): RoleDefinition[] {
  if (!configPath) {
    const defaultPath = path.join(process.cwd(), 'role-config.json');
    if (fs.existsSync(defaultPath)) {
      configPath = defaultPath;
    } else {
      return [];
    }
  }

  if (!fs.existsSync(configPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const config: RoleConfig = JSON.parse(content);
    return config.roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      patterns: role.patterns.map((p: string) => new RegExp(p)),
    }));
  } catch {
    return [];
  }
}

export function detectRolesFromText(text: string): RoleDefinition[] {
  const detectedRoles: RoleDefinition[] = [];
  
  const capitalizedWords = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  const uniqueWords = [...new Set(capitalizedWords)];
  
  const potentialRoles = uniqueWords.filter(word => word.length > 2 && word.length < 30);

  for (const word of potentialRoles.slice(0, 10)) {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z])${escapedWord}(?:[^a-zA-Z]|$)`, 'i');
    const matches = text.match(regex);
    if (matches && matches.length >= 2) {
      detectedRoles.push({
        id: word.toLowerCase().replace(/\s+/g, '_'),
        name: word,
        patterns: [new RegExp(`(?:${escapedWord})`, 'gi')],
        description: `Auto-detected role: ${word}`,
      });
    }
  }

  return detectedRoles;
}

export function saveRoleConfig(roles: RoleDefinition[], configPath: string): void {
  const config: RoleConfig = {
    roles: roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      patterns: role.patterns.map(p => p.source),
    })),
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}
