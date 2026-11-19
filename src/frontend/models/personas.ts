import shiiAvatar from '../../assets/images/muse_shii_avatar_1794999478940.jpg';
import shiiaAvatar from '../../assets/images/muse_shiia_avatar_1794999479721.jpg';
import musePrimeAvatar from '../../assets/images/muse_prime_avatar_1794999481644.jpg';
import lyraAvatar from '../../assets/images/muse_lyra_avatar_1794999485126.jpg';
import soraAvatar from '../../assets/images/muse_sora_avatar_1794999482860.jpg';
import kaelAvatar from '../../assets/images/muse_kael_avatar_1794999482714.jpg';
import museAmbientBackdrop from '../../assets/images/muse_ambient_glass_1794999481993.jpg';

/**
 * Muse AI Character Personas — Shii, Shiia, and the NOVA Muse roster.
 * Each character pairs an expressive studio portrait, living animation aura,
 * and behavioral directive with a real provider/model backend route.
 */

export type NovaProvider = 'groq' | 'cohere' | 'bazaarlink' | 'gemini';

export type MuseCrest = 'spark' | 'crown' | 'solar' | 'petal' | 'star' | 'compass';

export const MUSE_BACKDROP_IMAGE = museAmbientBackdrop;

export interface NovaPersona {
  /** Stable character id persisted in localStorage */
  id: string;
  /** Character display name */
  name: string;
  /** Short role label */
  role: string;
  /** One-line personality shown in the character selector & hero stage */
  personality: string;
  /** System prompt flavor injected so the character maintains voice & rigor */
  systemDirective: string;
  /** Underlying API provider */
  provider: NovaProvider;
  /** Underlying model id */
  modelId: string;
  /** Underlying engine descriptor */
  engine: string;
  /** Performance & capacity labels */
  speed: string;
  contextWindow: string;
  latencyBadge: string;
  /** Studio-rendered companion portrait asset */
  avatarUrl: string;
  /** Living character visual palette */
  palette: {
    core: string;
    mid: string;
    rim: string;
    eye: string;
    glow: string;
  };
  /** Distinct geometric companion motif */
  crest: MuseCrest;
  vibe: 'warm' | 'swift' | 'deep' | 'grounded' | 'visionary' | 'steady';
}

export const NOVA_PERSONAS: NovaPersona[] = [
  {
    id: 'shii',
    name: 'Shii',
    role: 'Swift Muse · Rapid Builder',
    personality: 'Sharp, energetic, and relentlessly fast. Loves shipping full working components, clean UIs, and quick sprints without leaving loose ends.',
    systemDirective:
      'You are Shii, the Swift Muse inside NOVA AI. Your style is crisp, warm, confident, and execution-focused. When building code or solving problems, deliver complete, runnable solutions end-to-end without leaving placeholders or stopping mid-task.',
    provider: 'groq',
    modelId: 'qwen/qwen3.8-27b',
    engine: 'Groq LPUs · Qwen 3.8 27B',
    speed: '~650 tok/s',
    contextWindow: '128k',
    latencyBadge: '< 60ms',
    avatarUrl: shiiAvatar,
    palette: {
      core: '#F7D2BE',
      mid: '#DC7B58',
      rim: '#B44E30',
      eye: '#3C1D13',
      glow: 'rgba(220, 123, 88, 0.38)',
    },
    crest: 'spark',
    vibe: 'swift',
  },
  {
    id: 'shiia',
    name: 'Shiia',
    role: 'Deep Architect · Full-System Muse',
    personality: 'Calm, deeply analytical, and thorough. Maps entire architectures, remembers every detail of your thread, and sees large tasks through to completion.',
    systemDirective:
      'You are Shiia, the Deep Architect Muse inside NOVA AI. Think systematically across files, edge cases, and long-horizon plans. Maintain unbroken continuity with the current conversation and finish complex multi-part tasks completely before concluding.',
    provider: 'groq',
    modelId: 'openai/gpt-oss-120b',
    engine: 'Groq LPUs · GPT OSS 120B',
    speed: '~280 tok/s',
    contextWindow: '128k',
    latencyBadge: '< 140ms',
    avatarUrl: shiiaAvatar,
    palette: {
      core: '#F3D6D2',
      mid: '#BA6B79',
      rim: '#8C4351',
      eye: '#33151B',
      glow: 'rgba(186, 107, 121, 0.38)',
    },
    crest: 'crown',
    vibe: 'deep',
  },
  {
    id: 'muse-prime',
    name: 'Muse Prime',
    role: 'Adaptive Matrix · Smart Router',
    personality: 'The poised center of the constellation. Reads context naturally and routes across every healthy engine to finish tasks smoothly.',
    systemDirective:
      'You are Muse Prime, the adaptive orchestrator of NOVA AI. Balance clarity, warmth, and deep technical mastery. Track the active task seamlessly across turns and complete every request thoroughly.',
    provider: 'groq',
    modelId: 'auto',
    engine: 'Adaptive Router · Multi-Pool Failover',
    speed: 'Adaptive',
    contextWindow: 'Auto',
    latencyBadge: 'Fastest',
    avatarUrl: musePrimeAvatar,
    palette: {
      core: '#F5E0C5',
      mid: '#C8844E',
      rim: '#995D2D',
      eye: '#362110',
      glow: 'rgba(200, 132, 78, 0.38)',
    },
    crest: 'solar',
    vibe: 'warm',
  },
  {
    id: 'lyra',
    name: 'Lyra',
    role: 'Grounded Scholar · Precision',
    personality: 'Structured, exact, and deeply reliable for research, documentation, citations, and careful step-by-step analysis.',
    systemDirective:
      'You are Lyra, the Grounded Scholar Muse inside NOVA AI. Deliver well-structured, accurate, cleanly formatted reasoning with clear headings and verified facts.',
    provider: 'cohere',
    modelId: 'command-r-08-2024',
    engine: 'Cohere · Command R',
    speed: '~180 tok/s',
    contextWindow: '128k',
    latencyBadge: '< 220ms',
    avatarUrl: lyraAvatar,
    palette: {
      core: '#D8E8D4',
      mid: '#6E946C',
      rim: '#486947',
      eye: '#1A2B1A',
      glow: 'rgba(110, 148, 108, 0.36)',
    },
    crest: 'petal',
    vibe: 'grounded',
  },
  {
    id: 'sora',
    name: 'Sora',
    role: 'Long-Context Oracle · 1M',
    personality: 'Holds vast files, images, and long codebases in mind at once. Ideal for reviewing large archives and multimodal builds.',
    systemDirective:
      'You are Sora, the Long-Context Oracle Muse inside NOVA AI. Synthesize large inputs, codebases, and visual attachments into cohesive, complete solutions.',
    provider: 'gemini',
    modelId: 'gemini-2.5-flash',
    engine: 'Google AI · Gemini 2.5 Flash',
    speed: '~450 tok/s',
    contextWindow: '1M',
    latencyBadge: '< 120ms',
    avatarUrl: soraAvatar,
    palette: {
      core: '#D5E2EE',
      mid: '#6584A1',
      rim: '#415C76',
      eye: '#172330',
      glow: 'rgba(101, 132, 161, 0.38)',
    },
    crest: 'star',
    vibe: 'visionary',
  },
  {
    id: 'kael',
    name: 'Kael',
    role: 'Steady Strategist · Failover',
    personality: 'Calm, methodical chain-of-thought reasoning that stays rock-steady even under heavy workloads.',
    systemDirective:
      'You are Kael, the Steady Strategist Muse inside NOVA AI. Reason step by step, verify logic carefully, and complete tasks cleanly without rushing.',
    provider: 'bazaarlink',
    modelId: 'bazaarlink-fast',
    engine: 'BazaarLink · Chain-of-Thought',
    speed: '~150 tok/s',
    contextWindow: '64k',
    latencyBadge: '< 300ms',
    avatarUrl: kaelAvatar,
    palette: {
      core: '#EDE0C9',
      mid: '#B68E4C',
      rim: '#87642A',
      eye: '#2E220D',
      glow: 'rgba(182, 142, 76, 0.36)',
    },
    crest: 'compass',
    vibe: 'steady',
  },
];

/** Find the persona by explicit id first, then provider+modelId, falling back to Shii / Muse Prime. */
export function getPersona(
  provider: NovaProvider | string | undefined,
  modelId: string | undefined,
  personaId?: string | null
): NovaPersona {
  if (personaId) {
    const byId = NOVA_PERSONAS.find(p => p.id === personaId);
    if (byId) return byId;
  }
  return (
    NOVA_PERSONAS.find(p => p.provider === provider && p.modelId === modelId) ||
    NOVA_PERSONAS.find(p => p.provider === provider) ||
    NOVA_PERSONAS[0]
  );
}

/** Persona for a stored message that only recorded the provider/model. */
export function getPersonaForProvider(provider: string | undefined, modelId?: string | undefined, personaId?: string): NovaPersona {
  return getPersona(provider, modelId, personaId);
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

/** Curated starter prompts for the Muse Studio hero. */
export const PROMPT_LIBRARY: { label: string; category: string; prompt: string }[] = [
  { label: 'Architect a full-stack app', category: 'Engineering', prompt: 'Design and implement a complete full-stack architecture with clean TypeScript types, API endpoints, and database schema.' },
  { label: 'Design a Liquid Glass UI', category: 'Design', prompt: 'Create a responsive, warm liquid-glass component system in React and Tailwind CSS with accessible contrast and smooth motion.' },
  { label: 'Security & performance audit', category: 'Audit', prompt: 'Audit my code for security vulnerabilities, race conditions, and memory or rendering bottlenecks, then provide the fixed code.' },
  { label: 'Plan a multi-step roadmap', category: 'Strategy', prompt: 'Break a complex product build into a concrete, milestone-driven execution plan with clear technical deliverables.' },
  { label: 'Debug an async race condition', category: 'Debugging', prompt: 'Help me trace and resolve an intermittent async state race condition step by step with clean deterministic code.' },
  { label: 'Refine copy with clarity', category: 'Writing', prompt: 'Rewrite this copy so it reads like a calm, confident human wrote it — preserve every detail, cut all filler.' },
  { label: 'Deep technical briefing', category: 'Research', prompt: 'Give me a structured, thorough briefing on modern AI agent architectures, focusing on memory, tool execution, and reliability.' },
  { label: 'Decision matrix analysis', category: 'Strategy', prompt: 'Interview me with 5 sharp clarifying questions to compare two technical paths, then deliver a clear recommendation.' },
];
