import fs from 'fs';
import path from 'path';
import { getRepoFile, commitRepoFile } from '../github.js';

export type ProposalArea = 'ui' | 'brain' | 'security' | 'connectors' | 'accessibility' | 'performance';
export type ProposalChangeType = 'create' | 'patch';
export type ProposalStatus = 'pending' | 'committed' | 'failed';

export interface ProposalPatch {
  /** Exact text to find in the current file (must appear exactly once). */
  anchor: string;
  /** Replacement text substituted for the anchor. */
  replacement: string;
}

export interface EvolutionProposal {
  id: string;
  area: ProposalArea;
  title: string;
  description: string;
  /** Target file path relative to the repo root. */
  file: string;
  changeType: ProposalChangeType;
  /** Anchored replacement, required when changeType is 'patch'. */
  patch?: ProposalPatch;
  /** Full file content, required when changeType is 'create'. */
  content?: string;
  createdAt: string;
  status: ProposalStatus;
  commitSha?: string;
  error?: string;
  htmlUrl?: string;
}

export interface EvolutionStats {
  total: number;
  committed: number;
  failed: number;
  lastCommit: string | null;
}

export interface ApplyOptions {
  owner: string;
  repo: string;
  branch: string;
}

const HISTORY_FILE = path.join(process.cwd(), 'src', 'server', 'evolution', 'history.json');
const MAX_HISTORY = 500;
const DEBOUNCE_MS = 1000;

const BACKLOG: Array<Pick<EvolutionProposal, 'area' | 'title' | 'description' | 'file' | 'changeType' | 'content' | 'patch'>> = [
  {
    area: 'ui',
    title: 'Add dark mode toggle to the main layout',
    description: 'Introduce a persisted theme preference with a toggle button in the header, driven by CSS custom properties.',
    file: 'src/client/components/ThemeToggle.tsx',
    changeType: 'create',
    content: [
      '// ThemeToggle: persisted light/dark preference.',
      'export function createThemeToggle(root: HTMLElement): void {',
      "  const key = 'nova-theme';",
      "  const apply = (theme: string) => document.documentElement.dataset.theme = theme;",
      "  const saved = localStorage.getItem(key) || 'light';",
      '  apply(saved);',
      '  const button = document.createElement(\'button\');',
      "  button.className = 'theme-toggle';",
      "  button.setAttribute('aria-label', 'Toggle color theme');",
      '  button.textContent = saved === \'dark\' ? \'☀️\' : \'🌙\';',
      "  button.addEventListener('click', () => {",
      "    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';",
      '    localStorage.setItem(key, next);',
      '    apply(next);',
      "    button.textContent = next === 'dark' ? '☀️' : '🌙';",
      '  });',
      '  root.appendChild(button);',
      '}',
    ].join('\n'),
  },
  {
    area: 'accessibility',
    title: 'Add aria labels to interactive controls',
    description: 'Ensure every icon-only button and form input exposes an accessible name for screen readers.',
    file: 'src/client/accessibility/labels.ts',
    changeType: 'create',
    content: [
      '// Scans the DOM for unlabeled interactive elements and fixes them.',
      'export function ensureAriaLabels(root: Document = document): number {',
      '  let fixed = 0;',
      "  const selectors = 'button, input, select, textarea, [role=\\'button\\']';",
      '  root.querySelectorAll(selectors).forEach((el) => {',
      '    const node = el as HTMLElement & { labels?: NodeList };',
      "    const hasName = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ||",
      "      (node.labels && node.labels.length > 0) || (el.textContent || '').trim().length > 0;",
      '    if (!hasName) {',
      '      el.setAttribute(\'aria-label\', node.id ? node.id.replace(/[-_]/g, \' \') : \'interactive control\');',
      '      fixed++;',
      '    }',
      '  });',
      '  return fixed;',
      '}',
    ].join('\n'),
  },
  {
    area: 'accessibility',
    title: 'Implement roving tabindex keyboard navigation',
    description: 'Allow arrow-key navigation through list and menu widgets with a roving tabindex pattern.',
    file: 'src/client/accessibility/keyboardNav.ts',
    changeType: 'create',
    content: [
      '// Arrow-key navigation for lists using a roving tabindex.',
      'export function enableKeyboardNav(container: HTMLElement): void {',
      "  const items = Array.from(container.querySelectorAll<HTMLElement>('[tabindex]'));",
      '  const focusAt = (i: number) => {',
      '    items.forEach((item, j) => item.tabIndex = i === j ? 0 : -1);',
      '    items[i]?.focus();',
      '  };',
      "  container.addEventListener('keydown', (e: KeyboardEvent) => {",
      "    const current = items.indexOf(document.activeElement as HTMLElement);",
      "    if (e.key === 'ArrowDown' && current >= 0) { e.preventDefault(); focusAt((current + 1) % items.length); }",
      "    if (e.key === 'ArrowUp' && current >= 0) { e.preventDefault(); focusAt((current - 1 + items.length) % items.length); }",
      '  });',
      '}',
    ].join('\n'),
  },
  {
    area: 'security',
    title: 'Add strict Content-Security-Policy middleware',
    description: 'Set a strict CSP header on every response to mitigate XSS via inline scripts and unknown sources.',
    file: 'src/server/middleware/contentSecurityPolicy.ts',
    changeType: 'create',
    content: [
      "import type { Request, Response, NextFunction } from 'express';",
      '',
      'export function contentSecurityPolicy(req: Request, res: Response, next: NextFunction): void {',
      "  res.setHeader('Content-Security-Policy', [",
      "    \"default-src 'self'\",",
      "    \"script-src 'self'\",",
      "    \"style-src 'self' 'unsafe-inline'\",",
      "    \"img-src 'self' data:\",",
      "    \"connect-src 'self'\",",
      "    \"frame-ancestors 'none'\",",
      "    'base-uri \\'self\\'',",
      "    \"form-action 'self'\",",
      "  ].join('; '));",
      '  next();',
      '}',
    ].join('\n'),
  },
  {
    area: 'security',
    title: 'Tune API rate limiter defaults',
    description: 'Tighten the default rate-limit window and max requests per IP to protect unauthenticated endpoints.',
    file: 'src/server/middleware/rateLimitTuning.ts',
    changeType: 'create',
    content: [
      "import type { Request, Response, NextFunction } from 'express';",
      '',
      'const WINDOW_MS = 60_000;',
      'const MAX_REQUESTS = 60;',
      '',
      'const hits = new Map<string, { count: number; reset: number }>();',
      '',
      'export function rateLimit(req: Request, res: Response, next: NextFunction): void {',
      "  const key = req.ip || 'unknown';",
      '  const now = Date.now();',
      '  const entry = hits.get(key);',
      '  if (!entry || entry.reset < now) {',
      '    hits.set(key, { count: 1, reset: now + WINDOW_MS });',
      '  } else {',
      '    entry.count++;',
      '    if (entry.count > MAX_REQUESTS) {',
      '      res.status(429).json({ error: \'Too many requests, slow down.\' });',
      '      return;',
      '    }',
      '  }',
      '  next();',
      '}',
    ].join('\n'),
  },
  {
    area: 'security',
    title: 'Sanitize error responses before emitting',
    description: 'Strip stack traces and internal paths from API error payloads so internals never leak to clients.',
    file: 'src/server/middleware/safeErrors.ts',
    changeType: 'create',
    content: [
      "import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';",
      '',
      'export function safeErrors(): ErrorRequestHandler {',
      '  return (err: any, req: Request, res: Response, _next: NextFunction) => {',
      "    const status = typeof err?.status === 'number' ? err.status : 500;",
      '    res.status(status).json({ error: status === 500 ? \'Internal server error\' : err.message });',
      '  };',
      '}',
    ].join('\n'),
  },
  {
    area: 'connectors',
    title: 'Add retry with backoff for connector requests',
    description: 'Wrap outbound connector HTTP calls with exponential backoff so transient failures self-heal.',
    file: 'src/server/connectors/retry.ts',
    changeType: 'create',
    content: [
      'export async function fetchWithRetry(',
      '  url: string,',
      '  init: RequestInit,',
      '  retries = 3,',
      '): Promise<Response> {',
      '  let lastError: unknown;',
      '  for (let attempt = 0; attempt <= retries; attempt++) {',
      '    try {',
      '      const res = await fetch(url, init);',
      '      if (res.status < 500) return res;',
      '      lastError = new Error(`HTTP ${res.status}`);',
      '    } catch (err) {',
      '      lastError = err;',
      '    }',
      '    if (attempt < retries) {',
      '      const delay = Math.min(2 ** attempt * 250, 5_000);',
      '      await new Promise((resolve) => setTimeout(resolve, delay));',
      '    }',
      '  }',
      '  throw lastError;',
      '}',
    ].join('\n'),
  },
  {
    area: 'connectors',
    title: 'Add connector health registry',
    description: 'Track last success/failure per connector and expose a lightweight health endpoint payload.',
    file: 'src/server/connectors/health.ts',
    changeType: 'create',
    content: [
      'export interface ConnectorHealth {',
      '  name: string;',
      '  lastSuccessAt: string | null;',
      '  lastFailureAt: string | null;',
      '  consecutiveFailures: number;',
      '}',
      '',
      'const registry = new Map<string, ConnectorHealth>();',
      '',
      'export function recordSuccess(name: string): void {',
      "  const entry = registry.get(name) || { name, lastSuccessAt: null, lastFailureAt: null, consecutiveFailures: 0 };",
      '  entry.lastSuccessAt = new Date().toISOString();',
      '  entry.consecutiveFailures = 0;',
      '  registry.set(name, entry);',
      '}',
      '',
      'export function recordFailure(name: string): void {',
      "  const entry = registry.get(name) || { name, lastSuccessAt: null, lastFailureAt: null, consecutiveFailures: 0 };",
      '  entry.lastFailureAt = new Date().toISOString();',
      '  entry.consecutiveFailures++;',
      '  registry.set(name, entry);',
      '}',
      '',
      'export function getHealthSnapshot(): ConnectorHealth[] {',
      '  return Array.from(registry.values());',
      '}',
    ].join('\n'),
  },
  {
    area: 'brain',
    title: 'Add conversation context summarizer',
    description: 'Compress older conversation turns into a rolling summary so long chats stay within context limits.',
    file: 'src/server/brain/contextSummarizer.ts',
    changeType: 'create',
    content: [
      'export interface Turn { role: string; content: string; }',
      '',
      'const MAX_TURNS = 12;',
      '',
      'export function summarizeContext(turns: Turn[]): { recent: Turn[]; summary: string } {',
      '  if (turns.length <= MAX_TURNS) {',
      '    return { recent: turns, summary: \'\' };',
      '  }',
      '  const older = turns.slice(0, turns.length - MAX_TURNS);',
      '  const summary = older',
      '    .map((t) => `${t.role}: ${t.content.slice(0, 200)}`)',
      '    .join(\' | \');',
      '  return { recent: turns.slice(-MAX_TURNS), summary };',
      '}',
    ].join('\n'),
  },
  {
    area: 'brain',
    title: 'Add response cache for repeated prompts',
    description: 'Cache identical brain responses for a short TTL to cut latency and cost on repeat questions.',
    file: 'src/server/brain/responseCache.ts',
    changeType: 'create',
    content: [
      'const TTL_MS = 5 * 60_000;',
      'const cache = new Map<string, { value: string; expires: number }>();',
      '',
      'function key(prompt: string): string {',
      '  return Buffer.from(prompt.trim().toLowerCase()).toString(\'base64\');',
      '}',
      '',
      'export function getCached(prompt: string): string | null {',
      '  const hit = cache.get(key(prompt));',
      '  if (!hit) return null;',
      '  if (Date.now() > hit.expires) {',
      '    cache.delete(key(prompt));',
      '    return null;',
      '  }',
      '  return hit.value;',
      '}',
      '',
      'export function setCached(prompt: string, value: string): void {',
      '  cache.set(key(prompt), { value, expires: Date.now() + TTL_MS });',
      '}',
    ].join('\n'),
  },
  {
    area: 'performance',
    title: 'Add lazy JSON body limits per route',
    description: 'Apply a per-route JSON body size limit so oversized payloads are rejected early.',
    file: 'src/server/middleware/bodyLimit.ts',
    changeType: 'create',
    content: [
      "import type { Request, Response, NextFunction } from 'express';",
      '',
      'export function bodyLimit(maxBytes: number) {',
      '  return (req: Request, res: Response, next: NextFunction) => {',
      "    const length = Number(req.headers['content-length'] || 0);",
      '    if (length > maxBytes) {',
      '      res.status(413).json({ error: `Payload too large (max ${maxBytes} bytes)` });',
      '      return;',
      '    }',
      '    next();',
      '  };',
      '}',
    ].join('\n'),
  },
  {
    area: 'ui',
    title: 'Add empty-state illustrations to main panels',
    description: 'Give empty lists and panels friendly copy and a call to action instead of a blank area.',
    file: 'src/client/components/EmptyState.ts',
    changeType: 'create',
    content: [
      'export function renderEmptyState(parent: HTMLElement, title: string, hint: string): void {',
      "  const box = document.createElement('div');",
      "  box.className = 'empty-state';",
      "  box.setAttribute('role', 'status');",
      "  const heading = document.createElement('h3');",
      '  heading.textContent = title;',
      "  const text = document.createElement('p');",
      '  text.textContent = hint;',
      '  box.append(heading, text);',
      '  parent.replaceChildren(box);',
      '}',
    ].join('\n'),
  },
];

function loadHistory(): EvolutionProposal[] {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as EvolutionProposal[] : [];
  } catch (_) {
    return [];
  }
}

let history: EvolutionProposal[] = loadHistory();
let writeTimer: ReturnType<typeof setTimeout> | null = null;

function persistHistory(): void {
  if (writeTimer) {
    clearTimeout(writeTimer);
  }
  writeTimer = setTimeout(() => {
    writeTimer = null;
    try {
      const trimmed = history.slice(-MAX_HISTORY);
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('Failed to persist evolution history:', err?.message || err);
    }
  }, DEBOUNCE_MS);
}

function recordProposal(proposal: EvolutionProposal): void {
  const index = history.findIndex((p) => p.id === proposal.id);
  if (index >= 0) {
    history[index] = proposal;
  } else {
    history.push(proposal);
  }
  if (history.length > MAX_HISTORY) {
    history = history.slice(-MAX_HISTORY);
  }
  persistHistory();
}

function makeId(): string {
  return `evo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

let backlogCursor = 0;

export class EvolutionEngine {
  /**
   * Build a self-upgrade proposal. When an `idea` string is provided it is
   * wrapped as a create-file proposal; otherwise the next idea from the
   * rotating backlog is used.
   */
  generateProposal(idea?: string, area: ProposalArea = 'ui', file?: string): EvolutionProposal {
    let proposal: EvolutionProposal;

    if (idea && idea.trim()) {
      const slug = idea.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'idea';
      proposal = {
        id: makeId(),
        area,
        title: idea.trim().slice(0, 80),
        description: idea.trim(),
        file: file || `src/server/evolution/upgrades/${slug}.ts`,
        changeType: 'create',
        content: `// Self-upgrade: ${idea.trim()}\n// Generated by Nova's evolution engine on ${new Date().toISOString()}\n\nexport {};\n`,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
    } else {
      const next = BACKLOG[backlogCursor % BACKLOG.length];
      backlogCursor = (backlogCursor + 1) % BACKLOG.length;
      proposal = {
        id: makeId(),
        area: next.area,
        title: next.title,
        description: next.description,
        file: next.file,
        changeType: next.changeType,
        content: next.content,
        patch: next.patch,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
    }

    recordProposal(proposal);
    return proposal;
  }

  /**
   * Commit a proposal to the target repository via the GitHub contents API.
   * Create proposals push `content`; patch proposals fetch the current file
   * and apply an anchored replacement. Never hardcode credentials; the token
   * is passed in by the caller.
   */
  async applyProposal(proposal: EvolutionProposal, token: string, options: ApplyOptions): Promise<EvolutionProposal> {
    const { owner, repo, branch } = options;
    const commitMessage = `[evolution] ${proposal.title} (${proposal.area})`;

    try {
      let content: string;
      let fileSha: string | undefined;

      if (proposal.changeType === 'patch') {
        if (!proposal.patch) {
          throw new Error('Patch proposal is missing its anchored replacement');
        }
        const existing = await getRepoFile(token, owner, repo, proposal.file, branch);
        const occurrences = existing.content.split(proposal.patch.anchor).length - 1;
        if (occurrences !== 1) {
          throw new Error(`Anchor found ${occurrences} times in ${proposal.file}; expected exactly once`);
        }
        content = existing.content.replace(proposal.patch.anchor, proposal.patch.replacement);
        fileSha = existing.sha;
      } else {
        if (!proposal.content) {
          throw new Error('Create proposal is missing its content');
        }
        content = proposal.content;
      }

      const result = await commitRepoFile(token, owner, repo, proposal.file, content, commitMessage, branch, fileSha);

      proposal.status = 'committed';
      proposal.commitSha = result.commit?.sha || result.commit?.id || undefined;
      proposal.htmlUrl = result.htmlUrl;
    } catch (err: any) {
      proposal.status = 'failed';
      proposal.error = err?.message || String(err);
    }

    recordProposal(proposal);
    return proposal;
  }

  listProposals(): EvolutionProposal[] {
    return [...history];
  }

  getEvolutionStats(): EvolutionStats {
    const committed = history.filter((p) => p.status === 'committed');
    const last = committed.length > 0 ? committed[committed.length - 1] : null;
    return {
      total: history.length,
      committed: committed.length,
      failed: history.filter((p) => p.status === 'failed').length,
      lastCommit: last ? last.createdAt : null,
    };
  }
}

export const evolutionEngine = new EvolutionEngine();
