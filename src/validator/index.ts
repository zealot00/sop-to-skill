import fs from 'fs/promises';
import path from 'path';

export interface ValidationIssue {
  type: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  issues: ValidationIssue[];
}

export async function validateSkillPackage(packagePath: string): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  try {
    await fs.access(packagePath);
  } catch {
    return { valid: false, score: 0, issues: [{ type: 'missing_directory', severity: 'error', message: `Package path does not exist: ${packagePath}` }] };
  }

  const stat = await fs.stat(packagePath);
  const isDirectory = stat.isDirectory();

  if (!isDirectory) {
    if (path.extname(packagePath) === '.zip') return { valid: true, score: 1, issues: [] };
    return { valid: false, score: 0, issues: [{ type: 'invalid_format', severity: 'error', message: 'Package must be a directory or ZIP file' }] };
  }

  const REQUIRED_FILES = ['SKILL.md', 'skill.schema.json', 'skill.manifest.yaml'];
  let score = 0;
  let requiredFound = 0;

  for (const file of REQUIRED_FILES) {
    try {
      await fs.access(path.join(packagePath, file));
      requiredFound++;
    } catch {
      issues.push({ type: 'missing_file', severity: 'error', message: `Required file missing: ${file}` });
    }
  }
  score = requiredFound / REQUIRED_FILES.length;

  const schemaPath = path.join(packagePath, 'skill.schema.json');
  try {
    const content = await fs.readFile(schemaPath, 'utf-8');
    JSON.parse(content);
  } catch (e: any) {
    issues.push({ type: 'invalid_json', severity: 'error', message: `skill.schema.json is not valid JSON: ${e.message}` });
  }

  const errors = issues.filter(i => i.severity === 'error');
  return { valid: errors.length === 0, score, issues };
}