import { Command, Option } from 'clipanion';

export default class ExtractCommand extends Command {
  public inputFile = Option.String();
  public outputFormat = Option.String('--format', 'json');

  static paths = [['extract']];

  async execute(): Promise<number> {
    if (!this.inputFile) {
      this.context.stdout.write('Error: Input file is required\n');
      return 1;
    }

    try {
      const { parseInputFile } = await import('../parser/factory.js');
      const { extractFromText } = await import('../extractor/index.js');

      const parsed = await parseInputFile(this.inputFile);
      const extracted = extractFromText(parsed.content);

      if (this.outputFormat === 'json') {
        this.context.stdout.write(JSON.stringify(extracted, null, 2) + '\n');
      } else {
        this.context.stdout.write('Unsupported format. Use --format json\n');
        return 1;
      }

      return 0;
    } catch (error) {
      this.context.stdout.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  }
}