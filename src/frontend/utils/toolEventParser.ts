import { 
  StructuredToolEvent, 
  TerminalToolEvent, 
  EditorToolEvent, 
  GitHubToolEvent, 
  BuildOrTestToolEvent 
} from '../../models/types';

export interface ParsedMessageContent {
  beforeText: string;
  toolEvents: StructuredToolEvent[];
  afterText: string;
  thinking?: string;
}

const COMMON_COMMAND_PREFIXES = [
  '$', 'nmap', 'ping', 'curl', 'wget', 'npm', 'npx', 'node', 'git', 'pnpm', 'yarn', 'bun',
  'sh', 'bash', 'cd', 'ls', 'cat', 'python', 'python3', 'netstat', 'traceroute', 'ifconfig',
  'pip', 'mkdir', 'rm', 'cp', 'mv', 'echo', 'grep', 'find', 'docker', 'cargo', 'go', 'rustc'
];

/**
 * Parses message text to separate AI conversation/narration from structured tool events
 * ensuring raw terminal output or tool events are NEVER rendered as plain assistant bubbles.
 */
export function parseMessageContent(
  rawText: string,
  existingToolEvents?: StructuredToolEvent[],
  existingThinking?: string
): ParsedMessageContent {
  const toolEvents: StructuredToolEvent[] = existingToolEvents ? [...existingToolEvents] : [];
  let thinking: string | undefined = existingThinking;
  let text = rawText || '';

  // 1. Extract <thinking>...</thinking> or [THINKING]...[/THINKING] blocks if present
  const thinkingRegex = /<(?:thinking|thought)>([\s\S]*?)<\/(?:thinking|thought)>/i;
  const thinkingMatch = text.match(thinkingRegex);
  if (thinkingMatch) {
    thinking = thinkingMatch[1].trim();
    text = text.replace(thinkingRegex, '').trim();
  }

  const thinkingBracketRegex = /\[(?:THINKING|PLANNING)\]([\s\S]*?)\[\/(?:THINKING|PLANNING)\]/i;
  const thinkingBracketMatch = text.match(thinkingBracketRegex);
  if (thinkingBracketMatch) {
    if (!thinking) thinking = thinkingBracketMatch[1].trim();
    text = text.replace(thinkingBracketRegex, '').trim();
  }

  // 2. Extract ```void-tool-event or ```tool-event blocks
  const toolEventBlockRegex = /```(?:void-tool-event|tool-event)\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = toolEventBlockRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed && parsed.tool) {
        if (!parsed.id) parsed.id = `tool-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        if (!parsed.type) parsed.type = 'tool';
        if (!parsed.status) parsed.status = 'completed';
        if (!parsed.startedAt) parsed.startedAt = Date.now();
        toolEvents.push(parsed as StructuredToolEvent);
      }
    } catch (_) {}
  }
  text = text.replace(toolEventBlockRegex, '___TOOL_EVENT_PLACEHOLDER___');

  // 3. Extract diff blocks: ```diff ... ```
  const diffBlockRegex = /```(?:diff|patch)\s*\n([\s\S]*?)```/g;
  while ((match = diffBlockRegex.exec(text)) !== null) {
    const diffContent = match[1].trim();
    const fileMatch = diffContent.match(/(?:---|\+\+\+)\s+[ab]\/([^\s\n]+)/);
    const filePath = fileMatch ? fileMatch[1] : 'workspace/changes';

    const addCount = (diffContent.match(/^\+[^+]/gm) || []).length;
    const delCount = (diffContent.match(/^-[^-]/gm) || []).length;

    const editorEvent: EditorToolEvent = {
      id: `edit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'tool',
      tool: 'editor',
      status: 'completed',
      action: 'edit',
      filePath,
      additions: addCount,
      deletions: delCount,
      diff: diffContent,
      summary: `Updated ${filePath} (+${addCount} −${delCount})`,
      startedAt: Date.now(),
    };
    toolEvents.push(editorEvent);
  }
  text = text.replace(diffBlockRegex, '___TOOL_EVENT_PLACEHOLDER___');

  // 4. Extract raw ```terminal or ```bash or ```sh or ```void or untagged command blocks
  const terminalBlockRegex = /```(?:terminal|sh|bash|shell|console|void|text)?\s*\n([\s\S]*?)```/g;
  while ((match = terminalBlockRegex.exec(text)) !== null) {
    let rawContent = match[1].trim();
    
    // Check if it contains 'tool: "terminal"' or '$ command' or starts with common command
    const hasToolTerminalHeader = /tool:\s*["']?terminal["']?/i.test(rawContent);
    if (hasToolTerminalHeader) {
      rawContent = rawContent.replace(/tool:\s*["']?terminal["']?\s*/gi, '').trim();
    }

    const lines = rawContent.split('\n');
    const firstLineTrimmed = lines[0]?.trim() || '';
    const startsWithDollar = firstLineTrimmed.startsWith('$');
    const firstWord = firstLineTrimmed.replace(/^\$\s*/, '').split(/\s+/)[0]?.toLowerCase();

    if (hasToolTerminalHeader || startsWithDollar || COMMON_COMMAND_PREFIXES.includes(firstWord)) {
      const commandStr = (startsWithDollar ? firstLineTrimmed.replace(/^\$\s*/, '') : firstLineTrimmed).trim() || 'command';
      const outputLines = lines.slice(1).join('\n').trim();

      const isExitErr = outputLines.toLowerCase().includes('error:') || outputLines.toLowerCase().includes('failed') || outputLines.toLowerCase().includes('command not found');

      const terminalEvent: TerminalToolEvent = {
        id: `term-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'tool',
        tool: 'terminal',
        status: isExitErr ? 'failed' : 'completed',
        command: commandStr,
        output: outputLines,
        startedAt: Date.now() - 2500,
        completedAt: Date.now(),
        durationMs: 2500,
        exitCode: isExitErr ? 1 : 0
      };
      toolEvents.push(terminalEvent);
      text = text.replace(match[0], '___TOOL_EVENT_PLACEHOLDER___');
    }
  }

  // 5. Clean out any loose 'tool: "terminal"' or 'tool: terminal' text completely
  text = text.replace(/tool:\s*["']?terminal["']?\s*/gi, '');
  text = text.replace(/\[\s*tool:\s*["']?terminal["']?\s*\]/gi, '');

  // 6. Split narration into before and after tool usage based on placeholder
  const parts = text.split('___TOOL_EVENT_PLACEHOLDER___');
  let beforeText = parts[0]?.trim() || '';
  let afterText = parts.slice(1).join('\n\n').trim();

  // If text is completely empty but toolEvents exist, synthesize a clean, natural response
  if (!beforeText && !afterText && toolEvents.length > 0) {
    const term = toolEvents.find(t => t.tool === 'terminal') as TerminalToolEvent | undefined;
    if (term) {
      if (term.command.toLowerCase().includes('nmap')) {
        beforeText = `Scan results for **${term.command}** completed. Details and open ports are available in the terminal tool button below.`;
      } else {
        beforeText = `Executed **${term.command}**. Execution details are accessible in the terminal runner below.`;
      }
    }
  }

  return {
    beforeText,
    toolEvents,
    afterText,
    thinking,
  };
}
