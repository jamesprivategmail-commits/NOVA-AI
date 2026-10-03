import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Square, Copy, Check, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { TerminalToolEvent } from '../../../models/types';
import { terminalManager } from '../../utils/terminalManager';
import { clsx } from 'clsx';

interface TerminalToolComponentProps {
  event: TerminalToolEvent;
  isStreaming?: boolean;
}

export function TerminalToolComponent({ event }: TerminalToolComponentProps) {
  const isRunning = event.status === 'running';
  const isCompleted = event.status === 'completed';
  const isFailed = event.status === 'failed';

  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    if (event.durationMs) return Math.round(event.durationMs / 100) / 10;
    if (event.startedAt) return Math.max(0, Math.round((Date.now() - event.startedAt) / 100) / 10);
    return 0;
  });

  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!isRunning) {
      if (event.durationMs) {
        setElapsedSeconds(Math.round(event.durationMs / 100) / 10);
      }
      return;
    }

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.round((Date.now() - event.startedAt) / 100) / 10);
      setElapsedSeconds(diff);
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, event.startedAt, event.durationMs]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `$ ${event.command}\n\n${event.output || ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    terminalManager.stopActiveCommand();
  };

  const durationText = `${elapsedSeconds.toFixed(1)}s`;

  return (
    <div className="my-2 flex flex-col items-start font-mono text-xs select-none">
      {/* Clean interactive execution status button */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsx(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer shadow-sm",
          isRunning 
            ? "bg-[#161b22] border-emerald-500/50 hover:bg-[#1c222b] text-white" 
            : isCompleted
            ? "bg-[#161b22] hover:bg-[#1c2128] border-[#30363d]/80 text-slate-300"
            : "bg-[#1f1618] hover:bg-[#26191c] border-rose-800/60 text-rose-300"
        )}
        title={isExpanded ? "Hide output" : "Click to view output"}
      >
        <Terminal size={12} className={isRunning ? "text-emerald-400" : "text-[#8d8d91]"} />

        {/* Status text & indicator */}
        {isRunning ? (
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Running
          </span>
        ) : isCompleted ? (
          <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[10px]">
            <Check size={11} className="stroke-[3]" />
          </span>
        ) : (
          <span className="flex items-center gap-1 text-rose-400 font-bold text-[10px]">
            <AlertCircle size={11} />
            Failed
          </span>
        )}

        <span className="text-[#484f58]">•</span>

        {/* Command string */}
        <span className="font-semibold text-white max-w-[170px] sm:max-w-xs truncate">
          {event.command}
        </span>

        <span className="text-[#8d8d91] text-[10px]">
          ({durationText})
        </span>

        {/* Stop button while running */}
        {isRunning && (
          <button
            onClick={handleStop}
            className="ml-1 px-1.5 py-0.5 rounded bg-rose-950/90 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-[9px] font-sans font-medium transition-colors cursor-pointer"
            title="Stop process"
          >
            <Square size={8} fill="currentColor" />
          </button>
        )}

        {/* Expand/Collapse chevron */}
        <div className="text-[#8d8d91] hover:text-white">
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>
      </div>

      {/* Expandable output drawer on request */}
      {isExpanded && (
        <div className="w-full mt-2 p-3 bg-[#0d1117] border border-[#30363d]/80 rounded-xl overflow-hidden shadow-lg">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#21262d] text-[10px] text-[#8d8d91]">
            <span className="text-[#58a6ff] font-bold">$ {event.command}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white transition-colors cursor-pointer"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <pre
            ref={outputRef}
            className="overflow-y-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed text-[#c9d1d9] font-mono max-h-56 scrollbar-thin select-text"
          >
            {event.output || (isRunning ? 'Running process...' : '(No output returned)')}
          </pre>
        </div>
      )}
    </div>
  );
}
