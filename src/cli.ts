import { Cli } from 'clipanion';
import GenerateCommand from './commands/generate.js';
import ExtractCommand from './commands/extract.js';
import LLMEnhanceCommand from './commands/llm-enhance.js';
import ValidateCommand from './commands/validate.js';
import VersionCommand from './commands/version.js';

const cli = new Cli({
  binaryLabel: 'sop-to-skill',
  binaryName: 'sop-to-skill',
  binaryVersion: '1.0.0',
});

cli.register(GenerateCommand);
cli.register(ExtractCommand);
cli.register(LLMEnhanceCommand);
cli.register(ValidateCommand);
cli.register(VersionCommand);

export default cli;