import { Command, Option } from 'clipanion';
import fs from 'fs/promises';
import { OrchestratorClient } from '../orchestrator/client.js';

type OrchestratorOp =
  | 'health'
  | 'create-run'
  | 'get-run'
  | 'list-artifacts'
  | 'create-version'
  | 'list-versions'
  | 'get-version'
  | 'diff-versions'
  | 'rollback'
  | 'promote'
  | 'create-test'
  | 'get-test'
  | 'get-report'
  | 'evaluate-gate';

export default class OrchestratorCommand extends Command {
  public op = Option.String('--op', { required: true });
  public baseUrl = Option.String('--base-url', {
    description: 'Orchestrator API base URL (env: SOP_TO_SKILL_ORCHESTRATOR_API)',
  });
  public token = Option.String('--token', {
    description: 'Orchestrator API bearer token (env: SOP_TO_SKILL_ORCHESTRATOR_TOKEN)',
  });
  public timeoutMs = Option.String('--timeout-ms', '8000');
  public payloadPath = Option.String('--payload', { description: 'Path to JSON payload file' });
  public runId = Option.String('--run-id');
  public skillId = Option.String('--skill-id');
  public version = Option.String('--version');
  public from = Option.String('--from');
  public to = Option.String('--to');
  public testRunId = Option.String('--test-run-id');
  public idempotencyKey = Option.String('--idempotency-key');

  static paths = [['orchestrator']];

  async execute(): Promise<number> {
    try {
      const op = this.op as OrchestratorOp;
      const baseUrl = this.baseUrl || process.env.SOP_TO_SKILL_ORCHESTRATOR_API;
      const token = this.token || process.env.SOP_TO_SKILL_ORCHESTRATOR_TOKEN;
      const timeoutMs = Number(this.timeoutMs);

      if (!baseUrl) {
        this.context.stdout.write('Error: --base-url is required (or set SOP_TO_SKILL_ORCHESTRATOR_API)\n');
        return 1;
      }
      if (Number.isNaN(timeoutMs) || timeoutMs <= 0) {
        this.context.stdout.write('Error: --timeout-ms must be a positive integer\n');
        return 1;
      }

      const client = new OrchestratorClient({ baseUrl, token, timeoutMs });
      const payload = await this.readPayloadIfAny();

      let result: unknown;
      switch (op) {
        case 'health':
          result = await client.healthz();
          break;
        case 'create-run':
          this.assertPayload(op, payload);
          result = await client.createRun(payload, this.idempotencyKey);
          break;
        case 'get-run':
          this.assertFlag(op, '--run-id', this.runId);
          result = await client.getRun(this.runId!);
          break;
        case 'list-artifacts':
          this.assertFlag(op, '--run-id', this.runId);
          result = await client.listRunArtifacts(this.runId!);
          break;
        case 'create-version':
          this.assertFlag(op, '--skill-id', this.skillId);
          this.assertPayload(op, payload);
          result = await client.createSkillVersion(this.skillId!, payload, this.idempotencyKey);
          break;
        case 'list-versions':
          this.assertFlag(op, '--skill-id', this.skillId);
          result = await client.listSkillVersions(this.skillId!);
          break;
        case 'get-version':
          this.assertFlag(op, '--skill-id', this.skillId);
          this.assertFlag(op, '--version', this.version);
          result = await client.getSkillVersion(this.skillId!, this.version!);
          break;
        case 'diff-versions':
          this.assertFlag(op, '--skill-id', this.skillId);
          this.assertFlag(op, '--from', this.from);
          this.assertFlag(op, '--to', this.to);
          result = await client.diffSkillVersions(this.skillId!, this.from!, this.to!);
          break;
        case 'rollback':
          this.assertFlag(op, '--skill-id', this.skillId);
          this.assertPayload(op, payload);
          result = await client.rollbackSkill(this.skillId!, payload, this.idempotencyKey);
          break;
        case 'promote':
          this.assertFlag(op, '--skill-id', this.skillId);
          this.assertPayload(op, payload);
          result = await client.promoteSkill(this.skillId!, payload, this.idempotencyKey);
          break;
        case 'create-test':
          this.assertPayload(op, payload);
          result = await client.createTestRun(payload, this.idempotencyKey);
          break;
        case 'get-test':
          this.assertFlag(op, '--test-run-id', this.testRunId);
          result = await client.getTestRun(this.testRunId!);
          break;
        case 'get-report':
          this.assertFlag(op, '--test-run-id', this.testRunId);
          result = await client.getTestReport(this.testRunId!);
          break;
        case 'evaluate-gate':
          this.assertPayload(op, payload);
          result = await client.evaluateGate(payload);
          break;
        default:
          this.context.stdout.write(`Error: Unsupported --op '${this.op}'\n`);
          return 1;
      }

      this.context.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    } catch (error) {
      this.context.stdout.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  }

  private async readPayloadIfAny(): Promise<unknown | undefined> {
    if (!this.payloadPath) return undefined;
    const raw = await fs.readFile(this.payloadPath, 'utf-8');
    return JSON.parse(raw);
  }

  private assertFlag(op: string, flag: string, value?: string): void {
    if (!value) {
      throw new Error(`Operation '${op}' requires ${flag}`);
    }
  }

  private assertPayload(op: string, payload: unknown): void {
    if (!payload) {
      throw new Error(`Operation '${op}' requires --payload <json-file>`);
    }
  }
}
