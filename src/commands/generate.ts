import { Command, Option } from 'clipanion';

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

    if (this.verbose) {
      this.context.stdout.write(`Generating skill package from: ${this.inputFile}\n`);
    }

    try {
      const { parseInputFile } = await import('../parser/factory.js');
      const { extractFromText } = await import('../extractor/index.js');
      const { generateSkillPackage } = await import('../generator/skill-package.js');

      const parsed = await parseInputFile(this.inputFile);
      const extracted = extractFromText(parsed.content);

      const skillName = this.name || parsed.metadata.title || 'Untitled Skill';
      const skillPackage = await generateSkillPackage(extracted, skillName, {
        sourceFile: this.inputFile,
      });

      this.context.stdout.write(`Skill package generated successfully!\n`);
      this.context.stdout.write(`Name: ${skillName}\n`);

      return 0;
    } catch (error) {
      this.context.stdout.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  }
}