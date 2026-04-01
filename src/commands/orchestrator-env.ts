const ORCHESTRATOR_API_ENV_KEYS = ['SOP_TO_SKILL_ORCHESTRATOR_API', 'MANAGING_UP_BASE_URL'] as const;
const ORCHESTRATOR_TOKEN_ENV_KEYS = [
  'SOP_TO_SKILL_ORCHESTRATOR_TOKEN',
  'MANAGING_UP_JWT_TOKEN',
  'MANAGING_UP_TOKEN',
] as const;

function firstDefinedEnv(keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

export function resolveOrchestratorApi(explicit?: string): string | undefined {
  if (explicit && explicit.trim().length > 0) {
    return explicit;
  }
  return firstDefinedEnv(ORCHESTRATOR_API_ENV_KEYS);
}

export function resolveOrchestratorToken(explicit?: string): string | undefined {
  if (explicit && explicit.trim().length > 0) {
    return explicit;
  }
  return firstDefinedEnv(ORCHESTRATOR_TOKEN_ENV_KEYS);
}

export const ORCHESTRATOR_API_ENV_HINT = ORCHESTRATOR_API_ENV_KEYS.join(' / ');
export const ORCHESTRATOR_TOKEN_ENV_HINT = ORCHESTRATOR_TOKEN_ENV_KEYS.join(' / ');
