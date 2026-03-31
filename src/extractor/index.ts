import { parseMarkdown } from '../parser/markdown.js';
import { extractTables } from '../parser/table-parser.js';
import type { Constraint, Decision, BoundaryParameter } from '../types/index.js';
import { extractConstraints } from './constraint.js';
import { extractDecisions } from './decision.js';
import { extractRoles, type Role } from './role.js';
import { BoundaryDetector } from './boundary.js';
import { loadRoleConfig } from './role-config.js';

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
  boundaries: Record<string, BoundaryParameter>;
  subjective_judgments: never[];
  ambiguity_notes: never[];
}

export interface ExtractorOptions {
  language?: 'zh' | 'en';
  confidenceThreshold?: number;
  roleConfigPath?: string;
  enableBoundaryDetection?: boolean;
}

export function extractFromText(content: string, options?: ExtractorOptions): ExtractorOutput {
  const parsed = parseMarkdown(content);

  const constraints = extractConstraints(parsed.content, {
    language: options?.language,
    confidenceThreshold: options?.confidenceThreshold,
  });
  const decisions = extractDecisions(parsed.content);
  const roleDefs = loadRoleConfig(options?.roleConfigPath);
  const roles = extractRoles(parsed.content, { roles: roleDefs });

  let boundaries: Record<string, BoundaryParameter> = {};
  if (options?.enableBoundaryDetection !== false) {
    const boundaryDetector = new BoundaryDetector();
    const textBoundaries = boundaryDetector.detect(parsed.content);
    const tables = extractTables(parsed.content);
    const tableBoundaries: Record<string, BoundaryParameter> = {};
    for (const table of tables) {
      for (const row of table.rows) {
        const rowText = row.join(' ');
        const rowBoundaries = boundaryDetector.detectFromTable(rowText);
        for (const [name, bp] of Object.entries(rowBoundaries)) {
          if (!tableBoundaries[name] || tableBoundaries[name].confidence < bp.confidence) {
            tableBoundaries[name] = bp;
          }
        }
      }
    }
    boundaries = { ...textBoundaries, ...tableBoundaries };
  }

  return {
    constraints,
    decisions,
    parameters: [],
    sources: [{
      type: 'sop',
      fileName: parsed.metadata.title || 'unknown',
    }],
    roles,
    boundaries,
    subjective_judgments: [],
    ambiguity_notes: [],
  };
}
