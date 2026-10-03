import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Square, Copy, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { TerminalToolEvent } from '../../../models/types';
import { clsx } from 'clsx';

interface TerminalCardProps {
  event: TerminalToolEvent;
  onStop?: (eventId: string) => void;
  onClear?: (eventId: string) => void;
  isStreaming?: boolean;
}

export function TerminalCard({ event, onStop }: TerminalCardProps) {
  // Always collapsed by default when finished so it stays non-intrusive
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    if (event.durationMs) return Math.round(event.durationMs / 1000);
    if (event.startedAt) return Math.max(0, Math.round((Date.now() - event.startedAt) / 1000));
    return 0;
  });

  const outputRef = useRef<HTMLPreElement>(null);
  const isRunning = event.status === 'running';

  // Live timer for active running commands
  useEffect(() => {
    if (!isRunning) {
      if (event.durationMs) {
        setElapsedSeconds(Math.round(event.durationMs / 1000));
      }
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.round((now - event.startedAt) / 1000));
      setElapsedSeconds(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, event.startedAt, event.durationMs]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = event.output ? `$ ${event.command}\n\n${event.output}` : `$ ${event.command}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDuration = event.durationMs !== undefined
    ? `${(event.durationMs / 1000).toFixed(1)}s`
    : `${elapsedSeconds}s`;

  // Format concise natural status label
  const getActionLabel = () => {
    const cmd = (event.command || '').trim().toLowerCase();
    if (cmd.includes('test')) return isRunning ? 'Running tests...' : 'Tests finished';
    if (cmd.includes('build')) return isRunning ? 'Building project...' : 'Build verified';
    if (cmd.includes('git status') || cmd.includes('git diff')) return isRunning ? 'Checking repository...' : 'Repository inspected';
    if (cmd.includes('npm i') || cmd.includes('install')) return isRunning ? 'Installing packages...' : 'Packages installed';
    return isRunning ? 'Running command...' : 'Command executed';
  };

  return (
    <div className="w-full my-1.5 rounded-lg bg-[#161b22]/90 border border-[#30363d]/70 overflow-hidden text-xs transition-all font-sans select-none">
      {/* Small non-intrusive tool-status indicator bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-3 py-1.5 hover:bg-[#1c2128] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isRunning ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{getActionLabel()}</span>
              <span className="text-[#8d8d91] font-normal font-mono text-[11px]">· {formattedDuration}</span>
            </span>
          ) : event.status === 'completed' ? (
            <span className="flex items-center gap-1.5 text-slate-300 font-medium truncate">
              <Check size={12} className="text-emerald-400 shrink-0" />
              <span className="truncate">{getActionLabel()}</span>
              <span className="text-[#8d8d91] font-mono text-[10px]">· {formattedDuration}</span>
            </span>
          ) : event.status === 'failed' ? (
            <span className="flex items-center gap-1.5 text-rose-400 font-medium truncate">
              <span className="text-rose-400 font-bold shrink-0 text-xs">✕</span>
              <span className="truncate">Command failed</span>
              <span className="text-rose-400/80 font-mono text-[10px]">· {formattedDuration}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span>Cancelled</span>
            </span>
          )}
        </div>

        {/* Small subtle controls */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {isRunning && onStop && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStop(event.id);
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-[10px] transition-colors cursor-pointer"
              title="Stop running command"
            >
              <Square size={9} fill="currentColor" />
              <span>Stop</span>
            </button>
          )}

          {isExpanded && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 hover:bg-[#21262d] rounded text-[#8d8d91] hover:text-white transition-colors cursor-pointer"
              title="Copy command & output"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            </button>
          )}

          <div className="flex items-center gap-0.5 text-[10px] text-[#8d8d91] hover:text-slate-200">
            <span>{isExpanded ? 'Hide' : 'Details'}</span>
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </div>
        </div>
      </div>

      {/* Expanded full details ONLY when user explicitly asks to see it */}
      {isExpanded && (
        <div className="px-3 py-2 bg-[#0d1117] border-t border-[#30363d]/60 font-mono text-[11px] leading-relaxed text-[#c9d1d9] select-text">
          <div className="flex items-center gap-1.5 text-[#58a6ff] mb-1 font-bold">
            <span className="text-[#7ee787]">$</span>
            <span>{event.command}</span>
          </div>
          <pre
            ref={outputRef}
            className="max-h-56 overflow-y-auto whitespace-pre-wrap break-all text-[#c9d1d9] text-[10px] leading-relaxed font-mono scrollbar-thin select-text"
          >
            {event.output || (isRunning ? 'Executing process...' : '(No output returned)')}
          </pre>
        </div>
      )}
    </div>
  );
}
