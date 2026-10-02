export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  total_private_repos?: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  updated_at: string;
  fork: boolean;
}

export interface GitHubFileItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export interface ActiveRepoState {
  owner: string;
  repo: string;
  branch: string;
  activeFile?: string;
}

const STORAGE_KEY_TOKEN = 'void_ai_github_token';
const STORAGE_KEY_USER = 'void_ai_github_user';
const STORAGE_KEY_ACTIVE_REPO = 'void_ai_github_active_repo';

export function getStoredGitHubToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

export function getStoredGitHubUser(): GitHubUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredGitHubAuth(token: string, user: GitHubUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_TOKEN, token.trim());
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
}

export function clearStoredGitHubAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_ACTIVE_REPO);
}

export function getStoredActiveRepo(): ActiveRepoState | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_REPO);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredActiveRepo(repo: ActiveRepoState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ACTIVE_REPO, JSON.stringify(repo));
}

// ── API wrappers ──

export async function fetchOAuthUrl(): Promise<{ url: string; redirectUri: string; configured: boolean; clientIdMasked?: string }> {
  const res = await fetch('/api/github/oauth/url');
  if (!res.ok) throw new Error('Failed to retrieve GitHub OAuth URL');
  return res.json();
}

export async function verifyToken(token: string): Promise<{ valid: boolean; user?: GitHubUser; scopes?: string; error?: string }> {
  const res = await fetch('/api/github/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return res.json();
}

export async function fetchUserRepos(token: string): Promise<GitHubRepo[]> {
  const res = await fetch('/api/github/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch repos' }));
    throw new Error(err.error || 'Failed to list repositories');
  }
  const data = await res.json();
  return data.repos || [];
}

export async function fetchRepoBranches(token: string, owner: string, repo: string): Promise<string[]> {
  const res = await fetch('/api/github/repo/branches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, owner, repo }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch branches' }));
    throw new Error(err.error || 'Failed to fetch branches');
  }
  const data = await res.json();
  return data.branches || [];
}

export async function fetchRepoTree(token: string, owner: string, repo: string, branch: string = 'main'): Promise<{ sha: string; tree: GitHubFileItem[] }> {
  const res = await fetch('/api/github/repo/tree', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, owner, repo, branch }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch repository tree' }));
    throw new Error(err.error || 'Failed to fetch repository tree');
  }
  return res.json();
}

export async function fetchRepoFile(token: string, owner: string, repo: string, path: string, branch: string = 'main'): Promise<{ content: string; sha: string; size: number; html_url: string }> {
  const res = await fetch('/api/github/repo/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, owner, repo, path, branch }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to read file' }));
    throw new Error(err.error || 'Failed to read file from repository');
  }
  return res.json();
}

export async function commitFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string = 'main',
  sha?: string
): Promise<{ success: boolean; commit: any; content: any; htmlUrl: string }> {
  const res = await fetch('/api/github/repo/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, owner, repo, path, content, message, branch, sha }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to commit file' }));
    throw new Error(err.error || 'Failed to commit file to GitHub');
  }
  return res.json();
}

export async function createNewRepo(
  token: string,
  name: string,
  description?: string,
  isPrivate?: boolean
): Promise<{ success: boolean; repo: GitHubRepo }> {
  const res = await fetch('/api/github/repo/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, name, description, isPrivate }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create repo' }));
    throw new Error(err.error || 'Failed to create repository on GitHub');
  }
  return res.json();
}

export async function createNewBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string = 'main'
): Promise<{ success: boolean; branch: any }> {
  const res = await fetch('/api/github/repo/branch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, owner, repo, branchName, fromBranch }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create branch' }));
    throw new Error(err.error || 'Failed to create branch on GitHub');
  }
  return res.json();
}
