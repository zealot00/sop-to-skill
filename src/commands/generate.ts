import { Command, Option } from 'clipanion';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import type { ExtractedData } from '../types/index.js';
import type { ProgressiveConfig } from '../types/progressive.js';

export default class GenerateCommand extends Command {
  public verbose = Option.Boolean('-v,--verbose', false);
  public inputFile = Option.String();
  public outputDir = Option.String('-o,--output');
  public name = Option.String('-n,--name');
  public progressive = Option.String('--progressive', { description: 'Enable progressive disclosure (default: enabled)' });

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

    const progressiveEnabled = this.progressive !== 'legacy';

    if (this.verbose) {
      this.context.stdout.write(`Generating skill package from: ${this.inputFile}\n`);
      this.context.stdout.write(`Progressive disclosure: ${progressiveEnabled ? 'enabled' : 'disabled'}\n`);
    }

    try {
      const { parseInputFile } = await import('../parser/factory.js');
      const { extractFromText } = await import('../extractor/index.js');
      const {
        generateSkillPackage,
        generateSkillMarkdown,
        generateMinimalMarkdown,
        generateFullMarkdown,
        generateConstraintDetail,
        constraintDetailToMarkdown,
      } = await import('../generator/index.js');

      const parsed = await parseInputFile(this.inputFile);
      const extracted = extractFromText(parsed.content);
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

      const skillName = this.name || parsed.metadata.title || 'Untitled Skill';
      const skillPackage = await generateSkillPackage(extractedData, skillName, {
        sourceFile: this.inputFile,
      });

      await fs.mkdir(this.outputDir, { recursive: true });

      const progressiveConfig: ProgressiveConfig = {
        enabled: progressiveEnabled,
        detailLevel: 'minimal',
        generateFullDoc: true,
        generateConstraintFiles: progressiveEnabled,
        constraintDir: 'constraints',
      };

      if (progressiveEnabled) {
        const minimalMd = generateMinimalMarkdown(skillPackage.schema, progressiveConfig);
        await fs.writeFile(path.join(this.outputDir, 'SKILL.md'), minimalMd, 'utf-8');

        const fullMd = generateFullMarkdown(skillPackage.schema, this.inputFile);
        await fs.writeFile(path.join(this.outputDir, 'SKILL.full.md'), fullMd, 'utf-8');

        const constraintsDir = path.join(this.outputDir, progressiveConfig.constraintDir);
        await fs.mkdir(constraintsDir, { recursive: true });

        for (const constraint of skillPackage.schema.constraints) {
          const detail = generateConstraintDetail(constraint, this.inputFile);
          const detailMd = constraintDetailToMarkdown(detail);
          const fileName = `${constraint.id}.md`.replace(/[^a-zA-Z0-9.-]/g, '_');
          await fs.writeFile(path.join(constraintsDir, fileName), detailMd, 'utf-8');
        }

        if (this.verbose) {
          this.context.stdout.write(`Generated progressive structure:\n`);
          this.context.stdout.write(`  - SKILL.md (minimal, for Agent)\n`);
          this.context.stdout.write(`  - SKILL.full.md (complete, for humans)\n`);
          this.context.stdout.write(`  - constraints/ (detailed constraints)\n`);
        }
      } else {
        const skillMd = generateSkillMarkdown(skillPackage.schema);
        await fs.writeFile(path.join(this.outputDir, 'SKILL.md'), skillMd, 'utf-8');
      }

      await fs.writeFile(
        path.join(this.outputDir, 'skill.schema.json'),
        JSON.stringify(skillPackage, null, 2),
        'utf-8'
      );

      await fs.writeFile(
        path.join(this.outputDir, 'skill.manifest.yaml'),
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
