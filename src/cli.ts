import { Cli } from 'clipanion';
import GenerateCommand from './commands/generate.js';
import ExtractCommand from './commands/extract.js';
import LLMEnhanceCommand from './commands/llm-enhance.js';
import ValidateCommand from './commands/validate.js';
import VersionCommand from './commands/version.js';
import { getPackageVersionSync } from './version.js';

const cli = new Cli({
  binaryLabel: 'sop-to-skill',
  binaryName: 'sop-to-skill',
  binaryVersion: getPackageVersionSync(),
});

cli.register(GenerateCommand);
cli.register(ExtractCommand);
cli.register(LLMEnhanceCommand);
cli.register(ValidateCommand);
cli.register(VersionCommand);

export default cli;
