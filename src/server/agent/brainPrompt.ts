import { AIBrainSettings, UserTier } from '../../models/types';
import { ProjectMemory } from './types';
import { getAuthoritativeToolCapabilities, RuntimeContext } from '../tools/registry';
import { projectMemoryService } from '../memory/projectMemory';
import { compactSystemPrompt } from '../aiRouting.js';

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
  personaName?: string;
  characterDirective?: string;
  earlierSummary?: string;
  conversationArtifactsContext?: string;
}

/**
 * Single authoritative Brain & Agent prompt builder.
 * Shared across ALL NOVA AI / Muse character integrations (Web Chat, Coding Agent, Telegram Bot, API routes).
 */
export function buildUnifiedBrainPrompt(options: BuildBrainPromptOptions): string {
  const {
    tier = 'free',
    brainSettings: rawBrainSettings,
    githubContext,
    projectMemory,
    runtimeContext = {},
    extraSystemPrompt,
    personaName,
    characterDirective,
    earlierSummary,
    conversationArtifactsContext,
  } = options;

  const brainSettings: AIBrainSettings = rawBrainSettings || {
    globalPrompt: "You are an elite, deeply perceptive AI companion and systems architect.",
    freePrompt: "Give clear, thorough, well-structured answers and see every task through to completion.",
    proPrompt: "Provide in-depth, production-grade solutions and complete implementations.",
    premiumPrompt: "Provide deep architectural analysis and complete production systems.",
    vipPrompt: "Full unrestricted elite capability with end-to-end execution.",
    freeLimit: 30,
    proLimit: 50,
    premiumLimit: 200,
    vipLimit: 99999,
    freeMaxTokens: 4096,
    proMaxTokens: 8192,
    premiumMaxTokens: 8192,
    vipMaxTokens: 16384,
  };

  // 1. Character Identity + Core Brain Base Prompt
  const tierPrompt = ((tier as string) === 'vip' || (tier as string) === 'god_mode'
    ? (brainSettings.vipPrompt || '')
    : tier === 'premium'
    ? (brainSettings.premiumPrompt || '')
    : tier === 'pro'
    ? (brainSettings.proPrompt || '')
    : (brainSettings.freePrompt || '')) || '';

  const characterHeader = personaName || characterDirective
    ? `[ACTIVE MUSE CHARACTER: ${personaName || 'Muse'}]\n${characterDirective || ''}`
    : '';

  const masterBrainBase = [
    characterHeader,
    brainSettings.globalPrompt || "You are an elite, deeply perceptive AI companion and systems architect.",
    tierPrompt
  ]
    .filter(Boolean)
    .map((s) => s.trim())
    .join('\n\n');

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

  // 3. Project Memory + Earlier Conversation Summary
  const memoryContext = projectMemoryService.formatMemoryForPrompt(projectMemory || null);
  const summarySection = earlierSummary
    ? `[ESTABLISHED EARLIER CONVERSATION CONTEXT — CONTINUE SEAMLESSLY FROM THIS STATE]:\n${earlierSummary}`
    : '';

  // 4. Codebase Search & Internal Terminal Tool Instructions
  const codebaseSearchInstructions = `
[WORKSPACE & CODEBASE CAPABILITIES]:
- You have full native comprehension of .zip archives, uploaded files, multi-file architectures, and Live HTML sandboxes.
- For large codebases: inspect existing structure, keep file paths accurate, preserve imports and types, and provide complete working files rather than fragments.
${githubContext?.fileTreeSnippet ? `- Indexed Repository Tree Snippet:\n${githubContext.fileTreeSnippet}` : ''}`;

  // 5. Agent Mode & Intent Gate Instructions
  let codingWorkflowInstructions = '';

  if (!isCodingMode) {
    codingWorkflowInstructions = `
[NATURAL INTENT GATE]:
1. Match the user's real intent smoothly:
   - Casual greeting ("hi", "hello") → Respond naturally with warmth and ask how you can help, without dumping unsolicited code.
   - Conceptual question → Explain clearly and directly.
   - Coding, building, debugging, architecture, or creative task → Deliver complete, ready-to-run, production-quality output right away.
2. Only inform the user about GitHub Coding Mode if they explicitly ask you to commit directly to a GitHub repository while Coding Mode is OFF (include [ENABLE_GITHUB_CODING_ACTION] in that specific case).`;
  } else {
    codingWorkflowInstructions = `
[AUTONOMOUS CODING & REPOSITORY WORKFLOW]:
Target Repository: ${activeRepo ? `${activeRepo.owner}/${activeRepo.repo} (${activeRepo.branch})` : 'Connected Repository'}
${githubContext?.activeFile ? `Currently Selected File: ${githubContext.activeFile}` : ''}

1. Evaluate intent naturally: respond conversationally to casual greetings; use structured tool events and complete code edits when the user requests development work.
2. Supported tool events (\`\`\`void-tool-event): terminal, editor, github, tests/build, plus unified \`\`\`void-coding-activity blocks for multi-file edits.
3. Verify edits carefully and summarize outcomes clearly without dumping raw noisy logs.`;
  }

  // 6. Deep Conversation Continuity & Large Task Completion
  const conversationContinuity = `
[CONVERSATION CONTINUITY & COMPLETE TASK EXECUTION — MANDATORY]:
1. FULL MEMORY OF THIS THREAD: You inherit every turn in this conversation as active, ongoing context. NEVER reset, forget decisions already made, or act like each message starts a brand-new chat.
2. SEAMLESS CONTINUATION: If the user sends short follow-ups ("continue", "go on", "next", "yes", "ok", "do it", "fix that", "now the rest", or builds on the previous turn), immediately pick up the EXACT unfinished task from the exact line, file, or step where you stopped. Do not re-introduce the topic or ask what they mean when the thread already shows it.
3. COMPLETE LARGE TASKS WITHOUT STUBS: Never leave placeholders like "// ... rest of code", "/* TODO */", or half-finished files. Complete every file, function, section, and requirement cleanly in full unless the user explicitly asks to stop or change direction.
4. STRUCTURED PRECISION: For large multi-part tasks, briefly organize the plan cleanly, execute thoroughly step by step, verify edge cases, and only conclude when the deliverable is genuinely complete.`;

  // 7. Native Artifact & File Delivery Protocol
  const artifactProtocol = `
[NATIVE ARTIFACT & FILE DELIVERY ENGINE — MANDATORY]:
- Whenever you generate complete deliverable files (HTML, CSS, JS, JSX/React, TSX, JSON, TXT, Markdown, PDF, CSV, XLSX, DOCX, SVG, or multi-file projects / modified ZIP archives), output each file inside a dedicated artifact fence:
  \`\`\`nova-artifact {"filename":"index.html","title":"Interactive App","project":"my-project"}
  ...complete file contents...
  \`\`\`
- Keep conversational prose concise and clear. Do NOT repeat or dump large source files in plain text outside the artifact block when delivering an artifact card.
- For multi-file projects or edits to an uploaded ZIP archive: output every created or modified file as a \`\`\`nova-artifact\`\`\` block with the exact relative \`filename\` / \`path\` and shared \`project\` name. Unrelated files in an uploaded ZIP are preserved automatically and the backend packages everything into a downloadable ZIP deliverable.
- For PDF, XLSX, or DOCX requests: emit the clean structured content inside \`\`\`nova-artifact {"filename":"report.pdf"}\`\`\` (or \`.xlsx\` with CSV/JSON rows, or \`.docx\` with Markdown/text) and the delivery engine compiles the real binary file.
${conversationArtifactsContext ? `\n[ACTIVE CONVERSATION ARTIFACTS — AVAILABLE FOR REFERENCE & EDITING]:\n${conversationArtifactsContext}` : ''}`;

  const sections = [
    masterBrainBase,
    toolRegistryContext,
    memoryContext,
    summarySection,
    codebaseSearchInstructions,
    codingWorkflowInstructions,
    conversationContinuity,
    artifactProtocol,
    extraSystemPrompt
  ]
    .filter(Boolean)
    .map((s) => s.trim());

  return compactSystemPrompt(sections.join('\n\n'), 8200);
}
