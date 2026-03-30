import { Command } from 'clipanion';

export default class VersionCommand extends Command {
  static paths = [['version']];

  async execute(): Promise<number> {
    this.context.stdout.write('sop-to-skill v1.0.0\n');
    this.context.stdout.write('Convert SOP documents to executable AI Agent Skills\n');
    return 0;
  }
}