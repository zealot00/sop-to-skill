import { Command } from 'clipanion';
import { getPackageMetadata } from '../version.js';

export default class VersionCommand extends Command {
  static paths = [['version']];

  async execute(): Promise<number> {
    const pkg = await getPackageMetadata();
    this.context.stdout.write(`${pkg.name} v${pkg.version}\n`);
    this.context.stdout.write(`${pkg.description}\n`);
    return 0;
  }
}
