import { Command, Option } from 'clipanion';
import type { ExtractedData } from '../types/index.js';

export default class LLMEnhanceCommand extends Command {
  public inputFile = Option.String();
  public apiUrl = Option.String('--llm-api', 'http://localhost:11434');
  public model = Option.String('--llm-model', 'llama3');
  public verbose = Option.Boolean('-v,--verbose', false);

  static paths = [['llm-enhance']];

  async execute(): Promise<number> {
    if (!this.inputFile) {
      this.context.stdout.write('Error: Input file is required\n');
      return 1;
    }

    if (this.verbose) {
      this.context.stdout.write(`Using LLM API: ${this.apiUrl}\n`);
      this.context.stdout.write(`Model: ${this.model}\n`);
    }

    try {
      const { parseInputFile } = await import('../parser/factory.js');
      const { extractFromText } = await import('../extractor/index.js');
      const { enhanceWithLLM } = await import('../llm/enhancer.js');

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

      const enhanced = await enhanceWithLLM(extractedData, {
        apiUrl: this.apiUrl,
        model: this.model,
      });

      this.context.stdout.write(JSON.stringify(enhanced, null, 2) + '\n');

      return 0;
    } catch (error) {
      this.context.stdout.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  }
}
