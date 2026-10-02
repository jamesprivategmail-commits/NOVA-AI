import dotenv from 'dotenv';
dotenv.config();

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  email: string | null;
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
  permissions?: {
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
  };
}

export interface GitHubFileItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url?: string;
}

const GITHUB_API_BASE = 'https://api.github.com';

function getGitHubHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token.trim()}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'VOID-AI-Assistant/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export function getGitHubOAuthUrl(redirectUri: string, state?: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID || '';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo read:user user:email',
    response_type: 'code',
  });
  if (state) {
    params.set('state', state);
  }
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGitHubCode(code: string, redirectUri: string): Promise<{ accessToken: string; tokenType: string; scope: string } | null> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET environment variable is missing.');
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

export async function verifyGitHubToken(token: string): Promise<{ valid: boolean; user?: GitHubUser; scopes?: string; error?: string }> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: getGitHubHeaders(token),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      return { valid: false, error: err.message || `HTTP ${res.status}` };
    }

    const user = await res.json() as GitHubUser;
    const scopes = res.headers.get('x-oauth-scopes') || '';
    return { valid: true, user, scopes };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Network error verifying token' };
  }
}

export async function listGitHubRepos(token: string): Promise<GitHubRepo[]> {
  const res = await fetch(`${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member`, {
    headers: getGitHubHeaders(token),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Failed to fetch repos: HTTP ${res.status}`);
  }

  return res.json() as Promise<GitHubRepo[]>;
}

export async function getRepoBranches(token: string, owner: string, repo: string): Promise<string[]> {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/branches?per_page=100`, {
    headers: getGitHubHeaders(token),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Failed to fetch branches: HTTP ${res.status}`);
  }

  const branches = await res.json() as { name: string }[];
  return branches.map(b => b.name);
}

export async function getRepoTree(token: string, owner: string, repo: string, branch: string = 'main'): Promise<{ sha: string; tree: GitHubFileItem[] }> {
  // Get reference commit sha
  const refRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`, {
    headers: getGitHubHeaders(token),
  });

  if (!refRes.ok) {
    const err = await refRes.json().catch(() => ({ message: refRes.statusText }));
    throw new Error(err.message || `Failed to fetch branch ${branch}: HTTP ${refRes.status}`);
  }

  const commitData = await refRes.json() as any;
  const treeSha = commitData.commit?.tree?.sha || branch;

  const treeRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`, {
    headers: getGitHubHeaders(token),
  });

  if (!treeRes.ok) {
    const err = await treeRes.json().catch(() => ({ message: treeRes.statusText }));
    throw new Error(err.message || `Failed to fetch tree: HTTP ${treeRes.status}`);
  }

  const treeData = await treeRes.json() as any;
  return {
    sha: treeData.sha,
    tree: (treeData.tree || []).map((item: any) => ({
      path: item.path,
      mode: item.mode,
      type: item.type,
      sha: item.sha,
      size: item.size,
      url: item.url,
    })),
  };
}

export async function getRepoFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<{ content: string; sha: string; size: number; html_url: string }> {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${cleanPath}?ref=${encodeURIComponent(branch)}`, {
    headers: getGitHubHeaders(token),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Failed to read file ${path}: HTTP ${res.status}`);
  }

  const data = await res.json() as any;
  let decodedContent = '';

  if (data.encoding === 'base64' && data.content) {
    const cleaned = data.content.replace(/[\r\n\s]/g, '');
    decodedContent = Buffer.from(cleaned, 'base64').toString('utf-8');
  } else if (typeof data.content === 'string') {
    decodedContent = data.content;
  }

  return {
    content: decodedContent,
    sha: data.sha,
    size: data.size,
    html_url: data.html_url,
  };
}

export async function commitRepoFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string = 'main',
  sha?: string
): Promise<{ success: boolean; commit: any; content: any; htmlUrl: string }> {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // If sha is not provided, try to fetch current file sha if it exists
  let fileSha = sha;
  if (!fileSha) {
    try {
      const existing = await getRepoFile(token, owner, repo, cleanPath, branch);
      fileSha = existing.sha;
    } catch (_) {
      // File does not exist yet; will create new
    }
  }

  const base64Content = Buffer.from(content, 'utf-8').toString('base64');
  const payload: any = {
    message: message || `Update ${cleanPath} via VOID AI`,
    content: base64Content,
    branch,
  };

  if (fileSha) {
    payload.sha = fileSha;
  }

  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${cleanPath}`, {
    method: 'PUT',
    headers: {
      ...getGitHubHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Failed to commit file to GitHub: HTTP ${res.status}`);
  }

  const data = await res.json() as any;
  return {
    success: true,
    commit: data.commit,
    content: data.content,
    htmlUrl: data.content?.html_url || `https://github.com/${owner}/${repo}/blob/${branch}/${cleanPath}`,
  };
}

export async function createGitHubRepo(
  token: string,
  name: string,
  description: string = '',
  isPrivate: boolean = false,
  autoInit: boolean = true
): Promise<GitHubRepo> {
  const res = await fetch(`${GITHUB_API_BASE}/user/repos`, {
    method: 'POST',
    headers: {
      ...getGitHubHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name.trim(),
      description,
      private: isPrivate,
      auto_init: autoInit,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Failed to create repo: HTTP ${res.status}`);
  }

  return res.json() as Promise<GitHubRepo>;
}

export async function createGitHubBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string = 'main'
): Promise<any> {
  // Get latest commit sha of fromBranch
  const refRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(fromBranch)}`, {
    headers: getGitHubHeaders(token),
  });

  if (!refRes.ok) {
    const err = await refRes.json().catch(() => ({ message: refRes.statusText }));
    throw new Error(err.message || `Failed to find base branch ${fromBranch}`);
  }

  const refData = await refRes.json() as any;
  const sha = refData.object?.sha;

  if (!sha) {
    throw new Error(`Could not resolve commit SHA for base branch ${fromBranch}`);
  }

  const createRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    headers: {
      ...getGitHubHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: `refs/heads/${branchName.trim()}`,
      sha,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({ message: createRes.statusText }));
    throw new Error(err.message || `Failed to create branch: HTTP ${createRes.status}`);
  }

  return createRes.json();
}
