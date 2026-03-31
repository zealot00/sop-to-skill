export type ApiStrategy = 'local_only' | 'remote_first' | 'remote_only';

export interface OrchestratorClientOptions {
  baseUrl: string;
  token?: string;
  timeoutMs?: number;
}

export class OrchestratorError extends Error {
  status?: number;
  body?: unknown;

  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.name = 'OrchestratorError';
    this.status = status;
    this.body = body;
  }
}

export interface EnhanceExtractionRequest {
  source:
    | { type: 'inline_text'; content: string }
    | { type: 'file_uri'; uri: string };
  options?: {
    language?: 'auto' | 'zh' | 'en';
    confidenceThreshold?: number;
    roleConfigPath?: string;
    enableBoundaryDetection?: boolean;
  };
}

export interface EnhancedExtractionResponse {
  constraints: any[];
  decisions: any[];
  roles: Array<{ name: string; description?: string; mentions: number; source?: string }>;
  boundaries: Array<{ name: string; minValue?: number; maxValue?: number; defaultValue?: number; unit?: string; confidence: number }>;
  modelInfo: { provider: string; model: string; latencyMs: number };
}

export class OrchestratorClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly timeoutMs: number;

  constructor(options: OrchestratorClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.timeoutMs = options.timeoutMs ?? 8000;
  }

  async healthz() {
    return this.request<any>('GET', '/v1/healthz');
  }

  async enhanceExtraction(payload: EnhanceExtractionRequest) {
    return this.request<EnhancedExtractionResponse>('POST', '/v1/extraction/enhance', payload);
  }

  async createRun(payload: unknown, idempotencyKey?: string) {
    return this.request<any>('POST', '/v1/runs', payload, idempotencyKey);
  }

  async getRun(runId: string) {
    return this.request<any>('GET', `/v1/runs/${encodeURIComponent(runId)}`);
  }

  async listRunArtifacts(runId: string) {
    return this.request<any>('GET', `/v1/runs/${encodeURIComponent(runId)}/artifacts`);
  }

  async createSkillVersion(skillId: string, payload: unknown, idempotencyKey?: string) {
    return this.request<any>('POST', `/v1/skills/${encodeURIComponent(skillId)}/versions`, payload, idempotencyKey);
  }

  async listSkillVersions(skillId: string) {
    return this.request<any>('GET', `/v1/skills/${encodeURIComponent(skillId)}/versions`);
  }

  async getSkillVersion(skillId: string, version: string) {
    return this.request<any>('GET', `/v1/skills/${encodeURIComponent(skillId)}/versions/${encodeURIComponent(version)}`);
  }

  async diffSkillVersions(skillId: string, from: string, to: string) {
    return this.request<any>(
      'GET',
      `/v1/skills/${encodeURIComponent(skillId)}/diff?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
  }

  async rollbackSkill(skillId: string, payload: unknown, idempotencyKey?: string) {
    return this.request<any>('POST', `/v1/skills/${encodeURIComponent(skillId)}/rollback`, payload, idempotencyKey);
  }

  async promoteSkill(skillId: string, payload: unknown, idempotencyKey?: string) {
    return this.request<any>('POST', `/v1/skills/${encodeURIComponent(skillId)}/promote`, payload, idempotencyKey);
  }

  async createTestRun(payload: unknown, idempotencyKey?: string) {
    return this.request<any>('POST', '/v1/tests/runs', payload, idempotencyKey);
  }

  async getTestRun(testRunId: string) {
    return this.request<any>('GET', `/v1/tests/runs/${encodeURIComponent(testRunId)}`);
  }

  async getTestReport(testRunId: string) {
    return this.request<any>('GET', `/v1/tests/runs/${encodeURIComponent(testRunId)}/report`);
  }

  async evaluateGate(payload: unknown) {
    return this.request<any>('POST', '/v1/gates/evaluate', payload);
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    idempotencyKey?: string
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
      if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await response.text();
      const parsed = tryParseJson(text);

      if (!response.ok) {
        throw new OrchestratorError(`Orchestrator API error ${response.status}`, response.status, parsed ?? text);
      }

      return (parsed ?? ({} as T)) as T;
    } catch (error) {
      if (error instanceof OrchestratorError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new OrchestratorError(`Orchestrator API timeout after ${this.timeoutMs}ms`);
      }
      throw new OrchestratorError(error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timeout);
    }
  }
}

function tryParseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
