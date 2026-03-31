import { Command, Option } from 'clipanion';
import type { ExtractedData } from '../types/index.js';
import { resolveExtraction } from './extraction-resolver.js';

export default class LLMEnhanceCommand extends Command {
  public inputFile = Option.String();
  public apiUrl = Option.String('--llm-api', 'http://localhost:11434');
  public model = Option.String('--llm-model', 'llama3');
  public configPath = Option.String('--config', { description: 'Path to generator config JSON (for extraction options)' });
  public lenientConfig = Option.Boolean('--lenient-config', false, { description: 'Fallback to defaults when config is invalid' });
  public extractLanguage = Option.String('--extract-language', { description: 'Override extraction language: auto|zh|en' });
  public extractThreshold = Option.String('--extract-threshold', { description: 'Override extraction confidence threshold (0-1)' });
  public roleConfigPath = Option.String('--role-config', { description: 'Path to role config JSON' });
  public noBoundary = Option.Boolean('--no-boundary', false, { description: 'Disable boundary detection' });
  public orchestratorApi = Option.String('--orchestrator-api', { description: 'Orchestrator API base URL' });
  public orchestratorToken = Option.String('--orchestrator-token', { description: 'Orchestrator API bearer token' });
  public apiStrategy = Option.String('--api-strategy', 'local_only', { description: 'Extraction strategy: local_only|remote_first|remote_only' });
  public apiTimeoutMs = Option.String('--api-timeout-ms', '8000', { description: 'Orchestrator API timeout in milliseconds' });
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
      const { loadGeneratorConfig } = await import('../config/generator-config.js');

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

      const parsed = await parseInputFile(this.inputFile);
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
          orchestratorApi: this.orchestratorApi || process.env.SOP_TO_SKILL_ORCHESTRATOR_API,
          orchestratorToken: this.orchestratorToken || process.env.SOP_TO_SKILL_ORCHESTRATOR_TOKEN,
          apiTimeoutMs: timeoutMs,
          language: language as 'auto' | 'zh' | 'en',
          confidenceThreshold: thresholdOverride ?? generatorConfig.extraction.confidenceThreshold,
          roleConfigPath: this.roleConfigPath || generatorConfig.extraction.roleConfigPath,
          enableBoundaryDetection: this.noBoundary ? false : generatorConfig.extraction.enableBoundaryDetection,
          onInfo: (msg) => this.verbose && this.context.stdout.write(`${msg}\n`),
        }
      );
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
