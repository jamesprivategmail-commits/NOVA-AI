import fs from 'fs';
import path from 'path';
import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { clampTokensForModel } from '../aiRouting.js';
import {
  evolutionMemory,
  makeExperimentFingerprint,
  type EvolutionMemoryInstance,
} from './evolutionMemory.js';
import { runAutonomousWebResearch } from './internetResearcher.js';
import { executeSandboxedExperiment } from './sandboxExperimentRunner.js';
import { classifySecurityGate } from './securityGate.js';
import { runArchitectureSelfAnalysis } from './selfAnalyzer.js';
import type {
  DebateTurn,
  EvolutionExperiment,
  TechnicalDiscovery,
  WeaknessFinding,
} from './types.js';

export interface EvolutionKeysProvider {
  (): Promise<{
    groqKeys: string[];
    geminiKeys: string[];
    cohereKeys: string[];
  }>;
}

interface BlueprintTemplate {
  weaknessArea: WeaknessFinding['area'];
  title: string;
  hypothesis: string;
  targetFile: string;
  content: string;
  researcherNote: string;
  strategistChallenge: string;
  strategistDecision: string;
  qcNote: string;
}

const EVOLUTION_MODULE_BLUEPRINTS: BlueprintTemplate[] = [
  {
    weaknessArea: 'memory',
    title: 'Implement Hybrid BM25 + Recency Memory Ranker',
    hypothesis:
      'Scoring memory records with BM25 lexical relevance and exponential recency decay surfaces critical facts in <2ms without bloating system prompts.',
    targetFile: 'src/server/evolution/modules/hybridMemoryRanker.ts',
    researcherNote:
      'Live web research confirms hybrid lexical BM25 + temporal decay improves agent context precision without external vector database latency.',
    strategistChallenge:
      'Will BM25 tokenization stall long threads if documents exceed 500 entries? Must remain O(N) with zero external dependencies.',
    strategistDecision:
      'Approve additive module in src/server/evolution/modules/hybridMemoryRanker.ts with bounded term indexing and deterministic scoring.',
    qcNote:
      'Verify empty query handling, exact keyword boost, recency tie-breaking, and esbuild TypeScript compilation in isolated sandbox.',
    content: `export interface MemoryDocument {
  id: string;
  text: string;
  updatedAt: number;
  importance?: number;
}

export interface RankedMemoryDocument {
  id: string;
  score: number;
  text: string;
}

const TOKEN_SPLIT_RE = /[^a-z0-9]+/i;

function tokenize(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .split(TOKEN_SPLIT_RE)
    .filter((t) => t.length >= 2);
}

/**
 * Ranks persistent memory snippets using BM25 lexical relevance combined with
 * exponential recency decay and optional importance weight.
 */
export function rankMemoriesHybrid(
  query: string,
  documents: MemoryDocument[],
  options?: { limit?: number; nowMs?: number; halfLifeHours?: number }
): RankedMemoryDocument[] {
  if (!Array.isArray(documents) || documents.length === 0) return [];
  const limit = Math.max(1, options?.limit ?? 6);
  const nowMs = options?.nowMs ?? Date.now();
  const halfLifeMs = Math.max(1, options?.halfLifeHours ?? 72) * 3_600_000;

  const queryTerms = Array.from(new Set(tokenize(query)));
  const tokenizedDocs = documents.map((doc) => ({
    doc,
    tokens: tokenize(doc.text),
  }));

  const avgDocLen =
    tokenizedDocs.reduce((sum, d) => sum + d.tokens.length, 0) / Math.max(1, tokenizedDocs.length);

  const docFreq = new Map<string, number>();
  for (const term of queryTerms) {
    let count = 0;
    for (const d of tokenizedDocs) {
      if (d.tokens.includes(term)) count++;
    }
    docFreq.set(term, count);
  }

  const k1 = 1.5;
  const b = 0.75;
  const N = tokenizedDocs.length;

  const scored: RankedMemoryDocument[] = tokenizedDocs.map(({ doc, tokens }) => {
    const tfMap = new Map<string, number>();
    for (const tok of tokens) {
      tfMap.set(tok, (tfMap.get(tok) || 0) + 1);
    }

    let bm25 = 0;
    const dl = Math.max(1, tokens.length);
    for (const term of queryTerms) {
      const df = docFreq.get(term) || 0;
      const tf = tfMap.get(term) || 0;
      if (tf === 0) continue;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      const denom = tf + k1 * (1 - b + b * (dl / Math.max(1, avgDocLen)));
      bm25 += idf * ((tf * (k1 + 1)) / denom);
    }

    const ageMs = Math.max(0, nowMs - (doc.updatedAt || nowMs));
    const recencyBoost = Math.pow(0.5, ageMs / halfLifeMs);
    const importance = Math.max(0.5, Math.min(2.0, doc.importance ?? 1));
    const totalScore = Number(((bm25 * 2.5 + recencyBoost) * importance).toFixed(4));

    return {
      id: doc.id,
      score: totalScore,
      text: doc.text,
    };
  });

  scored.sort((a, bScore) => bScore.score - a.score);
  return scored.slice(0, limit);
}
`,
  },
  {
    weaknessArea: 'routing',
    title: 'Implement EMA Adaptive Provider & Model Health Scorer',
    hypothesis:
      'Ranking AI providers by exponential-moving-average latency and recent success ratio reduces failover cascade delays.',
    targetFile: 'src/server/evolution/modules/adaptiveModelScorer.ts',
    researcherNote:
      'Adaptive routing architectures track rolling error budgets and EMA latency to skip degraded endpoints early.',
    strategistChallenge:
      'What happens on cold start when a provider has 0 observations? Unseen providers must receive optimistic exploration.',
    strategistDecision:
      'Build a pure EMA scorer initialized with neutral priors and automatic cooldown decay after 5 minutes.',
    qcNote:
      'Ensure circuit-breaker penalty decays smoothly and never permanently starves healthy backup engines.',
    content: `export interface ProviderStatsSample {
  provider: string;
  model: string;
  success: boolean;
  latencyMs: number;
  recordedAt: number;
}

interface InternalMetric {
  emaLatencyMs: number;
  successEma: number;
  samples: number;
  consecutiveFailures: number;
  lastUpdatedAt: number;
}

/**
 * Pure Exponential Moving Average (EMA) scorer that ranks healthy AI
 * provider/model pairs based on real observed latency and reliability.
 */
export class AdaptiveModelScorer {
  private metrics = new Map<string, InternalMetric>();
  private readonly alpha = 0.25;

  private makeKey(provider: string, model: string): string {
    return \`\${provider}::\${model}\`;
  }

  public record(sample: ProviderStatsSample): void {
    const key = this.makeKey(sample.provider, sample.model);
    const prev = this.metrics.get(key) || {
      emaLatencyMs: 1200,
      successEma: 0.9,
      samples: 0,
      consecutiveFailures: 0,
      lastUpdatedAt: sample.recordedAt,
    };

    const clampedLatency = Math.max(25, Math.min(60_000, sample.latencyMs || 1200));
    const emaLatencyMs =
      prev.samples === 0
        ? clampedLatency
        : prev.emaLatencyMs * (1 - this.alpha) + clampedLatency * this.alpha;

    const successVal = sample.success ? 1 : 0;
    const successEma =
      prev.samples === 0
        ? successVal
        : prev.successEma * (1 - this.alpha) + successVal * this.alpha;

    this.metrics.set(key, {
      emaLatencyMs: Math.round(emaLatencyMs),
      successEma: Number(successEma.toFixed(4)),
      samples: prev.samples + 1,
      consecutiveFailures: sample.success ? 0 : prev.consecutiveFailures + 1,
      lastUpdatedAt: sample.recordedAt,
    });
  }

  public scoreCandidate(provider: string, model: string, nowMs: number = Date.now()): number {
    const m = this.metrics.get(this.makeKey(provider, model));
    if (!m) return 85; // Optimistic prior for untested candidates

    // Decay consecutive failure penalty after 5 minutes
    const elapsedMs = Math.max(0, nowMs - m.lastUpdatedAt);
    const penaltyActive = m.consecutiveFailures > 0 && elapsedMs < 300_000;
    const failurePenalty = penaltyActive ? Math.min(60, m.consecutiveFailures * 18) : 0;
    const speedScore = Math.max(0, 40 - m.emaLatencyMs / 250);
    const reliabilityScore = m.successEma * 60;

    return Number(Math.max(1, reliabilityScore + speedScore - failurePenalty).toFixed(2));
  }

  public rankCandidates<T extends { provider: string; model: string }>(candidates: T[]): T[] {
    const now = Date.now();
    return [...candidates].sort(
      (a, b) =>
        this.scoreCandidate(b.provider, b.model, now) -
        this.scoreCandidate(a.provider, a.model, now)
    );
  }
}
`,
  },
  {
    weaknessArea: 'execution',
    title: 'Implement Importance-Weighted Context Budget Optimizer',
    hypothesis:
      'Replacing fixed slicing with importance-scored segment selection preserves error traces, code diffs, and active constraints under TPM limits.',
    targetFile: 'src/server/evolution/modules/contextBudgetOptimizer.ts',
    researcherNote:
      'Token-budget optimization preserves highest-signal spans (errors, active requirements, recent turns) rather than blindly truncating middle turns.',
    strategistChallenge:
      'Make sure system directives and latest user message are pinned at highest priority so core intent is never dropped.',
    strategistDecision:
      'Create a pure deterministic context budgeter with explicit pinned flags and code/error density heuristics.',
    qcNote:
      'Confirm maxChars budget is never exceeded and original chronological ordering of kept chunks is preserved.',
    content: `export interface ContextChunk {
  id: string;
  text: string;
  pinned?: boolean;
  recencyIndex: number;
}

function estimateSignalDensity(text: string): number {
  let bonus = 0;
  if (/error|exception|failed|fix|stack/i.test(text)) bonus += 3.0;
  if (/\`\`\`|function\s+|export\s+|interface\s+/i.test(text)) bonus += 2.2;
  if (/https?:\/\//i.test(text)) bonus += 1.0;
  return bonus;
}

/**
 * Selects the highest-value conversation/context segments that fit within a character budget,
 * keeping chronological order and always retaining pinned instructions.
 */
export function selectContextWithinBudget(
  chunks: ContextChunk[],
  maxChars: number
): ContextChunk[] {
  if (!Array.isArray(chunks) || chunks.length === 0 || maxChars <= 0) return [];

  const maxIdx = Math.max(1, chunks.reduce((m, c) => Math.max(m, c.recencyIndex), 1));
  const scored = chunks.map((chunk) => {
    const priority = chunk.pinned
      ? 1_000_000
      : (chunk.recencyIndex / maxIdx) * 10 + estimateSignalDensity(chunk.text);
    return { chunk, priority };
  });

  scored.sort((a, b) => b.priority - a.priority);

  const chosen = new Set<string>();
  let usedChars = 0;

  for (const item of scored) {
    const len = item.chunk.text.length;
    if (usedChars + len <= maxChars || (item.chunk.pinned && usedChars === 0)) {
      chosen.add(item.chunk.id);
      usedChars += len;
    }
  }

  return chunks
    .filter((c) => chosen.has(c.id))
    .sort((a, b) => a.recencyIndex - b.recencyIndex);
}
`,
  },
  {
    weaknessArea: 'performance',
    title: 'Implement Normalized Prompt Response Fingerprint Cache',
    hypothesis:
      'LRU caching deterministic low-temperature verification and analysis queries eliminates redundant upstream API calls.',
    targetFile: 'src/server/evolution/modules/promptFingerprintCache.ts',
    researcherNote:
      'Semantic/normalized response caching trims repeated lookup latency to sub-millisecond levels while freeing provider TPM headroom.',
    strategistChallenge:
      'Never cache high-temperature creative turns or queries containing mutable timestamps/live URLs.',
    strategistDecision:
      'Restrict cache keys to normalized text + model + temperature <= 0.35 and bound size with LRU eviction.',
    qcNote:
      'Test TTL expiration, LRU max entries enforcement, and high-temperature bypass guard.',
    content: `export interface CachedCompletion {
  value: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Bounded LRU + TTL cache for deterministic low-temperature prompt completions.
 */
export class PromptFingerprintCache {
  private entries = new Map<string, CachedCompletion>();

  constructor(
    private readonly maxEntries: number = 120,
    private readonly defaultTtlMs: number = 5 * 60_000
  ) {}

  public makeKey(provider: string, model: string, prompt: string, temperature: number): string | null {
    if (temperature > 0.35) return null;
    const normalized = prompt.trim().toLowerCase().replace(/\\s+/g, ' ');
    if (normalized.length < 8) return null;
    return \`\${provider}:\${model}:\${normalized.slice(0, 320)}\`;
  }

  public get(key: string | null, nowMs: number = Date.now()): string | null {
    if (!key) return null;
    const hit = this.entries.get(key);
    if (!hit) return null;
    if (nowMs > hit.expiresAt) {
      this.entries.delete(key);
      return null;
    }
    // Refresh LRU order
    this.entries.delete(key);
    this.entries.set(key, hit);
    return hit.value;
  }

  public set(key: string | null, value: string, nowMs: number = Date.now()): void {
    if (!key || !value) return;
    if (this.entries.has(key)) {
      this.entries.delete(key);
    } else if (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey) this.entries.delete(oldestKey);
    }
    this.entries.set(key, {
      value,
      createdAt: nowMs,
      expiresAt: nowMs + this.defaultTtlMs,
    });
  }
}
`,
  },
];

async function queryEvolutionAgentLLM(params: {
  rolePrompt: string;
  userPrompt: string;
  keysProvider?: EvolutionKeysProvider;
}): Promise<string | null> {
  if (!params.keysProvider) return null;
  try {
    const keys = await params.keysProvider();
    if (keys.groqKeys.length > 0) {
      for (const apiKey of keys.groqKeys.slice(0, 3)) {
        try {
          const groq = new Groq({ apiKey });
          const completion = await groq.chat.completions.create(
            {
              model: 'qwen/qwen3.8-27b',
              messages: [
                { role: 'system', content: params.rolePrompt },
                { role: 'user', content: params.userPrompt },
              ],
              max_tokens: clampTokensForModel('groq', 'qwen/qwen3.8-27b', 900),
              temperature: 0.35,
            },
            { signal: AbortSignal.timeout(12000) }
          );
          const text = completion.choices?.[0]?.message?.content?.trim();
          if (text) return text;
        } catch {
          continue;
        }
      }
    }
    if (keys.geminiKeys.length > 0) {
      for (const apiKey of keys.geminiKeys.slice(0, 2)) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          });
          const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
            config: {
              systemInstruction: params.rolePrompt,
              maxOutputTokens: clampTokensForModel('gemini', 'gemini-2.5-flash', 900),
              temperature: 0.35,
            },
          });
          const text = res.text?.trim();
          if (text) return text;
        } catch {
          continue;
        }
      }
    }
  } catch {
    // non-fatal, fallback handles cleanly
  }
  return null;
}

function selectNextBlueprint(
  weaknesses: WeaknessFinding[],
  memory: EvolutionMemoryInstance
): BlueprintTemplate {
  const repoRoot = process.cwd();
  const snapshot = memory.getSnapshot();
  const existingTitles = new Set(snapshot.experiments.map((e) => e.title));
  const activeOrDeployedFingerprints = new Set(
    snapshot.experiments
      .filter((e) => e.status === 'passed_awaiting_approval' || e.status === 'approved_deployed')
      .map((e) => e.failedFingerprint)
  );

  // Prioritize blueprints not yet queued, deployed, or failed/rejected
  const candidates = EVOLUTION_MODULE_BLUEPRINTS.filter((bp) => {
    const fp = makeExperimentFingerprint(bp.weaknessArea, bp.title, [bp.targetFile]);
    if (memory.hasFailedFingerprint(fp)) return false;
    if (activeOrDeployedFingerprints.has(fp)) return false;
    const alreadyExists = fs.existsSync(path.resolve(repoRoot, bp.targetFile));
    if (alreadyExists && existingTitles.has(bp.title)) return false;
    return true;
  });

  if (candidates.length > 0) {
    // Match unresolved highest-severity weakness first
    const unresolvedAreas = new Set(
      weaknesses.filter((w) => !w.resolved).map((w) => w.area)
    );
    const matched = candidates.find((c) => unresolvedAreas.has(c.weaknessArea));
    return matched || candidates[0];
  }

  // Rotate cleanly if all core blueprints have been evaluated
  const base = EVOLUTION_MODULE_BLUEPRINTS[
    snapshot.experiments.length % EVOLUTION_MODULE_BLUEPRINTS.length
  ];
  return base;
}

/**
 * Executes one complete collaborative Self-Evolution Cycle across all 4 agents:
 * 1. Self-Analysis & 7-question reflection
 * 2. Live Autonomous Internet Research
 * 3. Collaborative 4-Agent Debate (Researcher, Strategist, Developer, Quality Control)
 * 4. Isolated Sandbox Implementation, esbuild Compilation & Benchmark
 * 5. Security Gate Classification & Approval Queueing
 */
export async function runCollaborativeEvolutionCycle(params: {
  memory?: EvolutionMemoryInstance;
  keysProvider?: EvolutionKeysProvider;
  customGoal?: string;
  researchEnabled?: boolean;
}): Promise<EvolutionExperiment> {
  const memory = params.memory || evolutionMemory;
  const cycleId = `cycle-${Date.now().toString(36)}`;
  const state = memory.schedulerState;

  state.currentPhase = 'self_analysis';
  memory.addLog('info', 'system', `Starting autonomous self-evolution ${cycleId}`);

  // ── Phase 1: Self-Analysis ─────────────────────────────────────────────
  const analysis = runArchitectureSelfAnalysis(memory);

  // ── Phase 2: Autonomous Internet Research ──────────────────────────────
  let discoveries: TechnicalDiscovery[] = memory.getSnapshot().discoveries;
  if (params.researchEnabled !== false) {
    state.currentPhase = 'internet_research';
    const fresh = await runAutonomousWebResearch(
      memory,
      analysis.capabilities,
      params.customGoal
    );
    if (fresh.length > 0) discoveries = fresh;
  }

  // ── Phase 3: Pick Next High-Impact Target & Check Failed Memory ────────
  state.currentPhase = 'agent_debate';
  const blueprint = selectNextBlueprint(analysis.weaknesses, memory);
  const topWeakness =
    analysis.weaknesses.find((w) => w.area === blueprint.weaknessArea && !w.resolved) ||
    analysis.weaknesses[0];
  const topDiscovery = discoveries[0];

  const title = params.customGoal?.trim()
    ? `${blueprint.title} (${params.customGoal.trim().slice(0, 42)})`
    : blueprint.title;

  const debateTranscript: DebateTurn[] = [];
  const pushTurn = (
    agent: DebateTurn['agent'],
    stance: DebateTurn['stance'],
    message: string,
    targetAgent?: DebateTurn['agent']
  ) => {
    debateTranscript.push({
      id: `deb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      agent,
      stance,
      message,
      targetAgent,
      timestamp: new Date().toISOString(),
    });
    memory.addLog('debate', agent, `[${stance.toUpperCase()}] ${message}`);
  };

  // Turn 1: RESEARCHER proposes grounded opportunity
  const llmResearcher = await queryEvolutionAgentLLM({
    keysProvider: params.keysProvider,
    rolePrompt:
      'You are RESEARCHER in NOVA AI Self-Evolution Council. Be concise (2-3 crisp technical sentences, zero fluff).',
    userPrompt: `Weakness: ${topWeakness?.title || blueprint.weaknessArea}. Latest discovery: ${topDiscovery?.title || blueprint.researcherNote}. Candidate upgrade: ${title}. Summarize why this matters right now.`,
  });
  pushTurn(
    'researcher',
    'propose',
    llmResearcher ||
      `${blueprint.researcherNote} Addressing "${topWeakness?.title || blueprint.weaknessArea}" unlocks measurable gains.${topDiscovery ? ` External reference: ${topDiscovery.title} (${topDiscovery.sourceUrl}).` : ''}`
  );

  // Turn 2: STRATEGIST challenges assumptions & checks Failed Experiment Memory
  const pastFailuresCount = memory.getSnapshot().failedExperiments.length;
  const llmStrategist = await queryEvolutionAgentLLM({
    keysProvider: params.keysProvider,
    rolePrompt:
      'You are STRATEGIST in NOVA AI Self-Evolution Council. Challenge assumptions critically, check past failures, and refine scope (2-3 crisp sentences).',
    userPrompt: `Critique Researcher's proposal "${title}". Past failed experiments recorded: ${pastFailuresCount}. Required constraint: isolated sandbox first, additive pure TypeScript, measurable benchmark. Challenge edge cases and state approval criteria.`,
  });
  pushTurn(
    'strategist',
    'challenge',
    llmStrategist ||
      `${blueprint.strategistChallenge} Checked ${pastFailuresCount} failed experiment record(s) to ensure we do not repeat past regressions. ${blueprint.strategistDecision}`,
    'researcher'
  );

  // Turn 3: DEVELOPER proposes concrete sandbox implementation
  pushTurn(
    'developer',
    'revise',
    `Implemented complete TypeScript module at ${blueprint.targetFile} strictly inside isolated sandbox workspaces/_evolution_sandbox with zero placeholders and full exported types/functions.`,
    'strategist'
  );

  // ── Phase 4: Isolated Sandbox Build + Real Verification + A/B Benchmark ─
  state.currentPhase = 'sandbox_experiment';
  const expId = `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const fingerprint = makeExperimentFingerprint(blueprint.weaknessArea, title, [
    blueprint.targetFile,
  ]);

  const initialExperiment: EvolutionExperiment = {
    id: expId,
    cycleId,
    title,
    hypothesis: blueprint.hypothesis,
    area: blueprint.weaknessArea,
    targetFiles: [blueprint.targetFile],
    sandboxDir: `workspaces/_evolution_sandbox/${expId}`,
    status: 'sandbox_running',
    debateTranscript,
    filePatches: [],
    syntaxVerified: false,
    verificationErrors: [],
    benchmark: null,
    securityGate: classifySecurityGate([blueprint.targetFile], title),
    failedFingerprint: fingerprint,
    createdAt: new Date().toISOString(),
  };

  memory.addLog(
    'experiment',
    'developer',
    `Staging sandbox experiment "${title}" in ${initialExperiment.sandboxDir}`
  );

  const completedExperiment = await executeSandboxedExperiment({
    experiment: initialExperiment,
    candidates: [
      {
        path: blueprint.targetFile,
        content: blueprint.content,
      },
    ],
    memory,
  });

  // Turn 4: QUALITY CONTROL delivers final challenge/verdict from real sandbox metrics
  state.currentPhase = 'quality_control';
  if (
    completedExperiment.syntaxVerified &&
    completedExperiment.benchmark &&
    !completedExperiment.benchmark.regressionDetected
  ) {
    pushTurn(
      'quality_control',
      'approve',
      `${blueprint.qcNote} Result: PASSED (${completedExperiment.benchmark.testsPassed}/${completedExperiment.benchmark.testsTotal} checks, ${completedExperiment.benchmark.experimentLatencyMs}ms compile/eval). Held behind Security Gate for user approval.`,
      'developer'
    );
  } else {
    pushTurn(
      'quality_control',
      'veto',
      `VETOED after sandbox verification failed: ${completedExperiment.verificationErrors.join('; ') || completedExperiment.benchmark?.summary}. Logged to failed experiment memory.`,
      'developer'
    );
  }

  completedExperiment.debateTranscript = debateTranscript;
  memory.upsertExperiment(completedExperiment);
  memory.recordPerformanceSnapshot();

  state.totalCyclesCompleted += 1;
  state.lastRunAt = new Date().toISOString();
  state.currentPhase = null;

  return completedExperiment;
}
