import type { Decision, DecisionRule } from '../types/index.js';

export function extractDecisions(text: string): Decision[] {
  const decisions: Decision[] = [];
  const sentences = text.split(/[。\n]/);
  let counter = 1;

  for (const sentence of sentences) {
    if (sentence.length < 10) continue;

    const decision = extractIfThenDecision(sentence, counter);
    if (decision) {
      decisions.push(decision);
      counter++;
      continue;
    }

    const tableDecision = extractTableBasedDecision(sentence, counter);
    if (tableDecision) {
      decisions.push(tableDecision);
      counter++;
    }
  }

  return decisions;
}

function extractIfThenDecision(sentence: string, counter: number): Decision | null {
  const ifThenMatch = sentence.match(/如果(.+?)[，,](?:则|那么|应|必须|就)(.+?)$/);
  if (!ifThenMatch) {
    const dangMatch = sentence.match(/当(.+?)[，,](?:可以|选择|决定)(.+?)$/);
    if (!dangMatch) return null;
    
    const condition = dangMatch[1].trim();
    const action = dangMatch[2].trim();
    const options = extractOptions(action);

    if (options.length < 1) {
      return {
        id: `D${counter.toString().padStart(3, '0')}`,
        name: `决策-${counter}`,
        inputVars: [condition],
        outputVars: ['action'],
        rules: [{
          when: { condition },
          then: { action },
        }],
      };
    }

    const rules: DecisionRule[] = options.map((option, idx) => ({
      when: { condition: `${condition} 且选择${idx + 1}` },
      then: { action: option.trim() },
    }));

    return {
      id: `D${counter.toString().padStart(3, '0')}`,
      name: `决策-${counter}`,
      inputVars: [condition],
      outputVars: ['selected_option', 'action'],
      rules,
    };
  }

  const condition = ifThenMatch[1].trim();
  const action = ifThenMatch[2].trim();
  const options = extractOptions(action);

  if (options.length < 1) {
    return {
      id: `D${counter.toString().padStart(3, '0')}`,
      name: `决策-${counter}`,
      inputVars: [condition],
      outputVars: ['action'],
      rules: [{
        when: { condition },
        then: { action },
      }],
    };
  }

  const rules: DecisionRule[] = options.map((option, idx) => ({
    when: { condition: `${condition} 且选择${idx + 1}` },
    then: { action: option.trim() },
  }));

  return {
    id: `D${counter.toString().padStart(3, '0')}`,
    name: `决策-${counter}`,
    inputVars: [condition],
    outputVars: ['selected_option', 'action'],
    rules,
  };
}

function extractTableBasedDecision(sentence: string, counter: number): Decision | null {
  const lines = sentence.split(/[;\n]/).filter(l => l.trim().length > 0);
  if (lines.length < 3) return null;

  const tablePattern = /\|(.+?)\|/;
  const hasTableStructure = lines.slice(1).every(line => tablePattern.test(line));
  if (!hasTableStructure) return null;

  const header = lines[0].match(tablePattern);
  if (!header) return null;

  const conditions: string[] = [];
  const rules: DecisionRule[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].match(tablePattern);
    if (cells && cells.length >= 2) {
      const condition = cells[1].trim();
      const action = cells[cells.length - 1].trim();
      conditions.push(condition);
      rules.push({
        when: { condition },
        then: { action },
      });
    }
  }

  if (rules.length < 2) return null;

  return {
    id: `D${counter.toString().padStart(3, '0')}`,
    name: `表格决策-${counter}`,
    inputVars: ['scenario'],
    outputVars: ['action'],
    rules,
  };
}

function extractOptions(text: string): string[] {
  const options: string[] = [];

  const orMatches = text.match(/[或或者]([^，,。]+?)/g);
  if (orMatches) {
    for (const match of orMatches) {
      const option = match.replace(/[或或者]/, '').trim();
      if (option && !options.includes(option)) {
        options.push(option);
      }
    }
  }

  const numberedMatches = text.match(/方案[一二三四五六七八九十]+/g);
  if (numberedMatches) {
    for (const match of numberedMatches) {
      if (!options.includes(match)) {
        options.push(match);
      }
    }
  }

  return options;
}
