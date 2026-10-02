import React, { useState, useEffect } from 'react';
import { 
  X, Check, AlertCircle, RefreshCw, GitBranch, Folder, File, ExternalLink, 
  Plus, Upload, ShieldCheck, Key, LogOut, Code, Eye, Search, GitCommit, Copy, Sparkles
} from 'lucide-react';
import { 
  getStoredGitHubToken, getStoredGitHubUser, setStoredGitHubAuth, clearStoredGitHubAuth,
  getStoredActiveRepo, setStoredActiveRepo, fetchOAuthUrl, verifyToken,
  fetchUserRepos, fetchRepoBranches, fetchRepoTree, fetchRepoFile, commitFile,
  createNewRepo, GitHubUser, GitHubRepo, GitHubFileItem, ActiveRepoState
} from '../utils/github';
import { clsx } from 'clsx';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFileForChat?: (repo: string, filePath: string, content: string) => void;
  onRepoChanged?: (activeRepo: ActiveRepoState | null) => void;
}

export function GitHubModal({ isOpen, onClose, onSelectFileForChat, onRepoChanged }: GitHubModalProps) {
  const [activeTab, setActiveTab] = useState<'connect' | 'repos' | 'commit' | 'create'>('connect');
  
  // Auth state
  const [token, setToken] = useState<string>(() => getStoredGitHubToken() || '');
  const [user, setUser] = useState<GitHubUser | null>(() => getStoredGitHubUser());
  const [patInput, setPatInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // OAuth info
  const [oauthConfig, setOauthConfig] = useState<{ url: string; redirectUri: string; configured: boolean; clientIdMasked?: string } | null>(null);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);

  // Repos & Tree state
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [activeRepo, setActiveRepo] = useState<ActiveRepoState | null>(() => getStoredActiveRepo());
  const [branches, setBranches] = useState<string[]>([]);
  const [fileTree, setFileTree] = useState<GitHubFileItem[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Direct Commit state
  const [commitPath, setCommitPath] = useState('');
  const [commitMessage, setCommitMessage] = useState('feat: update via VOID AI');
  const [commitContent, setCommitContent] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [lastCommitUrl, setLastCommitUrl] = useState<string | null>(null);

  // Create Repo state
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);

  // Fetch OAuth URL config on mount
  useEffect(() => {
    fetchOAuthUrl()
      .then(cfg => setOauthConfig(cfg))
      .catch(() => {});
  }, []);

  // Listen for popup OAuth postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.provider === 'github') {
        const { token: receivedToken, user: receivedUser } = event.data;
        if (receivedToken) {
          setStoredGitHubAuth(receivedToken, receivedUser);
          setToken(receivedToken);
          setUser(receivedUser);
          setIsConnectingOAuth(false);
          setSuccessMsg(`Connected successfully as @${receivedUser.login || 'GitHub User'}!`);
          setActiveTab('repos');
          setTimeout(() => setSuccessMsg(''), 4000);
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setIsConnectingOAuth(false);
        setErrorMsg(`OAuth connection failed: ${event.data.error || 'User cancelled'}`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Load repos when user is authenticated
  useEffect(() => {
    if (token && (activeTab === 'repos' || activeTab === 'commit')) {
      loadRepos();
    }
  }, [token, activeTab]);

  // Load branches & tree when active repo changes
  useEffect(() => {
    if (token && activeRepo) {
      loadBranchesAndTree(activeRepo.owner, activeRepo.repo, activeRepo.branch);
    }
  }, [activeRepo?.owner, activeRepo?.repo, activeRepo?.branch]);

  const loadRepos = async () => {
    if (!token) return;
    setIsLoadingRepos(true);
    setErrorMsg('');
    try {
      const list = await fetchUserRepos(token);
      setRepos(list);
      if (list.length > 0 && !activeRepo) {
        const initial: ActiveRepoState = {
          owner: list[0].full_name.split('/')[0],
          repo: list[0].name,
          branch: list[0].default_branch || 'main',
        };
        setActiveRepo(initial);
        setStoredActiveRepo(initial);
        if (onRepoChanged) onRepoChanged(initial);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch repositories.');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const loadBranchesAndTree = async (owner: string, repo: string, branch: string) => {
    setIsLoadingTree(true);
    try {
      const branchList = await fetchRepoBranches(token, owner, repo);
      setBranches(branchList);

      const treeResult = await fetchRepoTree(token, owner, repo, branch);
      setFileTree(treeResult.tree || []);
    } catch (err: any) {
      console.warn('Failed to load branches or tree:', err);
    } finally {
      setIsLoadingTree(false);
    }
  };

  const handleSelectRepo = (r: GitHubRepo) => {
    const [owner, name] = r.full_name.split('/');
    const newState: ActiveRepoState = {
      owner,
      repo: name,
      branch: r.default_branch || 'main',
    };
    setActiveRepo(newState);
    setStoredActiveRepo(newState);
    setSelectedFile(null);
    setFileContent('');
    if (onRepoChanged) onRepoChanged(newState);
  };

  const handleBranchChange = (newBranch: string) => {
    if (!activeRepo) return;
    const newState: ActiveRepoState = {
      ...activeRepo,
      branch: newBranch,
    };
    setActiveRepo(newState);
    setStoredActiveRepo(newState);
    setSelectedFile(null);
    setFileContent('');
    if (onRepoChanged) onRepoChanged(newState);
  };

  const handleFileClick = async (filePath: string) => {
    if (!token || !activeRepo) return;
    setSelectedFile(filePath);
    setIsLoadingFile(true);
    setErrorMsg('');
    try {
      const fileData = await fetchRepoFile(token, activeRepo.owner, activeRepo.repo, filePath, activeRepo.branch);
      setFileContent(fileData.content);
      // Pre-fill direct commit tab
      setCommitPath(filePath);
      setCommitContent(fileData.content);
    } catch (err: any) {
      setErrorMsg(`Could not read file ${filePath}: ${err.message}`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleConnectWithOAuth = () => {
    setErrorMsg('');
    if (!oauthConfig?.url) {
      setErrorMsg('GitHub OAuth is not configured with CLIENT_ID. Please enter a Personal Access Token below instead.');
      return;
    }
    setIsConnectingOAuth(true);
    const popup = window.open(
      oauthConfig.url,
      'github_oauth_popup',
      'width=600,height=750,menubar=no,toolbar=no'
    );
    if (!popup) {
      setIsConnectingOAuth(false);
      setErrorMsg('Popup was blocked by your browser. Please allow popups or use Personal Access Token below.');
    }
  };

  const handleConnectWithPAT = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!patInput.trim()) {
      setErrorMsg('Please enter a GitHub Personal Access Token.');
      return;
    }

    setIsVerifying(true);
    try {
      const check = await verifyToken(patInput.trim());
      if (check.valid && check.user) {
        setStoredGitHubAuth(patInput.trim(), check.user);
        setToken(patInput.trim());
        setUser(check.user);
        setPatInput('');
        setSuccessMsg(`Connected successfully as @${check.user.login}!`);
        setActiveTab('repos');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(check.error || 'Invalid GitHub token. Please verify token has `repo` permissions.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Token verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnect = () => {
    clearStoredGitHubAuth();
    setToken('');
    setUser(null);
    setActiveRepo(null);
    setRepos([]);
    setFileTree([]);
    setSelectedFile(null);
    setFileContent('');
    setSuccessMsg('Disconnected GitHub account.');
    if (onRepoChanged) onRepoChanged(null);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDirectCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeRepo) {
      setErrorMsg('Please connect GitHub and select a repository first.');
      return;
    }
    if (!commitPath.trim() || commitContent === undefined) {
      setErrorMsg('File path and content are required.');
      return;
    }

    setIsCommitting(true);
    setErrorMsg('');
    setLastCommitUrl(null);
    try {
      const result = await commitFile(
        token,
        activeRepo.owner,
        activeRepo.repo,
        commitPath.trim(),
        commitContent,
        commitMessage.trim() || `Update ${commitPath} via VOID AI`,
        activeRepo.branch
      );
      setSuccessMsg(`Successfully committed ${commitPath.trim()} to GitHub!`);
      setLastCommitUrl(result.htmlUrl);
      loadBranchesAndTree(activeRepo.owner, activeRepo.repo, activeRepo.branch);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to commit file to GitHub.');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!newRepoName.trim()) {
      setErrorMsg('Repository name is required.');
      return;
    }

    setIsCreatingRepo(true);
    setErrorMsg('');
    try {
      const result = await createNewRepo(token, newRepoName.trim(), newRepoDesc.trim(), newRepoPrivate);
      setSuccessMsg(`Repository ${result.repo.full_name} created successfully!`);
      setNewRepoName('');
      setNewRepoDesc('');
      loadRepos();
      setActiveTab('repos');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create repository on GitHub.');
    } finally {
      setIsCreatingRepo(false);
    }
  };

  const handleSendFileToChat = () => {
    if (!selectedFile || !fileContent || !activeRepo) return;
    if (onSelectFileForChat) {
      onSelectFileForChat(`${activeRepo.owner}/${activeRepo.repo}`, selectedFile, fileContent);
      onClose();
    }
  };

  if (!isOpen) return null;

  const filteredRepos = repos.filter(r => 
    r.full_name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(repoSearch.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#1a1a1c] border border-[#38383b] rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-fadeIn text-white text-xs">
        
        {/* Top Header */}
        <div className="p-4 border-b border-[#38383b] flex items-center justify-between bg-[#202022]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black border border-[#38383b] flex items-center justify-center text-white">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">GitHub Workspace</h2>
                {user ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[10px] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    @{user.login}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/40 text-[10px] font-medium">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8d8d91]">
                AI-powered direct code editing, repository browsing, and automated commits
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8d8d91] hover:text-white hover:bg-[#252527] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#38383b] bg-[#1a1a1c] px-4 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('connect')}
            className={clsx(
              "py-2.5 px-3 border-b-2 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0",
              activeTab === 'connect' 
                ? "border-[#3f86ff] text-white" 
                : "border-transparent text-[#8d8d91] hover:text-white"
            )}
          >
            <Key size={14} />
            <span>Connection & Auth</span>
          </button>

          <button
            onClick={() => setActiveTab('repos')}
            className={clsx(
              "py-2.5 px-3 border-b-2 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0",
              activeTab === 'repos' 
                ? "border-[#3f86ff] text-white" 
                : "border-transparent text-[#8d8d91] hover:text-white"
            )}
          >
            <Folder size={14} />
            <span>Repositories & Explorer</span>
            {repos.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#252527] text-[10px] text-[#8d8d91]">
                {repos.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('commit')}
            className={clsx(
              "py-2.5 px-3 border-b-2 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0",
              activeTab === 'commit' 
                ? "border-[#3f86ff] text-white" 
                : "border-transparent text-[#8d8d91] hover:text-white"
            )}
          >
            <GitCommit size={14} />
            <span>Direct File Commit</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={clsx(
              "py-2.5 px-3 border-b-2 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0",
              activeTab === 'create' 
                ? "border-[#3f86ff] text-white" 
                : "border-transparent text-[#8d8d91] hover:text-white"
            )}
          >
            <Plus size={14} />
            <span>Create New Repo</span>
          </button>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-red-950/40 border border-red-800/50 rounded-xl flex items-start gap-2 text-red-300 text-xs">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1">{errorMsg}</div>
            <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-200">
              <X size={14} />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mx-4 mt-3 p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-start gap-2 text-emerald-300 text-xs">
            <Check size={15} className="shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex-1">
              {successMsg}
              {lastCommitUrl && (
                <a 
                  href={lastCommitUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="ml-2 underline text-emerald-200 inline-flex items-center gap-1"
                >
                  View on GitHub <ExternalLink size={11} />
                </a>
              )}
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-200">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* TAB 1: CONNECTION */}
          {activeTab === 'connect' && (
            <div className="space-y-6 max-w-2xl mx-auto py-2">
              {/* Authenticated User Banner */}
              {user ? (
                <div className="p-4 bg-[#202022] border border-[#38383b] rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.avatar_url} 
                      alt={user.login} 
                      className="w-12 h-12 rounded-xl border border-[#38383b]"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{user.name || user.login}</span>
                        <a 
                          href={user.html_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[#8d8d91] hover:text-white"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      <span className="text-xs text-[#8d8d91]">@{user.login} • {user.public_repos} public repos</span>
                      {user.bio && <p className="text-[11px] text-[#8d8d91] mt-1">{user.bio}</p>}
                    </div>
                  </div>

                  <button
                    onClick={handleDisconnect}
                    className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Disconnect</span>
                  </button>
                </div>
              ) : null}

              {/* Method 1: Instant Personal Access Token */}
              <div className="p-5 bg-[#202022] border border-[#38383b] rounded-2xl space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Key size={15} className="text-[#3f86ff]" />
                      <span>Direct Token Connection (Instant & Recommended)</span>
                    </h3>
                    <p className="text-xs text-[#8d8d91] mt-1">
                      Works instantly with zero domain errors or Firebase issues. Paste any GitHub Personal Access Token (Classic or Fine-grained with <code className="bg-[#252527] px-1 py-0.5 rounded text-amber-300">repo</code> scope).
                    </p>
                  </div>
                </div>

                <form onSubmit={handleConnectWithPAT} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-[#8d8d91] block mb-1">
                      GitHub Personal Access Token (starts with <code className="text-white">ghp_</code> or fine-grained)
                    </label>
                    <input
                      type="password"
                      value={patInput}
                      onChange={(e) => setPatInput(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-[#1a1a1c] border border-[#38383b] focus:border-[#3f86ff] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email&description=VOID+AI+Direct+Coding"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#3f86ff] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Generate token on GitHub with repo permissions</span>
                      <ExternalLink size={11} />
                    </a>

                    <button
                      type="submit"
                      disabled={isVerifying || !patInput.trim()}
                      className="px-4 py-2 bg-[#3f86ff] hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>Verify & Connect</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Method 2: OAuth Flow */}
              <div className="p-5 bg-[#202022] border border-[#38383b] rounded-2xl space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <ShieldCheck size={15} className="text-emerald-400" />
                      <span>One-Click GitHub OAuth</span>
                    </h3>
                    <p className="text-xs text-[#8d8d91] mt-1">
                      Authenticate directly with GitHub in a popup window.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-[#1a1a1c] border border-[#38383b] rounded-xl space-y-2 text-[11px]">
                    <div className="flex items-center justify-between text-[#8d8d91]">
                      <span>OAuth Callback URL:</span>
                      <button
                        onClick={() => {
                          if (oauthConfig?.redirectUri) {
                            navigator.clipboard.writeText(oauthConfig.redirectUri);
                            setSuccessMsg('Copied callback URL to clipboard!');
                            setTimeout(() => setSuccessMsg(''), 2500);
                          }
                        }}
                        className="text-[#3f86ff] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy size={11} /> Copy URL
                      </button>
                    </div>
                    <code className="block bg-black/60 p-2 rounded-lg text-emerald-400 font-mono break-all text-[11px]">
                      {oauthConfig?.redirectUri || 'https://ais-dev-bfcytcosqgphtyr5k6ysit-46029375391.europe-west1.run.app/auth/callback'}
                    </code>
                    <p className="text-[#8d8d91]">
                      Add this callback URL in your GitHub Developer Settings → OAuth Apps if creating an OAuth application.
                    </p>
                  </div>

                  <button
                    onClick={handleConnectWithOAuth}
                    disabled={isConnectingOAuth}
                    className="w-full py-2.5 px-4 bg-[#252527] hover:bg-[#38383b] border border-[#38383b] hover:border-white/40 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isConnectingOAuth ? (
                      <RefreshCw size={14} className="animate-spin text-[#3f86ff]" />
                    ) : (
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                    )}
                    <span>{isConnectingOAuth ? 'Authorizing in popup...' : 'Connect via GitHub OAuth Popup'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REPOSITORIES & EXPLORER */}
          {activeTab === 'repos' && (
            <div className="space-y-4">
              {!token ? (
                <div className="p-8 text-center bg-[#202022] rounded-2xl border border-[#38383b] space-y-3">
                  <Key size={32} className="mx-auto text-[#8d8d91]" />
                  <h3 className="font-bold text-sm text-white">Connect GitHub Account First</h3>
                  <p className="text-xs text-[#8d8d91] max-w-sm mx-auto">
                    Please connect via Personal Access Token or OAuth on the Connection tab to browse and edit repositories.
                  </p>
                  <button
                    onClick={() => setActiveTab('connect')}
                    className="px-4 py-2 bg-[#3f86ff] hover:opacity-90 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    Go to Connection Tab
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Left Column: Repository list */}
                  <div className="md:col-span-4 bg-[#202022] border border-[#38383b] rounded-2xl p-3 flex flex-col h-[520px]">
                    <div className="flex items-center justify-between pb-2 border-b border-[#38383b]">
                      <span className="font-bold text-xs text-white">Your Repositories</span>
                      <button
                        onClick={loadRepos}
                        disabled={isLoadingRepos}
                        className="p-1 text-[#8d8d91] hover:text-white rounded transition-colors"
                        title="Refresh repos"
                      >
                        <RefreshCw size={13} className={clsx(isLoadingRepos && "animate-spin")} />
                      </button>
                    </div>

                    {/* Search */}
                    <div className="my-2 relative">
                      <Search size={13} className="absolute left-2.5 top-2.5 text-[#8d8d91]" />
                      <input
                        type="text"
                        value={repoSearch}
                        onChange={(e) => setRepoSearch(e.target.value)}
                        placeholder="Search repo..."
                        className="w-full bg-[#1a1a1c] border border-[#38383b] rounded-lg pl-8 pr-2 py-1.5 text-xs text-white outline-none"
                      />
                    </div>

                    {/* Repo List */}
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                      {isLoadingRepos ? (
                        <div className="flex items-center justify-center h-32 text-[#8d8d91]">
                          <RefreshCw size={16} className="animate-spin mr-2" /> Loading repos...
                        </div>
                      ) : filteredRepos.length === 0 ? (
                        <div className="text-center py-8 text-[#8d8d91]">No repositories found</div>
                      ) : (
                        filteredRepos.map((r) => {
                          const isSelected = activeRepo?.repo === r.name;
                          return (
                            <button
                              key={r.id}
                              onClick={() => handleSelectRepo(r)}
                              className={clsx(
                                "w-full text-left p-2 rounded-xl transition-all cursor-pointer border flex flex-col gap-0.5",
                                isSelected
                                  ? "bg-[#252527] border-[#3f86ff] shadow-sm"
                                  : "bg-[#1a1a1c] hover:bg-[#252527]/70 border-transparent text-[#8d8d91] hover:text-white"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className={clsx("font-bold text-xs truncate", isSelected ? "text-white" : "text-slate-300")}>
                                  {r.name}
                                </span>
                                {r.private ? (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-800/30">
                                    Private
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                                    Public
                                  </span>
                                )}
                              </div>
                              {r.description && (
                                <p className="text-[10px] text-[#8d8d91] truncate">{r.description}</p>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Column: Active Repo Explorer */}
                  <div className="md:col-span-8 bg-[#202022] border border-[#38383b] rounded-2xl p-4 flex flex-col h-[520px]">
                    {activeRepo ? (
                      <>
                        {/* Active Repo Header & Branch selector */}
                        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#38383b] gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">
                              {activeRepo.owner} / {activeRepo.repo}
                            </span>
                            <a
                              href={`https://github.com/${activeRepo.owner}/${activeRepo.repo}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#8d8d91] hover:text-white"
                            >
                              <ExternalLink size={13} />
                            </a>
                          </div>

                          <div className="flex items-center gap-2">
                            <GitBranch size={13} className="text-[#3f86ff]" />
                            <select
                              value={activeRepo.branch}
                              onChange={(e) => handleBranchChange(e.target.value)}
                              className="bg-[#1a1a1c] border border-[#38383b] rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer"
                            >
                              {branches.map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* File Tree + Viewer */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 overflow-hidden mt-3">
                          {/* File list */}
                          <div className="md:col-span-5 bg-[#1a1a1c] border border-[#38383b] rounded-xl p-2 overflow-y-auto">
                            <div className="text-[10px] font-bold text-[#8d8d91] uppercase px-1 pb-1">
                              Files ({fileTree.filter(f => f.type === 'blob').length})
                            </div>
                            {isLoadingTree ? (
                              <div className="p-4 text-center text-[#8d8d91]">
                                <RefreshCw size={14} className="animate-spin mx-auto mb-1" /> Loading tree...
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                {fileTree
                                  .filter(item => item.type === 'blob')
                                  .map((item) => {
                                    const isSel = selectedFile === item.path;
                                    return (
                                      <button
                                        key={item.path}
                                        onClick={() => handleFileClick(item.path)}
                                        className={clsx(
                                          "w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer truncate",
                                          isSel
                                            ? "bg-[#3f86ff]/20 text-[#3f86ff] font-semibold"
                                            : "hover:bg-[#252527] text-slate-300 hover:text-white"
                                        )}
                                      >
                                        <File size={13} className="shrink-0 text-[#8d8d91]" />
                                        <span className="truncate">{item.path}</span>
                                      </button>
                                    );
                                  })}
                              </div>
                            )}
                          </div>

                          {/* File Viewer */}
                          <div className="md:col-span-7 bg-[#1a1a1c] border border-[#38383b] rounded-xl p-3 flex flex-col overflow-hidden">
                            {selectedFile ? (
                              <>
                                <div className="flex items-center justify-between pb-2 border-b border-[#38383b] mb-2">
                                  <span className="font-mono text-[11px] text-[#3f86ff] truncate">
                                    {selectedFile}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={handleSendFileToChat}
                                      className="px-2 py-1 bg-[#3f86ff] hover:opacity-90 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <Sparkles size={11} />
                                      <span>Ask AI to Edit</span>
                                    </button>
                                  </div>
                                </div>

                                {isLoadingFile ? (
                                  <div className="flex-1 flex items-center justify-center text-[#8d8d91]">
                                    <RefreshCw size={16} className="animate-spin mr-2" /> Reading file...
                                  </div>
                                ) : (
                                  <pre className="flex-1 overflow-auto bg-black/60 p-2.5 rounded-lg font-mono text-[11px] text-slate-200 leading-relaxed select-text">
                                    {fileContent}
                                  </pre>
                                )}
                              </>
                            ) : (
                              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-[#8d8d91]">
                                <Code size={24} className="mb-2 opacity-50" />
                                <span className="font-medium text-xs">Select any file from the list</span>
                                <span className="text-[11px] opacity-75 mt-0.5">
                                  View content or send directly into VOID AI chat for editing
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-[#8d8d91]">
                        <span>Select a repository on the left to explore files</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DIRECT FILE COMMIT */}
          {activeTab === 'commit' && (
            <div className="space-y-4 max-w-2xl mx-auto py-2">
              <div className="p-4 bg-[#202022] border border-[#38383b] rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <GitCommit size={15} className="text-[#3f86ff]" />
                    <span>Direct Commit to GitHub</span>
                  </h3>
                  {activeRepo && (
                    <span className="text-xs text-[#8d8d91]">
                      Target: <strong className="text-white">{activeRepo.owner}/{activeRepo.repo}</strong> ({activeRepo.branch})
                    </span>
                  )}
                </div>

                {!token || !activeRepo ? (
                  <p className="text-xs text-amber-300">
                    Please connect your GitHub account and select a target repository first.
                  </p>
                ) : (
                  <form onSubmit={handleDirectCommit} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-medium text-[#8d8d91] block mb-1">
                        File Path (e.g. <code>src/components/MyComponent.tsx</code> or <code>README.md</code>)
                      </label>
                      <input
                        type="text"
                        required
                        value={commitPath}
                        onChange={(e) => setCommitPath(e.target.value)}
                        placeholder="src/index.ts"
                        className="w-full bg-[#1a1a1c] border border-[#38383b] focus:border-[#3f86ff] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[#8d8d91] block mb-1">
                        Commit Message
                      </label>
                      <input
                        type="text"
                        required
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="feat: add new feature"
                        className="w-full bg-[#1a1a1c] border border-[#38383b] focus:border-[#3f86ff] rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[#8d8d91] block mb-1">
                        File Content
                      </label>
                      <textarea
                        rows={12}
                        required
                        value={commitContent}
                        onChange={(e) => setCommitContent(e.target.value)}
                        placeholder="// Enter or paste code here..."
                        className="w-full bg-[#1a1a1c] border border-[#38383b] focus:border-[#3f86ff] rounded-xl p-3 text-xs text-white outline-none font-mono leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-[#8d8d91]">
                        Commits directly to branch <strong>{activeRepo.branch}</strong>
                      </span>
                      <button
                        type="submit"
                        disabled={isCommitting}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                      >
                        {isCommitting ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Pushing Commit...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={14} />
                            <span>Commit Directly to GitHub</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CREATE NEW REPO */}
          {activeTab === 'create' && (
            <div className="space-y-4 max-w-xl mx-auto py-2">
              <div className="p-5 bg-[#202022] border border-[#38383b] rounded-2xl">
                <h3 className="font-bold text-sm text-white mb-1 flex items-center gap-2">
                  <Plus size={15} className="text-[#3f86ff]" />
                  <span>Create a New GitHub Repository</span>
                </h3>
                <p className="text-xs text-[#8d8d91] mb-4">
                  Create a new repository under your GitHub account for new projects.
                </p>

                {!token ? (
                  <p className="text-xs text-amber-300">
                    Please connect your GitHub account first.
                  </p>
                ) : (
                  <form onSubmit={handleCreateRepo} className="space-y-4">
                    <div>
                      <label className="text-[11px] font-medium text-[#8d8d91] block mb-1">
                        Repository Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newRepoName}
                        onChange={(e) => setNewRepoName(e.target.value)}
                        placeholder="my-awesome-app"
                        className="w-full bg-[#1a1a1c] border border-[#38383b] focus:border-[#3f86ff] rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[#8d8d91] block mb-1">
                        Description (optional)
                      </label>
                      <input
                        type="text"
                        value={newRepoDesc}
                        onChange={(e) => setNewRepoDesc(e.target.value)}
                        placeholder="Built with VOID AI"
                        className="w-full bg-[#1a1a1c] border border-[#38383b] focus:border-[#3f86ff] rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="repoPrivate"
                        checked={newRepoPrivate}
                        onChange={(e) => setNewRepoPrivate(e.target.checked)}
                        className="rounded border-[#38383b] text-[#3f86ff] focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="repoPrivate" className="text-xs text-slate-300 cursor-pointer select-none">
                        Make repository private
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isCreatingRepo || !newRepoName.trim()}
                      className="w-full py-2.5 bg-[#3f86ff] hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      {isCreatingRepo ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Creating Repository...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          <span>Create Repository on GitHub</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#38383b] bg-[#202022] flex items-center justify-between">
          <div className="text-[11px] text-[#8d8d91] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>GitHub Direct API Engine</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#252527] hover:bg-[#38383b] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
