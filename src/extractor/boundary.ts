import type { BoundaryParameter } from '../types/index.js';

type LimitType = 'max' | 'min' | 'range' | null;

interface BoundaryPattern {
  pattern: RegExp;
  unit: string;
  limitType: LimitType;
}

export class BoundaryDetector {
  private timePatterns: BoundaryPattern[] = [
    { pattern: /(\d+(?:\.\d+)?)\s*个工作日/, unit: '工作日', limitType: 'max' },
    { pattern: /(\d+(?:\.\d+)?)\s*个工作日\s*(?:内)?/, unit: '工作日', limitType: 'max' },
    { pattern: /(\d+(?:\.\d+)?)\s*小时/, unit: '小时', limitType: 'max' },
    { pattern: /(\d+(?:\.\d+)?)\s*小时\s*(?:内)?/, unit: '小时', limitType: 'max' },
    { pattern: /(\d+(?:\.\d+)?)\s*天内/, unit: '天', limitType: 'max' },
    { pattern: /(\d+(?:\.\d+)?)\s*日内/, unit: '天', limitType: 'max' },
    { pattern: /(\d+(?:\.\d+)?)\s*天后/, unit: '天', limitType: 'min' },
    { pattern: /(\d+(?:\.\d+)?)\s*周/, unit: '周', limitType: null },
    { pattern: /(\d+(?:\.\d+)?)\s*个月/, unit: '月', limitType: null },
    { pattern: /(\d+(?:\.\d+)?)\s*年/, unit: '年', limitType: null },
  ];

  private percentagePatterns: BoundaryPattern[] = [
    { pattern: /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*%(?:\s|的情况下|范围内|之间)?/, unit: '%', limitType: 'range' },
    { pattern: /不超过\s*(\d+(?:\.\d+)?)\s*%/, unit: '%', limitType: 'max' },
    { pattern: /不低于\s*(\d+(?:\.\d+)?)\s*%/, unit: '%', limitType: 'min' },
    { pattern: /(\d+(?:\.\d+)?)\s*%(?!\s*以上|\s*以下)/, unit: '%', limitType: null },
    { pattern: /(\d+(?:\.\d+)?)\s*以上/, unit: '%', limitType: 'min' },
    { pattern: /(\d+(?:\.\d+)?)\s*以下/, unit: '%', limitType: 'max' },
  ];

  private amountPatterns: BoundaryPattern[] = [
    { pattern: /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:万|千|百|元)(?:\s|之间|以上|以下|的)?/, unit: '元', limitType: 'range' },
    { pattern: /(?:不超过|低于)\s*(\d+(?:\.\d+)?)\s*(?:万|千|百|元)(?:\s|的)?/, unit: '元', limitType: 'max' },
    { pattern: /(?:超过|高于|不低于)\s*(\d+(?:\.\d+)?)\s*(?:万|千|百|元)(?:\s|的)?/, unit: '元', limitType: 'min' },
    { pattern: /(\d+(?:\.\d+)?)\s*(?:万|千|百|元)/, unit: '元', limitType: null },
  ];

  private countPatterns: BoundaryPattern[] = [
    { pattern: /(?:最多|最少|不少于|不超过|至少|至多)\s*(\d+)\s*(?:个|项|次|条|份|页|行|名|位)/, unit: 'count', limitType: null },
  ];

  detect(text: string): Record<string, BoundaryParameter> {
    const boundaries: Record<string, BoundaryParameter> = {};

    const timeBoundaries = this.detectTimeBoundaries(text);
    Object.assign(boundaries, timeBoundaries);

    const pctBoundaries = this.detectPercentageBoundaries(text);
    for (const [name, bp] of Object.entries(pctBoundaries)) {
      if (!boundaries[name] || this.isBetterBoundary(boundaries[name], bp)) {
        boundaries[name] = bp;
      }
    }

    const amountBoundaries = this.detectAmountBoundaries(text);
    for (const [name, bp] of Object.entries(amountBoundaries)) {
      if (!boundaries[name] || this.isBetterBoundary(boundaries[name], bp)) {
        boundaries[name] = bp;
      }
    }

    const countBoundaries = this.detectCountBoundaries(text);
    for (const [name, bp] of Object.entries(countBoundaries)) {
      if (!boundaries[name] || this.isBetterBoundary(boundaries[name], bp)) {
        boundaries[name] = bp;
      }
    }

    return boundaries;
  }

  detectFromTable(tableText: string): Record<string, BoundaryParameter> {
    return this.detect(tableText);
  }

  private detectTimeBoundaries(text: string): Record<string, BoundaryParameter> {
    const boundaries: Record<string, BoundaryParameter> = {};

    for (const { pattern, unit, limitType } of this.timePatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        const key = `时间限制_${unit}`;
        
        const detectedLimitType = this.detectLimitType(text, limitType);
        
        const bp: BoundaryParameter = {
          name: `时间限制_${unit}`,
          unit,
          confidence: 0.85,
        };

        if (detectedLimitType === 'max') {
          bp.maxValue = value;
        } else if (detectedLimitType === 'min') {
          bp.minValue = value;
        } else {
          bp.defaultValue = value;
        }

        if (!boundaries[key]) {
          boundaries[key] = bp;
        }
      }
    }

    return boundaries;
  }

  private detectPercentageBoundaries(text: string): Record<string, BoundaryParameter> {
    const boundaries: Record<string, BoundaryParameter> = {};

    for (const { pattern, limitType } of this.percentagePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (limitType === 'range') {
          const minVal = parseFloat(match[1]);
          const maxVal = parseFloat(match[2]);
          boundaries['百分比限制'] = {
            name: '百分比范围',
            minValue: minVal,
            maxValue: maxVal,
            unit: '%',
            confidence: 0.9,
          };
          break;
        } else {
          const value = parseFloat(match[1]);
          const detectedLimitType = this.detectLimitType(text, limitType);
          
          const bp: BoundaryParameter = {
            name: '百分比',
            unit: '%',
            confidence: 0.85,
          };

          if (detectedLimitType === 'max') {
            bp.maxValue = value;
          } else if (detectedLimitType === 'min') {
            bp.minValue = value;
          } else {
            bp.defaultValue = value;
          }

          if (!boundaries['百分比限制'] || this.isBetterBoundary(boundaries['百分比限制'], bp)) {
            boundaries['百分比限制'] = bp;
          }
        }
      }
    }

    return boundaries;
  }

  private detectAmountBoundaries(text: string): Record<string, BoundaryParameter> {
    const boundaries: Record<string, BoundaryParameter> = {};

    for (const { pattern, unit, limitType } of this.amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        if (limitType === 'range') {
          const minVal = parseFloat(match[1]);
          const maxVal = parseFloat(match[2]);
          boundaries['金额限制'] = {
            name: '金额范围',
            minValue: minVal * 10000,
            maxValue: maxVal * 10000,
            unit,
            confidence: 0.9,
          };
          break;
        } else {
          const value = parseFloat(match[1]);
          const detectedLimitType = this.detectLimitType(text, limitType);
          
          const bp: BoundaryParameter = {
            name: '金额限制',
            unit,
            confidence: 0.85,
          };

          if (detectedLimitType === 'max') {
            bp.maxValue = value * 10000;
          } else if (detectedLimitType === 'min') {
            bp.minValue = value * 10000;
          } else {
            bp.defaultValue = value * 10000;
          }

          if (!boundaries['金额限制'] || this.isBetterBoundary(boundaries['金额限制'], bp)) {
            boundaries['金额限制'] = bp;
          }
        }
      }
    }

    return boundaries;
  }

  private detectCountBoundaries(text: string): Record<string, BoundaryParameter> {
    const boundaries: Record<string, BoundaryParameter> = {};

    for (const { pattern, unit, limitType } of this.countPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        const detectedLimitType = this.detectLimitType(text, limitType);
        
        const bp: BoundaryParameter = {
          name: '数量限制',
          unit,
          confidence: 0.85,
        };

        if (detectedLimitType === 'max') {
          bp.maxValue = value;
        } else if (detectedLimitType === 'min') {
          bp.minValue = value;
        } else {
          bp.defaultValue = value;
        }

        if (!boundaries['数量限制'] || this.isBetterBoundary(boundaries['数量限制'], bp)) {
          boundaries['数量限制'] = bp;
        }
      }
    }

    return boundaries;
  }

  private detectLimitType(text: string, defaultType: LimitType): LimitType {
    if (defaultType !== null) return defaultType;
    
    if (text.includes('最多') || text.includes('不超过') || text.includes('以内') || text.includes('不高于') || text.includes('至多')) {
      return 'max';
    }
    if (text.includes('最少') || text.includes('不少于') || text.includes('以上') || text.includes('不低于') || text.includes('至少')) {
      return 'min';
    }
    return null;
  }

  private isBetterBoundary(existing: BoundaryParameter, newBp: BoundaryParameter): boolean {
    const existingHasRange = existing.minValue !== undefined && existing.maxValue !== undefined;
    const newHasRange = newBp.minValue !== undefined && newBp.maxValue !== undefined;

    if (newHasRange && !existingHasRange) return true;
    if (existingHasRange && !newHasRange) return false;

    if (newBp.confidence > existing.confidence) return true;

    return false;
  }
}
