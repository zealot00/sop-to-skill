import { Command, Option } from 'clipanion';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import type { ExtractedData, SkillSchema } from '../types/index.js';

export default class GenerateCommand extends Command {
  public verbose = Option.Boolean('-v,--verbose', false);
  public inputFile = Option.String();
  public outputDir = Option.String('-o,--output');
  public name = Option.String('-n,--name');

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
      const { generateSkillPackage, generateSkillMarkdown } = await import('../generator/index.js');

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

      // Write files to output directory
      await fs.mkdir(this.outputDir, { recursive: true });

      // Write SKILL.md (human-readable documentation)
      const skillMd = generateSkillMarkdown(skillPackage.schema);
      await fs.writeFile(path.join(this.outputDir, 'SKILL.md'), skillMd, 'utf-8');

      // Write skill.schema.json (complete package - machine-readable schema + manifest)
      await fs.writeFile(
        path.join(this.outputDir, 'skill.schema.json'),
        JSON.stringify(skillPackage, null, 2),
        'utf-8'
      );

      // Write skill.manifest.yaml
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
