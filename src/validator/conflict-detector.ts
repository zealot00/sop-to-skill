import type { Constraint } from '../types/index.js';

export interface Conflict {
  constraintIds: [string, string];
  conflictType: 'contradictory_requirements' | 'numeric_range_conflict';
  description: string;
}

export interface ConflictReport {
  conflicts: Conflict[];
  warnings: string[];
}

function extractNumericValue(text: string): number | null {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*万/,
    /(\d+(?:\.\d+)?)\s*%/,
    /(\d+(?:\.\d+)?)\s*元/,
    /(\d+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let value = parseFloat(match[1]);
      if (pattern.source.includes('万') && !pattern.source.includes('%')) {
        value *= 10000;
      }
      return value;
    }
  }
  return null;
}

function hasConditionOverlap(c1: Constraint, c2: Constraint): boolean {
  if (!c1.condition || !c2.condition) return false;
  
  const cond1 = c1.condition.toLowerCase();
  const cond2 = c2.condition.toLowerCase();
  
  const stopWords = new Set(['当', '任何', '在', '的', '时', 'and', 'or', 'the', 'a', 'an', 'when', 'if']);
  
  const words1 = cond1.split(/\s+/).filter(w => !stopWords.has(w));
  const words2 = cond2.split(/\s+/).filter(w => !stopWords.has(w));
  
  const shared = words1.filter(w => words2.includes(w));
  return shared.length >= 1;
}

function checkContradiction(c1: Constraint, c2: Constraint): string | null {
  const desc1 = c1.description;
  const desc2 = c2.description;

  const val1 = extractNumericValue(desc1);
  const val2 = extractNumericValue(desc2);

  if (val1 !== null && val2 !== null) {
    if (desc1.includes('不得超过') && desc2.includes('不得低于')) {
      if (val1 < val2) {
        return `'上限=${val1}' vs '下限=${val2}' creates impossible range`;
      }
    }
    if (desc2.includes('不得超过') && desc1.includes('不得低于')) {
      if (val2 < val1) {
        return `'上限=${val2}' vs '下限=${val1}' creates impossible range`;
      }
    }
  }

  return null;
}

function checkNumericConflict(c1: Constraint, c2: Constraint): string | null {
  if (!hasConditionOverlap(c1, c2)) return null;

  const val1 = extractNumericValue(c1.description);
  const val2 = extractNumericValue(c2.description);

  if (val1 !== null && val2 !== null) {
    if (c1.description.includes('上限') || c2.description.includes('上限')) {
      if (c1.description.includes('下限') || c2.description.includes('下限')) {
        return 'Conflicting numeric bounds on overlapping conditions';
      }
    }
  }

  return null;
}

export function detectConflicts(constraints: Constraint[]): ConflictReport {
  const report: ConflictReport = { conflicts: [], warnings: [] };

  for (let i = 0; i < constraints.length; i++) {
    const c1 = constraints[i];
    if (c1.level !== 'MUST') continue;

    for (let j = i + 1; j < constraints.length; j++) {
      const c2 = constraints[j];
      if (c2.level !== 'MUST') continue;

      const contradictionDesc = checkContradiction(c1, c2);
      if (contradictionDesc) {
        report.conflicts.push({
          constraintIds: [c1.id, c2.id],
          conflictType: 'contradictory_requirements',
          description: contradictionDesc,
        });
        continue;
      }

      const numericConflict = checkNumericConflict(c1, c2);
      if (numericConflict) {
        report.conflicts.push({
          constraintIds: [c1.id, c2.id],
          conflictType: 'numeric_range_conflict',
          description: numericConflict,
        });
      }
    }
  }

  return report;
}
