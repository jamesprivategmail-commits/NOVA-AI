import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  Database,
  FlaskConical,
  Globe,
  History,
  Layers,
  Loader2,
  Lock,
  MessageSquare,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import type {
  EvolutionAgentRole,
  EvolutionExperiment,
  EvolutionLogEntry,
  EvolutionStateSnapshot,
  PerformanceSnapshot,
  SecurityRiskCategory,
} from '../../server/evolution/types';

type EvolutionTab =
  | 'overview'
  | 'debate'
  | 'research'
  | 'sandbox'
  | 'approvals'
  | 'memory';

type MemorySubTab = 'solutions' | 'failed' | 'decisions' | 'telemetry' | 'logs';

interface EvolutionCentreProps {
  onClose?: () => void;
}

const NAV_TABS: Array<{ id: EvolutionTab; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview & Reflection', icon: <Activity size={15} /> },
  { id: 'debate', label: '4-Agent Debate', icon: <MessageSquare size={15} /> },
  { id: 'research', label: 'Web Research', icon: <Globe size={15} /> },
  { id: 'sandbox', label: 'Sandbox & Benchmarks', icon: <FlaskConical size={15} /> },
  { id: 'approvals', label: 'Approvals & Rollback', icon: <ShieldCheck size={15} /> },
  { id: 'memory', label: 'Memory & Logs', icon: <Database size={15} /> },
];

const AGENT_META: Record<EvolutionAgentRole, { name: string; roleTitle: string; mandate: string }> = {
  researcher: {
    name: 'Researcher',
    roleTitle: 'External Discovery',
    mandate: 'Surveys live web engineering sources, benchmarks, and model routing advances.',
  },
  strategist: {
    name: 'Strategist',
    roleTitle: 'Prioritization & Architecture',
    mandate: 'Weighs discoveries against open system weaknesses and ROI before committing dev time.',
  },
  developer: {
    name: 'Developer',
    roleTitle: 'Isolated Implementation',
    mandate: 'Writes complete TypeScript modules inside isolated sandbox directories only.',
  },
  quality_control: {
    name: 'Quality Control',
    roleTitle: 'Verification & Gatekeeping',
    mandate: 'Compiles, benchmarks baseline vs candidate, flags regressions, and enforces security gates.',
  },
};

const RISK_LABELS: Record<SecurityRiskCategory, string> = {
  safe_sandbox: 'Sandbox Only',
  production_deploy: 'Production Deploy',
  destructive: 'Destructive Change',
  database_migration: 'Database Migration',
  auth_change: 'Authentication Change',
  security_sensitive: 'Security Sensitive',
  paid_service: 'Paid Service',
  api_credentials: 'API Credentials',
};

function formatTime(iso?: string | null): string {
  if (!iso) return 'Not yet run';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PerformanceTrendChart({ data }: { data: PerformanceSnapshot[] }) {
  if (!data || data.length < 2) {
    return (
      <div className="p-6 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/60 text-center space-y-1.5">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Performance history builds automatically across evolution cycles
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Run at least two self-analysis or evolution cycles to plot measured latency and capability trends.
        </p>
      </div>
    );
  }

  const points = data.slice(-16);
  const width = 640;
  const height = 160;
  const padX = 28;
  const padY = 20;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const maxLatency = Math.max(250, ...points.map((p) => p.avgLatencyMs || 0));
  const maxCaps = Math.max(5, ...points.map((p) => p.capabilityCount || 0));

  const latencyPath = points
    .map((p, idx) => {
      const x = padX + (idx / Math.max(1, points.length - 1)) * innerW;
      const y = padY + innerH - ((p.avgLatencyMs || 0) / maxLatency) * innerH;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const capabilityPath = points
    .map((p, idx) => {
      const x = padX + (idx / Math.max(1, points.length - 1)) * innerW;
      const y = padY + innerH - ((p.capabilityCount || 0) / maxCaps) * innerH;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const latest = points[points.length - 1];

  return (
    <div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Measured Performance History</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Tracked across {points.length} recorded snapshots
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] font-mono tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full bg-[var(--accent)] inline-block" />
            Latency: {latest.avgLatencyMs}ms
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400 inline-block" />
            Capabilities: {latest.capabilityCount}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-36 overflow-visible"
        role="img"
        aria-label="Measured performance history chart showing latency and capabilities across cycles"
      >
        <line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="var(--line)" strokeDasharray="3 4" />
        <line x1={padX} y1={height / 2} x2={width - padX} y2={height / 2} stroke="var(--line)" strokeDasharray="3 4" />
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="var(--line)" />

        <path d={capabilityPath} fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
        <path d={latencyPath} fill="none" stroke="var(--accent)" strokeWidth="2.25" strokeLinecap="round" />

        {points.map((p, idx) => {
          const x = padX + (idx / Math.max(1, points.length - 1)) * innerW;
          const yLat = padY + innerH - ((p.avgLatencyMs || 0) / maxLatency) * innerH;
          return (
            <circle
              key={`${p.timestamp}-${idx}`}
              cx={x}
              cy={yLat}
              r="3"
              fill="var(--bg-1)"
              stroke="var(--accent)"
              strokeWidth="1.75"
            />
          );
        })}
      </svg>
    </div>
  );
}

export function EvolutionCentre({ onClose }: EvolutionCentreProps) {
  const [state, setState] = useState<EvolutionStateSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EvolutionTab>('overview');
  const [memorySubTab, setMemorySubTab] = useState<MemorySubTab>('solutions');

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [customGoal, setCustomGoal] = useState('');
  const [researchQuery, setResearchQuery] = useState('');
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
  const [expandedPatchIds, setExpandedPatchIds] = useState<Record<string, boolean>>({});
  const [confirmRollbackId, setConfirmRollbackId] = useState<string | null>(null);
  const [logSearch, setLogSearch] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState<string>('all');

  const fetchState = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/evolution/state');
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json = await res.json();
      if (!json?.state) throw new Error('Invalid evolution state payload');
      setState(json.state);
      if (!selectedExperimentId && json.state.experiments?.length > 0) {
        setSelectedExperimentId(json.state.experiments[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Evolution Centre');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchState(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const postAction = async (
    actionKey: string,
    url: string,
    body?: Record<string, unknown>,
    successMsg?: string
  ) => {
    setBusyAction(actionKey);
    setNotice(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : '{}',
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }
      if (json.state) {
        setState(json.state);
        if (json.experiment?.id) {
          setSelectedExperimentId(json.experiment.id);
        }
      } else {
        await fetchState(true);
      }
      if (successMsg) {
        setNotice({ type: 'success', text: successMsg });
      }
      return json;
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Evolution action failed',
      });
      return null;
    } finally {
      setBusyAction(null);
    }
  };

  const handleRunCycle = async (goal?: string) => {
    const result = await postAction(
      'run-cycle',
      '/api/evolution/cycle/run',
      {
        customGoal: goal?.trim() || undefined,
        researchEnabled: state?.schedulerConfig.researchEnabled ?? true,
      },
      'Evolution cycle finished in isolated sandbox.'
    );
    if (result?.experiment) {
      setCustomGoal('');
      setSelectedExperimentId(result.experiment.id);
    }
  };

  const handleAnalyze = async () => {
    await postAction('analyze', '/api/evolution/analyze', {}, 'System architecture re-analyzed.');
  };

  const handleResearch = async () => {
    const q = researchQuery.trim();
    const res = await postAction(
      'research',
      '/api/evolution/research',
      q ? { query: q } : {},
      q ? `Completed live research for "${q}".` : 'Autonomous web research cycle completed.'
    );
    if (res) setResearchQuery('');
  };

  const handleToggleScheduler = async (enabled: boolean) => {
    await postAction(
      'scheduler',
      '/api/evolution/scheduler',
      { enabled },
      enabled ? 'Autonomous evolution scheduler enabled.' : 'Autonomous evolution scheduler paused.'
    );
  };

  const handleIntervalChange = async (intervalMinutes: number) => {
    await postAction(
      'scheduler-interval',
      '/api/evolution/scheduler',
      { intervalMinutes },
      `Scheduler cadence updated to every ${intervalMinutes} minutes.`
    );
  };

  const handleApprove = async (id: string) => {
    await postAction(
      `approve-${id}`,
      `/api/evolution/approvals/${encodeURIComponent(id)}/approve`,
      {},
      'Upgrade backed up and deployed safely.'
    );
  };

  const handleReject = async (id: string) => {
    await postAction(
      `reject-${id}`,
      `/api/evolution/approvals/${encodeURIComponent(id)}/reject`,
      { reason: 'Rejected by user in Evolution Centre' },
      'Proposal rejected and archived.'
    );
  };

  const handleRollback = async (id: string) => {
    const res = await postAction(
      `rollback-${id}`,
      `/api/evolution/experiments/${encodeURIComponent(id)}/rollback`,
      { reason: 'User initiated rollback from Evolution Centre' },
      'Upgrade rolled back from automatic backup snapshot.'
    );
    if (res) setConfirmRollbackId(null);
  };

  const activeExperiment: EvolutionExperiment | null = useMemo(() => {
    if (!state?.experiments?.length) return null;
    if (selectedExperimentId) {
      const found = state.experiments.find((e) => e.id === selectedExperimentId);
      if (found) return found;
    }
    return state.experiments[0];
  }, [state, selectedExperimentId]);

  const filteredLogs: EvolutionLogEntry[] = useMemo(() => {
    const logs = state?.logs || [];
    const q = logSearch.trim().toLowerCase();
    return logs.filter((entry) => {
      if (logLevelFilter !== 'all' && entry.level !== logLevelFilter) return false;
      if (!q) return true;
      return (
        entry.message.toLowerCase().includes(q) ||
        entry.agent.toLowerCase().includes(q) ||
        (entry.details && entry.details.toLowerCase().includes(q))
      );
    });
  }, [state?.logs, logLevelFilter, logSearch]);

  const openWeaknessCount = useMemo(
    () => (state?.weaknesses || []).filter((w) => !w.resolved).length,
    [state?.weaknesses]
  );

  const operationalCapabilityCount = useMemo(
    () => (state?.capabilities || []).filter((c) => c.status === 'operational').length,
    [state?.capabilities]
  );

  const pendingApprovals = state?.pendingApprovals || [];
  const completedUpgrades = state?.completedUpgrades || [];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-0 md:p-6 bg-black/55 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evolution-centre-title"
    >
      {onClose && <div className="fixed inset-0" onClick={onClose} />}

      <div className="relative z-10 w-full max-w-6xl h-[100dvh] md:h-[88vh] muse-glass-panel rounded-none md:rounded-[28px] overflow-hidden flex flex-col text-[var(--text-primary)]">
        {/* Top Bar: Clean 3-Zone Header */}
        <header className="glass-header-2026 px-3.5 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2.5 sm:gap-4 shrink-0">
          <div className="min-w-0 flex-1">
            <h2
              id="evolution-centre-title"
              className="font-display text-base sm:text-xl font-semibold text-[var(--text-primary)] tracking-tight truncate"
            >
              Evolution Centre
            </h2>
            <p className="text-[11px] sm:text-xs text-[var(--text-muted)] truncate">
              Autonomous 4-Agent R&amp;D
              <span className="mx-1.5" aria-hidden="true">·</span>
              {state?.schedulerState.running
                ? `Active phase: ${state.schedulerState.currentPhase || 'running'}`
                : state?.schedulerConfig.enabled
                  ? `Scheduled every ${state.schedulerConfig.intervalMinutes}m`
                  : 'Scheduler paused'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleRunCycle()}
              disabled={busyAction !== null || Boolean(state?.schedulerState.running)}
              className="btn btn-primary px-2.5 sm:px-3.5 py-2 text-xs whitespace-nowrap shrink-0"
              aria-label="Run Evolution Cycle"
            >
              {busyAction === 'run-cycle' || state?.schedulerState.running ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
              <span className="sm:hidden">Run</span>
              <span className="hidden sm:inline">Run Evolution Cycle</span>
            </button>

            <button
              type="button"
              onClick={() => fetchState(false)}
              disabled={loading || busyAction !== null}
              className="btn btn-ghost w-9 h-9 !p-0 shrink-0"
              aria-label="Refresh Evolution Centre"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost w-9 h-9 !p-0 shrink-0"
                aria-label="Close Evolution Centre"
                title="Close"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </header>

        {/* Inline Action Notice */}
        {notice && (
          <div
            className={clsx(
              'px-4 sm:px-6 py-2.5 border-b border-[var(--line)] flex items-center justify-between gap-3 text-xs shrink-0',
              notice.type === 'success' && 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300',
              notice.type === 'error' && 'bg-rose-600/10 text-rose-700 dark:text-rose-300',
              notice.type === 'info' && 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {notice.type === 'success' && <CheckCircle2 size={14} className="shrink-0" />}
              {notice.type === 'error' && <AlertTriangle size={14} className="shrink-0" />}
              <span className="truncate">{notice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="p-1 hover:opacity-75 cursor-pointer shrink-0"
              aria-label="Dismiss notification"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Body Layout: Responsive Left Rail + Main Viewport */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          <nav
            aria-label="Evolution Centre sections"
            className="md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-[var(--line)] bg-[var(--bg-1)]/40 p-2 md:p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto no-scrollbar"
          >
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const badgeCount =
                tab.id === 'approvals' ? pendingApprovals.length : undefined;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap text-left border',
                    isActive
                      ? 'bg-[var(--accent-soft)] border-[var(--accent-muted)] text-[var(--text-primary)] font-semibold'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </span>
                  {typeof badgeCount === 'number' && badgeCount > 0 && (
                    <span className="font-mono tabular-nums text-[11px] font-semibold text-[var(--accent)]">
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="hidden md:block mt-auto pt-4 px-2 space-y-2 border-t border-[var(--line)]">
              <div className="text-[11px] font-medium text-[var(--text-muted)]">Security Policy</div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Experiments compile and benchmark inside isolated sandboxes. Live deployment, auth, DB, and credential edits always pause for approval with automatic backups.
              </p>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 smooth-scroll-container">
            {loading && !state ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-20 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/50 animate-pulse"
                    />
                  ))}
                </div>
                <div className="h-44 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/50 animate-pulse" />
                <div className="h-56 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/50 animate-pulse" />
              </div>
            ) : error && !state ? (
              <div className="p-10 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/60 text-center space-y-3">
                <AlertTriangle size={24} className="mx-auto text-rose-500" />
                <p className="text-sm font-medium text-[var(--text-primary)]">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchState(false)}
                  className="btn btn-ghost px-4 py-2 text-xs"
                >
                  <RefreshCw size={13} />
                  <span>Retry</span>
                </button>
              </div>
            ) : state ? (
              <>
                {/* ═══════════════════════════════════════════════════════ */}
                {/* TAB 1: OVERVIEW & SELF-REFLECTION                       */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Top 4 KPI Cells */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65">
                        <div className="text-xs text-[var(--text-muted)]">System Capabilities</div>
                        <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
                          <span className="text-2xl font-semibold text-[var(--text-primary)]">
                            {operationalCapabilityCount}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            / {state.capabilities.length} operational
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65">
                        <div className="text-xs text-[var(--text-muted)]">Open Weaknesses</div>
                        <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
                          <span className="text-2xl font-semibold text-[var(--text-primary)]">
                            {openWeaknessCount}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">identified</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65">
                        <div className="text-xs text-[var(--text-muted)]">Pending Approvals</div>
                        <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
                          <span className="text-2xl font-semibold text-[var(--accent)]">
                            {pendingApprovals.length}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">awaiting review</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65">
                        <div className="text-xs text-[var(--text-muted)]">Completed Upgrades</div>
                        <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
                          <span className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
                            {completedUpgrades.length}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            avg {state.telemetry.avgLatencyMs}ms
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Autonomous Scheduler & Controls */}
                    <section className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-0.5 min-w-0">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                          Autonomous Improvement Scheduler
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
                          Cycles completed: {state.schedulerState.totalCyclesCompleted}
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          Last cycle: {formatTime(state.schedulerState.lastRunAt)}
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          Last audit: {formatTime(state.lastAnalyzedAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <span>Cadence</span>
                          <select
                            aria-label="Scheduler cadence"
                            value={state.schedulerConfig.intervalMinutes}
                            onChange={(e) => handleIntervalChange(Number(e.target.value))}
                            disabled={busyAction !== null}
                            className="bg-[var(--bg-2)] border border-[var(--line-strong)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] cursor-pointer"
                          >
                            <option value={15}>Every 15m</option>
                            <option value={30}>Every 30m</option>
                            <option value={60}>Every 60m</option>
                            <option value={240}>Every 4h</option>
                          </select>
                        </label>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={state.schedulerConfig.enabled}
                          aria-label="Toggle autonomous scheduler"
                          onClick={() => handleToggleScheduler(!state.schedulerConfig.enabled)}
                          disabled={busyAction !== null}
                          className={clsx(
                            'btn px-3 py-1.5 text-xs',
                            state.schedulerConfig.enabled ? 'btn-primary' : 'btn-ghost'
                          )}
                        >
                          <Clock size={13} />
                          <span>{state.schedulerConfig.enabled ? 'Auto-Schedule ON' : 'Auto-Schedule OFF'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleAnalyze}
                          disabled={busyAction !== null}
                          className="btn btn-ghost px-3 py-1.5 text-xs"
                        >
                          {busyAction === 'analyze' ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Search size={13} />
                          )}
                          <span>Re-analyze System</span>
                        </button>
                      </div>
                    </section>

                    {/* Performance History Chart */}
                    <PerformanceTrendChart data={state.performanceHistory} />

                    {/* Current System Capabilities & Weaknesses */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Capabilities */}
                      <section className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                            Current System Capabilities
                          </h3>
                          <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
                            {state.capabilities.length} modules
                          </span>
                        </div>
                        <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 divide-y divide-[var(--line)]">
                          {state.capabilities.map((cap) => (
                            <div key={cap.id} className="p-3.5 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-[var(--text-primary)]">
                                  {cap.name}
                                </span>
                                <span
                                  className={clsx(
                                    'text-[11px] font-medium capitalize shrink-0 inline-flex items-center gap-1',
                                    cap.status === 'operational' && 'text-emerald-700 dark:text-emerald-400',
                                    cap.status === 'degraded' && 'text-amber-700 dark:text-amber-400',
                                    cap.status === 'missing' && 'text-rose-700 dark:text-rose-400',
                                    cap.status === 'experimental' && 'text-[var(--accent)]'
                                  )}
                                >
                                  {cap.status === 'operational' ? (
                                    <CheckCircle2 size={12} />
                                  ) : (
                                    <AlertTriangle size={12} />
                                  )}
                                  {cap.status}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                {cap.description}
                              </p>
                              <div className="text-[11px] text-[var(--text-muted)] font-mono truncate">
                                {cap.category}
                                <span className="mx-1.5" aria-hidden="true">·</span>
                                {cap.files.join(', ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Weaknesses */}
                      <section className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                            Identified Weaknesses &amp; Gaps
                          </h3>
                          <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
                            {openWeaknessCount} open
                          </span>
                        </div>
                        {state.weaknesses.length === 0 ? (
                          <div className="p-6 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 text-xs text-[var(--text-muted)]">
                            No architectural weaknesses detected in the latest inspection.
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 divide-y divide-[var(--line)]">
                            {state.weaknesses.map((w) => (
                              <div key={w.id} className="p-3.5 space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                                    {w.title}
                                  </span>
                                  <span
                                    className={clsx(
                                      'text-[11px] font-medium capitalize shrink-0',
                                      w.resolved
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : w.severity === 'critical' || w.severity === 'high'
                                          ? 'text-rose-700 dark:text-rose-400'
                                          : 'text-amber-700 dark:text-amber-400'
                                    )}
                                  >
                                    {w.resolved ? 'Resolved' : `${w.severity} severity`}
                                  </span>
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                  {w.description}
                                </p>
                                <div className="text-[11px] text-[var(--text-muted)]">
                                  Suggested fix: {w.suggestedFix}
                                </div>
                                <div className="text-[11px] text-[var(--text-muted)] font-mono truncate">
                                  {w.area}
                                  <span className="mx-1.5" aria-hidden="true">·</span>
                                  {w.affectedFiles.join(', ')}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </div>

                    {/* 7 Self-Expansion Questions */}
                    <section className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                          Autonomous Capability Self-Reflection
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          Continuous self-interrogation guiding which capabilities NOVA researches and builds next.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {state.selfReflection.map((qa, idx) => (
                          <div
                            key={qa.question}
                            className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 space-y-1.5"
                          >
                            <div className="text-xs font-semibold text-[var(--text-primary)]">
                              0{idx + 1}. {qa.question}
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                              {qa.currentAnswer}
                            </p>
                            <div className="text-[11px] text-[var(--accent)] pt-0.5">
                              Gap: {qa.gapIdentified}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* TAB 2: 4-AGENT COLLABORATIVE DEBATE                     */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab === 'debate' && (
                  <div className="space-y-6">
                    {/* Targeted Goal Launcher */}
                    <section className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                          Launch Collaborative 4-Agent Debate &amp; Sandbox Build
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          Researcher, Strategist, Developer, and Quality Control debate a capability upgrade, build it in sandbox, and benchmark it.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={customGoal}
                          onChange={(e) => setCustomGoal(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRunCycle(customGoal)}
                          placeholder="Optional target goal (e.g. Improve hybrid RAG memory ranking or prompt caching)..."
                          aria-label="Target evolution goal"
                          className="flex-1 bg-[var(--bg-2)] border border-[var(--line)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-muted)]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRunCycle(customGoal)}
                          disabled={busyAction !== null}
                          className="btn btn-primary px-4 py-2 text-xs shrink-0"
                        >
                          {busyAction === 'run-cycle' ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} />
                          )}
                          <span>Start Council Cycle</span>
                        </button>
                      </div>
                    </section>

                    {/* 4 Agent Roles Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {(['researcher', 'strategist', 'developer', 'quality_control'] as EvolutionAgentRole[]).map(
                        (role) => {
                          const meta = AGENT_META[role];
                          const turnCount =
                            activeExperiment?.debateTranscript.filter((t) => t.agent === role).length ?? 0;
                          return (
                            <div
                              key={role}
                              className="p-3.5 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-[var(--text-primary)]">
                                  {meta.name}
                                </span>
                                <span className="text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
                                  {turnCount} turns
                                </span>
                              </div>
                              <div className="text-[11px] text-[var(--accent)]">{meta.roleTitle}</div>
                              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                {meta.mandate}
                              </p>
                            </div>
                          );
                        }
                      )}
                    </div>

                    {/* Experiment Selector + Debate Thread */}
                    {state.experiments.length === 0 ? (
                      <div className="p-8 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 text-center space-y-3">
                        <Bot size={24} className="mx-auto text-[var(--text-muted)]" />
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          No evolution debates recorded yet
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Run an evolution cycle above to watch the four agents challenge and verify an architecture upgrade.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                            Debate Transcript
                          </h3>
                          <select
                            aria-label="Select evolution cycle"
                            value={activeExperiment?.id || ''}
                            onChange={(e) => setSelectedExperimentId(e.target.value)}
                            className="bg-[var(--bg-2)] border border-[var(--line-strong)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)] max-w-full"
                          >
                            {state.experiments.map((exp) => (
                              <option key={exp.id} value={exp.id}>
                                {exp.title} ({exp.status.replace(/_/g, ' ')})
                              </option>
                            ))}
                          </select>
                        </div>

                        {activeExperiment && (
                          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 divide-y divide-[var(--line)]">
                            <div className="p-4 space-y-1">
                              <div className="text-sm font-semibold text-[var(--text-primary)]">
                                {activeExperiment.title}
                              </div>
                              <p className="text-xs text-[var(--text-secondary)]">
                                Hypothesis: {activeExperiment.hypothesis}
                              </p>
                              <div className="text-[11px] text-[var(--text-muted)] font-mono">
                                Area: {activeExperiment.area}
                                <span className="mx-1.5" aria-hidden="true">·</span>
                                Status: {activeExperiment.status.replace(/_/g, ' ')}
                                <span className="mx-1.5" aria-hidden="true">·</span>
                                {formatTime(activeExperiment.createdAt)}
                              </div>
                            </div>

                            {activeExperiment.debateTranscript.map((turn) => (
                              <div key={turn.id} className="p-4 space-y-1.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                                    {AGENT_META[turn.agent].name}
                                    <span className="mx-1.5 text-[var(--text-muted)]" aria-hidden="true">·</span>
                                    <span
                                      className={clsx(
                                        'capitalize font-medium',
                                        turn.stance === 'challenge' && 'text-amber-700 dark:text-amber-400',
                                        turn.stance === 'veto' && 'text-rose-700 dark:text-rose-400',
                                        turn.stance === 'approve' && 'text-emerald-700 dark:text-emerald-400',
                                        (turn.stance === 'propose' || turn.stance === 'revise' || turn.stance === 'support') &&
                                          'text-[var(--accent)]'
                                      )}
                                    >
                                      {turn.stance}
                                    </span>
                                    {turn.targetAgent && (
                                      <span className="text-[var(--text-muted)] font-normal">
                                        {' '}
                                        to {AGENT_META[turn.targetAgent].name}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
                                    {formatTime(turn.timestamp)}
                                  </span>
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                                  {turn.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* TAB 3: AUTONOMOUS WEB RESEARCH                          */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab === 'research' && (
                  <div className="space-y-6">
                    <section className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                            Autonomous Technical Discovery
                          </h3>
                          <p className="text-xs text-[var(--text-muted)]">
                            Queries live web search and extracts architectural insights compared against NOVA&apos;s current modules.
                          </p>
                        </div>
                        <span className="text-xs text-[var(--text-muted)] font-mono">
                          Last run: {formatTime(state.lastResearchedAt)}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={researchQuery}
                          onChange={(e) => setResearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                          placeholder="Optional research topic (leave blank for rotating autonomous topic)..."
                          aria-label="Research topic query"
                          className="flex-1 bg-[var(--bg-2)] border border-[var(--line)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-muted)]"
                        />
                        <button
                          type="button"
                          onClick={handleResearch}
                          disabled={busyAction !== null}
                          className="btn btn-primary px-4 py-2 text-xs shrink-0"
                        >
                          {busyAction === 'research' ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Globe size={14} />
                          )}
                          <span>Research Web</span>
                        </button>
                      </div>
                    </section>

                    {state.discoveries.length === 0 ? (
                      <div className="p-8 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 text-center space-y-3">
                        <Globe size={24} className="mx-auto text-[var(--text-muted)]" />
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          No technical discoveries logged yet
                        </p>
                        <button
                          type="button"
                          onClick={handleResearch}
                          disabled={busyAction !== null}
                          className="btn btn-ghost px-4 py-2 text-xs"
                        >
                          Run First Web Research Cycle
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 divide-y divide-[var(--line)]">
                        {state.discoveries.map((d) => (
                          <article key={d.id} className="p-4 space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                                  {d.title}
                                </h4>
                                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                  <span className="capitalize">{d.category.replace(/_/g, ' ')}</span>
                                  <span className="mx-1.5" aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums">
                                    Relevance {Math.round(d.relevanceScore * 100)}%
                                  </span>
                                  <span className="mx-1.5" aria-hidden="true">·</span>
                                  <span>{formatTime(d.discoveredAt)}</span>
                                </div>
                              </div>
                              {d.sourceUrl && (
                                <a
                                  href={d.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline shrink-0"
                                >
                                  <span>Source</span>
                                  <ArrowUpRight size={13} />
                                </a>
                              )}
                            </div>

                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                              {d.summary}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                              <div className="p-2.5 rounded-xl bg-[var(--bg-2)]/60">
                                <span className="font-medium text-[var(--text-primary)] block mb-0.5">
                                  Compared to Current NOVA
                                </span>
                                <span className="text-[var(--text-secondary)]">{d.comparedToCurrent}</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-[var(--bg-2)]/60">
                                <span className="font-medium text-[var(--text-primary)] block mb-0.5">
                                  Actionable Upgrade Insight
                                </span>
                                <span className="text-[var(--text-secondary)]">{d.actionableInsight}</span>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* TAB 4: SANDBOX EXPERIMENTS & BENCHMARKS                 */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab === 'sandbox' && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                          Isolated Sandbox &amp; Benchmark Verification
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          All candidate code is compiled and timed in isolated folders under workspaces/_evolution_sandbox. Live files are never touched during experimentation.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRunCycle()}
                        disabled={busyAction !== null}
                        className="btn btn-ghost px-3 py-1.5 text-xs"
                      >
                        <FlaskConical size={13} />
                        <span>New Sandbox Experiment</span>
                      </button>
                    </div>

                    {state.experiments.length === 0 ? (
                      <div className="p-8 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 text-center space-y-2">
                        <Code2 size={24} className="mx-auto text-[var(--text-muted)]" />
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          No sandbox experiments run yet
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Trigger an evolution cycle to compile and benchmark a candidate upgrade safely.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {state.experiments.map((exp) => {
                          const isPatchOpen = Boolean(expandedPatchIds[exp.id]);
                          return (
                            <section
                              key={exp.id}
                              className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 space-y-3"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                                    {exp.title}
                                  </h4>
                                  <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5 break-all">
                                    Sandbox: {exp.sandboxDir}
                                    <span className="mx-1.5" aria-hidden="true">·</span>
                                    {exp.targetFiles.join(', ')}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs shrink-0">
                                  <span
                                    className={clsx(
                                      'inline-flex items-center gap-1 font-medium',
                                      exp.syntaxVerified
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : 'text-rose-700 dark:text-rose-400'
                                    )}
                                  >
                                    {exp.syntaxVerified ? (
                                      <CheckCircle2 size={13} />
                                    ) : (
                                      <XCircle size={13} />
                                    )}
                                    {exp.syntaxVerified ? 'Compiled' : 'Compile Failed'}
                                  </span>
                                  <span className="text-[var(--text-muted)]" aria-hidden="true">·</span>
                                  <span className="capitalize font-medium text-[var(--text-secondary)]">
                                    {exp.status.replace(/_/g, ' ')}
                                  </span>
                                </div>
                              </div>

                              {/* Benchmark Metrics Table */}
                              {exp.benchmark && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-[var(--bg-2)]/60 text-xs">
                                  <div>
                                    <div className="text-[11px] text-[var(--text-muted)]">Baseline Latency</div>
                                    <div className="font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                                      {exp.benchmark.baselineLatencyMs} ms
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-[var(--text-muted)]">Candidate Latency</div>
                                    <div className="font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                                      {exp.benchmark.experimentLatencyMs} ms
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-[var(--text-muted)]">Verification Checks</div>
                                    <div className="font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                                      {exp.benchmark.testsPassed}/{exp.benchmark.testsTotal} passed
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-[var(--text-muted)]">Regression Status</div>
                                    <div
                                      className={clsx(
                                        'font-semibold',
                                        exp.benchmark.regressionDetected
                                          ? 'text-rose-700 dark:text-rose-400'
                                          : 'text-emerald-700 dark:text-emerald-400'
                                      )}
                                    >
                                      {exp.benchmark.regressionDetected ? 'Regression Found' : 'Verified Clean'}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {exp.verificationErrors.length > 0 && (
                                <div className="p-2.5 rounded-xl bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300 font-mono">
                                  {exp.verificationErrors.join(' | ')}
                                </div>
                              )}

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedPatchIds((prev) => ({
                                      ...prev,
                                      [exp.id]: !prev[exp.id],
                                    }))
                                  }
                                  className="btn btn-ghost px-3 py-1.5 text-xs"
                                >
                                  <Code2 size={13} />
                                  <span>
                                    {isPatchOpen
                                      ? 'Hide Patch Code'
                                      : `Inspect ${exp.filePatches.length} File Patch`}
                                  </span>
                                </button>

                                {exp.status === 'passed_awaiting_approval' && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab('approvals')}
                                    className="btn btn-primary px-3 py-1.5 text-xs"
                                  >
                                    <ShieldCheck size={13} />
                                    <span>Review in Approvals</span>
                                  </button>
                                )}
                              </div>

                              {isPatchOpen && (
                                <div className="space-y-2 pt-2 border-t border-[var(--line)]">
                                  {exp.filePatches.map((patch) => (
                                    <div key={patch.path} className="space-y-1">
                                      <div className="text-[11px] font-mono text-[var(--text-muted)]">
                                        {patch.changeType.toUpperCase()} {patch.path} (+{patch.linesAdded} / -{patch.linesRemoved})
                                      </div>
                                      <pre className="p-3 rounded-xl bg-black/85 text-stone-100 text-[11px] font-mono overflow-x-auto max-h-64 leading-relaxed">
                                        {patch.content}
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </section>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* TAB 5: PENDING APPROVALS & ROLLBACK                     */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab === 'approvals' && (
                  <div className="space-y-6">
                    {/* Pending Approvals */}
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                            Pending Approvals &amp; Security Gate
                          </h3>
                          <p className="text-xs text-[var(--text-muted)]">
                            Production deployments, database migrations, authentication, credentials, and security changes always require explicit confirmation.
                          </p>
                        </div>
                        <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                          {pendingApprovals.length} queued
                        </span>
                      </div>

                      {pendingApprovals.length === 0 ? (
                        <div className="p-6 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 text-center space-y-2">
                          <ShieldCheck size={22} className="mx-auto text-emerald-600 dark:text-emerald-400" />
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            No upgrades awaiting approval
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            Run an evolution cycle to stage new verified candidates for review.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {pendingApprovals.map((exp) => {
                            const isPatchOpen = Boolean(expandedPatchIds[`appr-${exp.id}`]);
                            return (
                              <div
                                key={exp.id}
                                className="p-4 rounded-2xl border border-[var(--line-strong)] bg-[var(--bg-1)]/75 space-y-3"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                                      {exp.title}
                                    </h4>
                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                      {exp.hypothesis}
                                    </p>
                                  </div>
                                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 shrink-0">
                                    <Lock size={13} />
                                    Approval Required
                                  </span>
                                </div>

                                {/* Security Gate Details */}
                                <div className="p-3 rounded-xl bg-[var(--bg-2)]/65 space-y-1.5 text-xs">
                                  <div className="flex flex-wrap items-center gap-2 font-medium text-[var(--text-primary)]">
                                    <ShieldAlert size={14} className="text-[var(--accent)]" />
                                    <span>
                                      Gate classifications:{' '}
                                      {exp.securityGate.riskCategories
                                        .map((c) => RISK_LABELS[c] || c)
                                        .join(' · ')}
                                    </span>
                                  </div>
                                  <ul className="list-disc pl-5 text-[11px] text-[var(--text-secondary)] space-y-0.5">
                                    {exp.securityGate.reasons.map((r, i) => (
                                      <li key={i}>{r}</li>
                                    ))}
                                  </ul>
                                  <div className="text-[11px] text-[var(--text-muted)] font-mono break-all">
                                    Target files: {exp.targetFiles.join(', ')}
                                  </div>
                                </div>

                                {exp.benchmark && (
                                  <div className="text-xs text-[var(--text-secondary)] font-mono tabular-nums">
                                    Benchmark: {exp.benchmark.summary}
                                  </div>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedPatchIds((prev) => ({
                                        ...prev,
                                        [`appr-${exp.id}`]: !prev[`appr-${exp.id}`],
                                      }))
                                    }
                                    className="btn btn-ghost px-3 py-1.5 text-xs"
                                  >
                                    <Code2 size={13} />
                                    <span>{isPatchOpen ? 'Hide Proposed Code' : 'Inspect Proposed Code'}</span>
                                  </button>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleReject(exp.id)}
                                      disabled={busyAction !== null}
                                      className="btn btn-ghost px-3 py-2 text-xs text-rose-700 dark:text-rose-400"
                                    >
                                      {busyAction === `reject-${exp.id}` ? (
                                        <Loader2 size={13} className="animate-spin" />
                                      ) : (
                                        <XCircle size={13} />
                                      )}
                                      <span>Reject</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleApprove(exp.id)}
                                      disabled={busyAction !== null}
                                      className="btn btn-primary px-3.5 py-2 text-xs"
                                    >
                                      {busyAction === `approve-${exp.id}` ? (
                                        <Loader2 size={13} className="animate-spin" />
                                      ) : (
                                        <CheckCircle2 size={13} />
                                      )}
                                      <span>Approve &amp; Backup + Deploy</span>
                                    </button>
                                  </div>
                                </div>

                                {isPatchOpen && (
                                  <div className="space-y-2 pt-2 border-t border-[var(--line)]">
                                    {exp.filePatches.map((patch) => (
                                      <div key={patch.path} className="space-y-1">
                                        <div className="text-[11px] font-mono text-[var(--text-muted)]">
                                          {patch.changeType.toUpperCase()} {patch.path}
                                        </div>
                                        <pre className="p-3 rounded-xl bg-black/85 text-stone-100 text-[11px] font-mono overflow-x-auto max-h-64 leading-relaxed">
                                          {patch.content}
                                        </pre>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    {/* Completed Upgrades & Backups with 1-Click Rollback */}
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                            Completed Upgrades &amp; Rollback Snapshots
                          </h3>
                          <p className="text-xs text-[var(--text-muted)]">
                            Every approved deployment stores a file-level backup snapshot so changes can be restored cleanly.
                          </p>
                        </div>
                        <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                          {completedUpgrades.length} deployed
                        </span>
                      </div>

                      {completedUpgrades.length === 0 ? (
                        <div className="p-6 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 text-xs text-[var(--text-muted)]">
                          No autonomous upgrades have been approved for live deployment yet.
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 divide-y divide-[var(--line)]">
                          {completedUpgrades.map((up) => {
                            const expRecord = state.experiments.find((e) => e.id === up.experimentId);
                            const alreadyRolledBack = expRecord?.status === 'rolled_back';
                            const isConfirming = confirmRollbackId === up.experimentId;
                            return (
                              <div
                                key={up.id}
                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="min-w-0 space-y-1">
                                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                                    {up.title}
                                  </div>
                                  <div className="text-xs text-[var(--text-secondary)]">
                                    {up.impactSummary}
                                  </div>
                                  <div className="text-[11px] text-[var(--text-muted)] font-mono truncate">
                                    {up.deployedFiles.join(', ')}
                                    <span className="mx-1.5" aria-hidden="true">·</span>
                                    Deployed {formatTime(up.deployedAt)}
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-2">
                                  {alreadyRolledBack ? (
                                    <span className="text-xs font-medium text-[var(--text-muted)]">
                                      Rolled Back
                                    </span>
                                  ) : isConfirming ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleRollback(up.experimentId)}
                                        disabled={busyAction !== null}
                                        className="btn btn-primary px-3 py-1.5 text-xs"
                                      >
                                        {busyAction === `rollback-${up.experimentId}` ? (
                                          <Loader2 size={13} className="animate-spin" />
                                        ) : (
                                          <RotateCcw size={13} />
                                        )}
                                        <span>Confirm Rollback</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmRollbackId(null)}
                                        className="btn btn-ghost px-2.5 py-1.5 text-xs"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmRollbackId(up.experimentId)}
                                      disabled={busyAction !== null}
                                      className="btn btn-ghost px-3 py-1.5 text-xs"
                                    >
                                      <RotateCcw size={13} />
                                      <span>Rollback</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════ */}
                {/* TAB 6: PERSISTENT EVOLUTION MEMORY & LOGS               */}
                {/* ═══════════════════════════════════════════════════════ */}
                {activeTab === 'memory' && (
                  <div className="space-y-5">
                    {/* Segmented Memory Sub-Filter */}
                    <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[var(--bg-2)]/70 w-fit max-w-full overflow-x-auto">
                      {(
                        [
                          { id: 'solutions', label: `Solutions (${state.completedUpgrades.length})` },
                          { id: 'failed', label: `Avoided Mistakes (${state.failedExperiments.length})` },
                          { id: 'decisions', label: `Decisions (${state.architecturalDecisions.length})` },
                          { id: 'telemetry', label: 'Runtime Telemetry' },
                          { id: 'logs', label: `Activity Logs (${state.logs.length})` },
                        ] as Array<{ id: MemorySubTab; label: string }>
                      ).map((sub) => (
                        <button
                          type="button"
                          key={sub.id}
                          onClick={() => setMemorySubTab(sub.id)}
                          className={clsx(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap',
                            memorySubTab === sub.id
                              ? 'bg-[var(--bg-1)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          )}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>

                    {memorySubTab === 'solutions' && (
                      <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 divide-y divide-[var(--line)]">
                        {state.completedUpgrades.length === 0 ? (
                          <div className="p-6 text-xs text-[var(--text-muted)]">
                            No deployed solutions stored yet. Approved experiments appear here automatically.
                          </div>
                        ) : (
                          state.completedUpgrades.map((s) => (
                            <div key={s.id} className="p-4 space-y-1">
                              <div className="text-xs font-semibold text-[var(--text-primary)]">{s.title}</div>
                              <p className="text-xs text-[var(--text-secondary)]">{s.impactSummary}</p>
                              <div className="text-[11px] text-[var(--text-muted)] font-mono">
                                {s.area}
                                <span className="mx-1.5" aria-hidden="true">·</span>
                                {s.deployedFiles.join(', ')}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {memorySubTab === 'failed' && (
                      <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 divide-y divide-[var(--line)]">
                        {state.failedExperiments.length === 0 ? (
                          <div className="p-6 text-xs text-[var(--text-muted)]">
                            No failed experiment fingerprints recorded. Regressions or compile errors are logged here so cycles never repeat them.
                          </div>
                        ) : (
                          state.failedExperiments.map((f) => (
                            <div key={f.id} className="p-4 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-[var(--text-primary)]">
                                  {f.title}
                                </span>
                                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                                  {formatTime(f.timestamp)}
                                </span>
                              </div>
                              <p className="text-xs text-rose-700 dark:text-rose-400">{f.reason}</p>
                              <p className="text-xs text-[var(--text-secondary)]">
                                Lesson: {f.lessonsLearned}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {memorySubTab === 'decisions' && (
                      <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 divide-y divide-[var(--line)]">
                        {state.architecturalDecisions.length === 0 ? (
                          <div className="p-6 text-xs text-[var(--text-muted)]">
                            No architectural decisions recorded yet.
                          </div>
                        ) : (
                          state.architecturalDecisions.map((d) => (
                            <div key={d.id} className="p-4 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-[var(--text-primary)]">
                                  {d.title}
                                </span>
                                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                                  Approved by {d.approvedBy}
                                  <span className="mx-1.5" aria-hidden="true">·</span>
                                  {formatTime(d.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--text-secondary)]">{d.rationale}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {memorySubTab === 'telemetry' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3.5 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65">
                            <div className="text-[11px] text-[var(--text-muted)]">Total AI Requests</div>
                            <div className="text-lg font-semibold font-mono tabular-nums">
                              {state.telemetry.totalRequests}
                            </div>
                          </div>
                          <div className="p-3.5 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65">
                            <div className="text-[11px] text-[var(--text-muted)]">Avg Latency</div>
                            <div className="text-lg font-semibold font-mono tabular-nums">
                              {state.telemetry.avgLatencyMs}ms
                            </div>
                          </div>
                          <div className="p-3.5 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65">
                            <div className="text-[11px] text-[var(--text-muted)]">p95 Latency</div>
                            <div className="text-lg font-semibold font-mono tabular-nums">
                              {state.telemetry.p95LatencyMs}ms
                            </div>
                          </div>
                          <div className="p-3.5 rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65">
                            <div className="text-[11px] text-[var(--text-muted)]">Error Rate</div>
                            <div className="text-lg font-semibold font-mono tabular-nums">
                              {state.telemetry.errorRatePct}%
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-[var(--line)] text-[var(--text-muted)]">
                              <tr>
                                <th className="py-2.5 px-4 font-medium">Provider</th>
                                <th className="py-2.5 px-4 font-medium text-right">Requests</th>
                                <th className="py-2.5 px-4 font-medium text-right">Errors</th>
                                <th className="py-2.5 px-4 font-medium text-right">Avg Latency</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--line)] font-mono tabular-nums">
                              {Object.entries(state.telemetry.byProvider).length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-5 px-4 text-center font-sans text-[var(--text-muted)]">
                                    No live chat requests recorded in this session yet.
                                  </td>
                                </tr>
                              ) : (
                                Object.entries(state.telemetry.byProvider).map(([prov, stats]) => (
                                  <tr key={prov}>
                                    <td className="py-2.5 px-4 font-sans font-medium capitalize text-[var(--text-primary)]">
                                      {prov}
                                    </td>
                                    <td className="py-2.5 px-4 text-right">{stats.requests}</td>
                                    <td className="py-2.5 px-4 text-right">{stats.errors}</td>
                                    <td className="py-2.5 px-4 text-right">{stats.avgLatencyMs}ms</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {memorySubTab === 'logs' && (
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={logSearch}
                            onChange={(e) => setLogSearch(e.target.value)}
                            placeholder="Filter activity logs..."
                            aria-label="Filter activity logs"
                            className="flex-1 bg-[var(--bg-2)] border border-[var(--line)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                          />
                          <select
                            aria-label="Filter log level"
                            value={logLevelFilter}
                            onChange={(e) => setLogLevelFilter(e.target.value)}
                            className="bg-[var(--bg-2)] border border-[var(--line-strong)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)]"
                          >
                            <option value="all">All Levels</option>
                            <option value="info">Info</option>
                            <option value="research">Research</option>
                            <option value="debate">Debate</option>
                            <option value="experiment">Experiment</option>
                            <option value="security">Security</option>
                            <option value="warning">Warning</option>
                            <option value="error">Error</option>
                          </select>
                        </div>

                        <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-1)]/65 divide-y divide-[var(--line)] max-h-[380px] overflow-y-auto">
                          {filteredLogs.length === 0 ? (
                            <div className="p-6 text-xs text-[var(--text-muted)]">
                              No activity logs match your filter.
                            </div>
                          ) : (
                            filteredLogs.map((log) => (
                              <div key={log.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <div className="min-w-0 space-y-0.5">
                                  <div className="text-[var(--text-primary)] font-medium">
                                    {log.message}
                                  </div>
                                  {log.details && (
                                    <div className="text-[11px] text-[var(--text-muted)] truncate">
                                      {log.details}
                                    </div>
                                  )}
                                </div>
                                <div className="text-[11px] font-mono tabular-nums text-[var(--text-muted)] shrink-0">
                                  {log.agent}
                                  <span className="mx-1.5" aria-hidden="true">·</span>
                                  {log.level}
                                  <span className="mx-1.5" aria-hidden="true">·</span>
                                  {formatTime(log.timestamp)}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
