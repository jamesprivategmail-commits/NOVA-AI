/**
 * Nova personas — friendly names & one-line personalities layered on top of
 * the real provider/model ids. Presentation only: the underlying provider and
 * model ids (and every API call) stay exactly as they are.
 */

export type NovaProvider = 'groq' | 'cohere' | 'bazaarlink' | 'gemini';

export interface NovaPersona {
  /** Persona display name */
  name: string;
  /** One-line personality, shown under the name in the picker */
  personality: string;
  /** Original provider — the value actually sent to the API */
  provider: NovaProvider;
  /** Original model id — the value actually sent to the API */
  modelId: string;
  /** Short tagline of the underlying engine (kept for the detail view) */
  engine: string;
  /** Optional small emoji-free flavor word used as the picker subtitle */
  vibe: 'warm' | 'swift' | 'deep' | 'grounded' | 'visionary' | 'steady';
}

export const NOVA_PERSONAS: NovaPersona[] = [
  {
    name: 'Nova Prime',
    personality: 'The still point of the constellation. Reads the room, routes your question to the mind best built for it.',
    provider: 'groq',
    modelId: 'auto',
    engine: 'VOID Dynamic Router · Multi-Pool Failover',
    vibe: 'warm',
  },
  {
    name: 'Nova Swift',
    personality: 'First to answer, never first to stumble. Built for coding sprints, quick drafts and live back-and-forth.',
    provider: 'groq',
    modelId: 'qwen/qwen3.8-27b',
    engine: 'Groq LPUs · High Speed Reasoning',
    vibe: 'swift',
  },
  {
    name: 'Nova Sage',
    personality: 'Thinks before it speaks. Takes the long view, maps the whole architecture, then answers with care.',
    provider: 'groq',
    modelId: 'openai/gpt-oss-120b',
    engine: 'Groq LPUs · Deep Parameter Intelligence',
    vibe: 'deep',
  },
  {
    name: 'Nova Anchor',
    personality: 'Grounded and exact. Loves structure, clean citations, and getting the details right the first time.',
    provider: 'cohere',
    modelId: 'command-r-08-2024',
    engine: 'Cohere API · Enterprise Grounding',
    vibe: 'grounded',
  },
  {
    name: 'Nova Oracle',
    personality: 'Holds the long view. Vast context, sharp eyes, at home across text, images and everything between.',
    provider: 'gemini',
    modelId: 'gemini-2.5-flash',
    engine: 'Google AI · Next-Gen Multimodal Reasoning',
    vibe: 'visionary',
  },
  {
    name: 'Nova Steady',
    personality: 'The reliable understudy. Calm, honest answers, always on call when the others are busy.',
    provider: 'bazaarlink',
    modelId: 'bazaarlink-fast',
    engine: 'BazaarLink · Chain-of-Thought',
    vibe: 'steady',
  },
];

/** Find the persona behind a real provider + model id (falls back to Prime). */
export function getPersona(provider: NovaProvider | string | undefined, modelId: string | undefined): NovaPersona {
  return (
    NOVA_PERSONAS.find(p => p.provider === provider && p.modelId === modelId) ||
    NOVA_PERSONAS.find(p => p.provider === provider) ||
    NOVA_PERSONAS[0]
  );
}

/** Persona for a stored message that only recorded the provider. */
export function getPersonaForProvider(provider: string | undefined): NovaPersona {
  return (provider && NOVA_PERSONAS.find(p => p.provider === provider)) || NOVA_PERSONAS[0];
}

/** Time-of-day greeting used on the welcome hero. */
export function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Up late tonight';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

/** Well-crafted starter prompts for the hero prompt library. */
export const PROMPT_LIBRARY: { label: string; prompt: string }[] = [
  { label: 'Explain a hard idea simply', prompt: 'Explain quantum computing algorithms with interactive examples I can follow.' },
  { label: 'Design an API', prompt: 'Help me design a high-performance REST and WebSocket API architecture for a realtime chat product.' },
  { label: 'Audit my code', prompt: 'Audit my code for security vulnerabilities and suggest memory and performance optimizations.' },
  { label: 'Plan a project', prompt: 'Help me break a large side project into a realistic two-week plan with daily milestones.' },
  { label: 'Debug with me', prompt: 'Walk me through debugging a flaky async race condition step by step, asking me questions as we go.' },
  { label: 'Write with taste', prompt: 'Rewrite this paragraph so it sounds like a calm, confident human wrote it — keep my meaning, cut the filler.' },
  { label: 'Research a topic', prompt: 'Give me a structured briefing on the latest AI research breakthroughs, with what actually matters and why.' },
  { label: 'Make a decision', prompt: 'I need to choose between two options. Interview me with 5 sharp questions, then give a clear recommendation.' },
  { label: 'Learn something new', prompt: 'Teach me one genuinely new idea today in under five minutes, with one concrete way to use it.' },
  { label: 'Brainstorm names', prompt: 'Brainstorm 15 memorable names for a new product, grouped by vibe, with a one-line rationale each.' },
];
