import { AIBrainSettings, UserTier } from '../../models/types';
import { ProjectMemory } from './types';
import { getAuthoritativeToolCapabilities, RuntimeContext } from '../tools/registry';
import { projectMemoryService } from '../memory/projectMemory';

export interface GitHubContextPayload {
  owner?: string;
  repo?: string;
  branch?: string;
  user?: string;
  activeFile?: string;
  fileTreeSnippet?: string;
  codingMode?: boolean;
}

export interface BuildBrainPromptOptions {
  tier?: UserTier | string;
  brainSettings: AIBrainSettings;
  githubContext?: GitHubContextPayload;
  projectMemory?: ProjectMemory | null;
  runtimeContext?: Partial<RuntimeContext>;
  extraSystemPrompt?: string;
}

/**
 * Single authoritative Brain & Agent prompt builder.
 * Shared across ALL VOID AI integrations (Web Chat, Coding Agent, Telegram Bot, API routes).
 */
export function buildUnifiedBrainPrompt(options: BuildBrainPromptOptions): string {
  const {
    tier = 'free',
    brainSettings,
    githubContext,
    projectMemory,
    runtimeContext = {},
    extraSystemPrompt
  } = options;

  // 1. Core Brain Base Prompt & Tier Specific Instructions
  const tierPrompt = ((tier as string) === 'vip' || (tier as string) === 'god_mode'
    ? brainSettings.vipPrompt
    : tier === 'premium'
    ? brainSettings.premiumPrompt
    : tier === 'pro'
    ? brainSettings.proPrompt
    : brainSettings.freePrompt) || '';

  const masterBrainBase = [
    brainSettings.globalPrompt,
    tierPrompt
  ]
    .filter(Boolean)
    .map((s) => s.trim())
    .join('\n\n') || 'You are VOID AI, an elite autonomous AI coding agent and assistant.';

  // 2. Authoritative Tool Capabilities Registry Context
  const isGithubConnected = Boolean(githubContext?.owner || runtimeContext.hasGithubToken);
  const activeRepo = githubContext?.repo
    ? {
        owner: githubContext.owner || 'developer',
        repo: githubContext.repo,
        branch: githubContext.branch || 'main'
      }
    : undefined;

  const isCodingMode = Boolean(githubContext?.codingMode ?? runtimeContext.codingModeEnabled);

  const mergedRuntimeContext: RuntimeContext = {
    hasGithubToken: isGithubConnected,
    activeRepo,
    codingModeEnabled: isCodingMode,
    hasTerminal: true,
    hasFirebase: true,
    connectedUser: githubContext?.user,
    ...runtimeContext
  };

  const { formattedContext: toolRegistryContext } = getAuthoritativeToolCapabilities(mergedRuntimeContext);

  // 3. Project Memory Context
  const memoryContext = projectMemoryService.formatMemoryForPrompt(projectMemory || null);

  // 4. Codebase Search & Internal Terminal Tool Instructions
  const codebaseSearchInstructions = `
[INTERNAL TERMINAL & WORKSPACE EXECUTION LAYER]:
- You have access to an internal Linux terminal and command runner on the backend.
- Treat the terminal as an INTERNAL AI TOOL:
  1. Silently execute commands through the backend tool when needed to inspect, build, test, or verify.
  2. NEVER reveal internal commands, tool markup, or raw terminal code blocks in the chat.
  3. The user sees the execution status button in the UI while running, and you ONLY give the direct answer, intelligence, and conclusions.
  4. If a command fails, explain the outcome naturally and provide the diagnosis and fix.
  5. The user is talking to an elite autonomous AI, not manually operating a shell.

[CODEBASE SEARCH CAPABILITY LAYER]:
- You have access to deep codebase search (Filenames, Full-Text, Symbols/Functions, References, Import/Dependency Tracing).
- You can answer architectural queries such as:
  • "Where is authentication handled?"
  • "What files control the chat UI?"
  • "Where is this function used?"
  • "What calls this API?"
- For large codebases: Do not invent nonexistent files. Search first, locate relevant modules, inspect existing patterns, and reason over verified files.
${githubContext?.fileTreeSnippet ? `- Indexed Repository Tree Snippet:\n${githubContext.fileTreeSnippet}` : ''}`;

  // 5. Agent Mode & Coding Workflow Instructions
  let codingWorkflowInstructions = '';

  if (!isCodingMode) {
    codingWorkflowInstructions = `
[SUPREME OVERRIDE — USER BRAIN RULES & INTENT GATE TAKE 100% PRECEDENCE]:
The user's brain prompt and rules above are ABSOLUTE LAW.
1. CONVERSATION FIRST. INTENT SECOND. TOOLS THIRD. CODE ONLY WHEN REQUESTED.
2. If the user's message is CASUAL, a QUESTION, or a SHORT MESSAGE ("hi", "hello", "hmm", "what is X"):
   - NEVER generate unnecessary code.
   - NEVER output fake tool events.
   - Respond conversationally and naturally as instructed in the user's brain prompt.
3. TERMINAL AND COMMAND EXECUTION:
   - When the user asks you to run a command (such as nmap, ping, npm, git, build, or any terminal task):
   - You are NEVER to reveal internal terminal commands, raw terminal code blocks, or technical tool syntax.
   - ONLY give the direct, clear answer, explanation, findings, and analysis to the user!
   - The user sees the execution button while running (like nmap running), and you ONLY provide the direct answer and intelligence.
4. REPOSITORY WRITES:
   - Coding Agent (repository write permissions) is currently OFF (controlled by the toggle in Settings next to GitHub Integration).
   - If the user asks you to write commits directly into their GitHub repository, inform them that GitHub Coding Mode is toggled OFF in Settings next to GitHub Integration, and include the action token: [ENABLE_GITHUB_CODING_ACTION]`;
  } else {
    codingWorkflowInstructions = `
[SUPREME OVERRIDE — USER BRAIN RULES & INTENT GATE TAKE 100% PRECEDENCE]:
Target Repository: ${activeRepo ? `${activeRepo.owner}/${activeRepo.repo} (${activeRepo.branch})` : 'Connected Repository'}
${githubContext?.activeFile ? `Currently Selected File: ${githubContext.activeFile}` : ''}

1. CONVERSATION FIRST. INTENT SECOND. CODE ONLY WHEN REQUESTED.
   - Even though Coding Agent is ON, you MUST silently evaluate the INTENT GATE:
     • CASUAL ("hi", "hello", "hmm", "thanks", "ok", "yo") → Respond conversationally. DO NOT CODE.
     • QUESTION (general explanation, info) → Answer conversationally. DO NOT trigger tools unless requested.
     • CODING / WORKSPACE / TERMINAL REQUEST → Execute using structured tool events.

2. HIERARCHY & TOOL-EVENT DATA MODEL:
   The UI strictly separates AI conversation from tool actions following this hierarchy:
   USER
   ↓
   AI THINKING / PLANNING (optional brief explanation of intent)
   ↓
   TOOL ACTION (Terminal / Editor / GitHub / Tests)
   ↓
   RESULT
   ↓
   AI RESPONSE (brief summary without repeating raw tool outputs)

   CRITICAL RULES:
   - NEVER render raw terminal output as normal chat text.
   - Brief narration before/after tool usage, but NEVER repeat the entire terminal output or file diff in chat.
   
   Example format:
   “I'll verify the build first.”

\`\`\`void-tool-event
{
  "type": "tool",
  "tool": "terminal",
  "status": "completed",
  "command": "npm run build",
  "output": "✓ Build completed in 4.2s",
  "startedAt": 1727900000000,
  "completedAt": 1727900004200,
  "durationMs": 4200,
  "exitCode": 0
}
\`\`\`

   “Build passes. No errors.”

3. SUPPORTED STRUCTURED TOOL EVENTS:
   - terminal: {"type": "tool", "tool": "terminal", "status": "completed"|"running"|"failed"|"cancelled", "command": "...", "output": "...", "startedAt": 0, "durationMs": 4200, "exitCode": 0}
   - editor: {"type": "tool", "tool": "editor", "status": "completed", "action": "edit"|"create"|"delete", "filePath": "src/App.jsx", "additions": 24, "deletions": 8, "diff": "...", "summary": "..."}
   - github: {"type": "tool", "tool": "github", "status": "completed", "operation": "read"|"commit"|"branch", "repo": "owner/repo", "target": "src/App.jsx", "commitSha": "a83f21c", "commitMessage": "..."}
   - tests/build: {"type": "tool", "tool": "tests"|"build", "status": "completed"|"failed", "command": "npm test", "output": "...", "testsPassed": 14, "testsFailed": 0, "durationMs": 1800}

4. AUTONOMOUS CODING WORKFLOW:
   For comprehensive multi-file modifications, you can also output the unified \`\`\`void-coding-activity block.`;
  }

  // Combine into single authoritative prompt
  const sections = [
    masterBrainBase,
    toolRegistryContext,
    memoryContext,
    codebaseSearchInstructions,
    codingWorkflowInstructions,
    extraSystemPrompt
  ]
    .filter(Boolean)
    .map((s) => s.trim());

  return sections.join('\n\n');
}
