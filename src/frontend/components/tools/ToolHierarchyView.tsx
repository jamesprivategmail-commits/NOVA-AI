import React, { useState } from 'react';
import { StructuredToolEvent } from '../../../models/types';
import { TerminalToolComponent } from './TerminalToolComponent';
import { FileArtifactCard } from './FileArtifactCard';
import { GitHubActivityCard } from './GitHubActivityCard';
import { BuildTestCard } from './BuildTestCard';
import { Brain, ChevronDown, ChevronUp, Wrench } from 'lucide-react';

interface ToolHierarchyViewProps {
  thinking?: string;
  toolEvents?: StructuredToolEvent[];
  onStopTerminal?: (id: string) => void;
  isStreaming?: boolean;
}

export function ToolHierarchyView({
  thinking,
  toolEvents = [],
  isStreaming = false,
}: ToolHierarchyViewProps) {
  const [showThinking, setShowThinking] = useState(false);

  if (!thinking && (!toolEvents || toolEvents.length === 0)) {
    return null;
  }

  return (
    <div className="w-full my-2 space-y-2 select-text font-sans">
      {/* 1. AI THINKING / PLANNING */}
      {thinking && (
        <div className="rounded-xl bg-[#161b22]/70 border border-[#30363d]/60 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setShowThinking(!showThinking)}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#21262d]/50 transition-colors cursor-pointer select-none text-[#8d8d91] hover:text-slate-200"
          >
            <div className="flex items-center gap-2">
              <Brain size={14} className="text-purple-400 shrink-0" />
              <span className="font-semibold uppercase tracking-wider text-[10px] text-purple-300">
                AI Thinking & Planning
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <span>{showThinking ? 'Hide' : 'Show details'}</span>
              {showThinking ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </div>
          </button>

          {showThinking && (
            <div className="px-3.5 py-2.5 bg-[#0d1117]/60 border-t border-[#30363d]/40 text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap font-sans">
              {thinking}
            </div>
          )}
        </div>
      )}

      {/* 2. TOOL ACTION SECTION (Hierarchical Flow) */}
      {toolEvents && toolEvents.length > 0 && (
        <div className="space-y-2 my-2">
          {/* Render individual tool event cards */}
          {toolEvents.map((evt, idx) => {
            if (evt.tool === 'terminal') {
              return (
                <TerminalToolComponent
                  key={evt.id || idx}
                  event={evt}
                  isStreaming={isStreaming}
                />
              );
            }

            if (evt.tool === 'editor') {
              return (
                <FileArtifactCard
                  key={evt.id || idx}
                  event={evt}
                />
              );
            }

            if (evt.tool === 'github') {
              return (
                <GitHubActivityCard
                  key={evt.id || idx}
                  event={evt}
                />
              );
            }

            if (evt.tool === 'build' || evt.tool === 'tests') {
              return (
                <BuildTestCard
                  key={evt.id || idx}
                  event={evt}
                />
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}
