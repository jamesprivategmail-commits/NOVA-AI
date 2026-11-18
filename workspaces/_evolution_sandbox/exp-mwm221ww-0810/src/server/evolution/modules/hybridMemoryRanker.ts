export interface MemoryDocument {
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
