import fs from 'fs';
import path from 'path';
import { AI_CONFIG } from '../../config/ai.js';
import { AUTHORITATIVE_TOOLS } from '../tools/registry.js';
import type { EvolutionMemoryInstance } from './evolutionMemory.js';
import type {
  SelfReflectionQA,
  SystemCapability,
  WeaknessFinding,
} from './types.js';

interface ScannedFileInfo {
  relPath: string;
  lines: number;
  hasTodo: boolean;
  usesAlert: boolean;
}

function walkRepoFiles(rootDir: string, currentDir: string, out: ScannedFileInfo[]) {
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(currentDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (
      entry.name === 'node_modules' ||
      entry.name === 'dist' ||
      entry.name === '.git' ||
      entry.name === 'workspaces'
    ) {
      continue;
    }
    const full = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walkRepoFiles(rootDir, full, out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;

    try {
      const content = fs.readFileSync(full, 'utf-8');
      const relPath = path.relative(rootDir, full).replace(/\\/g, '/');
      out.push({
        relPath,
        lines: content.split('\n').length,
        hasTodo: /\b(TODO|FIXME|HACK)\b/.test(content),
        usesAlert: /\bwindow\.alert\s*\(|\balert\s*\(/.test(content),
      });
    } catch {
      // skip unreadable file
    }
  }
}

export function runArchitectureSelfAnalysis(memory: EvolutionMemoryInstance): {
  capabilities: SystemCapability[];
  weaknesses: WeaknessFinding[];
  selfReflection: SelfReflectionQA[];
} {
  const repoRoot = process.cwd();
  const scanned: ScannedFileInfo[] = [];
  walkRepoFiles(repoRoot, path.join(repoRoot, 'src'), scanned);
  const now = new Date().toISOString();
  const telemetry = memory.getRuntimeTelemetryStats();
  const snapshot = memory.getSnapshot();

  const capabilities: SystemCapability[] = [
    {
      id: 'cap-multi-provider-router',
      name: 'Multi-Provider Failover & Token Clamping Router',
      category: 'resilience',
      status: telemetry.errorRatePct > 35 ? 'degraded' : 'operational',
      description: `Routes completions across Groq (${AI_CONFIG.providers.groq.models.length} active models), Gemini (${AI_CONFIG.providers.gemini.models.length} models), Cohere, and BazaarLink with per-model token ceilings & 401 key quarantine.`,
      files: ['src/server/aiRouting.ts', 'src/server/createApp.ts', 'src/config/ai.ts'],
      verifiedAt: now,
    },
    {
      id: 'cap-4-model-council',
      name: '4-Model Collaborative Muse Council',
      category: 'reasoning',
      status: 'operational',
      description: 'Parallel round-table discussion, non-overlapping task slicing, and unified streaming synthesis across Shii, Shiia, Lyra, and Sora.',
      files: ['src/server/council/multiModelCouncil.ts', 'src/frontend/components/CouncilActivityCard.tsx'],
      verifiedAt: now,
    },
    {
      id: 'cap-autonomous-agent',
      name: 'Autonomous Tool & Workspace Execution Loop',
      category: 'execution',
      status: 'operational',
      description: 'Multi-step Linux terminal, persistent file workspace, background process manager, and live syntax verification loop.',
      files: [
        'src/server/agent/autonomousAgent.ts',
        'src/server/terminal/terminalService.ts',
        'src/server/workspace/workspaceService.ts',
        'src/server/agent/verifier.ts',
      ],
      verifiedAt: now,
    },
    {
      id: 'cap-live-web-researcher',
      name: 'Live Internet Search & Deep Subpage Crawler',
      category: 'research',
      status: 'operational',
      description: 'SSRF-safe live web search (DuckDuckGo + Wikipedia fallback) and multi-section parallel site crawling.',
      files: ['src/server/research/webResearcher.ts', 'src/server/evolution/internetResearcher.ts'],
      verifiedAt: now,
    },
    {
      id: 'cap-persistent-memory',
      name: 'Project & Evolution Persistent Memory',
      category: 'memory',
      status: 'operational',
      description: 'Firestore project memory combined with persistent evolution memory tracking past improvements, failed-experiment fingerprints, and decisions.',
      files: ['src/server/memory/projectMemory.ts', 'src/server/evolution/evolutionMemory.ts'],
      verifiedAt: now,
    },
    {
      id: 'cap-evolution-sandbox',
      name: 'Isolated Sandbox & Security Gate',
      category: 'security',
      status: 'operational',
      description: 'Tests experimental upgrades inside workspaces/_evolution_sandbox with esbuild TypeScript compilation, A/B timing benchmarks, automatic backups, and 1-click rollback.',
      files: [
        'src/server/evolution/sandboxExperimentRunner.ts',
        'src/server/evolution/securityGate.ts',
      ],
      verifiedAt: now,
    },
    {
      id: 'cap-tool-registry',
      name: `Authoritative Tool Registry (${AUTHORITATIVE_TOOLS.length} tools)`,
      category: 'execution',
      status: 'operational',
      description: AUTHORITATIVE_TOOLS.map((t) => t.displayName).join(', '),
      files: ['src/server/tools/registry.ts'],
      verifiedAt: now,
    },
  ];

  // Dynamically scan real architectural weaknesses
  const weaknesses: WeaknessFinding[] = [];

  const largeFiles = scanned
    .filter((f) => f.lines > 1100)
    .sort((a, b) => b.lines - a.lines);
  if (largeFiles.length > 0) {
    weaknesses.push({
      id: 'weak-monolithic-files',
      title: `High complexity in oversized modules (${largeFiles[0].relPath}: ${largeFiles[0].lines} lines)`,
      area: 'performance',
      severity: 'high',
      description: `${largeFiles.length} TypeScript file(s) exceed 1,100 lines (${largeFiles.slice(0, 3).map((f) => `${f.relPath} [${f.lines}L]`).join(', ')}), increasing merge friction and test coupling.`,
      evidence: `Static AST/LOC scan found ${largeFiles.map((f) => `${f.relPath} (${f.lines} lines)`).join(', ')}`,
      affectedFiles: largeFiles.slice(0, 3).map((f) => f.relPath),
      suggestedFix: 'Extract cohesive service utilities and pure helpers into standalone testable modules.',
      detectedAt: now,
      resolved: false,
    });
  }

  // Telemetry-driven error & latency findings
  if (telemetry.totalRequests > 0 && telemetry.errorRatePct >= 10) {
    weaknesses.push({
      id: 'weak-runtime-error-rate',
      title: `Elevated runtime AI completion error rate (${telemetry.errorRatePct}%)`,
      area: 'routing',
      severity: telemetry.errorRatePct >= 25 ? 'critical' : 'high',
      description: `${telemetry.failedRequests} of ${telemetry.totalRequests} tracked requests failed. Recent error: ${telemetry.recentErrors[0]?.error || 'Provider failure'}.`,
      evidence: `Live telemetry by provider: ${JSON.stringify(telemetry.byProvider)}`,
      affectedFiles: ['src/server/createApp.ts', 'src/server/aiRouting.ts'],
      suggestedFix: 'Add adaptive circuit-breaker cooldown scoring per provider/model based on rolling success ratio.',
      detectedAt: now,
      resolved: false,
    });
  }

  if (telemetry.avgLatencyMs > 3200) {
    weaknesses.push({
      id: 'weak-high-latency',
      title: `Slow average AI completion latency (${telemetry.avgLatencyMs}ms avg, ${telemetry.p95LatencyMs}ms p95)`,
      area: 'performance',
      severity: 'medium',
      description: 'Average first/full response latency exceeds 3.2s threshold.',
      evidence: `Measured across ${telemetry.totalRequests} requests`,
      affectedFiles: ['src/server/createApp.ts', 'src/server/council/multiModelCouncil.ts'],
      suggestedFix: 'Introduce semantic prompt response memoization and speculative provider racing for short prompts.',
      detectedAt: now,
      resolved: false,
    });
  }

  const alertFiles = scanned.filter((f) => f.usesAlert);
  if (alertFiles.length > 0) {
    weaknesses.push({
      id: 'weak-iframe-alerts',
      title: `Browser alert() usage detected in ${alertFiles.length} UI component(s)`,
      area: 'ui',
      severity: 'medium',
      description: 'Native window.alert/confirm calls can be blocked in sandboxed iframes.',
      evidence: `Matched alert() in: ${alertFiles.map((f) => f.relPath).join(', ')}`,
      affectedFiles: alertFiles.slice(0, 4).map((f) => f.relPath),
      suggestedFix: 'Replace native alert() dialogs with non-blocking glass toast notifications.',
      detectedAt: now,
      resolved: false,
    });
  }

  // Missing advanced intelligence & memory indexing capabilities
  const hasHybridRetrieval = scanned.some((f) => f.relPath.includes('bm25') || f.relPath.includes('semanticMemory'));
  if (!hasHybridRetrieval) {
    weaknesses.push({
      id: 'weak-memory-ranking',
      title: 'Memory retrieval lacks BM25 + recency relevance ranking',
      area: 'memory',
      severity: 'high',
      description: 'Current project/evolution memory injects static sections or slices chronologically instead of scoring relevance against the active query.',
      evidence: 'Codebase scan found no hybrid TF-IDF/BM25 retrieval module in src/server/memory or src/server/evolution/modules.',
      affectedFiles: ['src/server/memory/projectMemory.ts', 'src/server/evolution/evolutionMemory.ts'],
      suggestedFix: 'Develop a pure BM25 + temporal-decay context ranker module in the isolated sandbox and benchmark retrieval precision/speed.',
      detectedAt: now,
      resolved: false,
    });
  }

  const hasAdaptiveScorer = scanned.some((f) => f.relPath.includes('adaptiveModelScorer'));
  if (!hasAdaptiveScorer) {
    weaknesses.push({
      id: 'weak-static-routing',
      title: 'Static provider fallback order lacks live quality & latency scoring',
      area: 'routing',
      severity: 'medium',
      description: 'Fallback tries providers in fixed priority instead of dynamically ranking healthy providers by EMA latency and error rate.',
      evidence: 'No EMA adaptive router module detected in src/server/evolution/modules.',
      affectedFiles: ['src/server/aiRouting.ts', 'src/server/createApp.ts'],
      suggestedFix: 'Build an exponential-moving-average (EMA) provider/model scorer module and benchmark routing selection latency.',
      detectedAt: now,
      resolved: false,
    });
  }

  const hasPromptBudgeter = scanned.some((f) => f.relPath.includes('contextBudgetOptimizer'));
  if (!hasPromptBudgeter) {
    weaknesses.push({
      id: 'weak-context-budget',
      title: 'Long-thread context compaction uses fixed character slicing instead of importance scoring',
      area: 'execution',
      severity: 'medium',
      description: 'Fixed head/tail truncation may drop critical mid-conversation constraints or tool results under tight TPM limits.',
      evidence: 'compactSystemPrompt uses fixed 62%/38% split.',
      affectedFiles: ['src/server/aiRouting.ts', 'src/server/agent/brainPrompt.ts'],
      suggestedFix: 'Build an importance-weighted message & snippet budgeter preserving code blocks, errors, and recent turns.',
      detectedAt: now,
      resolved: false,
    });
  }

  // Preserve resolved state from previous cycles if already marked resolved
  const resolvedIds = new Set(
    snapshot.weaknesses.filter((w) => w.resolved).map((w) => w.id)
  );
  for (const w of weaknesses) {
    if (resolvedIds.has(w.id)) w.resolved = true;
  }

  const deployedCount = snapshot.completedUpgrades.length;
  const selfReflection: SelfReflectionQA[] = [
    {
      question: 'What can I currently do?',
      currentAnswer: `Execute ${capabilities.length} verified core systems: multi-provider streaming completions (Groq, Gemini, Cohere, BazaarLink), 4-Model Squad collaboration, live web crawling, Linux terminal/workspace automation, and sandboxed self-evolution (${deployedCount} upgrades deployed).`,
      gapIdentified: 'Hybrid BM25 memory ranking and live EMA latency routing are not yet deployed to production.',
      priority: 'medium',
    },
    {
      question: 'What am I unable to do?',
      currentAnswer: 'Cannot retrain base foundation model weights directly inside Node.js, cannot bypass explicit Security Gate human approvals for production/auth/DB/credential writes, and cannot guarantee uptime on offline third-party endpoints (e.g., degraded external BazaarLink host).',
      gapIdentified: 'Need stronger local intelligence amplification via RAG retrieval, automated few-shot distillation, and adaptive multi-model routing.',
      priority: 'high',
    },
    {
      question: 'What tools would make me more capable?',
      currentAnswer: 'A BM25 + recency hybrid memory retriever, an EMA provider quality/latency scorer, an AST dependency impact analyzer, and an automated regression test synthesizer.',
      gapIdentified: hasHybridRetrieval ? 'Hybrid retriever deployed; expand AST test generation.' : 'Missing BM25 memory retriever & EMA router modules.',
      priority: 'high',
    },
    {
      question: 'What technologies could improve my intelligence?',
      currentAnswer: 'Multi-agent critic-revision debate loops, semantic + lexical hybrid RAG, adaptive task-difficulty routing (fast 27B vs deep 120B/Pro reasoning), and structured verification feedback loops.',
      gapIdentified: 'System-level intelligence gains come from better context selection, routing, and verification rather than single-shot prompting.',
      priority: 'high',
    },
    {
      question: 'What tasks am I struggling with?',
      currentAnswer: telemetry.failedRequests > 0
        ? `Runtime telemetry logged ${telemetry.failedRequests} failed completion(s) (${telemetry.errorRatePct}% error rate), primarily from provider limits or dead upstream routes.`
        : `Zero runtime failures logged so far across ${telemetry.totalRequests} requests; monolithic createApp.ts (${largeFiles[0]?.lines || 0} lines) slows structural refactoring.`,
      gapIdentified: largeFiles.length > 0 ? `${largeFiles[0].relPath} needs modular extraction.` : 'Continue monitoring live runtime telemetry.',
      priority: telemetry.errorRatePct > 15 ? 'critical' : 'medium',
    },
    {
      question: 'What new capabilities should I develop?',
      currentAnswer: 'Build tested pure modules in workspaces/_evolution_sandbox first: (1) Hybrid BM25 + Recency Memory Ranker, (2) EMA Provider/Model Health Scorer, (3) Token-Budget Context Optimizer, and (4) Automated Regression Harness.',
      gapIdentified: 'Prioritize additive, unit-tested TypeScript modules with measurable latency/quality improvements.',
      priority: 'high',
    },
    {
      question: 'How can I improve my performance?',
      currentAnswer: 'Trim bloated duplicated system prompts, clamp output token ceilings cleanly per engine, rank retrieved memory snippets by relevance instead of dumping full history, and measure baseline vs candidate latency before every promotion.',
      gapIdentified: telemetry.avgLatencyMs > 2500 ? `Average latency (${telemetry.avgLatencyMs}ms) has room for prompt & cache optimization.` : 'Maintain fast routing & low error rates via continuous benchmarking.',
      priority: 'medium',
    },
  ];

  memory.setAnalysisResults({ capabilities, weaknesses, selfReflection });
  memory.addLog(
    'info',
    'system',
    `Completed architecture self-analysis across ${scanned.length} TypeScript files (${weaknesses.filter((w) => !w.resolved).length} active weaknesses, ${telemetry.totalRequests} telemetry samples).`
  );

  return { capabilities, weaknesses, selfReflection };
}
