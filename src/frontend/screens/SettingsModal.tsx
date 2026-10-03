import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Edit3, Sliders, Database, Cpu, Briefcase, Sparkles, Shield, 
  Mail, Sun, Palette, Bell, Key, Radio, Wallet, Bot, AudioLines, 
  HelpCircle, MessageSquare, LogOut, ChevronDown, ChevronRight, Trash2, Check, Send, Crown, ExternalLink,
  GitBranch, Folder, AlertCircle, RefreshCw, Power, Zap, Terminal
} from 'lucide-react';
import {
  getStoredGitHubToken,
  getStoredGitHubUser,
  getStoredActiveRepo,
  setStoredActiveRepo,
  clearStoredGitHubAuth,
  getStoredGitHubCodingMode,
  setStoredGitHubCodingMode,
  getCapabilityState,
  fetchUserRepos,
  fetchRepoBranches,
  verifyToken,
  setStoredGitHubAuth,
  GitHubUser,
  GitHubRepo,
  ActiveRepoState,
  CapabilityState
} from '../utils/github';

interface SettingsModalProps {
  onClose: () => void;
  isAdmin?: boolean;
  onClearHistory?: () => void;
  userEmail?: string;
  userName?: string;
  onLogout?: () => void;
  onOpenSubscription?: () => void;
  onOpenApiKeys?: () => void;
  onOpenSupport?: () => void;
  onOpenAdmin?: () => void;
  onOpenCampaignGenerator?: () => void;
  onOpenLiveVoice?: () => void;
  onOpenTelegram?: () => void;
  onOpenGitHubWorkspace?: () => void;
  initialView?: 'main' | 'integrations-github' | 'project-memory';
  walletBalance?: number;
  selectedProvider?: 'groq' | 'cohere' | 'bazaarlink';
  selectedModel?: string;
  onSelectProviderModel?: (provider: 'groq' | 'cohere' | 'bazaarlink', model: string) => void;
}

export function SettingsModal({ 
  onClose, 
  isAdmin = false, 
  onClearHistory,
  userEmail = 'mrnovatech4@gmail.com',
  userName = 'Mr nova tech',
  onLogout,
  onOpenSubscription,
  onOpenApiKeys,
  onOpenSupport,
  onOpenAdmin,
  onOpenCampaignGenerator,
  onOpenLiveVoice,
  onOpenTelegram,
  onOpenGitHubWorkspace,
  initialView = 'main',
  walletBalance = 0,
  selectedProvider = 'groq',
  selectedModel = 'auto',
  onSelectProviderModel
}: SettingsModalProps) {
  const [currentView, setCurrentView] = useState<'main' | 'integrations-github' | 'project-memory'>(initialView);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(userName);

  // GitHub integration states
  const [gitHubToken, setGitHubToken] = useState<string | null>(() => getStoredGitHubToken());
  const [gitHubUser, setGitHubUser] = useState<GitHubUser | null>(() => getStoredGitHubUser());
  const [activeRepo, setActiveRepo] = useState<ActiveRepoState | null>(() => getStoredActiveRepo());
  const [codingMode, setCodingMode] = useState<boolean>(() => getStoredGitHubCodingMode());
  const [capabilities, setCapabilities] = useState<CapabilityState>(() => getCapabilityState());

  // Repos & Branches dropdown lists
  const [reposList, setReposList] = useState<GitHubRepo[]>([]);
  const [branchesList, setBranchesList] = useState<string[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  // Inline connect states
  const [patInput, setPatInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [githubNotice, setGithubNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Project Memory states
  const [memoryProjectId, setMemoryProjectId] = useState<string>(() => {
    const active = getStoredActiveRepo();
    return active ? `${active.owner}/${active.repo}` : 'workspace-default';
  });
  const [projectMemory, setProjectMemory] = useState<any>(null);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [memoryNotice, setMemoryNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadProjectMemory = async (projId: string) => {
    setIsLoadingMemory(true);
    setMemoryNotice(null);
    try {
      const res = await fetch(`/api/project/memory?projectId=${encodeURIComponent(projId)}`);
      const data = await res.json();
      if (data.success && data.memory) {
        setProjectMemory(data.memory);
      }
    } catch (err: any) {
      console.warn('Failed to load project memory:', err);
    } finally {
      setIsLoadingMemory(false);
    }
  };

  const handleSaveMemory = async () => {
    if (!projectMemory) return;
    setIsSavingMemory(true);
    setMemoryNotice(null);
    try {
      const res = await fetch('/api/project/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: memoryProjectId,
          updates: projectMemory
        })
      });
      const data = await res.json();
      if (data.success) {
        setMemoryNotice({ text: 'Project memory saved to persistent Firestore!', type: 'success' });
        setProjectMemory(data.memory);
      } else {
        setMemoryNotice({ text: data.error || 'Failed to save project memory', type: 'error' });
      }
    } catch (err: any) {
      setMemoryNotice({ text: err.message || 'Error saving project memory', type: 'error' });
    } finally {
      setIsSavingMemory(false);
    }
  };

  const handleClearMemory = async () => {
    if (!confirm(`Are you sure you want to clear persistent memory for ${memoryProjectId}?`)) return;
    setIsSavingMemory(true);
    setMemoryNotice(null);
    try {
      const res = await fetch('/api/project/memory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: memoryProjectId })
      });
      const data = await res.json();
      if (data.success) {
        setMemoryNotice({ text: 'Project memory cleared from Firestore.', type: 'success' });
        setProjectMemory({
          projectId: memoryProjectId,
          framework: '',
          language: '',
          packageManager: '',
          entryPoints: [],
          importantDirectories: [],
          authArchitecture: '',
          databaseStructure: '',
          apiStructure: '',
          deploymentConfig: '',
          codingConventions: '',
          previousDecisions: [],
          knownIssues: [],
          userApprovedInstructions: '',
          updatedAt: Date.now()
        });
      }
    } catch (err: any) {
      setMemoryNotice({ text: err.message || 'Error clearing project memory', type: 'error' });
    } finally {
      setIsSavingMemory(false);
    }
  };

  useEffect(() => {
    const handleSync = () => {
      setGitHubToken(getStoredGitHubToken());
      setGitHubUser(getStoredGitHubUser());
      setActiveRepo(getStoredActiveRepo());
      setCodingMode(getStoredGitHubCodingMode());
      setCapabilities(getCapabilityState());
    };

    window.addEventListener('void_ai_github_state_change', handleSync);
    return () => window.removeEventListener('void_ai_github_state_change', handleSync);
  }, []);

  // When switching to GitHub integrations view, load repos if authenticated
  useEffect(() => {
    if (currentView === 'integrations-github' && gitHubToken) {
      loadRepos(gitHubToken);
    }
  }, [currentView, gitHubToken]);

  // When active repo changes, load its branches
  useEffect(() => {
    if (gitHubToken && activeRepo) {
      loadBranches(gitHubToken, activeRepo.owner, activeRepo.repo);
    }
  }, [gitHubToken, activeRepo?.owner, activeRepo?.repo]);

  const loadRepos = async (token: string) => {
    setIsLoadingRepos(true);
    try {
      const repos = await fetchUserRepos(token);
      setReposList(repos);
      if (repos.length > 0 && !activeRepo) {
        const [owner, name] = repos[0].full_name.split('/');
        const initial: ActiveRepoState = {
          owner,
          repo: name,
          branch: repos[0].default_branch || 'main'
        };
        setActiveRepo(initial);
        setStoredActiveRepo(initial);
      }
    } catch (err: any) {
      console.warn('Failed to load user repositories:', err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const loadBranches = async (token: string, owner: string, repo: string) => {
    setIsLoadingBranches(true);
    try {
      const branches = await fetchRepoBranches(token, owner, repo);
      setBranchesList(branches);
    } catch (err) {
      console.warn('Failed to load branches:', err);
      setBranchesList(['main', 'master']);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  const handleToggleCodingMode = (enabled: boolean) => {
    setCodingMode(enabled);
    setStoredGitHubCodingMode(enabled);
    setCapabilities(getCapabilityState());
    setGithubNotice({
      text: enabled 
        ? 'GitHub Coding Mode is ON. VOID can now make changes to your connected repository.'
        : 'GitHub Coding Mode is OFF. VOID will not write to your repository.',
      type: 'success'
    });
    setTimeout(() => setGithubNotice(null), 3500);
  };

  const handleSelectRepo = (fullName: string) => {
    const found = reposList.find(r => r.full_name === fullName);
    if (!found) return;
    const [owner, name] = fullName.split('/');
    const newState: ActiveRepoState = {
      owner,
      repo: name,
      branch: found.default_branch || 'main'
    };
    setActiveRepo(newState);
    setStoredActiveRepo(newState);
    setGithubNotice({
      text: `Active repository set to ${owner}/${name}`,
      type: 'success'
    });
    setTimeout(() => setGithubNotice(null), 3000);
  };

  const handleSelectBranch = (newBranch: string) => {
    if (!activeRepo) return;
    const newState: ActiveRepoState = {
      ...activeRepo,
      branch: newBranch
    };
    setActiveRepo(newState);
    setStoredActiveRepo(newState);
  };

  const handleConnectPAT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patInput.trim()) return;

    setIsConnecting(true);
    setGithubNotice(null);
    try {
      const check = await verifyToken(patInput.trim());
      if (check.valid && check.user) {
        setStoredGitHubAuth(patInput.trim(), check.user);
        setGitHubToken(patInput.trim());
        setGitHubUser(check.user);
        setPatInput('');
        setGithubNotice({
          text: `Connected as @${check.user.login}! GitHub Coding Mode is OFF by default.`,
          type: 'success'
        });
        loadRepos(patInput.trim());
      } else {
        setGithubNotice({
          text: check.error || 'Invalid GitHub token. Ensure token has repo scope.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setGithubNotice({
        text: err?.message || 'Token verification failed.',
        type: 'error'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (!confirm('Are you sure you want to disconnect GitHub? This will immediately disable GitHub Coding Mode.')) {
      return;
    }
    clearStoredGitHubAuth();
    setGitHubToken(null);
    setGitHubUser(null);
    setActiveRepo(null);
    setCodingMode(false);
    setReposList([]);
    setBranchesList([]);
    setCapabilities(getCapabilityState());
    setGithubNotice({
      text: 'Disconnected GitHub account. GitHub Coding Mode disabled.',
      type: 'success'
    });
    setTimeout(() => setGithubNotice(null), 3000);
  };

  return (
    <div className="fixed inset-0 bg-[#2b0709] z-50 overflow-y-auto font-sans text-white flex flex-col text-xs select-none">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-20 bg-black/95 border-b border-[#38383b] px-3 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (currentView !== 'main') {
                setCurrentView('main');
              } else {
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#252527] hover:bg-[#202022] border border-[#38383b] text-[#8d8d91] hover:text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer group"
            title={currentView !== 'main' ? "Back to Settings" : "Back to chat"}
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="uppercase tracking-wider">
              {currentView !== 'main' ? 'Settings' : 'Back'}
            </span>
          </button>
          
          <div className="h-4 w-px bg-[#252527] hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black tracking-widest text-[#3f86ff] uppercase">
              {currentView === 'integrations-github' 
                ? 'SETTINGS → INTEGRATIONS → GITHUB' 
                : currentView === 'project-memory'
                ? 'SETTINGS → INTEGRATIONS → PROJECT MEMORY'
                : 'CONTROL CENTER & SETTINGS'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentView === 'integrations-github' ? (
            <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${codingMode ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-400' : 'bg-[#252527] border-[#38383b] text-[#8d8d91]'}`}>
              {codingMode ? 'CODING ON' : 'CODING OFF'}
            </span>
          ) : currentView === 'project-memory' ? (
            <span className="text-[10px] px-2 py-0.5 rounded border border-emerald-700/60 bg-emerald-950/80 text-emerald-400 font-bold">
              FIRESTORE SYNC
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#252527] border border-[#38383b] text-[#8d8d91] font-bold shadow">
              v2.4 DEMONIC
            </span>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 max-w-xl mx-auto w-full p-3 sm:p-5 space-y-4 pb-12">

        {/* ============================================================== */}
        {/* SUBVIEW: SETTINGS → INTEGRATIONS → GITHUB                      */}
        {/* ============================================================== */}
        {currentView === 'integrations-github' ? (
          <div className="space-y-4">
            {/* Breadcrumb path */}
            <div className="flex items-center gap-1.5 text-[11px] text-[#8d8d91] font-mono">
              <span className="cursor-pointer hover:text-white" onClick={() => setCurrentView('main')}>Settings</span>
              <span>/</span>
              <span>Integrations</span>
              <span>/</span>
              <span className="text-[#3f86ff] font-semibold">GitHub</span>
            </div>

            {/* Notification Banner */}
            {githubNotice && (
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                githubNotice.type === 'success' 
                  ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200' 
                  : 'bg-red-950/50 border-red-700/60 text-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {githubNotice.type === 'success' ? <Check size={14} className="text-emerald-400 shrink-0" /> : <AlertCircle size={14} className="text-red-400 shrink-0" />}
                  <span>{githubNotice.text}</span>
                </div>
                <button onClick={() => setGithubNotice(null)} className="opacity-70 hover:opacity-100">✕</button>
              </div>
            )}

            {/* 1. Account Connection Status */}
            <div className="bg-gradient-to-b from-[#202022] via-[#202022] to-[#2b0709] border border-[#38383b] rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-bold text-[#3f86ff] uppercase tracking-widest block">
                1. GITHUB ACCOUNT CONNECTION
              </span>

              {gitHubUser ? (
                <div className="flex items-center justify-between gap-3 bg-black/40 p-3 rounded-xl border border-[#38383b]/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={gitHubUser.avatar_url} 
                      alt={gitHubUser.login} 
                      className="w-10 h-10 rounded-xl border border-[#38383b] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">
                          {gitHubUser.name || gitHubUser.login}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-[10px] font-bold flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Connected
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8d8d91] font-mono truncate">
                        @{gitHubUser.login} • {gitHubUser.public_repos} public repos
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleDisconnect}
                    className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 rounded-xl text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#8d8d91]">Status:</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#252527] border border-[#38383b] text-[#8d8d91] text-[10px] font-bold">
                      Not Connected
                    </span>
                  </div>

                  <form onSubmit={handleConnectPAT} className="space-y-2">
                    <label className="text-[11px] text-[#8d8d91] block">
                      Connect via GitHub Personal Access Token (with <code className="text-amber-300">repo</code> scope):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={patInput}
                        onChange={(e) => setPatInput(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        className="flex-1 bg-[#1a1a1c] border border-[#38383b] focus:border-[#3f86ff] rounded-xl px-3 py-1.5 text-xs text-white outline-none font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isConnecting || !patInput.trim()}
                        className="px-3 py-1.5 bg-[#3f86ff] hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {isConnecting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                        <span>Connect</span>
                      </button>
                    </div>
                  </form>

                  {onOpenGitHubWorkspace && (
                    <button
                      onClick={onOpenGitHubWorkspace}
                      className="w-full py-2 bg-[#252527] hover:bg-[#38383b] border border-[#38383b] text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Full GitHub Connect Dialog & OAuth</span>
                      <ExternalLink size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. Connected Repository & Branch Selectors */}
            {gitHubUser && (
              <div className="bg-gradient-to-b from-[#202022] via-[#202022] to-[#2b0709] border border-[#38383b] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#3f86ff] uppercase tracking-widest block">
                    2. ACTIVE REPOSITORY & BRANCH
                  </span>
                  <button
                    onClick={() => gitHubToken && loadRepos(gitHubToken)}
                    disabled={isLoadingRepos}
                    className="p-1 text-[#8d8d91] hover:text-white rounded transition-colors"
                    title="Refresh repositories"
                  >
                    <RefreshCw size={12} className={isLoadingRepos ? "animate-spin" : ""} />
                  </button>
                </div>

                {/* Repository Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#8d8d91] block">
                    Connected Repository:
                  </label>
                  {reposList.length > 0 ? (
                    <select
                      value={activeRepo ? `${activeRepo.owner}/${activeRepo.repo}` : ''}
                      onChange={(e) => handleSelectRepo(e.target.value)}
                      className="w-full bg-[#1a1a1c] border border-[#38383b] hover:border-[#3f86ff] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer font-mono"
                    >
                      {reposList.map((r) => (
                        <option key={r.id} value={r.full_name}>
                          {r.full_name} {r.private ? '(Private)' : '(Public)'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2.5 bg-black/40 border border-[#38383b] rounded-xl text-[11px] text-[#8d8d91] font-mono">
                      {activeRepo ? `${activeRepo.owner}/${activeRepo.repo}` : 'Loading repositories...'}
                    </div>
                  )}
                </div>

                {/* Branch Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#8d8d91] block flex items-center justify-between">
                    <span>Target Branch:</span>
                    {isLoadingBranches && <span className="text-[10px] text-[#8d8d91]">Loading branches...</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    <GitBranch size={14} className="text-[#3f86ff] shrink-0" />
                    {branchesList.length > 0 ? (
                      <select
                        value={activeRepo?.branch || 'main'}
                        onChange={(e) => handleSelectBranch(e.target.value)}
                        className="flex-1 bg-[#1a1a1c] border border-[#38383b] hover:border-[#3f86ff] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer font-mono"
                      >
                        {branchesList.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={activeRepo?.branch || 'main'}
                        onChange={(e) => handleSelectBranch(e.target.value)}
                        className="flex-1 bg-[#1a1a1c] border border-[#38383b] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. GitHub Coding Mode Switch & Clear ON/OFF state */}
            <div className="bg-gradient-to-b from-[#202022] via-[#202022] to-[#2b0709] border border-[#38383b] rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-bold text-[#3f86ff] uppercase tracking-widest block">
                3. GITHUB CODING MODE (CONTROL & PERMISSION)
              </span>

              {/* The Toggle Box */}
              <div className={`p-4 rounded-xl border transition-all ${
                codingMode 
                  ? 'bg-emerald-950/30 border-emerald-700/60 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                  : 'bg-black/40 border-[#38383b]'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">GitHub Coding Mode</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        codingMode 
                          ? 'bg-emerald-950 border-emerald-600 text-emerald-400' 
                          : 'bg-[#252527] border-[#38383b] text-[#8d8d91]'
                      }`}>
                        {codingMode ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <p className={`text-xs ${codingMode ? 'text-emerald-300' : 'text-[#8d8d91]'}`}>
                      {codingMode
                        ? 'VOID can now make changes to your connected repository.'
                        : 'VOID will not write to your repository.'}
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggleCodingMode(!codingMode)}
                    className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      codingMode ? 'bg-emerald-500' : 'bg-[#38383b]'
                    }`}
                    role="switch"
                    aria-checked={codingMode}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        codingMode ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Safety Rules Explanation */}
              <div className="p-3 bg-black/40 rounded-xl border border-[#38383b]/60 space-y-1.5 text-[11px] text-[#8d8d91] leading-relaxed">
                <div className="font-bold text-slate-300">Safety & Execution Rules:</div>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>When OFF:</strong> VOID acts as normal AI, provides code explanations, but never writes to your repository or creates commits.</li>
                  <li><strong>When ON:</strong> VOID inspects the project structure, plans the smallest necessary change, and modifies code via the GitHub integration.</li>
                  <li><strong>Turning OFF:</strong> Immediately revokes repository write permissions.</li>
                </ul>
              </div>
            </div>

            {/* 4. Separate Capabilities Breakdown */}
            <div className="bg-gradient-to-b from-[#202022] via-[#202022] to-[#2b0709] border border-[#38383b] rounded-2xl p-4 space-y-2.5">
              <span className="text-[10px] font-bold text-[#3f86ff] uppercase tracking-widest block">
                4. SYSTEM CAPABILITY MATRIX
              </span>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-[#38383b]/40">
                  <span className="text-[#8d8d91]">GitHub Integration:</span>
                  <span className={`font-mono text-[11px] font-bold ${capabilities.github === 'connected' ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {capabilities.github.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-[#38383b]/40">
                  <span className="text-[#8d8d91]">GitHub Repository Coding:</span>
                  <span className={`font-mono text-[11px] font-bold ${capabilities.githubCoding === 'enabled' ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {capabilities.githubCoding.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-[#38383b]/40">
                  <span className="text-[#8d8d91]">Terminal Execution:</span>
                  <span className="font-mono text-[11px] font-bold text-amber-400">
                    UNAVAILABLE
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-[#8d8d91] italic pt-1">
                Notice: Terminal execution isn't available yet, so VOID can modify the repository directly but can't execute local terminal commands.
              </p>
            </div>

            {/* Workspace Link */}
            {onOpenGitHubWorkspace && (
              <button
                onClick={() => {
                  onClose();
                  onOpenGitHubWorkspace();
                }}
                className="w-full py-3 bg-[#202022] hover:bg-[#252527] border border-[#38383b] text-white rounded-2xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Folder size={14} className="text-[#3f86ff]" />
                <span>Open Full GitHub Repository Explorer & Direct Commit Workspace</span>
              </button>
            )}
          </div>
        ) : currentView === 'project-memory' ? (
          /* ============================================================== */
          /* SUBVIEW: SETTINGS → INTEGRATIONS → PROJECT MEMORY               */
          /* ============================================================== */
          <div className="space-y-4">
            {/* Breadcrumb path */}
            <div className="flex items-center gap-1.5 text-[11px] text-[#8d8d91] font-mono">
              <span className="cursor-pointer hover:text-white" onClick={() => setCurrentView('main')}>Settings</span>
              <span>/</span>
              <span>Integrations</span>
              <span>/</span>
              <span className="text-[#3f86ff] font-semibold">Project Memory</span>
            </div>

            {/* Notification Banner */}
            {memoryNotice && (
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                memoryNotice.type === 'success' 
                  ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200' 
                  : 'bg-red-950/50 border-red-700/60 text-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {memoryNotice.type === 'success' ? <Check size={14} className="text-emerald-400 shrink-0" /> : <AlertCircle size={14} className="text-red-400 shrink-0" />}
                  <span>{memoryNotice.text}</span>
                </div>
                <button onClick={() => setMemoryNotice(null)} className="opacity-70 hover:opacity-100">✕</button>
              </div>
            )}

            {/* Project Target Selector & Actions */}
            <div className="bg-gradient-to-b from-[#202022] via-[#202022] to-[#2b0709] border border-[#38383b] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#3f86ff] uppercase tracking-widest block">
                  ACTIVE PROJECT MEMORY CONTEXT
                </span>
                <button
                  onClick={() => loadProjectMemory(memoryProjectId)}
                  disabled={isLoadingMemory}
                  className="px-2.5 py-1 rounded-lg bg-[#252528] hover:bg-[#323236] text-[#8d8d91] hover:text-white text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors border border-[#38383b]"
                >
                  <RefreshCw size={10} className={isLoadingMemory ? 'animate-spin' : ''} />
                  <span>Reload</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={memoryProjectId}
                  onChange={(e) => setMemoryProjectId(e.target.value)}
                  placeholder="Project ID (e.g. owner/repo or workspace-default)"
                  className="flex-1 bg-black/50 border border-[#38383b] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#3f86ff]"
                />
                <button
                  onClick={() => loadProjectMemory(memoryProjectId)}
                  className="px-3.5 py-2 rounded-xl bg-[#3f86ff] hover:bg-[#3270d8] text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  Fetch Memory
                </button>
              </div>

              <p className="text-[11px] text-[#8d8d91]">
                VOID AI loads this persistent memory context before starting major tasks. Memories persist in hosted Firestore across sessions.
              </p>
            </div>

            {/* Editable Memory Specs */}
            {isLoadingMemory ? (
              <div className="p-8 text-center text-[#8d8d91] font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin text-[#3f86ff]" />
                <span>Loading persistent project memory from Firestore...</span>
              </div>
            ) : projectMemory ? (
              <div className="space-y-4">
                {/* 1. Core Stack */}
                <div className="bg-[#1a1a1c] border border-[#38383b] rounded-2xl p-4 space-y-3">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider block">
                    Core Stack & Entry Points
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] text-[#8d8d91] block mb-1">Framework</label>
                      <input
                        type="text"
                        value={projectMemory.framework || ''}
                        onChange={(e) => setProjectMemory({ ...projectMemory, framework: e.target.value })}
                        className="w-full bg-black/50 border border-[#38383b] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none focus:border-[#3f86ff]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8d8d91] block mb-1">Language</label>
                      <input
                        type="text"
                        value={projectMemory.language || ''}
                        onChange={(e) => setProjectMemory({ ...projectMemory, language: e.target.value })}
                        className="w-full bg-black/50 border border-[#38383b] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none focus:border-[#3f86ff]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8d8d91] block mb-1">Package Manager</label>
                      <input
                        type="text"
                        value={projectMemory.packageManager || ''}
                        onChange={(e) => setProjectMemory({ ...projectMemory, packageManager: e.target.value })}
                        className="w-full bg-black/50 border border-[#38383b] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none focus:border-[#3f86ff]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8d8d91] block mb-1">Auth Architecture</label>
                      <input
                        type="text"
                        value={projectMemory.authArchitecture || ''}
                        onChange={(e) => setProjectMemory({ ...projectMemory, authArchitecture: e.target.value })}
                        className="w-full bg-black/50 border border-[#38383b] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none focus:border-[#3f86ff]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8d8d91] block mb-1">Entry Points (comma separated)</label>
                    <input
                      type="text"
                      value={Array.isArray(projectMemory.entryPoints) ? projectMemory.entryPoints.join(', ') : (projectMemory.entryPoints || '')}
                      onChange={(e) => setProjectMemory({ ...projectMemory, entryPoints: e.target.value.split(',').map((s: string) => s.trim()) })}
                      className="w-full bg-black/50 border border-[#38383b] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none focus:border-[#3f86ff]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8d8d91] block mb-1">Important Directories (comma separated)</label>
                    <input
                      type="text"
                      value={Array.isArray(projectMemory.importantDirectories) ? projectMemory.importantDirectories.join(', ') : (projectMemory.importantDirectories || '')}
                      onChange={(e) => setProjectMemory({ ...projectMemory, importantDirectories: e.target.value.split(',').map((s: string) => s.trim()) })}
                      className="w-full bg-black/50 border border-[#38383b] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none focus:border-[#3f86ff]"
                    />
                  </div>
                </div>

                {/* 2. Coding Conventions & Decisions */}
                <div className="bg-[#1a1a1c] border border-[#38383b] rounded-2xl p-4 space-y-3">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider block">
                    Conventions & Decisions
                  </span>

                  <div>
                    <label className="text-[10px] text-[#8d8d91] block mb-1">Coding Conventions</label>
                    <textarea
                      rows={2}
                      value={projectMemory.codingConventions || ''}
                      onChange={(e) => setProjectMemory({ ...projectMemory, codingConventions: e.target.value })}
                      placeholder="e.g. TypeScript strict, Tailwind v4 utility classes, functional components..."
                      className="w-full bg-black/50 border border-[#38383b] rounded-lg p-2.5 text-white font-mono text-xs outline-none focus:border-[#3f86ff] resize-y"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8d8d91] block mb-1">User-Approved Project Instructions</label>
                    <textarea
                      rows={3}
                      value={projectMemory.userApprovedInstructions || ''}
                      onChange={(e) => setProjectMemory({ ...projectMemory, userApprovedInstructions: e.target.value })}
                      placeholder="Custom guidelines VOID must always respect for this project..."
                      className="w-full bg-black/50 border border-[#38383b] rounded-lg p-2.5 text-white font-mono text-xs outline-none focus:border-[#3f86ff] resize-y"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handleClearMemory}
                    disabled={isSavingMemory}
                    className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-950/70 border border-red-800/40 text-red-300 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Clear Project Memory</span>
                  </button>

                  <button
                    onClick={handleSaveMemory}
                    disabled={isSavingMemory}
                    className="px-5 py-2.5 rounded-xl bg-[#3f86ff] hover:bg-[#3270d8] text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    {isSavingMemory ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Saving to Firestore...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save Memory</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-[#8d8d91] font-mono text-xs bg-[#1a1a1c] border border-[#38383b] rounded-2xl space-y-2">
                <p>Click "Fetch Memory" above to inspect and edit persistent project memory for {memoryProjectId}.</p>
                <button
                  onClick={() => loadProjectMemory(memoryProjectId)}
                  className="px-4 py-2 bg-[#3f86ff] text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  Load Initial Baseline
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* MAIN SETTINGS VIEW                                             */
          /* ============================================================== */
          <>
            {/* 1. PROFILE SECTION */}
            <div className="bg-gradient-to-b from-[#202022] via-[#202022] to-[#2b0709] border border-[#38383b]/70 rounded-2xl p-3.5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#3f86ff]/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#3f86ff] uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3f86ff] animate-pulse" />
                  USER PROFILE
                </span>
                <button 
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="text-[10px] text-[#8d8d91] hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 size={11} />
                  <span>{isEditingProfile ? 'Cancel' : 'Edit'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#202022] via-[#2b0709] to-[#202022] border border-[#3f86ff] flex items-center justify-center text-[#8d8d91] font-bold text-base shrink-0">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  {isEditingProfile ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="bg-[#2b0709] border border-[#38383b] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#3f86ff] font-sans"
                      />
                      <button 
                        onClick={() => setIsEditingProfile(false)}
                        className="px-2 py-1 bg-[#3f86ff] hover:opacity-90 text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <h2 className="text-sm font-bold text-white tracking-tight truncate flex items-center gap-2">
                      <span>{displayName}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#252527] text-[#8d8d91] border border-[#38383b] uppercase">OPERATOR</span>
                    </h2>
                  )}
                  <p className="text-[11px] text-[#8d8d91] truncate mt-0.5">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* 2. VOID AI PREFERENCES */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#3f86ff] px-1 block uppercase tracking-widest">
                VOID AI PREFERENCES
              </span>
              <div className="bg-gradient-to-b from-[#202022] via-[#202022] to-[#2b0709] border border-[#38383b] rounded-2xl overflow-hidden divide-y divide-[#38383b]">
                <div 
                  onClick={() => alert('Personalization set to: GOD MODE System Rules Active.')}
                  className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Sliders size={16} className="text-[#3f86ff] shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Personalization & System Prompt</span>
                      <span className="text-[10px] text-[#8d8d91]">Persona set to DEMONIC GOD MODE Engine</span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-[#8d8d91]" />
                </div>

                <div 
                  onClick={() => {
                    if (onClearHistory) onClearHistory();
                  }}
                  className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Database size={16} className="text-[#8d8d91] shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Memory & Chat History Logs</span>
                      <span className="text-[10px] text-[#8d8d91]">Manage saved session memory</span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-[#8d8d91]" />
                </div>
              </div>
            </div>

            {/* 3. ACCOUNT & BILLING */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#3f86ff] px-1 block uppercase tracking-widest">
                ACCOUNT & BILLING
              </span>
              <div className="bg-gradient-to-b from-[#202022] via-[#202022] to-[#2b0709] border border-[#38383b] rounded-2xl overflow-hidden divide-y divide-[#38383b]">
                {/* Wallet Balance Card */}
                <div 
                  onClick={() => {
                    if (onOpenSubscription) { onClose(); onOpenSubscription(); }
                  }}
                  className="p-3 flex items-center justify-between hover:bg-[#252527]/40 transition-colors cursor-pointer bg-[#252527]/20"
                >
                  <div className="flex items-center gap-2.5">
                    <Wallet size={16} className="text-[#8d8d91] shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-[#8d8d91] block">Wallet Balance</span>
                      <span className="text-[11px] font-black text-white">₦{walletBalance.toLocaleString()}</span>
                    </div>
                  </div>
                  <button className="px-2.5 py-1 bg-[#3f86ff] hover:bg-[#3f86ff] text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer uppercase tracking-wider">
                    Fund Wallet
                  </button>
                </div>

                {/* Subscription Upgrade */}
                <div 
                  onClick={() => {
                    if (onOpenSubscription) { onClose(); onOpenSubscription(); }
                  }}
                  className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Crown size={16} className="text-amber-500 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Subscription & Tier Limits</span>
                      <span className="text-[10px] text-[#8d8d91]">View Free, Pro, & VIP Plans</span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-[#8d8d91]" />
                </div>
              </div>
            </div>

            {/* 4. TOOLS & INTEGRATIONS (AI Engine, GitHub, Coding Agent, Live Terminal) */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#3f86ff] px-1 block uppercase tracking-widest">
                TOOLS, AGENTS & INTEGRATIONS
              </span>
              <div className="bg-gradient-to-b from-[#202022] via-[#202022] to-[#2b0709] border border-[#38383b] rounded-2xl overflow-hidden divide-y divide-[#38383b]">
                {/* AI Engine & Model Provider (Moved from header to Settings) */}
                <div className="p-3 bg-[#1d1d20]/80">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-[#252527] border border-[#38383b] flex items-center justify-center text-[#3f86ff] shrink-0">
                        <Cpu size={13} />
                      </div>
                      <span className="text-xs font-semibold text-white block">AI Inference Engine & Model</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#252527] border border-[#38383b] text-[#3f86ff]">
                      {selectedProvider.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    <div>
                      <label className="text-[10px] text-[#8d8d91] block mb-1">Provider Engine</label>
                      <select
                        value={selectedProvider}
                        onChange={(e) => {
                          const newProv = e.target.value as 'groq' | 'cohere' | 'bazaarlink';
                          if (onSelectProviderModel) {
                            onSelectProviderModel(newProv, 'auto');
                          }
                        }}
                        className="w-full bg-[#161618] border border-[#38383b] hover:border-[#454547] text-white text-xs py-1.5 px-2.5 rounded-xl focus:outline-none cursor-pointer"
                      >
                        <option value="groq">Groq AI (Ultra Low-Latency LPU)</option>
                        <option value="cohere">Cohere AI (Enterprise Command R+)</option>
                        <option value="bazaarlink">BazaarLink AI (Distributed DeepSeek/Llama)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#8d8d91] block mb-1">Specific Model</label>
                      <select
                        value={`${selectedProvider}:${selectedModel}`}
                        onChange={(e) => {
                          const [prov, mod] = e.target.value.split(':');
                          if (onSelectProviderModel) {
                            onSelectProviderModel(prov as any, mod || 'auto');
                          }
                        }}
                        className="w-full bg-[#161618] border border-[#38383b] hover:border-[#454547] text-white text-xs py-1.5 px-2.5 rounded-xl focus:outline-none cursor-pointer"
                      >
                        <option value="groq:auto">Groq: Auto (Optimized Fast Llama 3.3)</option>
                        <option value="groq:llama-3.3-70b-versatile">Groq: Llama 3.3 70B Versatile</option>
                        <option value="groq:llama-3.1-8b-instant">Groq: Llama 3.1 8B Instant</option>
                        <option value="groq:mixtral-8x7b-32768">Groq: Mixtral 8x7B (32k Context)</option>
                        <option value="groq:deepseek-r1-distill-llama-70b">Groq: DeepSeek R1 70B Reasoning</option>
                        <option value="cohere:auto">Cohere: Auto</option>
                        <option value="cohere:command-r-plus-08-2024">Cohere: Command R+ (Flagship)</option>
                        <option value="cohere:command-r-08-2024">Cohere: Command R</option>
                        <option value="bazaarlink:auto">BazaarLink: Auto</option>
                        <option value="bazaarlink:bazaarlink-fast">BazaarLink: Fast AI</option>
                        <option value="bazaarlink:bazaarlink-pro">BazaarLink: Pro AI</option>
                        <option value="bazaarlink:deepseek-r1">BazaarLink: DeepSeek R1 Full</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* GitHub Integration Item */}
                <div 
                  onClick={() => setCurrentView('integrations-github')}
                  className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-black border border-[#38383b] flex items-center justify-center text-white shrink-0">
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white block">GitHub Integration</span>
                        {gitHubUser ? (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full border font-bold ${
                            codingMode ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-400' : 'bg-[#252527] border-[#38383b] text-[#8d8d91]'
                          }`}>
                            {codingMode ? 'Coding ON' : 'Coding OFF'}
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#252527] border border-[#38383b] text-[#8d8d91]">
                            Not Connected
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#8d8d91]">
                        {activeRepo ? `${activeRepo.owner}/${activeRepo.repo} (${activeRepo.branch})` : 'Connect repositories & code directly'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-[#8d8d91]" />
                </div>

                {/* Coding Agent Toggle (Right next to GitHub Integration) */}
                <div className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs shrink-0 transition-colors ${
                      codingMode ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-400' : 'bg-[#252527] border-[#38383b] text-[#8d8d91]'
                    }`}>
                      <Zap size={13} className={codingMode ? 'fill-emerald-400' : ''} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white block">Coding Agent</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full border font-bold ${
                          codingMode 
                            ? 'bg-emerald-950/90 border-emerald-600 text-emerald-400' 
                            : 'bg-[#252527] border-[#38383b] text-[#8d8d91]'
                        }`}>
                          {codingMode ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#8d8d91]">
                        {codingMode 
                          ? 'Autonomous terminal commands, file diffs, test builds & GitHub changes' 
                          : 'Conversation only; autonomous code execution & file writing disabled'}
                      </span>
                    </div>
                  </div>

                  {/* Functional Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCodingMode(!codingMode);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      codingMode ? 'bg-emerald-500' : 'bg-[#38383b]'
                    }`}
                    role="switch"
                    aria-checked={codingMode}
                    title={codingMode ? 'Turn off Coding Agent' : 'Turn on Coding Agent'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        codingMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Project Memory */}
                <div 
                  onClick={() => {
                    setCurrentView('project-memory');
                    loadProjectMemory(memoryProjectId);
                  }}
                  className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Database size={16} className="text-[#3f86ff] shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">Project Memory</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-bold text-[9px]">
                          ACTIVE
                        </span>
                      </div>
                      <span className="text-[10px] text-[#8d8d91] block truncate max-w-[280px]">
                        Persistent architecture, conventions & custom guidelines
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-[#8d8d91]" />
                </div>

                {/* Email Campaign Generator */}
                {onOpenCampaignGenerator && (
                  <div 
                    onClick={() => { onClose(); onOpenCampaignGenerator(); }}
                    className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Mail size={16} className="text-[#8d8d91] shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-white block">Email Campaign Generator</span>
                        <span className="text-[10px] text-[#8d8d91]">Craft AI marketing emails & newsletters</span>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-[#8d8d91]" />
                  </div>
                )}

                {/* Live Voice Mode */}
                {onOpenLiveVoice && (
                  <div 
                    onClick={() => { onClose(); onOpenLiveVoice(); }}
                    className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <AudioLines size={16} className="text-[#8d8d91] shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-white block">Live Voice Mode</span>
                        <span className="text-[10px] text-[#8d8d91]">Real-time conversational voice assistant</span>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-[#8d8d91]" />
                  </div>
                )}

                {/* Telegram Bot Integration */}
                {onOpenTelegram && (
                  <div 
                    onClick={() => { onClose(); onOpenTelegram(); }}
                    className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Bot size={16} className="text-[#8d8d91] shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-white block">Telegram Bot Integration</span>
                        <span className="text-[10px] text-[#8d8d91]">Connect VOID AI directly to Telegram</span>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-[#8d8d91]" />
                  </div>
                )}

                {/* API Keys & Developer */}
                {onOpenApiKeys && (
                  <div 
                    onClick={() => { onClose(); onOpenApiKeys(); }}
                    className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Key size={16} className="text-[#8d8d91] shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-white block">Developer API Keys</span>
                        <span className="text-[10px] text-[#8d8d91]">Generate nvn_live_ keys for app integration</span>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-[#8d8d91]" />
                  </div>
                )}
              </div>
            </div>

            {/* 5. SUPPORT CENTER */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#3f86ff] px-1 block uppercase tracking-widest">
                SUPPORT & HELP
              </span>
              <div className="bg-gradient-to-b from-[#202022] via-[#202022] to-[#2b0709] border border-[#38383b] rounded-2xl overflow-hidden divide-y divide-[#38383b]">
                {onOpenSupport && (
                  <div 
                    onClick={() => { onClose(); onOpenSupport(); }}
                    className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare size={16} className="text-[#8d8d91] shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-white block">Support Desk & Live Chat</span>
                        <span className="text-[10px] text-[#8d8d91]">Get help from support team</span>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-[#8d8d91]" />
                  </div>
                )}

                <a 
                  href="https://t.me/nova_tech_1" 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer block"
                >
                  <div className="flex items-center gap-2.5">
                    <Send size={16} className="text-[#8d8d91] shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Contact Admin Telegram</span>
                      <span className="text-[10px] text-[#8d8d91]">Direct assistance @nova_tech_1</span>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-[#8d8d91]" />
                </a>
              </div>
            </div>

            {/* 6. ADMIN CONTROL PANEL (Only if Admin) */}
            {isAdmin && onOpenAdmin && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#3f86ff] px-1 block uppercase tracking-widest">
                  ADMINISTRATION
                </span>
                <div className="bg-gradient-to-b from-[#202022]/50 via-[#2b0709] to-[#202022] border border-[#38383b] rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                  <div 
                    onClick={() => { onClose(); onOpenAdmin(); }}
                    className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer bg-[#252527]"
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield size={16} className="text-[#8d8d91] shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-[#8d8d91] block">Admin Control Panel</span>
                        <span className="text-[10px] text-[#8d8d91]">Manage users, broadcasts, wallets & keys</span>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-[#8d8d91]" />
                  </div>
                </div>
              </div>
            )}

            {/* 7. DANGER ZONE */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#3f86ff] px-1 block uppercase tracking-widest">
                DANGER ZONE
              </span>
              <div className="bg-gradient-to-b from-[#202022]/60 via-[#2b0709] to-[#202022] border border-[#38383b]/90 rounded-2xl overflow-hidden divide-y divide-[#38383b]/80 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                {onClearHistory && (
                  <div 
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all history and memory logs?')) {
                        onClearHistory();
                        onClose();
                      }
                    }}
                    className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Trash2 size={16} className="text-[#3f86ff] shrink-0" />
                      <span className="text-xs font-semibold text-[#8d8d91]">Clear All Chat Logs</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={onLogout || onClose}
                  className="w-full p-3 flex items-center gap-2.5 text-[#8d8d91] font-bold text-xs hover:bg-[#252527] transition-colors cursor-pointer text-left"
                >
                  <LogOut size={16} className="text-[#3f86ff] shrink-0" />
                  <span>Log out of Account</span>
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
