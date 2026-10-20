import React, { useState, useEffect } from 'react';
import { 
  X, Code2, Terminal as TerminalIcon, GitBranch, Cpu, Sparkles, 
  Play, Download, Copy, Check, FileText, Folder, RefreshCw, 
  Plus, Trash2, ArrowUpRight, Search, ShieldCheck, AlertCircle, Maximize2, Minimize2,
  Archive, FileCode, Upload, Globe, Activity, Eye, Monitor, Tablet, Smartphone, Square
} from 'lucide-react';
import JSZip from 'jszip';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ActiveRepoState } from '../../utils/github';
import { terminalManager } from '../../utils/terminalManager';
import { 
  fetchWorkspaceFiles, 
  readWorkspaceFile, 
  writeWorkspaceFile, 
  deleteWorkspaceFile, 
  fetchProcesses, 
  startBackgroundProcess, 
  stopBackgroundProcess, 
  fetchProcessLogs, 
  runTerminalCommand, 
  stopTerminalCommand 
} from '../../api/client';
import { WorkspaceFileInfo, ManagedProcess } from '../../../models/types';
import { clsx } from 'clsx';

export type WorkspaceTab = 'editor' | 'terminal' | 'files' | 'processes' | 'preview' | 'rungraph' | 'git' | 'playground' | 'memory';

interface CodeWorkspaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeRepo: ActiveRepoState | null;
  activeFileContent?: string;
  activeFilePath?: string;
  onSaveFile?: (path: string, content: string) => Promise<void>;
  initialTab?: WorkspaceTab;
  onExecutePrompt?: (prompt: string) => void;
  isFullScreen?: boolean;
}

export function CodeWorkspaceDrawer({
  isOpen,
  onClose,
  activeRepo,
  activeFileContent = '// Select a file or start drafting in the editor\n\nfunction main() {\n  console.log("VOID AI Workspace ready.");\n}\n',
  activeFilePath = 'src/example.ts',
  onSaveFile,
  initialTab = 'editor',
  onExecutePrompt,
}: CodeWorkspaceDrawerProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [fileContent, setFileContent] = useState(activeFileContent);
  const [filePath, setFilePath] = useState(activeFilePath);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Terminal state
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'NOVA Linux Autonomous Sandbox Terminal initialized [2026 Core].',
    'Real Linux shell active. Commands execute directly inside your persistent workspace (/workspaces).',
  ]);
  const [isTerminalRunning, setIsTerminalRunning] = useState(false);
  const [activeTerminalTaskId, setActiveTerminalTaskId] = useState<string | null>(null);

  // Persistent Workspace Files state
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFileInfo[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);

  // Background Processes & Daemon Jobs state
  const [managedProcesses, setManagedProcesses] = useState<ManagedProcess[]>([]);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);
  const [newProcessCmd, setNewProcessCmd] = useState('');
  const [newProcessName, setNewProcessName] = useState('');
  const [newProcessPort, setNewProcessPort] = useState('');
  const [selectedProcLogs, setSelectedProcLogs] = useState<string[]>([]);
  const [selectedProcId, setSelectedProcId] = useState<string | null>(null);

  // Real Web Preview state
  const [previewPort, setPreviewPort] = useState<number>(5173);
  const [customPortInput, setCustomPortInput] = useState('5173');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewKey, setPreviewKey] = useState(0);

  // Playground state
  const [playgroundCode, setPlaygroundCode] = useState('const numbers = [1, 2, 3, 4, 5];\nreturn numbers.map(n => n * 2);');
  const [playgroundOutput, setPlaygroundOutput] = useState<string>('');
  const [regexPattern, setRegexPattern] = useState('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}');
  const [regexTestStr, setRegexTestStr] = useState('Contact support at contact@void-ai.dev or user@domain.com');
  const [regexMatches, setRegexMatches] = useState<string[]>([]);

  // Git Commit state
  const [commitMessage, setCommitMessage] = useState('feat: update core logic via VOID AI');
  const [newBranchName, setNewBranchName] = useState('void-ai-patch-1');
  const [commitStatus, setCommitStatus] = useState<string | null>(null);

  // Memory manager state
  const [memoryStats, setMemoryStats] = useState({
    estimatedTokens: 3420,
    maxContext: 128000,
    compressionRatio: '1.0x',
    activeFacts: [
      'Project uses Express server with Vite middleware mode',
      'Firestore database ai-studio-novaai is connected',
      'Autonomous coding mode enabled with GitHub integration',
    ]
  });
  const [newFact, setNewFact] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setFileContent(activeFileContent);
    setFilePath(activeFilePath);
  }, [activeFileContent, activeFilePath]);

  if (!isOpen) return null;

  // Handle Save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSaveFile) {
        await onSaveFile(filePath, fileContent);
      }
      setIsSaving(false);
      alert(`File saved: ${filePath}`);
    } catch (err: any) {
      setIsSaving(false);
      alert(`Error saving file: ${err?.message || 'Failed'}`);
    }
  };

  // Handle Copy
  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Handle Download
  const handleDownload = () => {
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop() || 'workspace-file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle Export Workspace File as ZIP Archive
  const handleDownloadZip = async () => {
    try {
      const zip = new JSZip();
      zip.file(filePath || 'index.html', fileContent);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = (filePath.split('/').pop() || 'project').replace(/\.[^.]+$/, '');
      a.download = `${baseName}_bundle.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Could not create zip archive: ${err?.message || 'Failed'}`);
    }
  };

  // Load workspace files
  const loadWorkspaceFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const data = await fetchWorkspaceFiles();
      setWorkspaceFiles(data.files || []);
    } catch (err) {
      console.error('Failed to load workspace files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Load managed background processes
  const loadProcesses = async () => {
    setIsLoadingProcesses(true);
    try {
      const procs = await fetchProcesses();
      setManagedProcesses(procs || []);
      const withPort = procs.find((p: any) => p.port && p.status === 'running');
      if (withPort?.port) {
        setPreviewPort(withPort.port);
        setCustomPortInput(String(withPort.port));
      }
    } catch (err) {
      console.error('Failed to load processes:', err);
    } finally {
      setIsLoadingProcesses(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadWorkspaceFiles();
      loadProcesses();
    }
  }, [isOpen, activeTab]);

  // Run Real Terminal Command with Live Chunk Streaming
  const handleRunTerminal = async (cmdToRun?: string) => {
    const cmd = (cmdToRun || terminalInput).trim();
    if (!cmd) return;
    setTerminalLogs(prev => [...prev, `$ ${cmd}`]);
    setIsTerminalRunning(true);
    setTerminalInput('');

    try {
      let accumulatedOutput = '';
      const event = await runTerminalCommand(cmd, (chunk) => {
        accumulatedOutput += chunk;
        setTerminalLogs(prev => {
          const next = [...prev];
          next[next.length - 1] = accumulatedOutput;
          return next;
        });
      });
      setActiveTerminalTaskId(event.id);
      if (event.output && !accumulatedOutput) {
        setTerminalLogs(prev => [...prev, event.output]);
      }
      loadWorkspaceFiles();
      loadProcesses();
    } catch (err: any) {
      setTerminalLogs(prev => [...prev, `[ERROR]: ${err?.message || 'Execution error'}`]);
    } finally {
      setIsTerminalRunning(false);
      setActiveTerminalTaskId(null);
    }
  };

  const handleStopTerminal = async () => {
    if (activeTerminalTaskId) {
      await stopTerminalCommand(activeTerminalTaskId);
      setTerminalLogs(prev => [...prev, '[Terminal process stopped by user]']);
      setIsTerminalRunning(false);
      setActiveTerminalTaskId(null);
    }
  };

  const handleOpenFile = async (fileP: string) => {
    try {
      const content = await readWorkspaceFile(fileP);
      setFilePath(fileP);
      setFileContent(content);
      setActiveTab('editor');
    } catch (err: any) {
      alert(`Could not open file: ${err.message}`);
    }
  };

  const handleCreateWorkspaceFile = async () => {
    if (!newFileName.trim()) return;
    try {
      await writeWorkspaceFile(newFileName.trim(), `// Created by user in NOVA AI\n`);
      setNewFileName('');
      setShowNewFileInput(false);
      await loadWorkspaceFiles();
      handleOpenFile(newFileName.trim());
    } catch (err: any) {
      alert(`Could not create file: ${err.message}`);
    }
  };

  const handleDeleteWorkspaceFile = async (fileP: string) => {
    if (!confirm(`Delete ${fileP}?`)) return;
    try {
      await deleteWorkspaceFile(fileP);
      await loadWorkspaceFiles();
    } catch (err: any) {
      alert(`Could not delete file: ${err.message}`);
    }
  };

  const handleStartProcess = async () => {
    if (!newProcessCmd.trim()) return;
    try {
      const port = newProcessPort ? parseInt(newProcessPort, 10) : undefined;
      await startBackgroundProcess({
        command: newProcessCmd.trim(),
        name: newProcessName.trim() || undefined,
        port,
      });
      setNewProcessCmd('');
      setNewProcessName('');
      setNewProcessPort('');
      await loadProcesses();
      if (port) {
        setPreviewPort(port);
        setCustomPortInput(String(port));
      }
    } catch (err: any) {
      alert(`Failed to start process: ${err.message}`);
    }
  };

  const handleStopProcess = async (id: string) => {
    try {
      await stopBackgroundProcess(id);
      await loadProcesses();
    } catch (err: any) {
      alert(`Failed to stop process: ${err.message}`);
    }
  };

  const handleViewProcessLogs = async (id: string) => {
    setSelectedProcId(id);
    try {
      const logs = await fetchProcessLogs(id);
      setSelectedProcLogs(logs);
    } catch (err: any) {
      setSelectedProcLogs([`Error fetching logs: ${err.message}`]);
    }
  };

  // Run Playground Code
  const handleRunPlayground = () => {
    try {
      // Safe local eval in closure
      const fn = new Function(playgroundCode);
      const res = fn();
      setPlaygroundOutput(typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res));
    } catch (err: any) {
      setPlaygroundOutput(`[Syntax/Runtime Error]: ${err.message}`);
    }
  };

  // Run Regex Test
  const handleTestRegex = () => {
    try {
      const re = new RegExp(regexPattern, 'g');
      const matches = regexTestStr.match(re) || [];
      setRegexMatches(matches);
    } catch (err: any) {
      setRegexMatches([`Invalid regex: ${err.message}`]);
    }
  };

  // Commit to GitHub
  const handleCommitToGitHub = async () => {
    if (!activeRepo) {
      alert('No active GitHub repository selected. Please connect your GitHub account in Settings.');
      return;
    }
    setCommitStatus('Committing changes to GitHub...');
    try {
      const token = localStorage.getItem('void_ai_github_pat') || '';
      const res = await fetch('/api/github/repo/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          owner: activeRepo.owner,
          repo: activeRepo.repo,
          path: filePath,
          content: fileContent,
          message: commitMessage,
          branch: activeRepo.branch,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Commit failed');
      setCommitStatus(`Success! Committed SHA: ${data.commit?.sha?.slice(0, 7) || 'latest'}`);
    } catch (err: any) {
      setCommitStatus(`Failed: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile & Tablet Backdrop to easily dismiss drawer */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 transition-opacity" 
      />
      <div className={clsx(
        "fixed inset-y-0 right-0 z-40 bg-[#111217] border-l border-[#242733] text-white flex flex-col shadow-2xl transition-all duration-300 ease-out select-none",
        isExpanded ? "w-full md:w-[85vw]" : "w-full md:w-[620px] lg:w-[680px]"
      )}>
      {/* Top Bar Header */}
      <div className="h-13 px-4 border-b border-[#242733] flex items-center justify-between shrink-0 bg-[#14151c]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1f222e] border border-[#2e3345] flex items-center justify-center text-blue-400">
            <Code2 size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Interactive Workspace</span>
              <span className="text-[10px] text-slate-500 font-mono">2026 Core</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-[260px]">
              {activeRepo ? `${activeRepo.owner}/${activeRepo.repo} (${activeRepo.branch})` : 'Local Scratchpad'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#202330] rounded-lg transition-colors hidden sm:flex cursor-pointer"
            title={isExpanded ? "Collapse width" : "Expand to wide view"}
          >
            {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#202330] rounded-lg transition-colors cursor-pointer"
            title="Close workspace"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="px-3 pt-2 bg-[#121319] border-b border-[#242733] flex items-center gap-1 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('editor')}
          className={clsx(
            "px-3 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
            activeTab === 'editor'
              ? "bg-[#181a24] text-white border-t-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#161821]"
          )}
        >
          <Code2 size={13} className="text-emerald-400" />
          <span>Code Editor</span>
        </button>

        <button
          onClick={() => setActiveTab('terminal')}
          className={clsx(
            "px-3 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
            activeTab === 'terminal'
              ? "bg-[#181a24] text-white border-t-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#161821]"
          )}
        >
          <TerminalIcon size={13} className="text-amber-400" />
          <span>Terminal Sandbox</span>
        </button>

        <button
          onClick={() => setActiveTab('rungraph')}
          className={clsx(
            "px-3 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
            activeTab === 'rungraph'
              ? "bg-[#181a24] text-white border-t-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#161821]"
          )}
        >
          <Sparkles size={13} className="text-purple-400" />
          <span>Run-Graph</span>
        </button>

        <button
          onClick={() => setActiveTab('git')}
          className={clsx(
            "px-3 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
            activeTab === 'git'
              ? "bg-[#181a24] text-white border-t-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#161821]"
          )}
        >
          <GitBranch size={13} className="text-orange-400" />
          <span>Git & PR</span>
        </button>

        <button
          onClick={() => setActiveTab('playground')}
          className={clsx(
            "px-3 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
            activeTab === 'playground'
              ? "bg-[#181a24] text-white border-t-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#161821]"
          )}
        >
          <Play size={13} className="text-cyan-400" />
          <span>Playground</span>
        </button>

        <button
          onClick={() => setActiveTab('memory')}
          className={clsx(
            "px-3 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
            activeTab === 'memory'
              ? "bg-[#181a24] text-white border-t-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#161821]"
          )}
        >
          <Cpu size={13} className="text-indigo-400" />
          <span>Memory & Tokens</span>
        </button>

        <button
          onClick={() => setActiveTab('files')}
          className={clsx(
            "px-3 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
            activeTab === 'files'
              ? "bg-[#181a24] text-white border-t-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#161821]"
          )}
        >
          <Folder size={13} className="text-amber-400" />
          <span>Files & Project</span>
        </button>

        <button
          onClick={() => setActiveTab('processes')}
          className={clsx(
            "px-3 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
            activeTab === 'processes'
              ? "bg-[#181a24] text-white border-t-2 border-emerald-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#161821]"
          )}
        >
          <Activity size={13} className="text-emerald-400" />
          <span>Processes & Bots ({managedProcesses.filter(p => p.status === 'running').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={clsx(
            "px-3 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
            activeTab === 'preview'
              ? "bg-[#181a24] text-white border-t-2 border-cyan-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#161821]"
          )}
        >
          <Eye size={13} className="text-cyan-400" />
          <span>Live Web Preview</span>
        </button>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 select-text font-sans">
        {/* TAB 1: CODE EDITOR */}
        {activeTab === 'editor' && (
          <div className="flex flex-col h-full space-y-3">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between gap-2 p-2 bg-[#171922] rounded-xl border border-[#272b3b] text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  className="bg-transparent border-none text-slate-200 font-mono text-xs focus:outline-none w-48 sm:w-64"
                  placeholder="src/index.ts"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {(filePath.toLowerCase().endsWith('.html') || filePath.toLowerCase().endsWith('.htm') || fileContent.toLowerCase().includes('<!doctype html') || fileContent.toLowerCase().includes('<html')) && (
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('void_ai_preview_html', {
                        detail: {
                          html: fileContent,
                          title: filePath || 'Live HTML Sandbox'
                        }
                      }));
                    }}
                    className="px-2.5 py-1 text-emerald-300 hover:text-white bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer shadow-sm"
                    title="Run live interactive HTML sandbox"
                  >
                    <Play size={11} fill="currentColor" />
                    <span>Live Preview</span>
                  </button>
                )}

                <button
                  onClick={handleDownloadZip}
                  className="px-2.5 py-1 text-amber-300 hover:text-white bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                  title="Export file inside a ZIP archive bundle"
                >
                  <Archive size={11} />
                  <span>Export ZIP</span>
                </button>

                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 text-slate-300 hover:text-white bg-[#202330] hover:bg-[#282d3e] rounded-lg transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                  title="Copy code"
                >
                  {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="px-2.5 py-1 text-slate-300 hover:text-white bg-[#202330] hover:bg-[#282d3e] rounded-lg transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                  title="Download file"
                >
                  <Download size={12} />
                  <span>Download</span>
                </button>

                {onSaveFile && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-3 py-1 text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <span>{isSaving ? 'Saving...' : 'Save File'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Editable code textarea with monospace font */}
            <div className="flex-1 min-h-[360px] bg-[#0d0e13] border border-[#232635] rounded-xl overflow-hidden flex flex-col font-mono text-xs">
              <div className="px-3 py-1.5 bg-[#14161f] border-b border-[#232635] flex items-center justify-between text-[11px] text-slate-400 select-none">
                <span>{filePath.split('.').pop()?.toUpperCase() || 'CODE'} Source</span>
                <span className="tabular-nums">{fileContent.split('\n').length} lines · {fileContent.length} chars</span>
              </div>
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                spellCheck={false}
                className="w-full flex-1 p-3.5 bg-transparent text-slate-100 font-mono text-xs resize-none focus:outline-none leading-relaxed selection:bg-blue-500/30"
              />
            </div>
          </div>
        )}

        {/* TAB 2: TERMINAL SANDBOX */}
        {activeTab === 'terminal' && (
          <div className="flex flex-col h-full space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-xs text-slate-400 bg-[#161822] p-2.5 rounded-xl border border-[#262a39]">
              <div className="flex items-center gap-2">
                <TerminalIcon size={14} className="text-amber-400" />
                <span className="font-semibold text-slate-200">Terminal Process Console</span>
              </div>
              <div className="flex items-center gap-2">
                {isTerminalRunning && (
                  <button
                    onClick={handleStopTerminal}
                    className="px-2.5 py-1 bg-rose-950/90 hover:bg-rose-900 border border-rose-700/60 text-rose-300 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer animate-pulse"
                  >
                    <Square size={9} fill="currentColor" />
                    <span>Stop Task</span>
                  </button>
                )}
                <button
                  onClick={() => setTerminalLogs(['Console cleared.'])}
                  className="px-2 py-1 text-slate-400 hover:text-white rounded hover:bg-[#222533]"
                >
                  Clear
                </button>
                <button
                  onClick={() => handleRunTerminal('ls -la')}
                  className="px-2.5 py-1 bg-[#202434] hover:bg-[#282d42] text-slate-200 rounded text-[11px]"
                >
                  ls -la
                </button>
                <button
                  onClick={() => handleRunTerminal('npm test')}
                  className="px-2.5 py-1 bg-[#202434] hover:bg-[#282d42] text-slate-200 rounded text-[11px]"
                >
                  npm test
                </button>
              </div>
            </div>

            {/* Output log viewer */}
            <div className="flex-1 min-h-[340px] max-h-[480px] p-3.5 bg-[#090a0f] border border-[#202331] rounded-xl overflow-y-auto space-y-1.5 font-mono text-xs text-slate-200">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className={clsx(
                  "whitespace-pre-wrap leading-relaxed",
                  log.startsWith('$') ? "text-blue-400 font-bold" :
                  log.includes('[ERROR]') ? "text-rose-400" :
                  log.includes('PASSED') || log.includes('Success') ? "text-emerald-400" :
                  "text-slate-300"
                )}>
                  {log}
                </div>
              ))}
              {isTerminalRunning && (
                <div className="text-amber-400 animate-pulse flex items-center gap-2 mt-2">
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Executing command in sandbox...</span>
                </div>
              )}
            </div>

            {/* Terminal Command Input Form */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleRunTerminal(); }}
              className="flex items-center gap-2 bg-[#14161f] border border-[#252838] p-1.5 rounded-xl"
            >
              <span className="text-blue-400 font-bold pl-2">$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="Enter command (e.g. ls, npm run build, nmap, curl)..."
                className="flex-1 bg-transparent border-none text-slate-100 text-xs font-mono focus:outline-none"
              />
              <button
                type="submit"
                disabled={isTerminalRunning || !terminalInput.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-xs disabled:opacity-40"
              >
                Execute
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: RUN-GRAPH */}
        {activeTab === 'rungraph' && (
          <div className="space-y-4">
            <div className="p-3 bg-[#151720] border border-[#262938] rounded-xl text-xs">
              <h4 className="font-bold text-white mb-1 flex items-center gap-2">
                <Sparkles size={14} className="text-purple-400" />
                Autonomous Coding Execution Stepper
              </h4>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Visual pipeline showing active phases of code generation, repository verification, diff application, and git synchronization.
              </p>
            </div>

            {/* Stepper Pipeline */}
            <div className="space-y-3 relative before:absolute before:inset-y-4 before:left-4 before:w-0.5 before:bg-[#252837]">
              {[
                { phase: 'Phase 1', title: 'Intent Classification & Scope Guard', status: 'completed', desc: 'Verified user coding intent and scoped affected files' },
                { phase: 'Phase 2', title: 'Repository & Codebase Architecture Scan', status: 'completed', desc: 'Fetched file tree and verified module dependencies' },
                { phase: 'Phase 3', title: 'Code Synthesis & AST Validation', status: 'completed', desc: 'Applied modifications, verified TypeScript types and syntax' },
                { phase: 'Phase 4', title: 'Terminal Execution & Build Verification', status: 'running', desc: 'Executing compilation and runtime sanity checks' },
                { phase: 'Phase 5', title: 'Git Staging & Pull Request Creation', status: 'pending', desc: 'Awaiting user one-click commit and merge signal' },
              ].map((step, idx) => (
                <div key={idx} className="relative flex items-start gap-3 pl-1">
                  <div className={clsx(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 text-[11px] font-bold border",
                    step.status === 'completed' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" :
                    step.status === 'running' ? "bg-blue-500/20 text-blue-400 border-blue-500/60 animate-pulse" :
                    "bg-[#1a1c25] text-slate-500 border-[#2b2e3e]"
                  )}>
                    {step.status === 'completed' ? <Check size={13} className="stroke-[3]" /> : idx + 1}
                  </div>

                  <div className="flex-1 p-3 bg-[#161822] border border-[#242735] rounded-xl">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-white">{step.title}</span>
                      <span className={clsx(
                        "text-[10px] uppercase font-mono tracking-wider",
                        step.status === 'completed' ? "text-emerald-400" :
                        step.status === 'running' ? "text-blue-400" :
                        "text-slate-500"
                      )}>
                        {step.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: GIT & PR */}
        {activeTab === 'git' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#151720] border border-[#262938] rounded-xl">
              <h4 className="font-bold text-white mb-1 flex items-center gap-2">
                <GitBranch size={14} className="text-orange-400" />
                Automated Git Branching & GitHub Commit Creator
              </h4>
              <p className="text-slate-400 text-[11px]">
                Stage current workspace edits directly to your connected GitHub repository and create branches.
              </p>
            </div>

            {activeRepo ? (
              <div className="space-y-3 p-4 bg-[#14161f] border border-[#242735] rounded-xl">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Target Repository & Branch</label>
                  <div className="p-2.5 bg-[#0d0e13] border border-[#212330] rounded-lg text-slate-200 font-mono text-xs">
                    {activeRepo.owner}/{activeRepo.repo} @ <span className="text-blue-400 font-bold">{activeRepo.branch}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">File To Commit</label>
                  <input
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    className="w-full p-2.5 bg-[#0d0e13] border border-[#212330] rounded-lg text-slate-200 font-mono text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Commit Message</label>
                  <textarea
                    rows={2}
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full p-2.5 bg-[#0d0e13] border border-[#212330] rounded-lg text-slate-200 font-mono text-xs focus:outline-none resize-none"
                  />
                </div>

                <button
                  onClick={handleCommitToGitHub}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <GitBranch size={14} />
                  <span>Commit File to GitHub</span>
                </button>

                {commitStatus && (
                  <div className="p-2.5 bg-[#1b1e2a] border border-[#2e3347] rounded-lg text-slate-300 font-mono text-[11px]">
                    {commitStatus}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center bg-[#14161f] border border-[#242735] rounded-xl text-slate-400">
                <p className="mb-3">No GitHub repository connected yet.</p>
                <p className="text-[11px] text-slate-500">Connect in Settings → Tools & Integrations to enable one-click commits and PR creation.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PLAYGROUND & TOOLS */}
        {activeTab === 'playground' && (
          <div className="space-y-4 text-xs font-mono">
            {/* JS/TS Quick Evaluator */}
            <div className="p-3 bg-[#151720] border border-[#262938] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-2">
                  <Play size={13} className="text-cyan-400" />
                  JavaScript Expression Runner
                </span>
                <button
                  onClick={handleRunPlayground}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium text-[11px] cursor-pointer"
                >
                  Evaluate
                </button>
              </div>
              <textarea
                rows={3}
                value={playgroundCode}
                onChange={(e) => setPlaygroundCode(e.target.value)}
                className="w-full p-2.5 bg-[#0c0d12] border border-[#222533] rounded-lg text-slate-200 font-mono text-xs focus:outline-none resize-none"
              />
              {playgroundOutput && (
                <div className="p-2.5 bg-[#090a0e] border border-[#212433] rounded-lg text-emerald-400 font-mono text-[11px] whitespace-pre-wrap">
                  {playgroundOutput}
                </div>
              )}
            </div>

            {/* Regex Evaluator */}
            <div className="p-3 bg-[#151720] border border-[#262938] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-2">
                  <Code2 size={13} className="text-amber-400" />
                  Live Regex Tester
                </span>
                <button
                  onClick={handleTestRegex}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium text-[11px] cursor-pointer"
                >
                  Test Pattern
                </button>
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Regular Expression:</label>
                <input
                  type="text"
                  value={regexPattern}
                  onChange={(e) => setRegexPattern(e.target.value)}
                  className="w-full p-2 bg-[#0c0d12] border border-[#222533] rounded-lg text-slate-200 font-mono text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Test Input Text:</label>
                <input
                  type="text"
                  value={regexTestStr}
                  onChange={(e) => setRegexTestStr(e.target.value)}
                  className="w-full p-2 bg-[#0c0d12] border border-[#222533] rounded-lg text-slate-200 font-mono text-xs focus:outline-none"
                />
              </div>
              {regexMatches.length > 0 && (
                <div className="p-2 bg-[#090a0e] border border-[#212433] rounded-lg text-amber-300 font-mono text-[11px]">
                  Matches: {JSON.stringify(regexMatches)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: MEMORY & TOKENS */}
        {activeTab === 'memory' && (
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-[#151720] border border-[#262938] rounded-xl">
              <h4 className="font-bold text-white mb-1 flex items-center gap-2">
                <Cpu size={14} className="text-indigo-400" />
                Session Token Budget & Long-Term Memory
              </h4>
              <p className="text-slate-400 text-[11px]">
                Monitor token consumption and manage facts remembered across your conversations.
              </p>
            </div>

            {/* Token Budget Gauge */}
            <div className="p-4 bg-[#14161f] border border-[#242735] rounded-xl space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Context Window Used</span>
                <span className="text-slate-400 tabular-nums">
                  {memoryStats.estimatedTokens.toLocaleString()} / {memoryStats.maxContext.toLocaleString()} tokens
                </span>
              </div>
              <div className="w-full h-2 bg-[#202330] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (memoryStats.estimatedTokens / memoryStats.maxContext) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Compression: {memoryStats.compressionRatio}</span>
                <button
                  onClick={() => {
                    alert('Memory compaction complete! Older messages summarized.');
                    setMemoryStats(prev => ({ ...prev, estimatedTokens: Math.round(prev.estimatedTokens * 0.45) }));
                  }}
                  className="text-blue-400 hover:text-blue-300 font-medium underline cursor-pointer"
                >
                  Compress Context Now
                </button>
              </div>
            </div>

            {/* Pinned Architectural Facts */}
            <div className="p-4 bg-[#14161f] border border-[#242735] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs">Active Project Memories</span>
                <span className="text-[10px] text-slate-500 font-mono">{memoryStats.activeFacts.length} facts</span>
              </div>

              <div className="space-y-2">
                {memoryStats.activeFacts.map((fact, idx) => (
                  <div key={idx} className="p-2.5 bg-[#0e1015] border border-[#222533] rounded-lg text-[11px] text-slate-300 flex items-center justify-between gap-2">
                    <span className="truncate">{fact}</span>
                    <button
                      onClick={() => setMemoryStats(prev => ({ ...prev, activeFacts: prev.activeFacts.filter((_, i) => i !== idx) }))}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newFact}
                  onChange={(e) => setNewFact(e.target.value)}
                  placeholder="Remember fact (e.g. Use strict type checking)..."
                  className="flex-1 p-2 bg-[#0d0e13] border border-[#222533] rounded-lg text-slate-200 text-xs focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (newFact.trim()) {
                      setMemoryStats(prev => ({ ...prev, activeFacts: [...prev.activeFacts, newFact.trim()] }));
                      setNewFact('');
                    }
                  }}
                  className="px-3 py-2 bg-[#202330] hover:bg-[#282d3e] text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  Add Fact
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: WORKSPACE FILES & PROJECT MANAGER */}
        {activeTab === 'files' && (
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-[#151720] border border-[#262938] rounded-xl flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-white mb-0.5 flex items-center gap-2">
                  <Folder size={14} className="text-amber-400" />
                  Persistent Linux Workspace Explorer
                </h4>
                <p className="text-slate-400 text-[11px]">
                  Real disk files stored on the backend. Click any file to edit, or export the entire project as a ZIP bundle.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadWorkspaceFiles}
                  disabled={isLoadingFiles}
                  className="p-1.5 bg-[#202330] hover:bg-[#282d3e] text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Refresh files"
                >
                  <RefreshCw size={13} className={isLoadingFiles ? "animate-spin" : ""} />
                </button>
                <a
                  href="/api/workspace/download"
                  download="nova-workspace.zip"
                  className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download Project as ZIP</span>
                </a>
              </div>
            </div>

            {/* Create New File bar */}
            <div className="p-3 bg-[#14161f] border border-[#242735] rounded-xl flex items-center justify-between gap-2">
              {showNewFileInput ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="e.g. server.js, app.py, styles.css..."
                    className="flex-1 bg-[#0d0e13] border border-[#2e3345] rounded-lg px-2.5 py-1 text-slate-100 font-mono text-xs focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateWorkspaceFile}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewFileInput(false)}
                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="text-slate-400 text-xs">Workspace Files ({workspaceFiles.length} items)</span>
                  <button
                    onClick={() => setShowNewFileInput(true)}
                    className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>New File</span>
                  </button>
                </div>
              )}
            </div>

            {/* Workspace File List */}
            <div className="bg-[#12131a] border border-[#222533] rounded-xl divide-y divide-[#1e202d] overflow-hidden">
              {workspaceFiles.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Folder size={32} className="mx-auto mb-2 opacity-30 text-amber-400" />
                  <p className="text-xs">No files in workspace yet.</p>
                  <p className="text-[11px] text-slate-600 mt-1">Ask Nova AI to build a project, create files, or click New File above.</p>
                </div>
              ) : (
                workspaceFiles.map((file) => (
                  <div
                    key={file.path}
                    className="p-2.5 flex items-center justify-between hover:bg-[#181a24] transition-colors group cursor-pointer"
                    onClick={() => !file.isDirectory && handleOpenFile(file.path)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {file.isDirectory ? (
                        <Folder size={15} className="text-amber-400 shrink-0" />
                      ) : (
                        <FileCode size={15} className="text-blue-400 shrink-0" />
                      )}
                      <span className="font-mono text-xs text-slate-200 truncate">{file.path}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {file.size !== undefined && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWorkspaceFile(file.path);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Delete file"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: BACKGROUND PROCESSES & DAEMONS */}
        {activeTab === 'processes' && (
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-[#151720] border border-[#262938] rounded-xl flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-white mb-0.5 flex items-center gap-2">
                  <Activity size={14} className="text-emerald-400" />
                  Daemon & Background Process Manager
                </h4>
                <p className="text-slate-400 text-[11px]">
                  Persistent servers, bots, and tasks running in the Linux execution environment.
                </p>
              </div>

              <button
                onClick={loadProcesses}
                disabled={isLoadingProcesses}
                className="p-1.5 bg-[#202330] hover:bg-[#282d3e] text-slate-300 rounded-lg transition-colors cursor-pointer"
                title="Refresh processes"
              >
                <RefreshCw size={13} className={isLoadingProcesses ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Launch new background job form */}
            <div className="p-3.5 bg-[#14161f] border border-[#242735] rounded-xl space-y-2.5">
              <span className="font-bold text-slate-200 text-xs block">Start New Background Server or Bot</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newProcessCmd}
                  onChange={(e) => setNewProcessCmd(e.target.value)}
                  placeholder="Command (e.g. node server.js)"
                  className="sm:col-span-2 bg-[#0d0e13] border border-[#2e3345] rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none"
                />
                <input
                  type="number"
                  value={newProcessPort}
                  onChange={(e) => setNewProcessPort(e.target.value)}
                  placeholder="Port (e.g. 5173)"
                  className="bg-[#0d0e13] border border-[#2e3345] rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleStartProcess}
                  disabled={!newProcessCmd.trim()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
                >
                  Start Daemon
                </button>
              </div>
            </div>

            {/* Running Process Cards */}
            <div className="space-y-2">
              {managedProcesses.length === 0 ? (
                <div className="p-8 bg-[#12131a] border border-[#222533] rounded-xl text-center text-slate-500">
                  <Activity size={32} className="mx-auto mb-2 opacity-30 text-emerald-400" />
                  <p className="text-xs">No background processes running.</p>
                  <p className="text-[11px] text-slate-600 mt-1">Start a web server, bot, or cron script using the form above or by prompting Nova in chat.</p>
                </div>
              ) : (
                managedProcesses.map((proc) => (
                  <div key={proc.id} className="p-3 bg-[#13151d] border border-[#252837] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          "w-2 h-2 rounded-full",
                          proc.status === 'running' ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                        )} />
                        <span className="font-bold text-white text-xs">{proc.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">PID {proc.pid}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {proc.port && (
                          <button
                            onClick={() => {
                              setPreviewPort(proc.port!);
                              setCustomPortInput(String(proc.port!));
                              setActiveTab('preview');
                            }}
                            className="px-2 py-0.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 rounded text-[10px] font-bold cursor-pointer"
                          >
                            Open Preview
                          </button>
                        )}
                        <button
                          onClick={() => handleViewProcessLogs(proc.id)}
                          className="px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded text-[10px] cursor-pointer"
                        >
                          Logs
                        </button>
                        {proc.status === 'running' && (
                          <button
                            onClick={() => handleStopProcess(proc.id)}
                            className="px-2 py-0.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 rounded text-[10px] font-bold cursor-pointer"
                          >
                            Stop
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="font-mono text-[11px] text-slate-400 bg-[#0c0d12] p-2 rounded border border-[#1f222e] truncate">
                      $ {proc.command}
                    </div>

                    {proc.port && (
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <span>Listening on port {proc.port}</span>
                        <span>· Preview URL: <code>{proc.previewUrl}</code></span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Selected Process Log Drawer */}
            {selectedProcId && (
              <div className="p-3 bg-[#0a0b10] border border-[#2b2e40] rounded-xl font-mono text-[11px] space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold text-white">Live Logs: {selectedProcId}</span>
                  <button
                    onClick={() => setSelectedProcId(null)}
                    className="text-slate-500 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-all text-slate-300 scrollbar-thin">
                  {selectedProcLogs.join('\n') || '(No logs recorded yet)'}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB: REAL WEB APP PREVIEW */}
        {activeTab === 'preview' && (
          <div className="flex flex-col h-full space-y-3 font-sans text-xs">
            {/* Preview Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#171922] rounded-xl border border-[#272b3b]">
              <div className="flex items-center gap-2">
                <Eye size={14} className="text-cyan-400" />
                <span className="font-bold text-white text-xs">Port:</span>
                <input
                  type="number"
                  value={customPortInput}
                  onChange={(e) => setCustomPortInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const p = parseInt(customPortInput, 10);
                      if (p) setPreviewPort(p);
                    }
                  }}
                  className="w-18 bg-[#0e1017] border border-[#2e3345] rounded px-2 py-0.5 text-center font-mono text-xs text-cyan-300 focus:outline-none"
                />
                <button
                  onClick={() => {
                    const p = parseInt(customPortInput, 10);
                    if (p) setPreviewPort(p);
                  }}
                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold cursor-pointer"
                >
                  Go
                </button>
              </div>

              {/* Viewport switchers */}
              <div className="flex items-center gap-1 bg-[#10121a] p-1 rounded-lg border border-[#242735]">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={clsx(
                    "p-1 rounded cursor-pointer transition-colors",
                    previewDevice === 'desktop' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                  )}
                  title="Desktop View"
                >
                  <Monitor size={13} />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={clsx(
                    "p-1 rounded cursor-pointer transition-colors",
                    previewDevice === 'tablet' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                  )}
                  title="Tablet View (768px)"
                >
                  <Tablet size={13} />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={clsx(
                    "p-1 rounded cursor-pointer transition-colors",
                    previewDevice === 'mobile' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                  )}
                  title="Mobile View (375px)"
                >
                  <Smartphone size={13} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPreviewKey(k => k + 1)}
                  className="p-1.5 text-slate-400 hover:text-white bg-[#202330] rounded-lg transition-colors cursor-pointer"
                  title="Reload preview"
                >
                  <RefreshCw size={13} />
                </button>
                <a
                  href={`/api/preview/${previewPort}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 text-cyan-300 hover:text-white bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Window</span>
                  <ArrowUpRight size={12} />
                </a>
              </div>
            </div>

            {/* Embedded Responsive Preview Sandbox */}
            <div className="flex-1 min-h-[480px] bg-[#090a0f] border border-[#202331] rounded-xl overflow-hidden flex items-center justify-center p-2">
              <div className={clsx(
                "h-full bg-white rounded-lg overflow-hidden transition-all duration-300 shadow-2xl",
                previewDevice === 'desktop' ? "w-full" :
                previewDevice === 'tablet' ? "w-[768px] max-w-full" :
                "w-[375px] max-w-full"
              )}>
                <iframe
                  key={previewKey}
                  src={`/api/preview/${previewPort}/`}
                  title="NOVA Live Web Preview"
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
      </div>
    </div>
    </>
  );
}
