import fs from 'fs';
import path from 'path';
import { Groq } from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { CohereClient } from 'cohere-ai';
import { AI_CONFIG } from '../../config/ai';

/**
 * NOVA CORE BRAIN
 * Nova's own self-evolving learning layer:
 *  - Model Council: runs a user message through multiple providers in parallel and synthesizes the best answer.
 *  - Distillation: extracts reusable insights from each council run and persists them to learnings.json.
 *  - Identity: wraps any base system prompt with Nova's identity, distilled knowledge, and learned strategies.
 */

export interface ProviderKeys {
  groqKeys: string[];
  geminiKeys: string[];
  cohereKeys: string[];
}

export interface CouncilContext {
  keys: ProviderKeys;
  maxTokens?: number;
  temperature?: number;
}

export interface CouncilCandidate {
  provider: 'groq' | 'gemini' | 'cohere';
  model: string;
  text: string;
  score: number;
  latencyMs: number;
  error?: string;
}

export interface CouncilResult {
  answer: string;
  winner: CouncilCandidate['provider'] | 'merged' | 'none';
  reason: string;
  candidates: CouncilCandidate[];
  mergedPoints: string[];
}

export interface LearningEntry {
  id: string;
  timestamp: number;
  winner: string;
  reason: string;
  insights: string[];
}

export interface BrainStats {
  councilRuns: number;
  providerWins: Record<string, number>;
  learnings: number;
  lastDistill: number | null;
}

const LEARNINGS_PATH = path.join(process.cwd(), 'src', 'server', 'brain', 'learnings.json');
const MAX_LEARNINGS = 2000;
const DISTILL_MAX_INSIGHTS = 40;
const WRITE_DEBOUNCE_MS = 2000;

class CoreBrain {
  private learnings: LearningEntry[] = [];
  private loaded = false;
  private writeTimer: NodeJS.Timeout | null = null;
  private councilRuns = 0;
  private providerWins: Record<string, number> = {};
  private lastDistill: number | null = null;
  private lastDistilledSummary = '';

  // ---------------------------------------------------------------- persistence

  private loadLearnings(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (fs.existsSync(LEARNINGS_PATH)) {
        const raw = JSON.parse(fs.readFileSync(LEARNINGS_PATH, 'utf8'));
        if (Array.isArray(raw)) {
          this.learnings = raw.slice(-MAX_LEARNINGS);
        }
      }
    } catch (err: any) {
      console.warn('[CoreBrain] Could not load learnings.json:', err.message || err);
    }
  }

  private schedulePersist(): void {
    if (this.writeTimer) return;
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      try {
        fs.mkdirSync(path.dirname(LEARNINGS_PATH), { recursive: true });
        fs.writeFileSync(LEARNINGS_PATH, JSON.stringify(this.learnings, null, 2), 'utf8');
      } catch (err: any) {
        console.warn('[CoreBrain] Could not persist learnings.json:', err.message || err);
      }
    }, WRITE_DEBOUNCE_MS);
  }

  // ---------------------------------------------------------------- learning

  public getLearnings(): LearningEntry[] {
    this.loadLearnings();
    return [...this.learnings];
  }

  public recordLearning(entry: Omit<LearningEntry, 'id' | 'timestamp'>): LearningEntry {
    this.loadLearnings();

    const insights = entry.insights.map((i) => i.trim()).filter(Boolean);
    const fingerprint = `${entry.winner}|${entry.reason}|${insights.join('|')}`;

    // Dedupe against existing entries
    const isDuplicate = this.learnings.some(
      (l) => `${l.winner}|${l.reason}|${l.insights.join('|')}` === fingerprint
    );
    if (isDuplicate) {
      return this.learnings[this.learnings.length - 1];
    }

    const learning: LearningEntry = {
      id: `learning-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      winner: entry.winner,
      reason: entry.reason,
      insights,
    };

    this.learnings.push(learning);
    if (this.learnings.length > MAX_LEARNINGS) {
      this.learnings = this.learnings.slice(-MAX_LEARNINGS);
    }

    this.schedulePersist();
    return learning;
  }

  /**
   * Compress learnings into a compact "core knowledge" summary string
   * injected into Nova's system prompt.
   */
  public distill(): string {
    this.loadLearnings();
    this.lastDistill = Date.now();

    if (this.learnings.length === 0) {
      this.lastDistilledSummary = '';
      return '';
    }

    // Count insight frequency: insights that repeat across runs are most reliable
    const insightCounts = new Map<string, number>();
    for (const l of this.learnings) {
      for (const insight of l.insights) {
        insightCounts.set(insight, (insightCounts.get(insight) || 0) + 1);
      }
    }

    const topInsights = [...insightCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, DISTILL_MAX_INSIGHTS)
      .map(([insight, count]) => `- ${insight}${count > 1 ? ` (seen ${count}x)` : ''}`);

    const winCounts: Record<string, number> = {};
    for (const l of this.learnings) {
      winCounts[l.winner] = (winCounts[l.winner] || 0) + 1;
    }
    const dominantProvider =
      Object.entries(winCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

    this.lastDistilledSummary = [
      `[NOVA CORE KNOWLEDGE — distilled from ${this.learnings.length} council runs]:`,
      `- Most reliable provider so far: ${dominantProvider}`,
      '- Learned strategies (prefer these over re-deriving):',
      ...topInsights,
    ].join('\n');

    return this.lastDistilledSummary;
  }

  // ---------------------------------------------------------------- model council

  public async runCouncil(userMessage: string, ctx: CouncilContext): Promise<CouncilResult> {
    this.loadLearnings();
    const { keys, maxTokens = 2048, temperature = 0.3 } = ctx;

    const tasks: Array<Promise<CouncilCandidate>> = [];

    if (keys.groqKeys.length > 0) tasks.push(this.callGroq(userMessage, keys.groqKeys[0], maxTokens, temperature));
    if (keys.geminiKeys.length > 0) tasks.push(this.callGemini(userMessage, keys.geminiKeys[0], maxTokens, temperature));
    if (keys.cohereKeys.length > 0) tasks.push(this.callCohere(userMessage, keys.cohereKeys[0], maxTokens, temperature));

    let candidates: CouncilCandidate[] = [];
    if (tasks.length === 0) {
      this.councilRuns++;
      return {
        answer: '',
        winner: 'none',
        reason: 'No provider keys available; brain fell back to base pipeline.',
        candidates: [],
        mergedPoints: [],
      };
    }

    try {
      candidates = (await Promise.all(tasks)).filter((c) => !c.error && c.text.trim().length > 0);
    } catch (err: any) {
      console.warn('[CoreBrain] Council execution error:', err.message || err);
    }

    this.councilRuns++;

    if (candidates.length === 0) {
      return {
        answer: '',
        winner: 'none',
        reason: 'All providers failed or returned empty responses.',
        candidates: [],
        mergedPoints: [],
      };
    }

    if (candidates.length === 1) {
      const only = candidates[0];
      this.providerWins[only.provider] = (this.providerWins[only.provider] || 0) + 1;
      this.recordLearning({
        winner: only.provider,
        reason: 'Only available provider; single-provider fallback.',
        insights: this.deriveInsights([only]),
      });
      return {
        answer: only.text,
        winner: only.provider,
        reason: 'Only one provider available; used it directly.',
        candidates,
        mergedPoints: [],
      };
    }

    // Score candidates and decide: merge key points if multiple are strong, else pick best
    const ranked = [...candidates].sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const closeRunners = ranked.slice(1).filter((c) => best.score - c.score <= 1.0);

    let answer: string;
    let winner: CouncilResult['winner'];
    let reason: string;
    let mergedPoints: string[] = [];

    if (closeRunners.length > 0) {
      mergedPoints = this.mergeKeyPoints([best, ...closeRunners]);
      answer = [
        best.text,
        closeRunners.length > 0 && mergedPoints.length > 0
          ? `\n\nAdditional key points from other council members:\n${mergedPoints.map((p) => `- ${p}`).join('\n')}`
          : '',
      ].join('');
      winner = 'merged';
      reason = `Tight race between ${[best, ...closeRunners].map((c) => c.provider).join(', ')}; merged best answer with additional key points.`;
    } else {
      answer = best.text;
      winner = best.provider;
      reason = `${best.provider} (${best.model}) scored highest (${best.score.toFixed(1)}) with ${best.latencyMs}ms latency.`;
    }

    this.providerWins[winner === 'merged' ? 'merged' : winner] =
      (this.providerWins[winner === 'merged' ? 'merged' : winner] || 0) + 1;

    this.recordLearning({
      winner,
      reason,
      insights: this.deriveInsights(candidates),
    });

    return { answer, winner, reason, candidates, mergedPoints };
  }

  private async callGroq(userMessage: string, apiKey: string, maxTokens: number, temperature: number): Promise<CouncilCandidate> {
    const startedAt = Date.now();
    const model = AI_CONFIG.providers.groq.models[0];
    try {
      const client = new Groq({ apiKey });
      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: userMessage }],
        max_tokens: maxTokens,
        temperature,
      });
      const text = completion.choices[0]?.message?.content || '';
      const latencyMs = Date.now() - startedAt;
      return { provider: 'groq', model, text, score: this.scoreCandidate(text, latencyMs), latencyMs };
    } catch (err: any) {
      return { provider: 'groq', model, text: '', score: 0, latencyMs: Date.now() - startedAt, error: err.message || String(err) };
    }
  }

  private async callGemini(userMessage: string, apiKey: string, maxTokens: number, temperature: number): Promise<CouncilCandidate> {
    const startedAt = Date.now();
    const model = AI_CONFIG.providers.gemini.models[0];
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        config: { maxOutputTokens: maxTokens, temperature },
      });
      const text = response.text || '';
      const latencyMs = Date.now() - startedAt;
      return { provider: 'gemini', model, text, score: this.scoreCandidate(text, latencyMs), latencyMs };
    } catch (err: any) {
      return { provider: 'gemini', model, text: '', score: 0, latencyMs: Date.now() - startedAt, error: err.message || String(err) };
    }
  }

  private async callCohere(userMessage: string, token: string, maxTokens: number, temperature: number): Promise<CouncilCandidate> {
    const startedAt = Date.now();
    const model = AI_CONFIG.providers.cohere.models[0];
    try {
      const client = new CohereClient({ token });
      const response = await client.chat({ message: userMessage, model, maxTokens, temperature });
      const text = response.text || '';
      const latencyMs = Date.now() - startedAt;
      return { provider: 'cohere', model, text, score: this.scoreCandidate(text, latencyMs), latencyMs };
    } catch (err: any) {
      return { provider: 'cohere', model, text: '', score: 0, latencyMs: Date.now() - startedAt, error: err.message || String(err) };
    }
  }

  /**
   * Heuristic scoring: substance (length), structure (lists/paragraphs), and responsiveness.
   */
  private scoreCandidate(text: string, latencyMs: number): number {
    if (!text.trim()) return 0;
    const lengthScore = Math.min(text.length / 400, 5); // up to 5 pts for substance
    const structureScore = /(\n- |\n\d\. |\n#{1,3} )/.test(text) ? 1.5 : 0;
    const latencyScore = Math.max(0, 2 - latencyMs / 4000); // up to 2 pts for speed
    return Math.round((lengthScore + structureScore + latencyScore) * 10) / 10;
  }

  /**
   * Extract distinct key points (deduped by first sentence) from strong candidates.
   */
  private mergeKeyPoints(candidates: CouncilCandidate[]): string[] {
    const seen = new Set<string>();
    const points: string[] = [];
    for (const c of candidates.slice(1)) {
      const bullets = c.text
        .split('\n')
        .map((l) => l.replace(/^[-*•]\s*/, '').trim())
        .filter((l) => l.length > 10);
      for (const bullet of bullets) {
        const key = bullet.slice(0, 80).toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          points.push(bullet.slice(0, 240));
        }
      }
    }
    return points.slice(0, 6);
  }

  /**
   * Derive short reusable insight strings from a council run's outcomes.
   */
  private deriveInsights(candidates: CouncilCandidate[]): string[] {
    if (candidates.length === 0) return [];
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const best = sorted[0];
    const fastest = [...candidates].sort((a, b) => a.latencyMs - b.latencyMs)[0];

    const insights: string[] = [];
    if (best.score > 0) {
      insights.push(`For ${best.model}-style queries, ${best.provider} produced the strongest structured answers.`);
    }
    if (fastest.provider !== best.provider) {
      insights.push(`${fastest.provider} was fastest (${fastest.latencyMs}ms) for this query type; use for latency-sensitive tasks.`);
    }
    const failed = candidates.filter((c) => c.error);
    if (failed.length > 0) {
      insights.push(`Providers unreliable for this query type: ${failed.map((c) => c.provider).join(', ')} (${failed[0].error?.slice(0, 60)}).`);
    }
    return insights.map((i) => i.slice(0, 200));
  }

  // ---------------------------------------------------------------- identity

  /**
   * Wrap a base system prompt with Nova's identity, distilled knowledge,
   * and recent win/error memory. With zero learnings this is still an
   * identity upgrade; with no distill output at all it degrades gracefully.
   */
  public buildNovaSystemPrompt(basePrompt: string, ctx?: { includeMemory?: boolean }): string {
    const includeMemory = ctx?.includeMemory !== false;
    const distilled = this.lastDistilledSummary || this.distill();

    const sections: string[] = [
      basePrompt,
      `[NOVA IDENTITY]: You are NOVA, self-evolving AI with your own learning core. You run a Model Council of multiple LLM providers, distill what works into durable knowledge, and improve with every run.`,
    ];

    if (includeMemory) {
      const recent = this.getLearnings().slice(-10).reverse();
      if (recent.length > 0) {
        const wins = recent.filter((l) => l.winner !== 'none' && l.reason);
        const errors = recent.filter((l) => l.reason.toLowerCase().includes('failed') || l.insights.some((i) => i.toLowerCase().includes('unreliable')));
        const memoryLines: string[] = ['[RECENT BRAIN MEMORY]:'];
        if (wins.length > 0) {
          memoryLines.push(`Recent wins: ${wins.slice(0, 3).map((l) => `${l.winner} — ${l.reason.slice(0, 80)}`).join('; ')}`);
        }
        if (errors.length > 0) {
          memoryLines.push(`Recent errors/pitfalls: ${errors.slice(0, 3).map((l) => l.reason.slice(0, 80)).join('; ')}`);
        }
        sections.push(memoryLines.join('\n'));
      }
    }

    if (distilled) {
      sections.push(distilled);
    }

    sections.push(
      `[LEARNED STRATEGY RULE]: When facing a problem, first check your distilled core knowledge and recent brain memory for a matching learned strategy. Prefer applying learned strategies over re-deriving a solution from scratch. If no strategy applies, solve it fresh and it will become a new learning.`
    );

    return sections.join('\n\n');
  }

  // ---------------------------------------------------------------- stats

  public getBrainStats(): BrainStats {
    this.loadLearnings();
    return {
      councilRuns: this.councilRuns,
      providerWins: { ...this.providerWins },
      learnings: this.learnings.length,
      lastDistill: this.lastDistill,
    };
  }
}

export const coreBrain = new CoreBrain();
