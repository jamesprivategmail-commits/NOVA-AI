import React, { useState } from 'react';
import {
  Globe,
  MessageSquare,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { CouncilData } from '../../models/types';
import { getPersona } from '../models/personas';
import { NovaOrb } from './NovaOrb';

interface CouncilActivityCardProps {
  data: CouncilData;
  isStreaming?: boolean;
}

type ActiveTab = 'discussion' | 'tasks' | 'sources';

function phaseHeadline(phase: CouncilData['phase'], leadName?: string, totalDurationMs?: number): string {
  switch (phase) {
    case 'research':
      return 'Researching live internet & crawling site sections…';
    case 'discussion':
      return '4 models discussing context & planning 4-way split…';
    case 'work':
      return 'Executing 4 split workstreams in parallel…';
    case 'synthesis':
      return `${leadName || 'Lead Muse'} synthesizing all 4 deliverables…`;
    case 'done':
    default: {
      const sec = totalDurationMs ? ` · ${(totalDurationMs / 1000).toFixed(1)}s` : '';
      return `4-Model Squad completed parallel execution${sec}`;
    }
  }
}

export function CouncilActivityCard({ data, isStreaming = false }: CouncilActivityCardProps) {
  const [expanded, setExpanded] = useState<boolean>(isStreaming);
  const [activeTab, setActiveTab] = useState<ActiveTab>('discussion');
  const [openTaskIds, setOpenTaskIds] = useState<Record<string, boolean>>({});

  const discussions = data.discussions || [];
  const tasks = data.tasks || [];
  const sources = data.webSources || [];
  const totalPages = data.totalPagesRead || sources.length;

  React.useEffect(() => {
    if (isStreaming) {
      if (data.phase === 'research' && sources.length > 0) {
        setActiveTab('sources');
      } else if (data.phase === 'work') {
        setActiveTab('tasks');
      } else if (data.phase === 'discussion') {
        setActiveTab('discussion');
      }
    }
  }, [data.phase, isStreaming, sources.length]);

  const toggleTask = (id: string) => {
    setOpenTaskIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const squadPersonas = (data.squadMemberIds || []).map((id) => getPersona(undefined, undefined, id));

  return (
    <div className="mb-3 rounded-2xl glass-subtle border border-[var(--line)] overflow-hidden not-prose">
      {/* Compact Header Summary */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Overlapping 4-Muse Squad Avatars */}
          <div className="flex items-center -space-x-2 shrink-0">
            {squadPersonas.slice(0, 4).map((p) => (
              <div key={p.id} className="rounded-full ring-2 ring-[var(--bg-1)]">
                <NovaOrb
                  size={24}
                  persona={p}
                  state={isStreaming && data.phase !== 'done' ? 'thinking' : 'idle'}
                />
              </div>
            ))}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)] truncate">
              {isStreaming && data.phase !== 'done' ? (
                <Loader2 size={13} className="animate-spin shrink-0" style={{ color: 'var(--accent)' }} />
              ) : (
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              )}
              <span className="truncate">{phaseHeadline(data.phase, data.leadAgentName, data.totalDurationMs)}</span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5 tabular-nums">
              <span>{discussions.length || 4} models</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{tasks.length} parallel tasks</span>
              {totalPages > 0 && (
                <>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span>{totalPages} web pages read</span>
                </>
              )}
            </div>
          </div>
        </div>

        <span className="text-[var(--text-muted)] shrink-0">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {/* Expandable 3-Tab Collaboration Inspector */}
      {expanded && (
        <div className="border-t border-[var(--line)] p-3 space-y-3">
          {/* Interactive Tab Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('discussion')}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap',
                activeTab === 'discussion'
                  ? 'glass-thick text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              <MessageSquare size={12} style={activeTab === 'discussion' ? { color: 'var(--accent)' } : undefined} />
              <span>Discussion ({discussions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap',
                activeTab === 'tasks'
                  ? 'glass-thick text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              <Layers size={12} style={activeTab === 'tasks' ? { color: 'var(--accent)' } : undefined} />
              <span>Task Split ({tasks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sources')}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap',
                activeTab === 'sources'
                  ? 'glass-thick text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              <Globe size={12} style={activeTab === 'sources' ? { color: 'var(--accent)' } : undefined} />
              <span>Web Sources ({sources.length})</span>
            </button>
          </div>

          {/* Tab 1: 4-Model Round-Table Discussion */}
          {activeTab === 'discussion' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {discussions.map((d) => {
                const persona = getPersona(undefined, undefined, d.agentId);
                return (
                  <div
                    key={d.agentId}
                    className="p-2.5 rounded-xl glass border border-[var(--line)] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <NovaOrb
                          size={26}
                          persona={persona}
                          state={d.status === 'thinking' ? 'thinking' : 'idle'}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {d.agentName}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                            {d.modelUsed}
                          </div>
                        </div>
                      </div>
                      {d.status === 'thinking' ? (
                        <Loader2 size={12} className="animate-spin text-[var(--accent)] shrink-0" />
                      ) : d.status === 'error' ? (
                        <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                      ) : (
                        <span className="text-[10px] font-mono text-[var(--text-muted)] tabular-nums shrink-0">
                          {(d.durationMs / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {d.analysis || 'Reviewing conversation context & live data…'}
                    </p>
                    {d.proposedSubtask && (
                      <div className="text-[11px] font-medium text-[var(--text-primary)] pt-1 border-t border-[var(--line)]">
                        <span className="text-[var(--text-muted)]">Slice: </span>
                        {d.proposedSubtask}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Parallel 4-Way Task Split & Worker Outputs */}
          {activeTab === 'tasks' && (
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="text-xs text-[var(--text-muted)] py-2">
                  Preparing parallel 4-way work split…
                </div>
              ) : (
                tasks.map((t) => {
                  const persona = getPersona(undefined, undefined, t.agentId);
                  const isOpen = Boolean(openTaskIds[t.agentId]);
                  return (
                    <div
                      key={t.agentId}
                      className="rounded-xl glass border border-[var(--line)] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleTask(t.agentId)}
                        className="w-full p-2.5 flex items-center justify-between gap-2 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <NovaOrb
                            size={24}
                            persona={persona}
                            state={t.status === 'running' ? 'thinking' : 'idle'}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                              {t.agentName}: {t.taskTitle}
                            </div>
                            <div className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                              {t.modelUsed}
                              {t.durationMs > 0 ? ` · ${(t.durationMs / 1000).toFixed(1)}s` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {t.status === 'running' ? (
                            <Loader2 size={13} className="animate-spin text-[var(--accent)]" />
                          ) : t.status === 'error' ? (
                            <AlertTriangle size={13} className="text-amber-500" />
                          ) : (
                            <CheckCircle2 size={13} className="text-emerald-500" />
                          )}
                          <ChevronDown
                            size={13}
                            className={clsx('text-[var(--text-muted)] transition-transform', isOpen && 'rotate-180')}
                          />
                        </div>
                      </button>

                      {isOpen && t.output && (
                        <div className="px-3 pb-3 pt-1 border-t border-[var(--line)] text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                          {t.output}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 3: Live Internet Sources & Multi-Page Crawl */}
          {activeTab === 'sources' && (
            <div className="space-y-2">
              {sources.length === 0 ? (
                <div className="text-xs text-[var(--text-muted)] py-2">
                  No live web pages were needed for this turn, or crawl is still running.
                </div>
              ) : (
                sources.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2.5 rounded-xl glass border border-[var(--line)] hover:border-[var(--accent-muted)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {s.title}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--text-muted)] truncate mt-0.5">
                          {s.section ? `${s.section} · ` : ''}
                          {s.url}
                          {s.wordCount ? ` · ${s.wordCount} words` : ''}
                        </div>
                      </div>
                      <ExternalLink size={12} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                    </div>
                    {s.snippet && (
                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-1 leading-snug">
                        {s.snippet}
                      </p>
                    )}
                  </a>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
