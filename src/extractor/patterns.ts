export interface ConstraintPattern {
  level: 'MUST' | 'SHOULD' | 'MAY';
  patterns: RegExp[];
  languages: ('zh' | 'en')[];
}

export const CONSTRAINT_PATTERNS: ConstraintPattern[] = [
  {
    level: 'MUST',
    languages: ['zh'],
    patterns: [
      /必须|应当|需要|不得|严禁|不准|不得超过|不得少于|强制/,
    ],
  },
  {
    level: 'SHOULD',
    languages: ['zh'],
    patterns: [
      /建议|推荐|应该|宜|可以考虑|一般应该|通常应当|推荐/,
    ],
  },
  {
    level: 'MAY',
    languages: ['zh'],
    patterns: [
      /可以|允许|酌情|根据情况|视情况|可选/,
    ],
  },
  {
    level: 'MUST',
    languages: ['en'],
    patterns: [
      /\bmust\b|\bshall\b|\bhave to\b|\bis required to\b|\bneeds to\b/i,
    ],
  },
  {
    level: 'SHOULD',
    languages: ['en'],
    patterns: [
      /\bshould\b|\bought to\b|\brecommend\b|\bits recommended\b/i,
    ],
  },
  {
    level: 'MAY',
    languages: ['en'],
    patterns: [
      /\bmay\b|\bmight\b|\bcan\b|\bcould\b|\boptional\b/i,
    ],
  },
];

export interface IfThenPattern {
  ifKeywords: string[];
  thenKeywords: string[];
}

export const IF_THEN_PATTERNS: IfThenPattern[] = [
  { ifKeywords: ['如果', '当', '一旦', '若是', '假如', '若'], thenKeywords: ['则', '那么', '应', '必须', '就'] },
  { ifKeywords: ['if', 'when', 'whenever', 'in case'], thenKeywords: ['then', 'must', 'shall', 'should', '=>'] },
];