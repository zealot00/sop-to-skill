import { Command, Option } from 'clipanion';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import type { ExtractedData } from '../types/index.js';
import type { ProgressiveConfig } from '../types/progressive.js';
import { resolveExtraction } from './extraction-resolver.js';
import { resolveOrchestratorApi, resolveOrchestratorToken } from './orchestrator-env.js';

export default class GenerateCommand extends Command {
  public verbose = Option.Boolean('-v,--verbose', false);
  public inputFile = Option.String();
  public outputDir = Option.String('-o,--output');
  public name = Option.String('-n,--name');
  public progressive = Option.String('--progressive', { description: 'Enable progressive disclosure (default: enabled)' });
  public framework = Option.String('--framework', { description: 'Target framework (run `generate --framework all` to export all supported frameworks)' });
  public configPath = Option.String('--config', { description: 'Path to generator config JSON' });
  public lenientConfig = Option.Boolean('--lenient-config', false, { description: 'Fallback to defaults when config is invalid' });
  public extractLanguage = Option.String('--extract-language', { description: 'Override extraction language: auto|zh|en' });
  public extractThreshold = Option.String('--extract-threshold', { description: 'Override extraction confidence threshold (0-1)' });
  public roleConfigPath = Option.String('--role-config', { description: 'Path to role config JSON' });
  public noBoundary = Option.Boolean('--no-boundary', false, { description: 'Disable boundary detection' });
  public orchestratorApi = Option.String('--orchestrator-api', { description: 'Orchestrator API base URL (env: SOP_TO_SKILL_ORCHESTRATOR_API|MANAGING_UP_BASE_URL)' });
  public orchestratorToken = Option.String('--orchestrator-token', { description: 'Orchestrator API bearer token (env: SOP_TO_SKILL_ORCHESTRATOR_TOKEN|MANAGING_UP_JWT_TOKEN|MANAGING_UP_TOKEN)' });
  public apiStrategy = Option.String('--api-strategy', 'local_only', { description: 'Extraction strategy: local_only|remote_first|remote_only' });
  public apiTimeoutMs = Option.String('--api-timeout-ms', '8000', { description: 'Orchestrator API timeout in milliseconds' });

  static paths = [['generate']];

  async execute(): Promise<number> {
    if (!this.inputFile) {
      this.context.stdout.write('Error: Input file is required\n');
      return 1;
    }

    if (!this.outputDir) {
      this.context.stdout.write('Error: --output/-o is required\n');
      return 1;
    }

    if (this.verbose) {
      this.context.stdout.write(`Generating skill package from: ${this.inputFile}\n`);
    }

    try {
      const { parseInputFile } = await import('../parser/factory.js');
      const { extractFromText } = await import('../extractor/index.js');
      const { loadGeneratorConfig } = await import('../config/generator-config.js');
      const {
        generateSkillPackage,
        generateSkillMarkdown,
        generateMinimalMarkdown,
        generateFullMarkdown,
        generateConstraintDetail,
        constraintDetailToMarkdown,
      } = await import('../generator/index.js');
      const { getSupportedFrameworks, resolveFramework } = await import('../generator/frameworks.js');

      const parsed = await parseInputFile(this.inputFile);
      const generatorConfig = await loadGeneratorConfig(this.configPath, { strict: !this.lenientConfig });
      const thresholdOverride = this.extractThreshold !== undefined ? Number(this.extractThreshold) : undefined;
      const timeoutMs = Number(this.apiTimeoutMs);
      if (thresholdOverride !== undefined && (Number.isNaN(thresholdOverride) || thresholdOverride < 0 || thresholdOverride > 1)) {
        this.context.stdout.write('Error: --extract-threshold must be a number between 0 and 1\n');
        return 1;
      }
      if (Number.isNaN(timeoutMs) || timeoutMs <= 0) {
        this.context.stdout.write('Error: --api-timeout-ms must be a positive integer\n');
        return 1;
      }
      const language = this.extractLanguage || generatorConfig.extraction.language;
      if (!['auto', 'zh', 'en'].includes(language)) {
        this.context.stdout.write('Error: --extract-language must be one of auto|zh|en\n');
        return 1;
      }
      if (!['local_only', 'remote_first', 'remote_only'].includes(this.apiStrategy)) {
        this.context.stdout.write('Error: --api-strategy must be one of local_only|remote_first|remote_only\n');
        return 1;
      }
      const extracted = await resolveExtraction(
        parsed.content,
        () => extractFromText(parsed.content, {
          language: language === 'auto' ? undefined : (language as 'zh' | 'en'),
          confidenceThreshold: thresholdOverride ?? generatorConfig.extraction.confidenceThreshold,
          roleConfigPath: this.roleConfigPath || generatorConfig.extraction.roleConfigPath,
          enableBoundaryDetection: this.noBoundary ? false : generatorConfig.extraction.enableBoundaryDetection,
        }),
        {
          strategy: this.apiStrategy as 'local_only' | 'remote_first' | 'remote_only',
          orchestratorApi: resolveOrchestratorApi(this.orchestratorApi),
          orchestratorToken: resolveOrchestratorToken(this.orchestratorToken),
          apiTimeoutMs: timeoutMs,
          language: language as 'auto' | 'zh' | 'en',
          confidenceThreshold: thresholdOverride ?? generatorConfig.extraction.confidenceThreshold,
          roleConfigPath: this.roleConfigPath || generatorConfig.extraction.roleConfigPath,
          enableBoundaryDetection: this.noBoundary ? false : generatorConfig.extraction.enableBoundaryDetection,
          onInfo: (msg) => this.verbose && this.context.stdout.write(`${msg}\n`),
        }
      );
      const progressiveEnabled = this.progressive ? this.progressive !== 'legacy' : generatorConfig.progressive.enabledByDefault;
      if (this.verbose) {
        this.context.stdout.write(`Progressive disclosure: ${progressiveEnabled ? 'enabled' : 'disabled'}\n`);
      }
      const extractedData: ExtractedData = {
        constraints: extracted.constraints,
        decisions: extracted.decisions,
        parameters: [],
        sources: extracted.sources.map(s => ({ type: s.type, fileName: s.fileName || '' })),
        roles: Object.fromEntries(
          Object.entries(extracted.roles || {}).map(([k, v]) => [k, { description: v.description, mentions: String(v.mentions), source: v.source }])
        ),
        subjective_judgments: [],
        ambiguity_notes: [],
      };

      const skillName = this.name || parsed.metadata.title || generatorConfig.metadata.defaultSkillName;
      const skillPackage = await generateSkillPackage(extractedData, skillName, {
        sourceFile: this.inputFile,
        config: generatorConfig,
      });

      await fs.mkdir(this.outputDir, { recursive: true });

      const progressiveConfig: ProgressiveConfig = {
        enabled: progressiveEnabled,
        detailLevel: generatorConfig.progressive.detailLevel,
        generateFullDoc: generatorConfig.progressive.generateFullDoc && progressiveEnabled,
        generateConstraintFiles: generatorConfig.progressive.generateConstraintFiles && progressiveEnabled,
        constraintDir: generatorConfig.output.constraintDir,
        fullDocFileName: generatorConfig.output.fullSkillFileName,
      };

      if (this.framework) {
        const { generateForFramework } = await import('../generator/frameworks.js');
        const validFrameworks = getSupportedFrameworks().filter(fw => generatorConfig.framework.enabledFrameworks.includes(fw));
        const resolved = resolveFramework(this.framework);

        if (this.framework !== 'all' && !resolved) {
          this.context.stdout.write(`Error: Invalid framework '${this.framework}'. Valid options: ${validFrameworks.join(', ')}, all\n`);
          return 1;
        }

        const boundaries = extracted.boundaries || {};

        if (this.verbose) {
          this.context.stdout.write(`Generating for framework: ${this.framework}\n`);
        }

        const frameworksToGenerate = this.framework === 'all' ? validFrameworks : [resolved!];
        if (frameworksToGenerate.length === 0) {
          this.context.stdout.write('Error: No frameworks are enabled by config\n');
          return 1;
        }

        for (const fw of frameworksToGenerate) {
          const outputs = generateForFramework(
            fw,
            extracted.constraints,
            extracted.decisions,
            boundaries,
            skillName
          );

          for (const output of outputs) {
            await fs.writeFile(path.join(this.outputDir, output.filename), output.content, 'utf-8');
            if (this.verbose) {
              this.context.stdout.write(`  - ${output.filename}\n`);
            }
          }
        }

        this.context.stdout.write(`Framework output generated successfully!\n`);
        this.context.stdout.write(`Name: ${skillName}\n`);
        this.context.stdout.write(`Framework: ${this.framework}\n`);
        this.context.stdout.write(`Output: ${this.outputDir}\n`);

        return 0;
      }

      if (progressiveEnabled) {
        const minimalMd = generateMinimalMarkdown(skillPackage.schema, progressiveConfig);
        await fs.writeFile(path.join(this.outputDir, generatorConfig.output.skillFileName), minimalMd, 'utf-8');

        if (progressiveConfig.generateFullDoc) {
          const fullMd = generateFullMarkdown(skillPackage.schema, this.inputFile);
          await fs.writeFile(path.join(this.outputDir, generatorConfig.output.fullSkillFileName), fullMd, 'utf-8');
        }

        if (progressiveConfig.generateConstraintFiles) {
          const constraintsDir = path.join(this.outputDir, progressiveConfig.constraintDir);
          await fs.mkdir(constraintsDir, { recursive: true });

          for (const constraint of skillPackage.schema.constraints) {
            const detail = generateConstraintDetail(constraint, this.inputFile);
            const detailMd = constraintDetailToMarkdown(detail);
            const fileName = `${constraint.id}.md`.replace(/[^a-zA-Z0-9.-]/g, '_');
            await fs.writeFile(path.join(constraintsDir, fileName), detailMd, 'utf-8');
          }
        }

        if (this.verbose) {
          this.context.stdout.write(`Generated progressive structure:\n`);
          this.context.stdout.write(`  - ${generatorConfig.output.skillFileName} (minimal, for Agent)\n`);
          if (progressiveConfig.generateFullDoc) {
            this.context.stdout.write(`  - ${generatorConfig.output.fullSkillFileName} (complete, for humans)\n`);
          }
          if (progressiveConfig.generateConstraintFiles) {
            this.context.stdout.write(`  - ${generatorConfig.output.constraintDir}/ (detailed constraints)\n`);
          }
        }
      } else {
        const skillMd = generateSkillMarkdown(skillPackage.schema);
        await fs.writeFile(path.join(this.outputDir, generatorConfig.output.skillFileName), skillMd, 'utf-8');
      }

      await fs.writeFile(
        path.join(this.outputDir, generatorConfig.output.schemaFileName),
        JSON.stringify(skillPackage, null, 2),
        'utf-8'
      );

      await fs.writeFile(
        path.join(this.outputDir, generatorConfig.output.manifestFileName),
        yaml.dump(skillPackage.manifest, { indent: 2 }),
        'utf-8'
      );

      this.context.stdout.write(`Skill package generated successfully!\n`);
      this.context.stdout.write(`Name: ${skillName}\n`);
      this.context.stdout.write(`Output: ${this.outputDir}\n`);

      return 0;
    } catch (error) {
      this.context.stdout.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  }
}
