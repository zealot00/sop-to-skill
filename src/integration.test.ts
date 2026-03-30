import { describe, it, expect } from 'vitest';
import path from 'path';
import { parseInputFile } from './parser/factory.js';
import { extractFromText } from './extractor/index.js';
import { generateSkillPackage } from './generator/skill-package.js';
import { generateSkillMarkdown } from './generator/skill-md.js';

const TEST_SOP = path.join(process.cwd(), 'integration/test-sop.md');

describe('Integration Test', () => {
  it('should parse SOP and extract constraints', async () => {
    const parsed = await parseInputFile(TEST_SOP);
    expect(parsed.content).toBeTruthy();
    expect(parsed.metadata.title).toBe('测试SOP流程');
  });

  it('should extract constraints from SOP', async () => {
    const parsed = await parseInputFile(TEST_SOP);
    const extracted = extractFromText(parsed.content);
    expect(extracted.constraints.length).toBeGreaterThan(0);
  });

  it('should generate skill package', async () => {
    const parsed = await parseInputFile(TEST_SOP);
    const extracted = extractFromText(parsed.content);
    const pkg = await generateSkillPackage(extracted as any, '测试流程', {
      sourceFile: TEST_SOP,
    });
    expect(pkg.schema.meta.name).toBe('测试流程');
    expect(pkg.schema.constraints.length).toBeGreaterThan(0);
    expect(pkg.manifest).toBeTruthy();
  });

  it('should generate markdown documentation', async () => {
    const parsed = await parseInputFile(TEST_SOP);
    const extracted = extractFromText(parsed.content);
    const pkg = await generateSkillPackage(extracted as any, '测试流程', {
      sourceFile: TEST_SOP,
    });
    const md = generateSkillMarkdown(pkg.schema);
    expect(md).toContain('# 测试流程');
    expect(md).toContain('## 约束规则');
  });
});