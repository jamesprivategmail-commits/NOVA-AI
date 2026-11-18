import React, { useState, useEffect } from 'react';
import {
  GitBranch, Check, ExternalLink, Lightbulb, Loader2, AlertCircle, RefreshCw, History, FlaskConical,
} from 'lucide-react';
import { clsx } from 'clsx';

interface Proposal {
  id: string | number;
  title?: string;
  description?: string;
  area?: string;
}

interface Commit {
  id: string | number;
  sha?: string;
  message?: string;
  url?: string;
  area?: string;
  createdAt?: string | number;
}

interface EvolutionStats {
  totalProposals?: number;
  totalApplied?: number;
  [key: string]: unknown;
}

const AREAS = ['ui', 'brain', 'security', 'connectors', 'accessibility'] as const;

const AREA_STYLES: Record<string, string> = {
  ui: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  brain: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  security: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  connectors: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  accessibility: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
};

export function EvolutionPanel() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [stats, setStats] = useState<EvolutionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [area, setArea] = useState<string>('all');
  const [applying, setApplying] = useState<string | number | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [idea, setIdea] = useState('');
  const [submittingIdea, setSubmittingIdea] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/evolution/proposals'),
        fetch('/api/evolution/stats'),
      ]);
      if (!pRes.ok || !sRes.ok) throw new Error('Failed to load evolution data');
      const pData = await pRes.json();
      setProposals(Array.isArray(pData) ? pData : pData.proposals ?? []);
      setCommits(Array.isArray(pData) ? [] : pData.commits ?? []);
      setStats(await sRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleApply = async (id: string | number) => {
    setApplying(id);
    try {
      const res = await fetch('/api/evolution/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setApplied((prev) => new Set(prev).add(String(id)));
      }
    } catch (_) {
      // keep button enabled so user can retry
    } finally {
      setApplying(null);
    }
  };

  const handleIdea = async () => {
    const text = idea.trim();
    if (!text) return;
    setSubmittingIdea(true);
    try {
      const res = await fetch('/api/evolution/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text, area, source: 'user' }),
      });
      if (res.ok) {
        setIdea('');
        await fetchAll();
      }
    } catch (_) {
      // retryable
    } finally {
      setSubmittingIdea(false);
    }
  };

  const visibleProposals = area === 'all' ? proposals : proposals.filter((p) => p.area === area);
  const visibleCommits = area === 'all' ? commits : commits.filter((c) => c.area === area);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10 bg-[#1F1E1D] rounded-xl border border-[#3D3929]">
        <Loader2 size={20} className="text-[#D97757] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 bg-[#1F1E1D] rounded-xl border border-[#3D3929] text-center">
        <AlertCircle size={22} className="text-rose-400" />
        <p className="text-xs text-[#6B6A67]">{error}</p>
        <button
          onClick={fetchAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F1E1D] hover:bg-[#1F1E1D] border border-[#3D3929] text-white text-xs transition-colors cursor-pointer"
        >
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#1F1E1D] rounded-xl border border-[#3D3929] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#3D3929]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#1F1E1D] border border-[#3D3929] flex items-center justify-center">
            <GitBranch size={18} className="text-[#D97757]" />
          </div>
          <div>
            <div className="text-sm font-bold">Evolution</div>
            <div className="text-[10px] text-[#6B6A67]">
              {stats?.totalApplied ?? 0} applied &middot; {visibleProposals.length} pending
            </div>
          </div>
        </div>
        <button
          onClick={fetchAll}
          className="w-[34px] h-[34px] rounded-lg border bg-[#1F1E1D] hover:bg-[#1F1E1D] border-[#3D3929] text-[#E8E4D9] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Area filter chips */}
      <div className="px-4 py-2.5 border-b border-[#3D3929] flex items-center gap-1.5 overflow-x-auto">
        {['all', ...AREAS].map((a) => (
          <button
            key={a}
            onClick={() => setArea(a)}
            className={clsx(
              'px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors cursor-pointer shrink-0 border',
              area === a
                ? 'bg-[#FFFFFF] text-[#1F1E1D] border-[#F0EEE5]'
                : 'bg-transparent text-[#6B6A67] hover:text-[#1F1E1D] border-transparent'
            )}
          >
            {a}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* Pending proposals */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] text-[#6B6A67] uppercase tracking-wide">
            <FlaskConical size={12} /> Pending Proposals
          </div>
          {visibleProposals.length === 0 ? (
            <div className="text-[11px] text-[#E8E4D9] p-3 bg-[#1F1E1D] rounded-lg border border-[#3D3929]">
              No pending proposals{area !== 'all' ? ` in ${area}` : ''}.
            </div>
          ) : (
            visibleProposals.map((p) => {
              const id = String(p.id);
              const isApplied = applied.has(id);
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 p-3 bg-[#1F1E1D] rounded-lg border border-[#3D3929]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{p.title ?? String(p.id)}</div>
                    {p.description && (
                      <div className="text-[11px] text-[#6B6A67] truncate mt-0.5">{p.description}</div>
                    )}
                    {p.area && (
                      <span
                        className={clsx(
                          'inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] border',
                          AREA_STYLES[p.area] ?? 'bg-[#1F1E1D] text-[#E8E4D9] border-[#3D3929]'
                        )}
                      >
                        {p.area}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleApply(p.id)}
                    disabled={isApplied || applying === p.id}
                    className={clsx(
                      'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer shrink-0 border',
                      isApplied
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 pointer-events-none'
                        : 'bg-[#D97757] hover:opacity-90 text-white border-transparent',
                      applying === p.id && 'opacity-60 pointer-events-none'
                    )}
                  >
                    {isApplied ? <Check size={12} /> : applying === p.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    <span>{isApplied ? 'Applied' : 'Apply'}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Committed history */}
        {visibleCommits.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] text-[#6B6A67] uppercase tracking-wide">
              <History size={12} /> Committed
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {visibleCommits.slice(0, 10).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg bg-[#1F1E1D] border border-[#3D3929] text-[11px]"
                >
                  <span className="truncate text-[#c8c8cc]">{c.message ?? c.sha ?? String(c.id)}</span>
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[#D97757] hover:text-[#1F1E1D] shrink-0 font-mono text-[10px]"
                    >
                      {c.sha?.slice(0, 7) ?? 'view'} <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Idea input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Lightbulb size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
            <input
              type="text"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleIdea()}
              placeholder="Propose an upgrade idea..."
              aria-label="Propose an upgrade idea"
              className="w-full bg-[#1F1E1D] border border-[#3D3929] text-white text-[12px] rounded-lg pl-8 pr-3 py-2 outline-none focus:border-[#F0EEE5]"
            />
          </div>
          <button
            onClick={handleIdea}
            disabled={!idea.trim() || submittingIdea}
            className={clsx(
              'flex items-center gap-1.5 bg-[#D97757] hover:opacity-90 text-white text-[12px] font-medium px-3.5 py-2 rounded-lg transition-all cursor-pointer shrink-0',
              (!idea.trim() || submittingIdea) && 'opacity-60 pointer-events-none'
            )}
          >
            {submittingIdea ? <Loader2 size={13} className="animate-spin" /> : <Lightbulb size={13} />}
            <span>Propose</span>
          </button>
        </div>
      </div>
    </div>
  );
}
