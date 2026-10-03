import React from 'react';
import { ArrowUpRight, ArrowUp, GitBranch, GitCommit, Check, GitPullRequest, Search } from 'lucide-react';
import { GitHubToolEvent } from '../../../models/types';
import { clsx } from 'clsx';

interface GitHubActivityCardProps {
  event: GitHubToolEvent;
}

export function GitHubActivityCard({ event }: GitHubActivityCardProps) {
  const isRead = event.operation === 'read' || event.operation === 'search';
  const isCommit = event.operation === 'commit';
  const isBranch = event.operation === 'branch';

  const actionTitle = isRead
    ? 'Reading repository'
    : isCommit
    ? 'Committed changes'
    : isBranch
    ? 'Created branch'
    : 'GitHub operation';

  const isRunning = event.status === 'running';

  return (
    <div className="w-full my-2 rounded-xl bg-[#161b22] border border-[#30363d] px-3.5 py-2.5 text-xs shadow-md transition-all font-sans">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {/* Arrow / Icon Indicator */}
          <div className="mt-0.5 w-6 h-6 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center text-slate-200 shrink-0">
            {isCommit ? (
              <span className="font-bold text-emerald-400 text-sm">↑</span>
            ) : isRead ? (
              <span className="font-bold text-sky-400 text-sm">↗</span>
            ) : (
              <GitBranch size={13} className="text-purple-400" />
            )}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-white tracking-wide">
              <span>{isCommit ? '↑' : isRead ? '↗' : '⑂'}</span>
              <span>GitHub</span>
              {event.repo && (
                <span className="text-[10px] text-[#8d8d91] font-mono font-normal">
                  • {event.repo}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-300 font-medium">
              {actionTitle}
            </p>

            {/* Target Path or Commit Sha */}
            {event.target && (
              <p className="font-mono text-emerald-300 text-[11px] truncate">
                "{event.target}"
              </p>
            )}

            {event.commitSha && (
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-purple-300 bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-800/60 font-semibold">
                  {event.commitSha.slice(0, 7)}
                </span>
                {event.commitMessage && (
                  <span className="text-slate-300 truncate max-w-xs font-sans text-[11px]">
                    "{event.commitMessage}"
                  </span>
                )}
              </div>
            )}

            {event.detail && (
              <p className="text-[10px] text-[#8d8d91] mt-0.5 truncate">
                {event.detail}
              </p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">
          {isRunning ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-bold text-[10px] animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Running
            </span>
          ) : event.status === 'completed' ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <Check size={12} />
              <span>Done</span>
            </span>
          ) : (
            <span className="text-[11px] text-rose-400 font-medium">Failed</span>
          )}
        </div>
      </div>
    </div>
  );
}
