import React, { useState } from 'react';
import { FileCode, ChevronDown, ChevronUp, Copy, Check, ExternalLink, RotateCcw, Eye } from 'lucide-react';
import { EditorToolEvent } from '../../../models/types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { clsx } from 'clsx';

interface FileArtifactCardProps {
  event: EditorToolEvent;
  onOpenInWorkspace?: (filePath: string, content?: string) => void;
}

export function FileArtifactCard({ event, onOpenInWorkspace }: FileArtifactCardProps) {
  const [showDiff, setShowDiff] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reverted, setReverted] = useState(false);

  const additions = event.additions ?? 0;
  const deletions = event.deletions ?? 0;
  const fileName = event.filePath.split('/').pop() || event.filePath;

  const contentToDisplay = event.newContent || event.diff || '';
  const ext = fileName.split('.').pop()?.toLowerCase() || 'text';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    html: 'html',
    css: 'css',
    json: 'json',
    py: 'python',
    md: 'markdown',
  };
  const syntaxLang = langMap[ext] || 'typescript';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(contentToDisplay);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenInWorkspace) {
      onOpenInWorkspace(event.filePath, event.newContent);
    }
  };

  const handleRevert = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReverted(true);
    setTimeout(() => setReverted(false), 2500);
  };

  return (
    <div className="w-full my-2 rounded-xl bg-[#161b22] border border-[#30363d]/80 overflow-hidden font-sans text-xs transition-all shadow-md">
      {/* Top Header Card */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1c2128] border-b border-[#30363d]/70 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode size={14} className="text-[#3f86ff] shrink-0" />

          {/* File pill: [ index.html ] */}
          <span className="font-mono font-bold text-white text-xs bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d] truncate">
            {fileName}
          </span>

          {/* +24 -8 Diff badge */}
          {(additions > 0 || deletions > 0) && (
            <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
              {additions > 0 && <span className="text-emerald-400">+{additions}</span>}
              {deletions > 0 && <span className="text-rose-400">−{deletions}</span>}
            </div>
          )}

          {event.summary && (
            <span className="text-[10px] text-[#8d8d91] truncate hidden sm:inline">
              • {event.summary}
            </span>
          )}
        </div>

        {/* Action Buttons: [View diff] [Open] */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* View diff toggle */}
          <button
            type="button"
            onClick={() => setShowDiff(!showDiff)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
          >
            <Eye size={12} className="text-[#3f86ff]" />
            <span>{showDiff ? 'Hide diff' : 'View diff'}</span>
            {showDiff ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {/* Open in Workspace button */}
          <button
            type="button"
            onClick={handleOpen}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#3f86ff]/20 hover:bg-[#3f86ff]/30 text-[#3f86ff] hover:text-white border border-[#3f86ff]/40 text-[11px] font-medium transition-colors cursor-pointer"
            title="Open in Workspace editor"
          >
            <span>Open</span>
            <ExternalLink size={11} />
          </button>
        </div>
      </div>

      {/* Inline Diff & Syntax Highlighting Viewer */}
      {showDiff && (
        <div className="p-3 bg-[#0d1117] space-y-2 border-t border-[#30363d]/60">
          <div className="flex items-center justify-between text-[11px] text-[#8d8d91] font-mono">
            <span>Path: <span className="text-slate-300">{event.filePath}</span></span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleRevert}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 hover:bg-amber-950/80 border border-amber-800/40 text-amber-300 hover:text-white transition-colors cursor-pointer"
                title="Revert file change"
              >
                <RotateCcw size={11} />
                <span>{reverted ? 'Reverted' : 'Revert'}</span>
              </button>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden border border-[#30363d] max-h-72 overflow-y-auto text-xs">
            <SyntaxHighlighter
              language={event.diff ? 'diff' : syntaxLang}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '0.75rem',
                fontSize: '11px',
                lineHeight: '1.5',
                background: '#0d1117',
              }}
            >
              {contentToDisplay}
            </SyntaxHighlighter>
          </div>
        </div>
      )}
    </div>
  );
}
