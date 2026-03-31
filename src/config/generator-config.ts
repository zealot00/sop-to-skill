import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import type { Trigger } from '../types/index.js';

export interface GeneratorConfig {
  metadata: {
    generatorName: string;
    skillVersion: string;
    formatVersion: string;
    defaultSkillName: string;
    defaultConstraintConfidence: number;
  };
  schema: {
    maxGeneratedSteps: number;
    defaultTriggers: Trigger[];
  };
  progressive: {
    enabledByDefault: boolean;
    detailLevel: 'minimal' | 'summary' | 'full';
    generateFullDoc: boolean;
    generateConstraintFiles: boolean;
  };
  framework: {
    enabledFrameworks: string[];
  };
  output: {
    skillFileName: string;
    fullSkillFileName: string;
    schemaFileName: string;
    manifestFileName: string;
    constraintDir: string;
  };
}

type PartialConfig = {
  metadata?: Partial<GeneratorConfig['metadata']>;
  schema?: {
    maxGeneratedSteps?: number;
    defaultTriggers?: Trigger[];
  };
  progressive?: Partial<GeneratorConfig['progressive']>;
  framework?: Partial<GeneratorConfig['framework']>;
  output?: Partial<GeneratorConfig['output']>;
};

const TriggerSchema = z.object({
  type: z.enum(['execution', 'query', 'approval', 'event']),
  name: z.string().optional(),
  description: z.string().optional(),
  condition: z.string().optional(),
});

const GeneratorConfigSchema = z.object({
  metadata: z.object({
    generatorName: z.string().min(1),
    skillVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    formatVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    defaultSkillName: z.string().min(1),
    defaultConstraintConfidence: z.number().min(0).max(1),
  }),
  schema: z.object({
    maxGeneratedSteps: z.number().int().min(1).max(200),
    defaultTriggers: z.array(TriggerSchema).min(1),
  }),
  progressive: z.object({
    enabledByDefault: z.boolean(),
    detailLevel: z.enum(['minimal', 'summary', 'full']),
    generateFullDoc: z.boolean(),
    generateConstraintFiles: z.boolean(),
  }),
  framework: z.object({
    enabledFrameworks: z.array(z.string().min(1)).min(1),
  }),
  output: z.object({
    skillFileName: z.string().min(1),
    fullSkillFileName: z.string().min(1),
    schemaFileName: z.string().min(1),
    manifestFileName: z.string().min(1),
    constraintDir: z.string().min(1),
  }),
});

export class GeneratorConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeneratorConfigError';
  }
}

export interface LoadConfigOptions {
  strict?: boolean;
}

async function getPackageMetadata(): Promise<{ name: string; version: string }> {
  const packagePaths = [
    path.join(process.cwd(), 'package.json'),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../package.json'),
  ];

  for (const packagePath of packagePaths) {
    try {
      const content = await fs.readFile(packagePath, 'utf-8');
      const pkg = JSON.parse(content) as { name?: string; version?: string };
      if (pkg.name && pkg.version) {
        return { name: pkg.name, version: pkg.version };
      }
    } catch {
      // Ignore and try next location.
    }
  }

  return {
    name: 'sop-to-skill',
    version: process.env.npm_package_version || '1.0.0',
  };
}

export async function loadGeneratorConfig(configPath?: string, options?: LoadConfigOptions): Promise<GeneratorConfig> {
  const strict = options?.strict ?? true;
  const pkg = await getPackageMetadata();
  const defaults: GeneratorConfig = {
    metadata: {
      generatorName: pkg.name,
      skillVersion: pkg.version,
      formatVersion: '1.0.0',
      defaultSkillName: 'Untitled Skill',
      defaultConstraintConfidence: 0.85,
    },
    schema: {
      maxGeneratedSteps: 8,
      defaultTriggers: [{
        type: 'execution',
        name: 'execute',
        description: 'Execute the skill',
      }],
    },
    progressive: {
      enabledByDefault: true,
      detailLevel: 'minimal',
      generateFullDoc: true,
      generateConstraintFiles: true,
    },
    framework: {
      enabledFrameworks: ['openclaw', 'opencode', 'codex', 'gpts', 'mcp', 'claude', 'langchain'],
    },
    output: {
      skillFileName: 'SKILL.md',
      fullSkillFileName: 'SKILL.full.md',
      schemaFileName: 'skill.schema.json',
      manifestFileName: 'skill.manifest.yaml',
      constraintDir: 'constraints',
    },
  };

  if (!configPath) {
    return defaults;
  }

  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const custom = JSON.parse(raw) as PartialConfig;

    const merged: GeneratorConfig = {
      metadata: {
        ...defaults.metadata,
        ...(custom.metadata || {}),
      },
      schema: {
        maxGeneratedSteps: custom.schema?.maxGeneratedSteps ?? defaults.schema.maxGeneratedSteps,
        defaultTriggers: custom.schema?.defaultTriggers ?? defaults.schema.defaultTriggers,
      },
      progressive: {
        ...defaults.progressive,
        ...(custom.progressive || {}),
      },
      framework: {
        ...defaults.framework,
        ...(custom.framework || {}),
      },
      output: {
        ...defaults.output,
        ...(custom.output || {}),
      },
    };

    const validated = GeneratorConfigSchema.parse(merged);
    return validated;
  } catch {
    if (strict) {
      throw new GeneratorConfigError(`Invalid generator config: ${configPath}`);
    }
    return defaults;
  }
}
