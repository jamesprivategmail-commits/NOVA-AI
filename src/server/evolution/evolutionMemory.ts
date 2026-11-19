import fs from 'fs';
import path from 'path';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import type {
  ArchitecturalDecision,
  BackupSnapshot,
  EvolutionAgentRole,
  EvolutionExperiment,
  EvolutionLogEntry,
  EvolutionStateSnapshot,
  FailedExperimentRecord,
  PerformanceSnapshot,
  RuntimeTelemetryEvent,
  RuntimeTelemetryStats,
  SchedulerConfig,
  SchedulerState,
  SelfReflectionQA,
  SuccessfulSolutionRecord,
  SystemCapability,
  TechnicalDiscovery,
  WeaknessFinding,
} from './types.js';

export const DEFAULT_MEMORY_FILE = path.join(
  process.cwd(),
  'src',
  'server',
  'evolution',
  'evolution-memory.json'
);

interface PersistedMemoryData {
  capabilities: SystemCapability[];
  weaknesses: WeaknessFinding[];
  discoveries: TechnicalDiscovery[];
  experiments: EvolutionExperiment[];
  backups: BackupSnapshot[];
  failedExperiments: FailedExperimentRecord[];
  successfulSolutions: SuccessfulSolutionRecord[];
  performanceHistory: PerformanceSnapshot[];
  architecturalDecisions: ArchitecturalDecision[];
  selfReflection: SelfReflectionQA[];
  schedulerConfig: SchedulerConfig;
  logs: EvolutionLogEntry[];
  lastAnalyzedAt: string | null;
  lastResearchedAt: string | null;
  totalCyclesCompleted: number;
}

interface TelemetrySample extends RuntimeTelemetryEvent {
  timestamp: string;
}

export function makeExperimentFingerprint(
  area: string,
  title: string,
  targetFiles: string[]
): string {
  const normTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 80);
  const normFiles = [...targetFiles]
    .map((f) => f.trim().toLowerCase())
    .sort()
    .join(',');
  return `${area.toLowerCase()}::${normTitle}::${normFiles}`;
}

export function createEvolutionMemory(memoryFilePath: string = DEFAULT_MEMORY_FILE) {
  let telemetrySamples: TelemetrySample[] = [];
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let lastFirestoreSyncAt = 0;

  const schedulerState: SchedulerState = {
    running: false,
    currentPhase: null,
    lastRunAt: null,
    nextRunAt: null,
    totalCyclesCompleted: 0,
    consecutiveIdleSkips: 0,
    lastError: null,
  };

  function defaultData(): PersistedMemoryData {
    return {
      capabilities: [],
      weaknesses: [],
      discoveries: [],
      experiments: [],
      backups: [],
      failedExperiments: [],
      successfulSolutions: [],
      performanceHistory: [],
      architecturalDecisions: [
        {
          id: 'dec-isolated-sandbox',
          title: 'Enforce isolated sandbox experimentation + mandatory Security Gate approval',
          rationale:
            'Autonomous R&D builds and benchmarks candidate changes inside workspaces/_evolution_sandbox before any human-approved production merge.',
          cycleId: 'bootstrap',
          approvedBy: 'quality_control',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'dec-token-clamp',
          title: 'Provider/model completion token clamping & selective 404 blacklisting',
          rationale:
            'Prevent oversized Firestore tier maxTokens (409,600+) from poisoning working Groq/Cohere engines via false-positive 400 blacklisting.',
          cycleId: 'bootstrap',
          approvedBy: 'user',
          createdAt: new Date().toISOString(),
        },
      ],
      selfReflection: [],
      schedulerConfig: {
        enabled: true,
        intervalMinutes: 30,
        researchEnabled: true,
        autoExperimentInSandbox: true,
      },
      logs: [],
      lastAnalyzedAt: null,
      lastResearchedAt: null,
      totalCyclesCompleted: 0,
    };
  }

  function loadFromDisk(): PersistedMemoryData {
    try {
      if (!fs.existsSync(memoryFilePath)) {
        return defaultData();
      }
      const raw = fs.readFileSync(memoryFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        ...defaultData(),
        ...parsed,
      };
    } catch {
      return defaultData();
    }
  }

  let store: PersistedMemoryData = loadFromDisk();
  schedulerState.totalCyclesCompleted = store.totalCyclesCompleted || 0;

  function saveNow() {
    try {
      const dir = path.dirname(memoryFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      store.totalCyclesCompleted = schedulerState.totalCyclesCompleted;
      const trimmed: PersistedMemoryData = {
        ...store,
        discoveries: store.discoveries.slice(-80),
        experiments: store.experiments.slice(-60),
        backups: store.backups.slice(-50),
        failedExperiments: store.failedExperiments.slice(-100),
        successfulSolutions: store.successfulSolutions.slice(-100),
        performanceHistory: store.performanceHistory.slice(-120),
        architecturalDecisions: store.architecturalDecisions.slice(-80),
        logs: store.logs.slice(-400),
      };
      fs.writeFileSync(memoryFilePath, JSON.stringify(trimmed, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[EvolutionMemory] Failed to persist JSON store:', err?.message || err);
    }
  }

  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      saveNow();
      syncFirestoreSummary().catch(() => {});
    }, 300);
    if (typeof (persistTimer as any).unref === 'function') {
      (persistTimer as any).unref();
    }
  }

  async function syncFirestoreSummary() {
    if (process.env.NODE_ENV === 'test') return;
    if (memoryFilePath !== DEFAULT_MEMORY_FILE) return;
    const now = Date.now();
    if (now - lastFirestoreSyncAt < 30_000) return;
    lastFirestoreSyncAt = now;

    try {
      await Promise.race([
        setDoc(
          doc(db, 'settings', 'evolution'),
          {
            updatedAt: now,
            totalCyclesCompleted: schedulerState.totalCyclesCompleted,
            capabilitiesCount: store.capabilities.length,
            unresolvedWeaknesses: store.weaknesses.filter((w) => !w.resolved).length,
            discoveriesCount: store.discoveries.length,
            deployedUpgradesCount: store.successfulSolutions.length,
            failedExperimentsCount: store.failedExperiments.length,
            schedulerConfig: store.schedulerConfig,
            latestPerformance: store.performanceHistory.slice(-1)[0] || null,
          },
          { merge: true }
        ),
        new Promise<void>((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch {
      // Non-fatal if Firebase is unavailable or offline
    }
  }

  function addLog(
    level: EvolutionLogEntry['level'],
    agent: EvolutionAgentRole | 'system' | 'user',
    message: string,
    details?: string
  ): EvolutionLogEntry {
    const entry: EvolutionLogEntry = {
      id: `evo-log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      level,
      agent,
      message,
      details,
    };
    store.logs.push(entry);
    if (store.logs.length > 400) {
      store.logs = store.logs.slice(-400);
    }
    schedulePersist();
    return entry;
  }

  function recordRuntimeTelemetry(evt: RuntimeTelemetryEvent) {
    telemetrySamples.push({
      ...evt,
      timestamp: new Date().toISOString(),
    });
    if (telemetrySamples.length > 500) {
      telemetrySamples = telemetrySamples.slice(-500);
    }
  }

  function getRuntimeTelemetryStats(): RuntimeTelemetryStats {
    const total = telemetrySamples.length;
    if (total === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        errorRatePct: 0,
        byProvider: {},
        recentErrors: [],
      };
    }

    let ok = 0;
    let sumLatency = 0;
    const latencies: number[] = [];
    const byProvider: Record<
      string,
      { requests: number; errors: number; totalLatency: number }
    > = {};

    for (const s of telemetrySamples) {
      if (s.success) ok++;
      const lat = Math.max(0, Math.round(s.latencyMs || 0));
      sumLatency += lat;
      latencies.push(lat);

      const provKey = s.provider || 'unknown';
      if (!byProvider[provKey]) {
        byProvider[provKey] = { requests: 0, errors: 0, totalLatency: 0 };
      }
      byProvider[provKey].requests++;
      if (!s.success) byProvider[provKey].errors++;
      byProvider[provKey].totalLatency += lat;
    }

    latencies.sort((a, b) => a - b);
    const p95Idx = Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95));
    const formattedProviders: RuntimeTelemetryStats['byProvider'] = {};
    for (const [k, v] of Object.entries(byProvider)) {
      formattedProviders[k] = {
        requests: v.requests,
        errors: v.errors,
        avgLatencyMs: v.requests > 0 ? Math.round(v.totalLatency / v.requests) : 0,
      };
    }

    const recentErrors = telemetrySamples
      .filter((s) => !s.success)
      .slice(-15)
      .reverse()
      .map((s) => ({
        timestamp: s.timestamp,
        route: s.route,
        provider: s.provider,
        model: s.model,
        error: s.error || 'Unknown error',
      }));

    const failed = total - ok;
    return {
      totalRequests: total,
      successfulRequests: ok,
      failedRequests: failed,
      avgLatencyMs: Math.round(sumLatency / total),
      p95LatencyMs: latencies[p95Idx] || 0,
      errorRatePct: Number(((failed / total) * 100).toFixed(1)),
      byProvider: formattedProviders,
      recentErrors,
    };
  }

  function hasFailedFingerprint(fingerprint: string): FailedExperimentRecord | undefined {
    return store.failedExperiments.find((f) => f.fingerprint === fingerprint);
  }

  function recordFailedExperiment(record: FailedExperimentRecord) {
    if (!hasFailedFingerprint(record.fingerprint)) {
      store.failedExperiments.push(record);
    }
    schedulePersist();
  }

  function recordSuccessfulSolution(record: SuccessfulSolutionRecord) {
    store.successfulSolutions.push(record);
    schedulePersist();
  }

  function addDecision(decision: ArchitecturalDecision) {
    store.architecturalDecisions.push(decision);
    schedulePersist();
  }

  function saveBackup(backup: BackupSnapshot) {
    store.backups.push(backup);
    saveNow();
  }

  function getBackup(id: string): BackupSnapshot | undefined {
    return store.backups.find((b) => b.id === id);
  }

  function markBackupRestored(id: string) {
    const b = store.backups.find((x) => x.id === id);
    if (b) {
      b.restoredAt = new Date().toISOString();
      saveNow();
    }
  }

  function upsertExperiment(exp: EvolutionExperiment) {
    const idx = store.experiments.findIndex((e) => e.id === exp.id);
    if (idx >= 0) {
      store.experiments[idx] = exp;
    } else {
      store.experiments.push(exp);
    }
    saveNow();
  }

  function getExperiment(id: string): EvolutionExperiment | undefined {
    return store.experiments.find((e) => e.id === id);
  }

  function recordPerformanceSnapshot() {
    const telemetry = getRuntimeTelemetryStats();
    const snap: PerformanceSnapshot = {
      timestamp: new Date().toISOString(),
      avgLatencyMs: telemetry.avgLatencyMs,
      errorRatePct: telemetry.errorRatePct,
      capabilityCount: store.capabilities.filter((c) => c.status === 'operational').length,
      unresolvedWeaknesses: store.weaknesses.filter((w) => !w.resolved).length,
      deployedUpgrades: store.successfulSolutions.length,
      discardedExperiments: store.failedExperiments.length,
    };
    store.performanceHistory.push(snap);
    schedulePersist();
    return snap;
  }

  function setAnalysisResults(params: {
    capabilities: SystemCapability[];
    weaknesses: WeaknessFinding[];
    selfReflection: SelfReflectionQA[];
  }) {
    store.capabilities = params.capabilities;
    store.weaknesses = params.weaknesses;
    store.selfReflection = params.selfReflection;
    store.lastAnalyzedAt = new Date().toISOString();
    recordPerformanceSnapshot();
    saveNow();
  }

  function mergeDiscoveries(newItems: TechnicalDiscovery[]): TechnicalDiscovery[] {
    const existingUrls = new Set(store.discoveries.map((d) => d.sourceUrl));
    const added: TechnicalDiscovery[] = [];
    for (const item of newItems) {
      if (!existingUrls.has(item.sourceUrl)) {
        existingUrls.add(item.sourceUrl);
        store.discoveries.push(item);
        added.push(item);
      }
    }
    store.lastResearchedAt = new Date().toISOString();
    schedulePersist();
    return added;
  }

  function resolveWeakness(areaOrId: string) {
    for (const w of store.weaknesses) {
      if (w.id === areaOrId || w.area === areaOrId) {
        w.resolved = true;
      }
    }
    schedulePersist();
  }

  function updateSchedulerConfig(patch: Partial<SchedulerConfig>): SchedulerConfig {
    store.schedulerConfig = {
      ...store.schedulerConfig,
      ...patch,
      intervalMinutes: Math.max(
        5,
        Math.min(1440, Number(patch.intervalMinutes ?? store.schedulerConfig.intervalMinutes) || 30)
      ),
    };
    saveNow();
    return store.schedulerConfig;
  }

  function getSnapshot(): EvolutionStateSnapshot {
    const pendingApprovals = store.experiments
      .filter((e) => e.status === 'passed_awaiting_approval')
      .slice()
      .reverse();

    return {
      capabilities: store.capabilities,
      weaknesses: store.weaknesses,
      discoveries: store.discoveries.slice().reverse(),
      experiments: store.experiments.slice().reverse(),
      pendingApprovals,
      completedUpgrades: store.successfulSolutions.slice().reverse(),
      failedExperiments: store.failedExperiments.slice().reverse(),
      backups: store.backups.slice().reverse(),
      performanceHistory: store.performanceHistory,
      architecturalDecisions: store.architecturalDecisions.slice().reverse(),
      selfReflection: store.selfReflection,
      schedulerConfig: store.schedulerConfig,
      schedulerState: { ...schedulerState },
      telemetry: getRuntimeTelemetryStats(),
      logs: store.logs.slice().reverse(),
      lastAnalyzedAt: store.lastAnalyzedAt,
      lastResearchedAt: store.lastResearchedAt,
    };
  }

  function flushForTests() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    saveNow();
  }

  return {
    schedulerState,
    addLog,
    recordRuntimeTelemetry,
    getRuntimeTelemetryStats,
    hasFailedFingerprint,
    recordFailedExperiment,
    recordSuccessfulSolution,
    addDecision,
    saveBackup,
    getBackup,
    markBackupRestored,
    upsertExperiment,
    getExperiment,
    recordPerformanceSnapshot,
    setAnalysisResults,
    mergeDiscoveries,
    resolveWeakness,
    updateSchedulerConfig,
    getSnapshot,
    saveNow,
    flushForTests,
  };
}

export const evolutionMemory = createEvolutionMemory();
export type EvolutionMemoryInstance = ReturnType<typeof createEvolutionMemory>;
