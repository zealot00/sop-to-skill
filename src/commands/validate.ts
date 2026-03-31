import { Command, Option } from 'clipanion';

export default class ValidateCommand extends Command {
  public inputDir = Option.String();
  public configPath = Option.String('--config', { description: 'Path to generator config JSON' });
  public lenientConfig = Option.Boolean('--lenient-config', false, { description: 'Fallback to defaults when config is invalid' });
  public verbose = Option.Boolean('-v,--verbose', false);

  static paths = [['validate']];

  async execute(): Promise<number> {
    if (!this.inputDir) {
      this.context.stdout.write('Error: Input directory is required\n');
      return 1;
    }

    if (this.verbose) {
      this.context.stdout.write(`Validating skill package in: ${this.inputDir}\n`);
    }

    try {
      const { validateSkillPackage } = await import('../validator/index.js');

      const result = await validateSkillPackage(this.inputDir, { configPath: this.configPath, strictConfig: !this.lenientConfig });

      if (result.valid) {
        this.context.stdout.write('Validation passed!\n');
        return 0;
      } else {
        this.context.stdout.write('Validation failed:\n');
        for (const issue of result.issues) {
          this.context.stdout.write(`  - [${issue.type}] ${issue.message}\n`);
        }
        return 1;
      }
    } catch (error) {
      this.context.stdout.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  }
}
