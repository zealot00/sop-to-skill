import { Command, Option } from 'clipanion';
import { generateFromExtracted } from './api-client.js';

export default class ExtractCommand extends Command {
  public inputFile = Option.String();
  public outputFormat = Option.String('--format', 'json');
  public generate = Option.Boolean('--generate', false, {
    description: 'Call managing-up API to generate complete Skill YAML',
  });
  public apiUrl = Option.String('--api-url', {
    description: 'managing-up API URL (env: SOP_TO_SKILL_API_URL)',
  });
  public apiKey = Option.String('--api-key', {
    description: 'managing-up API Key (env: SOP_TO_SKILL_API_KEY)',
  });
  public skillName = Option.String('-n', '--name', {
    description: 'Skill name (required with --generate)',
  });

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

      // If no --generate, output JSON (backward compatible)
      if (!this.generate) {
        this.context.stdout.write(JSON.stringify(extracted, null, 2) + '\n');
        return 0;
      }

      // Call API to generate
      const apiUrl = this.apiUrl || process.env.SOP_TO_SKILL_API_URL;
      const apiKey = this.apiKey || process.env.SOP_TO_SKILL_API_KEY;

      if (!apiUrl || !apiKey) {
        this.context.stdout.write('Error: --api-url and --api-key are required when using --generate\n');
        this.context.stdout.write('Or set SOP_TO_SKILL_API_URL and SOP_TO_SKILL_API_KEY environment variables\n');
        return 1;
      }

      this.context.stdout.write('Calling managing-up API to generate Skill...\n');
      const result = await generateFromExtracted(apiUrl, apiKey, {
        skill_name: this.skillName || parsed.metadata.title || 'Untitled Skill',
        extracted_data: {
          constraints: extracted.constraints,
          decisions: extracted.decisions,
          roles: Object.values(extracted.roles || {}),
        },
      });

      this.context.stdout.write('\n=== Generated SKILL.yaml ===\n');
      this.context.stdout.write(result.generated_yaml + '\n');
      this.context.stdout.write(`\nProvider: ${result.provider} | Model: ${result.model}\n`);
      return 0;
    } catch (error) {
      this.context.stdout.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  }
}