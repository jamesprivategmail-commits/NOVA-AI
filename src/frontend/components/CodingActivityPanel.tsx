import React, { useState } from 'react';
import {
  Check,
  GitBranch,
  ExternalLink,
  RefreshCw,
  Eye,
  FileCode,
  ChevronDown,
  ChevronUp,
  Upload,
  AlertCircle,
  ShieldCheck,
  Terminal,
  Activity,
  Layers,
  Wrench,
  AlertTriangle
} from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { getStoredGitHubToken, commitFile, ActiveRepoState } from '../utils/github';

export type AgentExecutionState =
  | 'planning'
  | 'inspecting'
  | 'editing'
  | 'running'
  | 'fixing'
  | 'completed'
  | 'failed'
  | 'waiting_for_user';

export type WorkflowPhase =
  | 'UNDERSTAND'
  | 'PLAN'
  | 'INSPECT'
  | 'EXECUTE'
  | 'VERIFY'
  | 'FIX'
  | 'REPORT';

export interface ToolActionRecord {
  id?: string;
  tool: string;
  action: string;
  phase?: WorkflowPhase;
  status?: 'running' | 'success' | 'error';
  detail?: string;
  timestamp?: number;
}

export interface CodingActivityData {
  task: string;
  status: AgentExecutionState;
  state?: AgentExecutionState;
  phase?: WorkflowPhase;
  steps: string[];
  actions?: ToolActionRecord[];
  changedFiles: string[];
  summary?: string;
  verification?: {
    passed: boolean;
    errors?: string[];
    warnings?: string[];
    message?: string;
  };
  filesData?: { path: string; content: string }[];
  activeFile?: string;
}

interface CodingActivityPanelProps {
  activity: CodingActivityData;
  activeRepo: ActiveRepoState | null;
  codingModeEnabled: boolean;
  onEnableCodingMode?: () => void;
  onOpenSettings?: () => void;
}

const WORKFLOW_PHASES: WorkflowPhase[] = [
  'UNDERSTAND',
  'PLAN',
  'INSPECT',
  'EXECUTE',
  'VERIFY',
  'FIX',
  'REPORT'
];

export function CodingActivityPanel({
  activity,
  activeRepo,
  codingModeEnabled,
  onEnableCodingMode,
  onOpenSettings,
}: CodingActivityPanelProps) {
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(true);
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccessUrls, setCommitSuccessUrls] = useState<Record<string, string>>({});
  const [commitError, setCommitError] = useState<string | null>(null);

  const token = getStoredGitHubToken();
  const repoName = activeRepo ? `${activeRepo.owner}/${activeRepo.repo}` : 'No repository connected';
  const branchName = activeRepo ? activeRepo.branch : 'main';

  const currentState: AgentExecutionState = (activity.state || activity.status || 'completed') as AgentExecutionState;
  const currentPhase: WorkflowPhase = activity.phase || (
    currentState === 'planning' ? 'PLAN'
      : currentState === 'inspecting' ? 'INSPECT'
      : currentState === 'editing' ? 'EXECUTE'
      : currentState === 'fixing' ? 'FIX'
      : currentState === 'running' ? 'VERIFY'
      : 'REPORT'
  );

  const handleCommitAll = async () => {
    if (!token || !activeRepo) {
      setCommitError('Please connect GitHub and select a target repository in Settings first.');
      return;
    }
    if (!activity.filesData || activity.filesData.length === 0) {
      setCommitError('No file contents available to commit.');
      return;
    }

    setIsCommitting(true);
    setCommitError(null);
    try {
      const urls: Record<string, string> = { ...commitSuccessUrls };
      for (const f of activity.filesData) {
        const res = await commitFile(
          token,
          activeRepo.owner,
          activeRepo.repo,
          f.path,
          f.content,
          `feat: ${activity.task || `update ${f.path}`}`,
          activeRepo.branch
        );
        urls[f.path] = res.htmlUrl;
      }
      setCommitSuccessUrls(urls);
    } catch (err: any) {
      setCommitError(err.message || 'Failed to commit files to GitHub.');
    } finally {
      setIsCommitting(false);
    }
  };

  const allCommitted =
    activity.filesData &&
    activity.filesData.length > 0 &&
    activity.filesData.every((f) => !!commitSuccessUrls[f.path]);

  const getStateBadge = (state: AgentExecutionState) => {
    switch (state) {
      case 'planning':
        return (
          <span className="px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-700/60 text-blue-400 font-bold text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            PLANNING
          </span>
        );
      case 'inspecting':
        return (
          <span className="px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-700/60 text-purple-400 font-bold text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            INSPECTING
          </span>
        );
      case 'editing':
        return (
          <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/60 text-amber-400 font-bold text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            EDITING
          </span>
        );
      case 'fixing':
        return (
          <span className="px-2 py-0.5 rounded-full bg-orange-950/80 border border-orange-700/60 text-orange-400 font-bold text-[10px] flex items-center gap-1 animate-pulse">
            <Wrench size={10} className="animate-spin text-orange-400" />
            AUTO-FIXING
          </span>
        );
      case 'running':
        return (
          <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-400 font-bold text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            RUNNING
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-700/60 text-red-400 font-bold text-[10px] flex items-center gap-1">
            <AlertTriangle size={10} />
            FAILED
          </span>
        );
      case 'waiting_for_user':
        return (
          <span className="px-2 py-0.5 rounded-full bg-yellow-950/80 border border-yellow-700/60 text-yellow-400 font-bold text-[10px] flex items-center gap-1">
            WAITING FOR USER
          </span>
        );
      case 'completed':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
            <Check size={10} />
            COMPLETED
          </span>
        );
    }
  };

  return (
    <div className="my-3 rounded-2xl border border-[#38383b] bg-[#1a1a1c]/95 overflow-hidden shadow-2xl text-xs w-full max-w-2xl font-sans transition-all">
      {/* 1. Header: GitHub Mode & Target Repo */}
      <div className="bg-[#202022] border-b border-[#38383b] px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-black border border-[#38383b] flex items-center justify-center text-white shrink-0">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white tracking-wide text-xs">GitHub:</span>
            {codingModeEnabled ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ON
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-[#252527] border border-[#38383b] text-[#8d8d91] font-bold text-[10px]">
                OFF
              </span>
            )}
          </div>
          <div className="ml-1">{getStateBadge(currentState)}</div>
        </div>

        {activeRepo ? (
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#8d8d91] truncate">
            <span className="text-white font-medium truncate">{activeRepo.owner}/{activeRepo.repo}</span>
            <span>/</span>
            <span className="text-[#3f86ff] flex items-center gap-0.5 shrink-0">
              <GitBranch size={11} />
              {activeRepo.branch}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-amber-400 font-mono">No repo selected</span>
        )}
      </div>

      {/* 2. Autonomous Workflow Phase Tracker */}
      <div className="bg-[#121214] px-3.5 py-2 border-b border-[#38383b]/50 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max">
          {WORKFLOW_PHASES.map((phase, idx) => {
            const isCurrent = currentPhase === phase;
            const isPassed = WORKFLOW_PHASES.indexOf(currentPhase) > idx;

            return (
              <React.Fragment key={phase}>
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[9px] uppercase tracking-wider transition-colors ${
                    isCurrent
                      ? 'bg-[#3f86ff]/20 text-[#3f86ff] font-bold border border-[#3f86ff]/50'
                      : isPassed
                      ? 'text-emerald-400 font-medium'
                      : 'text-[#5d5d62]'
                  }`}
                >
                  {isPassed ? <Check size={8} className="text-emerald-400" /> : null}
                  <span>{phase}</span>
                </div>
                {idx < WORKFLOW_PHASES.length - 1 && (
                  <span className="text-[#38383b] text-[10px]">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Warning if Coding Mode is OFF */}
      {!codingModeEnabled && (
        <div className="p-3 bg-amber-950/40 border-b border-amber-800/40 text-amber-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-amber-400" />
            <span>GitHub Coding Mode is OFF. Repository write access is restricted.</span>
          </div>
          {onEnableCodingMode && (
            <button
              onClick={onEnableCodingMode}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-[11px] shrink-0 transition-colors cursor-pointer shadow-md"
            >
              Turn ON
            </button>
          )}
        </div>
      )}

      {/* 3. Current Task */}
      <div className="p-3.5 border-b border-[#38383b]/60 space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8d8d91] block">
          Current Task
        </span>
        <p className="text-sm font-semibold text-white tracking-tight">
          "{activity.task}"
        </p>
        {activity.activeFile && (
          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-emerald-400 font-mono">
            <RefreshCw size={11} className="animate-spin text-emerald-400" />
            <span>Target File: {activity.activeFile}</span>
          </div>
        )}
      </div>

      {/* 4. Internal Tool / Action Records */}
      {activity.actions && activity.actions.length > 0 && (
        <div className="p-3.5 border-b border-[#38383b]/60 space-y-2 bg-black/20">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setShowActionsDropdown(!showActionsDropdown)}
          >
            <div className="flex items-center gap-1.5">
              <Activity size={12} className="text-[#3f86ff]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8d8d91]">
                Tool Action Records ({activity.actions.length})
              </span>
            </div>
            {showActionsDropdown ? (
              <ChevronUp size={13} className="text-[#8d8d91]" />
            ) : (
              <ChevronDown size={13} className="text-[#8d8d91]" />
            )}
          </div>

          {showActionsDropdown && (
            <div className="space-y-1.5 pt-1">
              {activity.actions.map((act, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#141416] border border-[#38383b]/40 font-mono text-[11px]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="px-1.5 py-0.5 rounded bg-[#252528] text-[#3f86ff] text-[10px] font-semibold">
                      {act.tool}
                    </span>
                    <span className="text-slate-200 truncate">{act.action}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {act.phase && (
                      <span className="text-[9px] text-[#8d8d91] font-bold">[{act.phase}]</span>
                    )}
                    <span
                      className={`w-2 h-2 rounded-full ${
                        act.status === 'error'
                          ? 'bg-red-400'
                          : act.status === 'running'
                          ? 'bg-amber-400 animate-ping'
                          : 'bg-emerald-400'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Activity Steps */}
      <div className="p-3.5 border-b border-[#38383b]/60 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8d8d91] block">
          Workflow Steps
        </span>
        <div className="space-y-1.5">
          {activity.steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-200">
              <span className="w-4 h-4 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">
                ✓
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Changed Files */}
      {activity.changedFiles && activity.changedFiles.length > 0 && (
        <div className="p-3.5 border-b border-[#38383b]/60 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8d8d91] block">
            Changed Files ({activity.changedFiles.length})
          </span>
          <div className="space-y-1">
            {activity.changedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between font-mono text-[11px] text-slate-300 bg-black/40 px-2.5 py-1.5 rounded-lg border border-[#38383b]/50"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[#3f86ff] font-bold">•</span>
                  <span className="truncate">{file}</span>
                </div>
                {commitSuccessUrls[file] ? (
                  <a
                    href={commitSuccessUrls[file]}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 text-[10px] flex items-center gap-1 hover:underline shrink-0"
                  >
                    <span>Committed</span>
                    <ExternalLink size={10} />
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Verification Status Badge */}
      {activity.verification && (
        <div
          className={`px-3.5 py-2 border-b border-[#38383b]/40 flex items-center justify-between text-[11px] ${
            activity.verification.passed
              ? 'bg-emerald-950/20 text-emerald-300'
              : 'bg-red-950/20 text-red-300'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className={activity.verification.passed ? 'text-emerald-400' : 'text-red-400'} />
            <span className="font-semibold">
              {activity.verification.passed ? 'Live Verification Passed' : 'Live Verification Errors Detected'}
            </span>
          </div>
          {activity.verification.message && (
            <span className="text-[10px] opacity-80 truncate max-w-[200px]">
              {activity.verification.message}
            </span>
          )}
        </div>
      )}

      {/* 8. Summary */}
      {activity.summary && (
        <div className="px-3.5 py-2.5 bg-black/30 border-b border-[#38383b]/40 text-[11px] text-slate-300">
          {activity.summary}
        </div>
      )}

      {/* Terminal capability disclaimer (honest & unblurred) */}
      <div className="px-3.5 py-1.5 bg-[#121214] text-[10px] text-[#8d8d91] border-b border-[#38383b]/40 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Terminal size={11} className="text-[#5d5d62]" />
          <span>
            Terminal execution: <strong className="text-slate-300">Unavailable</strong> (No local shell execution simulated)
          </span>
        </div>
        <span className="text-[9px] text-[#5d5d62]">VOID Agent Core v2.0</span>
      </div>

      {/* Commit error message */}
      {commitError && (
        <div className="p-3 bg-red-950/60 border-b border-red-800/50 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0 text-red-400" />
          <span>{commitError}</span>
        </div>
      )}

      {/* 9. Action Buttons */}
      <div className="p-3 bg-[#1e1e20] flex items-center justify-between gap-2">
        <button
          onClick={() => setShowChangesModal(true)}
          disabled={!activity.filesData || activity.filesData.length === 0}
          className="px-3 py-1.5 rounded-lg bg-[#2a2a2d] hover:bg-[#343438] text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-[#38383b]"
        >
          <Eye size={13} />
          <span>Inspect Changes ({activity.filesData?.length || 0})</span>
        </button>

        {codingModeEnabled && activeRepo && activity.filesData && activity.filesData.length > 0 && (
          <button
            onClick={handleCommitAll}
            disabled={isCommitting || allCommitted}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md ${
              allCommitted
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-[#3f86ff] hover:bg-[#3270d8] text-white disabled:opacity-50'
            }`}
          >
            {isCommitting ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Committing to {activeRepo.branch}...</span>
              </>
            ) : allCommitted ? (
              <>
                <Check size={13} />
                <span>All Changes Committed</span>
              </>
            ) : (
              <>
                <Upload size={13} />
                <span>Commit All to {activeRepo.branch}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Changes Modal */}
      {showChangesModal && activity.filesData && activity.filesData.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#18181a] border border-[#38383b] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#38383b] flex items-center justify-between bg-[#202022]">
              <div className="flex items-center gap-2">
                <FileCode size={18} className="text-[#3f86ff]" />
                <h3 className="font-bold text-white text-sm">
                  Generated Changes: {activity.task}
                </h3>
              </div>
              <button
                onClick={() => setShowChangesModal(false)}
                className="text-[#8d8d91] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: File Tabs + Code Viewer */}
            <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-3">
              {/* File selector tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#38383b]/60">
                {activity.filesData.map((f, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedFileIdx(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      selectedFileIdx === idx
                        ? 'bg-[#3f86ff] text-white font-bold'
                        : 'bg-[#252528] text-slate-300 hover:bg-[#303034]'
                    }`}
                  >
                    <span>{f.path}</span>
                    {commitSuccessUrls[f.path] && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>
                ))}
              </div>

              {/* Code Viewer */}
              <div className="flex-1 overflow-y-auto rounded-xl border border-[#38383b] bg-black/60 p-1">
                <CodeBlock
                  language={
                    activity.filesData[selectedFileIdx]?.path.split('.').pop() || 'typescript'
                  }
                  value={activity.filesData[selectedFileIdx]?.content || ''}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#38383b] flex items-center justify-between bg-[#202022]">
              <span className="text-xs text-[#8d8d91]">
                Target: {repoName} ({branchName})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowChangesModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#2a2a2d] hover:bg-[#343438] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
                {codingModeEnabled && activeRepo && (
                  <button
                    onClick={handleCommitAll}
                    disabled={isCommitting || allCommitted}
                    className="px-4 py-2 rounded-xl bg-[#3f86ff] hover:bg-[#3270d8] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                  >
                    {isCommitting ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Committing...</span>
                      </>
                    ) : allCommitted ? (
                      <>
                        <Check size={13} />
                        <span>Committed</span>
                      </>
                    ) : (
                      <>
                        <Upload size={13} />
                        <span>Commit All</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Robust parsing helper to extract CodingActivityData from void-coding-activity markdown blocks
 */
export function parseCodingActivity(raw: string): CodingActivityData | null {
  try {
    let task = '';
    let status: AgentExecutionState = 'completed';
    let phase: WorkflowPhase | undefined;
    let summary = '';
    const steps: string[] = [];
    const actions: ToolActionRecord[] = [];
    const changedFiles: string[] = [];

    // Check for file contents delimiter
    const fileParts = raw.split(/---FILE:([^\r\n]+)---/);
    const mainHeader = fileParts[0];
    const headerLines = mainHeader.split('\n');

    let inSteps = false;
    let inActions = false;
    let inChangedFiles = false;
    let currentAction: Partial<ToolActionRecord> | null = null;

    for (const line of headerLines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('task:')) {
        task = trimmed.replace(/^task:\s*/, '').replace(/^["']|["']$/g, '');
        inSteps = false;
        inActions = false;
        inChangedFiles = false;
      } else if (trimmed.startsWith('status:') || trimmed.startsWith('state:')) {
        const val = trimmed.replace(/^(status|state):\s*/, '').trim().toLowerCase() as AgentExecutionState;
        if (val) status = val;
        inSteps = false;
        inActions = false;
        inChangedFiles = false;
      } else if (trimmed.startsWith('phase:')) {
        const val = trimmed.replace(/^phase:\s*/, '').trim().toUpperCase() as WorkflowPhase;
        if (val) phase = val;
        inSteps = false;
        inActions = false;
        inChangedFiles = false;
      } else if (trimmed.startsWith('summary:')) {
        summary = trimmed.replace(/^summary:\s*/, '').trim();
        inSteps = false;
        inActions = false;
        inChangedFiles = false;
      } else if (trimmed.startsWith('steps:')) {
        inSteps = true;
        inActions = false;
        inChangedFiles = false;
      } else if (trimmed.startsWith('actions:')) {
        inActions = true;
        inSteps = false;
        inChangedFiles = false;
      } else if (trimmed.startsWith('changedFiles:')) {
        inChangedFiles = true;
        inSteps = false;
        inActions = false;
      } else if (inSteps && (trimmed.startsWith('-') || trimmed.startsWith('•'))) {
        steps.push(trimmed.replace(/^[-•]\s*/, '').trim());
      } else if (inChangedFiles && (trimmed.startsWith('-') || trimmed.startsWith('•'))) {
        changedFiles.push(trimmed.replace(/^[-•]\s*/, '').trim());
      } else if (inActions) {
        if (trimmed.startsWith('- tool:')) {
          if (currentAction && currentAction.tool && currentAction.action) {
            actions.push(currentAction as ToolActionRecord);
          }
          currentAction = {
            tool: trimmed.replace(/^-\s*tool:\s*/, '').trim(),
            status: 'success'
          };
        } else if (currentAction && trimmed.startsWith('action:')) {
          currentAction.action = trimmed.replace(/^action:\s*/, '').trim();
        } else if (currentAction && trimmed.startsWith('phase:')) {
          currentAction.phase = trimmed.replace(/^phase:\s*/, '').trim() as WorkflowPhase;
        } else if (currentAction && trimmed.startsWith('status:')) {
          currentAction.status = trimmed.replace(/^status:\s*/, '').trim() as any;
        }
      }
    }

    if (currentAction && currentAction.tool && currentAction.action) {
      actions.push(currentAction as ToolActionRecord);
    }

    const filesData: { path: string; content: string }[] = [];
    if (fileParts.length > 1) {
      for (let i = 1; i < fileParts.length; i += 2) {
        const filePath = fileParts[i].trim();
        const content = (fileParts[i + 1] || '').trim();
        filesData.push({ path: filePath, content });
        if (!changedFiles.includes(filePath)) {
          changedFiles.push(filePath);
        }
      }
    }

    if (!task && steps.length === 0 && changedFiles.length === 0) {
      return null;
    }

    return {
      task: task || 'Repository Coding Task',
      status: status || 'completed',
      state: status || 'completed',
      phase,
      steps: steps.length > 0 ? steps : ['Repository inspected', 'Changes written'],
      actions: actions.length > 0 ? actions : undefined,
      changedFiles: changedFiles.length > 0 ? changedFiles : filesData.map((f) => f.path),
      summary,
      filesData
    };
  } catch (err) {
    return null;
  }
}
