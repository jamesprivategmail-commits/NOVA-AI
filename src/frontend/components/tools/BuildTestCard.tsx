import React, { useState } from 'react';
import { Check, X, ShieldAlert, Cpu, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { BuildOrTestToolEvent } from '../../../models/types';
import { clsx } from 'clsx';

interface BuildTestCardProps {
  event: BuildOrTestToolEvent;
}

export function BuildTestCard({ event }: BuildTestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isBuild = event.tool === 'build';
  const isRunning = event.status === 'running';
  const isFailed = event.status === 'failed';
  const isCompleted = event.status === 'completed';

  const durationStr = event.durationMs !== undefined ? `${(event.durationMs / 1000).toFixed(1)}s` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(event.output || event.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full my-2 rounded-xl bg-[#FFFFFF] border border-[#FFFFFF] overflow-hidden text-xs shadow-md transition-all font-sans">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#FFFFFF] select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#FFFFFF] border border-[#FFFFFF] flex items-center justify-center text-slate-200 shrink-0">
            <Cpu size={13} className="text-[#D97757]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#1F1E1D]">
                {isBuild ? 'Build Execution' : 'Test Suite'}
              </span>
              <span className="text-[10px] text-[#6B6A67] font-mono">
                $ {event.command}
              </span>
            </div>

            {/* Test counts or summary */}
            <div className="flex items-center gap-2 text-[11px] text-[#6B6A67] mt-0.5">
              {event.testsPassed !== undefined && (
                <span className="text-emerald-400 font-medium">✓ {event.testsPassed} passed</span>
              )}
              {event.testsFailed !== undefined && event.testsFailed > 0 && (
                <span className="text-rose-400 font-medium">✕ {event.testsFailed} failed</span>
              )}
              {durationStr && <span>· {durationStr}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {isRunning ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-bold text-[10px] animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Running
            </span>
          ) : isCompleted ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <Check size={13} />
              <span>Passed</span>
            </span>
          ) : isFailed ? (
            <span className="flex items-center gap-1 text-[11px] text-rose-400 font-medium">
              <X size={13} />
              <span>Failed</span>
            </span>
          ) : (
            <span className="text-[11px] text-amber-400 font-medium">Cancelled</span>
          )}

          {event.output && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-[#FFFFFF] rounded text-[#6B6A67] hover:text-[#1F1E1D] transition-colors cursor-pointer"
              title={isExpanded ? "Collapse logs" : "Expand logs"}
            >
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Logs */}
      {isExpanded && event.output && (
        <div className="p-3 bg-[#FAF9F5] border-t border-[#FFFFFF] relative">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#FFFFFF]/50 text-[10px] text-[#6B6A67]">
            <span>Console logs:</span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-[#58a6ff] hover:underline"
            >
              {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-all text-[11px] font-mono text-[#3D3929] leading-relaxed select-text">
            {event.output}
          </pre>
        </div>
      )}
    </div>
  );
}
