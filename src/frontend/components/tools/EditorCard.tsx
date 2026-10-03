import React, { useState } from 'react';
import { Sparkles, FileCode, Check, ChevronRight, FilePlus, FileEdit, FileX } from 'lucide-react';
import { EditorToolEvent } from '../../../models/types';
import { FileDiffModal } from './FileDiffModal';
import { clsx } from 'clsx';

interface EditorCardProps {
  event: EditorToolEvent;
}

export function EditorCard({ event }: EditorCardProps) {
  const [showDiff, setShowDiff] = useState(false);

  const actionVerb = event.action === 'create'
    ? 'Created'
    : event.action === 'delete'
    ? 'Deleted'
    : 'Editing';

  const additions = event.additions ?? 0;
  const deletions = event.deletions ?? 0;

  return (
    <>
      <div 
        onClick={() => setShowDiff(true)}
        className="w-full my-2 rounded-xl bg-[#161b22] hover:bg-[#1c2128] border border-[#30363d] hover:border-[#58a6ff]/60 px-3.5 py-2.5 flex items-center justify-between text-xs shadow-md transition-all cursor-pointer group select-none font-sans"
        title="Click to view file diff"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#58a6ff] shrink-0 group-hover:scale-105 transition-transform">
            <span className="text-[#3f86ff] text-xs">✦</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-300 font-medium">
                {actionVerb} <span className="text-white font-mono font-semibold">"{event.filePath}"</span>
              </span>

              {/* +24 -8 Diff badge */}
              {(additions > 0 || deletions > 0) && (
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                  {additions > 0 && (
                    <span className="text-emerald-400">+{additions}</span>
                  )}
                  {deletions > 0 && (
                    <span className="text-rose-400">−{deletions}</span>
                  )}
                </div>
              )}
            </div>

            {event.summary && (
              <p className="text-[10px] text-[#8d8d91] truncate max-w-sm mt-0.5">
                {event.summary}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {event.status === 'completed' ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <Check size={12} />
              <span>Saved</span>
            </span>
          ) : event.status === 'running' ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 animate-pulse font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Writing...</span>
            </span>
          ) : (
            <span className="text-[11px] text-rose-400 font-medium">Failed</span>
          )}

          <ChevronRight size={14} className="text-[#8d8d91] group-hover:text-white transition-colors" />
        </div>
      </div>

      {/* Diff View Modal */}
      <FileDiffModal
        isOpen={showDiff}
        onClose={() => setShowDiff(false)}
        filePath={event.filePath}
        diff={event.diff}
        originalContent={event.originalContent}
        newContent={event.newContent}
        additions={additions}
        deletions={deletions}
      />
    </>
  );
}
