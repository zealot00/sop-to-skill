import { Command, Option } from 'clipanion';
import { generateFromExtracted } from './api-client.js';
import { resolveExtraction } from './extraction-resolver.js';

export default class ExtractCommand extends Command {
  public inputFile = Option.String();
  public outputFormat = Option.String('--format', 'json');
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
        }
      );

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
