import { parseMarkdown } from '../parser/markdown.js';
import type { Constraint, Decision } from '../types/index.js';
import { extractConstraints } from './constraint.js';
import { extractDecisions } from './decision.js';
import { extractRoles, type Role } from './role.js';

export { extractConstraints } from './constraint.js';
export { extractDecisions } from './decision.js';
export { extractRoles } from './role.js';

export interface ExtractedSource {
  type: 'sop';
  fileName: string;
}

export interface ExtractorOutput {
  constraints: Constraint[];
  decisions: Decision[];
  parameters: never[];
  sources: ExtractedSource[];
  roles: Record<string, Role>;
  subjective_judgments: never[];
  ambiguity_notes: never[];
}

export function extractFromText(content: string): ExtractorOutput {
  const parsed = parseMarkdown(content);

  const constraints = extractConstraints(parsed.content);
  const decisions = extractDecisions(parsed.content);
  const roles = extractRoles(parsed.content);

  return {
    constraints,
    decisions,
    parameters: [],
    sources: [{
      type: 'sop',
      fileName: parsed.metadata.title || 'unknown',
    }],
    roles,
    subjective_judgments: [],
    ambiguity_notes: [],
  };
}