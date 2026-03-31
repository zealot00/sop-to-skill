import fs from 'fs/promises';
import path from 'path';
import { SkillPackageSchema, type ValidatedSkillPackage } from './skill-schema.js';
import { loadGeneratorConfig } from '../config/generator-config.js';

export interface ValidationIssue {
  type: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  issues: ValidationIssue[];
  data?: ValidatedSkillPackage;
}

const DEFAULT_REQUIRED_FILES = ['SKILL.md', 'skill.schema.json', 'skill.manifest.yaml'];

export interface ValidateOptions {
  configPath?: string;
  strictConfig?: boolean;
}

export async function validateSkillPackage(packagePath: string, options?: ValidateOptions): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const config = await loadGeneratorConfig(options?.configPath, { strict: options?.strictConfig ?? true });
  const requiredFiles = [
    config.output.skillFileName,
    config.output.schemaFileName,
    config.output.manifestFileName,
  ].filter((v, i, arr) => arr.indexOf(v) === i);
  const effectiveRequiredFiles = requiredFiles.length > 0 ? requiredFiles : DEFAULT_REQUIRED_FILES;

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

  let requiredFound = 0;
  for (const file of effectiveRequiredFiles) {
    try {
      await fs.access(path.join(packagePath, file));
      requiredFound++;
    } catch {
      issues.push({ type: 'missing_file', severity: 'error', message: `Required file missing: ${file}` });
    }
  }

  const schemaPath = path.join(packagePath, config.output.schemaFileName);
  let skillData: any;

  try {
    const content = await fs.readFile(schemaPath, 'utf-8');
    skillData = JSON.parse(content);
  } catch (e: any) {
    issues.push({ type: 'invalid_json', severity: 'error', message: `skill.schema.json is not valid JSON: ${e.message}` });
    return { valid: false, score: requiredFound / effectiveRequiredFiles.length * 0.5, issues };
  }

  const zodResult = SkillPackageSchema.safeParse(skillData);
  
  if (!zodResult.success) {
    for (const error of zodResult.error.errors) {
      issues.push({
        type: 'schema_validation',
        severity: 'error',
        message: `${error.path.join('.')}: ${error.message}`,
      });
    }
  }

  const errors = issues.filter(i => i.severity === 'error');
  
  return {
    valid: errors.length === 0 && zodResult.success,
    score: zodResult.success ? 1 : (requiredFound / effectiveRequiredFiles.length) * 0.5,
    issues,
    data: zodResult.success ? zodResult.data : undefined,
  };
}
