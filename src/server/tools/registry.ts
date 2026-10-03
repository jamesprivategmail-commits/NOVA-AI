import { ToolCapabilityStatus } from '../agent/types';

export interface RuntimeContext {
  hasGithubToken?: boolean;
  activeRepo?: { owner: string; repo: string; branch: string };
  codingModeEnabled?: boolean;
  hasTerminal?: boolean;
  hasFirebase?: boolean;
  connectedUser?: string;
}

export interface AuthoritativeTool {
  name: string;
  category: 'vcs' | 'search' | 'memory' | 'verification' | 'execution' | 'database';
  displayName: string;
  description: string;
  isAvailable: (context: RuntimeContext) => boolean;
  getStatus: (context: RuntimeContext) => ToolCapabilityStatus;
}

export const AUTHORITATIVE_TOOLS: AuthoritativeTool[] = [
  {
    name: 'github_connection',
    category: 'vcs',
    displayName: 'GitHub Account',
    description: 'OAuth authentication with user GitHub account',
    isAvailable: (ctx) => Boolean(ctx.hasGithubToken),
    getStatus: (ctx) => ({
      name: 'GitHub',
      status: ctx.hasGithubToken ? 'CONNECTED' : 'DISCONNECTED',
      description: ctx.hasGithubToken
        ? `Authenticated as @${ctx.connectedUser || 'developer'}`
        : 'Not connected to GitHub account',
      details: { user: ctx.connectedUser }
    })
  },
  {
    name: 'repository_access',
    category: 'vcs',
    displayName: 'Repository Access',
    description: 'Read and tree inspection of connected GitHub repository',
    isAvailable: (ctx) => Boolean(ctx.hasGithubToken && ctx.activeRepo),
    getStatus: (ctx) => ({
      name: 'Repository access',
      status: ctx.hasGithubToken && ctx.activeRepo ? 'AVAILABLE' : 'UNAVAILABLE',
      description: ctx.activeRepo
        ? `Active target: ${ctx.activeRepo.owner}/${ctx.activeRepo.repo} (${ctx.activeRepo.branch})`
        : 'No repository selected',
      details: ctx.activeRepo ? { ...ctx.activeRepo } : undefined
    })
  },
  {
    name: 'github_coding_mode',
    category: 'vcs',
    displayName: 'GitHub Coding Mode',
    description: 'Explicit user-authorized permission to write code and commit changes to the active repository',
    isAvailable: (ctx) => Boolean(ctx.hasGithubToken && ctx.activeRepo && ctx.codingModeEnabled),
    getStatus: (ctx) => ({
      name: 'GitHub Coding Mode',
      status: ctx.codingModeEnabled ? 'AVAILABLE' : 'UNAVAILABLE',
      description: ctx.codingModeEnabled
        ? 'ON: Write and commit operations authorized by user'
        : 'OFF: Read-only mode; repository writes strictly prohibited',
      details: { enabled: Boolean(ctx.codingModeEnabled) }
    })
  },
  {
    name: 'codebase_search',
    category: 'search',
    displayName: 'Codebase Search Layer',
    description: 'Deep indexing, filename search, full-text regex search, symbol/function definition search, and import/dependency tracing',
    isAvailable: () => true,
    getStatus: () => ({
      name: 'Codebase search',
      status: 'AVAILABLE',
      description: 'Filenames, full-text search, symbol search, dependency tracing ready'
    })
  },
  {
    name: 'project_memory',
    category: 'memory',
    displayName: 'Project Memory',
    description: 'Persistent Firestore storage of architecture, decisions, conventions, and configuration per project',
    isAvailable: () => true,
    getStatus: () => ({
      name: 'Project memory',
      status: 'AVAILABLE',
      description: 'Persistent Firestore project memory layer active'
    })
  },
  {
    name: 'live_verifier',
    category: 'verification',
    displayName: 'Live Error Loop & Verifier',
    description: 'Automatic syntax validation, import verification, and error feedback loop',
    isAvailable: () => true,
    getStatus: () => ({
      name: 'Live error loop',
      status: 'AVAILABLE',
      description: 'Auto-verification and error feedback loop active'
    })
  },
  {
    name: 'terminal',
    category: 'execution',
    displayName: 'Live Terminal Execution',
    description: 'Real live interactive terminal/shell execution environment on Linux (bash/sh). Can execute shell commands, check files, run tests, and build code.',
    isAvailable: () => true,
    getStatus: (ctx) => ({
      name: 'Live Terminal',
      status: 'AVAILABLE',
      description: 'Live interactive Linux shell execution environment (bash/sh) is connected and available.',
      details: { shell: 'bash/sh', os: 'linux', live: true }
    })
  },
  {
    name: 'file_system',
    category: 'execution',
    displayName: 'File System',
    description: 'Direct workspace file reading and writing',
    isAvailable: () => true,
    getStatus: () => ({
      name: 'File system',
      status: 'AVAILABLE',
      description: 'Workspace files access ready'
    })
  },
  {
    name: 'firebase',
    category: 'database',
    displayName: 'Firebase Firestore',
    description: 'Hosted database and auth SDK access',
    isAvailable: (ctx) => ctx.hasFirebase !== false,
    getStatus: () => ({
      name: 'Firebase',
      status: 'AVAILABLE',
      description: 'Firestore hosted database connection ready'
    })
  }
];

export function getAuthoritativeToolCapabilities(context: RuntimeContext): {
  capabilities: ToolCapabilityStatus[];
  formattedContext: string;
} {
  const capabilities = AUTHORITATIVE_TOOLS.map((t) => t.getStatus(context));

  const formattedContext = [
    '[AUTHORITATIVE TOOL REGISTRY & RUNTIME CAPABILITIES]:',
    ...capabilities.map((c) => `- ${c.name}: ${c.status} (${c.description})`),
    '',
    'STRICT CAPABILITY HONESTY RULES:',
    '- Never claim "I ran this command" or "Running npm test..." unless a real terminal tool actually executed it.',
    '- Never claim "I changed your GitHub repository" unless the changes were committed through the GitHub integration.',
    '- If a capability is UNAVAILABLE, state so honestly and proceed with what can actually be accomplished.'
  ].join('\n');

  return { capabilities, formattedContext };
}
