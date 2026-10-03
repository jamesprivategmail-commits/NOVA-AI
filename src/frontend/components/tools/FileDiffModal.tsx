import React, { useState } from 'react';
import { X, Copy, Check, FileCode, Plus, Minus, ArrowLeftRight } from 'lucide-react';
import { clsx } from 'clsx';

interface FileDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  diff?: string;
  originalContent?: string;
  newContent?: string;
  additions?: number;
  deletions?: number;
}

export function FileDiffModal({
  isOpen,
  onClose,
  filePath,
  diff,
  originalContent,
  newContent,
  additions = 0,
  deletions = 0,
}: FileDiffModalProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'diff' | 'new'>('diff');

  if (!isOpen) return null;

  // Generate synthetic diff if explicit diff string wasn't provided but original & new exist
  let displayDiff = diff || '';
  if (!displayDiff && (originalContent || newContent)) {
    const origLines = (originalContent || '').split('\n');
    const newLines = (newContent || '').split('\n');
    const lines: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`];
    
    let adds = 0;
    let dels = 0;

    // Simple diff generator
    const max = Math.max(origLines.length, newLines.length);
    for (let i = 0; i < max; i++) {
      const o = origLines[i];
      const n = newLines[i];
      if (o === undefined) {
        lines.push(`+ ${n}`);
        adds++;
      } else if (n === undefined) {
        lines.push(`- ${o}`);
        dels++;
      } else if (o !== n) {
        lines.push(`- ${o}`);
        lines.push(`+ ${n}`);
        adds++;
        dels++;
      } else {
        lines.push(`  ${o}`);
      }
    }
    displayDiff = lines.join('\n');
    if (!additions && adds) additions = adds;
    if (!deletions && dels) deletions = dels;
  }

  const handleCopy = () => {
    const textToCopy = viewMode === 'diff' ? (displayDiff || newContent || '') : (newContent || displayDiff || '');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const diffLines = displayDiff ? displayDiff.split('\n') : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-[#0d1117] border border-[#30363d] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileCode size={16} className="text-[#3f86ff] shrink-0" />
            <span className="font-semibold text-white text-xs sm:text-sm truncate">
              {filePath}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold shrink-0 ml-1">
              {additions > 0 && (
                <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60">
                  +{additions}
                </span>
              )}
              {deletions > 0 && (
                <span className="text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-700/60">
                  −{deletions}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {newContent && (
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'diff' ? 'new' : 'diff')}
                className="px-2.5 py-1 text-xs rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 transition-colors cursor-pointer flex items-center gap-1 font-sans"
              >
                <ArrowLeftRight size={12} />
                <span>{viewMode === 'diff' ? 'Full File' : 'Diff View'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 hover:bg-[#21262d] rounded-lg text-[#8d8d91] hover:text-white transition-colors cursor-pointer"
              title="Copy diff"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-[#21262d] rounded-lg text-[#8d8d91] hover:text-white transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content View */}
        <div className="flex-1 overflow-y-auto p-4 text-xs leading-relaxed select-text bg-[#0d1117]">
          {viewMode === 'diff' && displayDiff ? (
            <div className="space-y-0.5 divide-y divide-transparent">
              {diffLines.map((line, idx) => {
                const isAdd = line.startsWith('+');
                const isDel = line.startsWith('-');
                const isHeader = line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++');

                return (
                  <div
                    key={idx}
                    className={clsx(
                      "px-2 py-0.5 rounded flex items-start gap-3 whitespace-pre-wrap break-all font-mono",
                      isAdd && "bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500",
                      isDel && "bg-rose-950/40 text-rose-300 border-l-2 border-rose-500",
                      isHeader && "text-purple-400 bg-purple-950/20 font-bold",
                      !isAdd && !isDel && !isHeader && "text-slate-400"
                    )}
                  >
                    <span className="w-8 shrink-0 text-[#484f58] select-none text-[10px] text-right">
                      {idx + 1}
                    </span>
                    <span className="flex-1">
                      {line}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <pre className="text-slate-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
              {newContent || displayDiff || '(No content available)'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
