export type AIProviderName = 'groq' | 'cohere' | 'bazaarlink' | 'gemini';

export interface ProviderTokenLimits {
  defaultCap: number;
  models?: Record<string, number>;
}

const PROVIDER_MAX_COMPLETION_TOKENS: Record<AIProviderName, ProviderTokenLimits> = {
  groq: {
    defaultCap: 16384,
    models: {
      'qwen/qwen3.8-27b': 16384,
      'openai/gpt-oss-120b': 16384,
      'openai/gpt-oss-20b': 16384,
      'openai/gpt-oss-safeguard-20b': 16384,
      'allam-2-7b': 4096,
      'llama-3.2-90b-vision-preview': 8192,
    },
  },
  cohere: {
    defaultCap: 4096,
    models: {
      'command-r-08-2024': 4096,
      'command-r-plus-08-2024': 4096,
      'command-r7b-12-2024': 4096,
    },
  },
  gemini: {
    defaultCap: 16384,
    models: {
      'gemini-2.5-flash': 16384,
      'gemini-2.5-pro': 16384,
      'gemini-2.5-flash-lite': 8192,
    },
  },
  bazaarlink: {
    defaultCap: 8192,
  },
};

/**
 * Clamp requested output tokens safely per provider and model so oversized tier
 * configuration values (e.g. 409600 in Firestore) never trigger HTTP 400 errors.
 */
export function clampTokensForModel(
  provider: AIProviderName,
  model: string | undefined,
  requestedTokens: number | undefined
): number {
  const safeRequested =
    typeof requestedTokens === 'number' && Number.isFinite(requestedTokens) && requestedTokens > 0
      ? Math.floor(requestedTokens)
      : 4096;

  const limits = PROVIDER_MAX_COMPLETION_TOKENS[provider];
  if (!limits) {
    return Math.max(256, Math.min(safeRequested, 8192));
  }

  const modelCap = model && limits.models?.[model] ? limits.models[model] : limits.defaultCap;
  return Math.max(256, Math.min(safeRequested, modelCap));
}

/**
 * Only permanently blacklist a model when the error explicitly indicates the model ID
 * does not exist or has been decommissioned — NEVER on transient 400 parameter/context errors.
 */
export function shouldBlacklistModelOnError(
  status: number | undefined,
  errorMessage: string
): boolean {
  const msg = String(errorMessage || '').toLowerCase();
  if (status === 404) return true;
  if (
    msg.includes('does not exist') ||
    msg.includes('decommissioned') ||
    msg.includes('model_not_found') ||
    msg.includes('unknown model') ||
    msg.includes('no longer supported')
  ) {
    return true;
  }
  return false;
}

export function isMaxTokensError(errorMessage: string): boolean {
  const msg = String(errorMessage || '').toLowerCase();
  return (
    msg.includes('max_tokens') ||
    msg.includes('max tokens') ||
    msg.includes('too_many_tokens') ||
    msg.includes('too many tokens')
  );
}

export function isPayloadOrContextError(status: number | undefined, errorMessage: string): boolean {
  const msg = String(errorMessage || '').toLowerCase();
  return (
    status === 413 ||
    msg.includes('context_length_exceeded') ||
    msg.includes('context length') ||
    msg.includes('reduce the length') ||
    msg.includes('request too large') ||
    msg.includes('payload too large') ||
    msg.includes('tokens per minute')
  );
}

export function isPermanentAuthKeyError(status: number | undefined, errorMessage: string): boolean {
  const msg = String(errorMessage || '').toLowerCase();
  return (
    status === 401 ||
    msg.includes('invalid api key') ||
    msg.includes('invalid_api_key') ||
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('unauthorized')
  );
}

/**
 * Deduplicate repeated boilerplate blocks and clamp oversized system prompts
 * (e.g., verbose Firestore brain configs) to protect provider TPM/context limits.
 */
export function compactSystemPrompt(prompt: string, maxChars: number = 6800): string {
  if (!prompt || typeof prompt !== 'string') return '';
  const paragraphs = prompt
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const para of paragraphs) {
    const fingerprint = para.toLowerCase().replace(/\s+/g, ' ').slice(0, 140);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    deduped.push(para);
  }

  let joined = deduped.join('\n\n');
  if (joined.length <= maxChars) return joined;

  // Preserve leading character directive + trailing continuity rules when trimming
  const headSize = Math.floor(maxChars * 0.62);
  const tailSize = maxChars - headSize - 40;
  return `${joined.slice(0, headSize).trim()}\n\n[...context compacted...]\n\n${joined.slice(-tailSize).trim()}`;
}

/**
 * Compact conversation messages when a provider rejects payload size (413 / context limit).
 */
export function compactMessagesForRetry<T extends { role: string; text?: string; content?: string }>(
  messages: T[],
  keepRecent: number = 8,
  maxCharsPerMsg: number = 2200
): T[] {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  const sliced = messages.slice(-keepRecent);
  return sliced.map((m) => {
    const raw = String(m.text ?? m.content ?? '');
    if (raw.length <= maxCharsPerMsg) return m;
    const trimmed = `${raw.slice(0, maxCharsPerMsg - 30)}\n[...truncated for context...]`;
    return {
      ...m,
      ...(m.text !== undefined ? { text: trimmed } : {}),
      ...(m.content !== undefined ? { content: trimmed } : {}),
    };
  });
}
