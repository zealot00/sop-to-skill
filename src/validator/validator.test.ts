import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { validateSkillPackage } from './index.js';

describe('Skill Package Validation', () => {
  const testDir = path.join(process.cwd(), 'test-output');
  
  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  it('should fail for missing directory', async () => {
    const result = await validateSkillPackage('/non/existent/path');
    expect(result.valid).toBe(false);
    expect(result.issues[0].type).toBe('missing_directory');
  });

  it('should report missing required files', async () => {
    await fs.mkdir(path.join(testDir, 'empty'), { recursive: true });
    const result = await validateSkillPackage(path.join(testDir, 'empty'));
    
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.type === 'missing_file')).toBe(true);
  });

  it('should validate a complete package', async () => {
    const pkgDir = path.join(testDir, 'valid-pkg');
    await fs.mkdir(pkgDir, { recursive: true });
    
    const schema = {
      schema: {
        meta: { name: 'Test', version: '1.0.0', description: 'Test skill' },
        triggers: [{ type: 'execution' }],
        steps: [{ id: 'STEP-001', name: 'Step 1', description: 'Test step', action: 'test' }],
        constraints: [],
      },
      manifest: { format_version: '1.0.0', generated_at: new Date().toISOString(), generator: 'test' },
    };
    
    await fs.writeFile(path.join(pkgDir, 'SKILL.md'), '# Test\n');
    await fs.writeFile(path.join(pkgDir, 'skill.schema.json'), JSON.stringify(schema));
    await fs.writeFile(path.join(pkgDir, 'skill.manifest.yaml'), 'format_version: 1.0.0\ngenerated_at: 2024-01-01T00:00:00Z\ngenerator: test');
    
    const result = await validateSkillPackage(pkgDir);
    expect(result.valid).toBe(true);
  });
});