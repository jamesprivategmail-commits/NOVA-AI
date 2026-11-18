import React, { useState, useEffect } from 'react';
import { Brain, RefreshCw, Sparkles, Trophy, Activity, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface BrainStats {
  runs?: number;
  learningCount?: number;
  providerWins?: Record<string, number>;
}

interface Learning {
  id: string | number;
  title?: string;
  summary?: string;
  content?: string;
  createdAt?: string | number;
}

export function BrainPanel() {
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distilling, setDistilling] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, learningsRes] = await Promise.all([
        fetch('/api/brain/stats'),
        fetch('/api/brain/learnings'),
      ]);
      if (!statsRes.ok || !learningsRes.ok) throw new Error('Failed to load brain data');
      setStats(await statsRes.json());
      const l = await learningsRes.json();
      setLearnings(Array.isArray(l) ? l : l.learnings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleDistill = async () => {
    setDistilling(true);
    try {
      await fetch('/api/brain/distill', { method: 'POST' });
      await fetchAll();
    } catch (_) {
      // surfaced via refresh state
    } finally {
      setDistilling(false);
    }
  };

  const wins = stats?.providerWins ?? {};
  const maxWins = Math.max(1, ...Object.values(wins));

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
            <Brain size={18} className="text-[#D97757]" />
          </div>
          <div>
            <div className="text-sm font-bold">Nova&apos;s Brain</div>
            <div className="text-[10px] text-[#6B6A67]">Council stats &amp; learnings</div>
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

      <div className="p-4 space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1F1E1D] rounded-lg border border-[#3D3929] p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-[#6B6A67] uppercase tracking-wide">
              <Activity size={12} /> Council Runs
            </div>
            <div className="text-2xl font-bold mt-1 font-mono">{stats?.runs ?? 0}</div>
          </div>
          <div className="bg-[#1F1E1D] rounded-lg border border-[#3D3929] p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-[#6B6A67] uppercase tracking-wide">
              <Sparkles size={12} /> Learnings
            </div>
            <div className="text-2xl font-bold mt-1 font-mono">{stats?.learningCount ?? learnings.length}</div>
          </div>
        </div>

        {/* Provider wins bar chart */}
        <div className="bg-[#1F1E1D] rounded-lg border border-[#3D3929] p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-[#6B6A67] uppercase tracking-wide mb-2.5">
            <Trophy size={12} /> Provider Wins
          </div>
          {Object.keys(wins).length === 0 ? (
            <div className="text-[11px] text-[#6B6A67] py-2">No provider data yet.</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(wins)
                .sort(([, a], [, b]) => b - a)
                .map(([provider, count]) => (
                  <div key={provider} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate text-[11px] text-[#6B6A67]">{provider}</span>
                    <div className="flex-1 h-4 bg-[#1F1E1D] rounded overflow-hidden">
                      <div
                        className="h-full bg-[#D97757] rounded transition-all duration-300"
                        style={{ width: `${Math.round((count / maxWins) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-[11px] font-mono text-[#1F1E1D]">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Recent learnings */}
        <div className="bg-[#1F1E1D] rounded-lg border border-[#3D3929] p-3">
          <div className="text-[10px] text-[#6B6A67] uppercase tracking-wide mb-2.5">Recent Learnings</div>
          {learnings.length === 0 ? (
            <div className="text-[11px] text-[#6B6A67] py-2">Nothing learned yet.</div>
          ) : (
            <ul className="space-y-1.5 max-h-48 overflow-y-auto">
              {learnings.slice(0, 10).map((l) => (
                <li
                  key={l.id}
                  className="flex items-start gap-2 p-2 rounded-lg bg-[#1F1E1D] text-[11px] leading-snug"
                >
                  <Sparkles size={11} className="text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-[#c8c8cc]">{l.title ?? l.summary ?? l.content ?? String(l.id)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Distill action */}
        <button
          onClick={handleDistill}
          disabled={distilling}
          className={clsx(
            'w-full flex items-center justify-center gap-2 bg-[#D97757] hover:opacity-90 text-white font-medium py-2.5 px-3.5 rounded-lg transition-all cursor-pointer text-[13px]',
            distilling && 'opacity-60 pointer-events-none'
          )}
        >
          {distilling ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          <span>{distilling ? 'Distilling...' : 'Distill Now'}</span>
        </button>
      </div>
    </div>
  );
}
