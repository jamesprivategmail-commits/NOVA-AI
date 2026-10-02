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

// ── UTF-8 Base64 Helpers ─────────────────────────────────────────

function utf8ToBase64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    return btoa(str);
  }
}

function base64ToUtf8(b64: string): string {
  try {
    return decodeURIComponent(escape(atob(b64.replace(/\s/g, ''))));
  } catch {
    return atob(b64.replace(/\s/g, ''));
  }
}

// ── Bulletproof JSON parser ──────────────────────────────────────

async function safeParseJson<T>(res: Response, fallbackError: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const rawText = await res.text().catch(() => '');
    const isHtml = rawText.includes('<html') || rawText.includes('<!doctype') || rawText.includes('The page');
    if (isHtml || !rawText) {
      throw new Error(fallbackError);
    }
    const clean = rawText.replace(/<[^>]*>?/gm, '').trim();
    throw new Error(clean.length > 0 && clean.length < 160 ? clean : fallbackError);
  }

  try {
    const data = await res.json();
    return data as T;
  } catch {
    throw new Error(fallbackError);
  }
}

const GITHUB_API_BASE = 'https://api.github.com';

function directHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token.trim()}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'VOID-AI-Assistant/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// ── Direct GitHub API Fallbacks ──────────────────────────────────

async function directGitHubVerify(token: string): Promise<{ valid: boolean; user?: GitHubUser; scopes?: string; error?: string }> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: directHeaders(token),
    });

    if (!res.ok) {
      if (res.status === 401) {
        return { valid: false, error: 'Invalid GitHub token (Bad credentials). Please check your token permissions.' };
      }
      if (res.status === 403) {
        return { valid: false, error: 'GitHub API rate limit exceeded or access forbidden.' };
      }
      return { valid: false, error: `GitHub error: HTTP ${res.status} ${res.statusText}` };
    }

    const user = await safeParseJson<GitHubUser>(res, 'Failed to parse GitHub profile');
    const scopes = res.headers.get('x-oauth-scopes') || '';
    return { valid: true, user, scopes };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Failed to reach GitHub API directly.' };
  }
}

async function directGitHubRepos(token: string): Promise<GitHubRepo[]> {
  const res = await fetch(`${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member`, {
    headers: directHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`Failed to list repositories from GitHub (HTTP ${res.status})`);
  }
  return safeParseJson<GitHubRepo[]>(res, 'Failed to parse repositories list');
}

async function directGitHubBranches(token: string, owner: string, repo: string): Promise<string[]> {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/branches?per_page=100`, {
    headers: directHeaders(token),
  });
  if (!res.ok) {
    return ['main', 'master'];
  }
  const data = await safeParseJson<{ name: string }[]>(res, 'Failed to parse branches');
  return data.map(b => b.name);
}

async function directGitHubTree(token: string, owner: string, repo: string, branch: string = 'main'): Promise<{ sha: string; tree: GitHubFileItem[] }> {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, {
    headers: directHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`Failed to read file tree for ${owner}/${repo}@${branch} (HTTP ${res.status})`);
  }
  const data = await safeParseJson<any>(res, 'Failed to parse file tree');
  return {
    sha: data.sha || '',
    tree: (data.tree || []).map((item: any) => ({
      path: item.path,
      mode: item.mode,
      type: item.type === 'tree' ? 'tree' : 'blob',
      sha: item.sha,
      size: item.size,
    })),
  };
}

async function directGitHubFile(token: string, owner: string, repo: string, path: string, branch: string = 'main'): Promise<{ content: string; sha: string; size: number; html_url: string }> {
  const cleanPath = path.replace(/^\/+/, '');
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${cleanPath}?ref=${encodeURIComponent(branch)}`, {
    headers: directHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`Failed to read file ${path} from ${owner}/${repo} (HTTP ${res.status})`);
  }
  const data = await safeParseJson<any>(res, 'Failed to parse file content');
  const decodedContent = data.content ? base64ToUtf8(data.content) : '';
  return {
    content: decodedContent,
    sha: data.sha,
    size: data.size,
    html_url: data.html_url,
  };
}

async function directGitHubCommit(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string = 'main',
  sha?: string
): Promise<{ success: boolean; commit: any; content: any; htmlUrl: string }> {
  const cleanPath = path.replace(/^\/+/, '');
  let currentSha = sha;

  if (!currentSha) {
    try {
      const existingRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${cleanPath}?ref=${encodeURIComponent(branch)}`, {
        headers: directHeaders(token),
      });
      if (existingRes.ok) {
        const existingData = await existingRes.json().catch(() => null);
        if (existingData?.sha) currentSha = existingData.sha;
      }
    } catch {
      // New file creation if not found
    }
  }

  const payload: any = {
    message,
    content: utf8ToBase64(content),
    branch,
  };
  if (currentSha) payload.sha = currentSha;

  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${cleanPath}`, {
    method: 'PUT',
    headers: {
      ...directHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let errMsg = `Commit failed (HTTP ${res.status})`;
    try {
      const errObj = JSON.parse(errText);
      if (errObj.message) errMsg = errObj.message;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await safeParseJson<any>(res, 'Failed to parse commit response');
  return {
    success: true,
    commit: data.commit,
    content: data.content,
    htmlUrl: data.content?.html_url || `https://github.com/${owner}/${repo}/blob/${branch}/${cleanPath}`,
  };
}

async function directGitHubCreateRepo(
  token: string,
  name: string,
  description?: string,
  isPrivate?: boolean
): Promise<{ success: boolean; repo: GitHubRepo }> {
  const res = await fetch(`${GITHUB_API_BASE}/user/repos`, {
    method: 'POST',
    headers: {
      ...directHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description: description || '',
      private: Boolean(isPrivate),
      auto_init: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let errMsg = `Failed to create repository (HTTP ${res.status})`;
    try {
      const errObj = JSON.parse(errText);
      if (errObj.message) errMsg = errObj.message;
    } catch {}
    throw new Error(errMsg);
  }

  const repo = await safeParseJson<GitHubRepo>(res, 'Failed to parse repository response');
  return { success: true, repo };
}

async function directGitHubCreateBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string = 'main'
): Promise<{ success: boolean; branch: any }> {
  const refRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(fromBranch)}`, {
    headers: directHeaders(token),
  });
  if (!refRes.ok) throw new Error(`Could not find branch '${fromBranch}' on ${owner}/${repo}`);

  const refData = await safeParseJson<any>(refRes, 'Failed to read source branch');
  const sourceSha = refData.object?.sha;
  if (!sourceSha) throw new Error(`Could not resolve commit SHA for branch '${fromBranch}'`);

  const createRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    headers: {
      ...directHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: `refs/heads/${branchName.replace(/^refs\/heads\//, '')}`,
      sha: sourceSha,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => '');
    let errMsg = `Failed to create branch (HTTP ${createRes.status})`;
    try {
      const errObj = JSON.parse(errText);
      if (errObj.message) errMsg = errObj.message;
    } catch {}
    throw new Error(errMsg);
  }

  const branch = await safeParseJson<any>(createRes, 'Failed to parse branch response');
  return { success: true, branch };
}

// ── Exported Hybrid API Wrappers ─────────────────────────────────

export async function fetchOAuthUrl(): Promise<{ url: string; redirectUri: string; configured: boolean; clientIdMasked?: string }> {
  try {
    const res = await fetch('/api/github/oauth/url');
    if (res.ok) {
      return await safeParseJson<any>(res, 'Invalid OAuth URL response');
    }
  } catch {
    // Backend proxy not reachable
  }

  // Graceful fallback URL
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectUri = `${origin}/auth/callback`;
  return {
    url: `https://github.com/login/oauth/authorize?client_id=&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo+read:user+user:email&response_type=code`,
    redirectUri,
    configured: false,
    clientIdMasked: null as any,
  };
}

export async function verifyToken(token: string): Promise<{ valid: boolean; user?: GitHubUser; scopes?: string; error?: string }> {
  if (!token || !token.trim()) {
    return { valid: false, error: 'Token is empty' };
  }

  // First try backend proxy endpoint
  try {
    const res = await fetch('/api/github/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim() }),
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (isJson) {
      const data = await res.json();
      if (data && typeof data.valid === 'boolean') {
        return data;
      }
    }
  } catch {
    // If backend proxy route failed or returned 404/HTML (e.g. on Vercel preview), fall through to direct GitHub API
  }

  // Seamless fallback to direct GitHub API
  return directGitHubVerify(token.trim());
}

export async function fetchUserRepos(token: string): Promise<GitHubRepo[]> {
  try {
    const res = await fetch('/api/github/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim() }),
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (res.ok && isJson) {
      const data = await res.json();
      if (Array.isArray(data.repos)) return data.repos;
    }
  } catch {
    // Fall back to direct
  }

  return directGitHubRepos(token);
}

export async function fetchRepoBranches(token: string, owner: string, repo: string): Promise<string[]> {
  try {
    const res = await fetch('/api/github/repo/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim(), owner, repo }),
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (res.ok && isJson) {
      const data = await res.json();
      if (Array.isArray(data.branches)) return data.branches;
    }
  } catch {
    // Fall back to direct
  }

  return directGitHubBranches(token, owner, repo);
}

export async function fetchRepoTree(token: string, owner: string, repo: string, branch: string = 'main'): Promise<{ sha: string; tree: GitHubFileItem[] }> {
  try {
    const res = await fetch('/api/github/repo/tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim(), owner, repo, branch }),
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (res.ok && isJson) {
      return await res.json();
    }
  } catch {
    // Fall back to direct
  }

  return directGitHubTree(token, owner, repo, branch);
}

export async function fetchRepoFile(token: string, owner: string, repo: string, path: string, branch: string = 'main'): Promise<{ content: string; sha: string; size: number; html_url: string }> {
  try {
    const res = await fetch('/api/github/repo/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim(), owner, repo, path, branch }),
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (res.ok && isJson) {
      return await res.json();
    }
  } catch {
    // Fall back to direct
  }

  return directGitHubFile(token, owner, repo, path, branch);
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
  try {
    const res = await fetch('/api/github/repo/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim(), owner, repo, path, content, message, branch, sha }),
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (res.ok && isJson) {
      return await res.json();
    }
  } catch {
    // Fall back to direct
  }

  return directGitHubCommit(token, owner, repo, path, content, message, branch, sha);
}

export async function createNewRepo(
  token: string,
  name: string,
  description?: string,
  isPrivate?: boolean
): Promise<{ success: boolean; repo: GitHubRepo }> {
  try {
    const res = await fetch('/api/github/repo/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim(), name, description, isPrivate }),
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (res.ok && isJson) {
      return await res.json();
    }
  } catch {
    // Fall back to direct
  }

  return directGitHubCreateRepo(token, name, description, isPrivate);
}

export async function createNewBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string = 'main'
): Promise<{ success: boolean; branch: any }> {
  try {
    const res = await fetch('/api/github/repo/branch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim(), owner, repo, branchName, fromBranch }),
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (res.ok && isJson) {
      return await res.json();
    }
  } catch {
    // Fall back to direct
  }

  return directGitHubCreateBranch(token, owner, repo, branchName, fromBranch);
}
