import { OrchestratorClient, type ApiStrategy } from '../orchestrator/client.js';
import type { ExtractorOutput } from '../extractor/index.js';

export interface ResolveExtractionOptions {
  strategy: ApiStrategy;
  orchestratorApi?: string;
  orchestratorToken?: string;
  apiTimeoutMs?: number;
  language?: 'auto' | 'zh' | 'en';
  confidenceThreshold?: number;
  roleConfigPath?: string;
  enableBoundaryDetection?: boolean;
  onInfo?: (msg: string) => void;
}

export async function resolveExtraction(
  content: string,
  localFn: () => ExtractorOutput,
  options: ResolveExtractionOptions
): Promise<ExtractorOutput> {
  if (options.strategy === 'local_only') {
    return localFn();
  }

  if (!options.orchestratorApi) {
    if (options.strategy === 'remote_only') {
      throw new Error('Orchestrator API is required when --api-strategy=remote_only');
    }
    options.onInfo?.('Orchestrator API not configured; fallback to local extraction.');
    return localFn();
  }

  const client = new OrchestratorClient({
    baseUrl: options.orchestratorApi,
    token: options.orchestratorToken,
    timeoutMs: options.apiTimeoutMs,
  });

  const request = {
    source: { type: 'inline_text' as const, content },
    options: {
      language: options.language,
      confidenceThreshold: options.confidenceThreshold,
      roleConfigPath: options.roleConfigPath,
      enableBoundaryDetection: options.enableBoundaryDetection,
    },
  };

  try {
    const remote = await client.enhanceExtraction(request);
    return mapRemoteExtraction(remote);
  } catch (error) {
    if (options.strategy === 'remote_only') {
      throw error;
    }
    options.onInfo?.(`Remote enhancement failed; fallback to local extraction. Reason: ${error instanceof Error ? error.message : String(error)}`);
    return localFn();
  }
}

function mapRemoteExtraction(remote: any): ExtractorOutput {
  const roles: Record<string, { name: string; description: string; mentions: number; source: string }> = {};
  for (const role of remote.roles || []) {
    const key = normalizeRoleKey(role.name || 'unknown');
    roles[key] = {
      name: role.name || key,
      description: role.description || role.name || key,
      mentions: Number(role.mentions || 0),
      source: role.source || 'remote',
    };
  }

  const boundaries: Record<string, any> = {};
  for (const boundary of remote.boundaries || []) {
    boundaries[boundary.name] = boundary;
  }

  return {
    constraints: (remote.constraints || []) as any[],
    decisions: (remote.decisions || []) as any[],
    parameters: [],
    sources: [{ type: 'sop', fileName: 'remote' }],
    roles,
    boundaries,
    subjective_judgments: [],
    ambiguity_notes: [],
  };
}

function normalizeRoleKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'role';
}
