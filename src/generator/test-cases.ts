import type { TestCase, TestCaseManifest } from '../types/index.js';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

export async function generateTestCaseFiles(cases: TestCase[], outputDir: string): Promise<void> {
  const byType: Record<string, TestCase[]> = { 'happy-path': [], 'edge-case': [], 'error-case': [], 'compliance': [] };
  for (const c of cases) {
    if (byType[c.type]) byType[c.type].push(c);
    else byType['happy-path'].push(c);
  }

  const manifest: TestCaseManifest = {
    dataset_name: 'Auto-generated Test Cases',
    version: '1.0.0',
    owner: 'sop-to-skill',
    description: 'Test cases auto-generated from SOP',
    generated_at: new Date().toISOString(),
    skill_name: 'unknown',
    summary: {
      total_cases: cases.length,
      happy_path: byType['happy-path'].length,
      edge_cases: byType['edge-case'].length,
      error_cases: byType['error-case'].length,
    },
    case_files: [],
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'manifest.yaml'), yaml.dump(manifest, { indent: 2 }));

  for (const [type, typeCases] of Object.entries(byType)) {
    if (typeCases.length === 0) continue;
    const typeDir = path.join(outputDir, type);
    await fs.mkdir(typeDir, { recursive: true });
    for (const c of typeCases) {
      await fs.writeFile(path.join(typeDir, `${c.case_id}.yaml`), yaml.dump(c, { indent: 2 }));
      manifest.case_files.push({ path: `${type}/${c.case_id}.yaml`, tags: c.tags || [] });
    }
  }
}