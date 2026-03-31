import type { Constraint, ConstraintLevel } from '../types/index.js';
import { CONSTRAINT_PATTERNS, IF_THEN_PATTERNS } from './patterns.js';
import { extractRoles } from './role.js';

export interface ConstraintExtractorOptions {
  confidenceThreshold?: number;
  language?: 'zh' | 'en';
}

export function extractConstraints(
  text: string,
  options?: ConstraintExtractorOptions
): Constraint[] {
  const constraints: Constraint[] = [];
  const language = options?.language || detectLanguage(text);
  const threshold = options?.confidenceThreshold || 0.7;
  
  const sentences = splitSentences(text, language);
  let counter = 1;

  for (const sentence of sentences) {
    if (sentence.length < 5) continue;

    const ifThen = extractIfThen(sentence, language, counter);
    if (ifThen) {
      constraints.push(ifThen);
      counter++;
      continue;
    }

    const keyword = extractByKeyword(sentence, language, counter);
    if (keyword && keyword.confidence >= threshold) {
      constraints.push(keyword);
      counter++;
    }
  }

  return constraints;
}

function detectLanguage(text: string): 'zh' | 'en' {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const words = text.split(/\s+/).length;
  return chineseChars > words * 0.3 ? 'zh' : 'en';
}

function splitSentences(text: string, language: 'zh' | 'en'): string[] {
  if (language === 'zh') {
    return text.split(/[。；\n]/).filter(s => s.trim().length > 0);
  }
  return text.split(/[.;\n]/).filter(s => s.trim().length > 0);
}

function extractIfThen(sentence: string, language: 'zh' | 'en', counter: number): Constraint | null {
  for (const pattern of IF_THEN_PATTERNS) {
    const needsLower = language === 'en';
    const sentenceToCheck = needsLower ? sentence.toLowerCase() : sentence;
    
    if (!pattern.ifKeywords.some(k => sentenceToCheck.includes(needsLower ? k.toLowerCase() : k))) continue;
    
    const ifMatch = sentence.match(new RegExp(`(${pattern.ifKeywords.join('|')})(.+?)(,|，)(${pattern.thenKeywords.join('|')})(.+?)$`));
    if (ifMatch) {
      const condition = ifMatch[2].trim();
      const action = ifMatch[5].trim();
      const level = detectLevelFromAction(action, language);
      const roles = Object.keys(extractRoles(sentence));
      
      return {
        id: `C${counter.toString().padStart(3, '0')}`,
        level,
        description: sentence.trim(),
        condition,
        action,
        roles,
        confidence: 0.9,
      };
    }
  }
  return null;
}

function extractByKeyword(sentence: string, language: 'zh' | 'en', counter: number): Constraint | null {
  const patterns = CONSTRAINT_PATTERNS.filter(p => p.languages.includes(language));
  
  for (const patternGroup of patterns) {
    if (patternGroup.patterns.some(p => p.test(sentence))) {
      const roles = Object.keys(extractRoles(sentence));
      return {
        id: `C${counter.toString().padStart(3, '0')}`,
        level: patternGroup.level,
        description: cleanDescription(sentence.trim()),
        roles,
        confidence: 0.85,
      };
    }
  }
  return null;
}

function detectLevelFromAction(action: string, language: 'zh' | 'en'): ConstraintLevel {
  if (language === 'zh') {
    if (/必须|应当|需要/.test(action)) return 'MUST';
    if (/建议|推荐|应该/.test(action)) return 'SHOULD';
    if (/可以|允许/.test(action)) return 'MAY';
  } else {
    if (/\bmust\b|\bshall\b/.test(action)) return 'MUST';
    if (/\bshould\b/.test(action)) return 'SHOULD';
    if (/\bmay\b|\bcan\b/.test(action)) return 'MAY';
  }
  return 'SHOULD';
}

function cleanDescription(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}