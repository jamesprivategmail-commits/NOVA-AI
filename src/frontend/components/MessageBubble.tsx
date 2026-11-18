import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  User, Copy, Check, Trash2, Edit2, ExternalLink, ThumbsUp, ThumbsDown,
  AlertCircle, Volume2, VolumeX, Star, GitBranch, ArrowRightCircle
} from 'lucide-react';
import { Message, TerminalToolEvent } from '../../models/types';
import { CodeBlock } from './CodeBlock';
import { CodingActivityPanel, parseCodingActivity } from './CodingActivityPanel';
import { ToolHierarchyView } from './tools/ToolHierarchyView';
import { TerminalToolComponent } from './tools/TerminalToolComponent';
import { FileArtifactCard } from './tools/FileArtifactCard';
import { BuildTestCard } from './tools/BuildTestCard';
import { terminalManager } from '../utils/terminalManager';
import { parseMessageContent } from '../utils/toolEventParser';
import { getStoredActiveRepo, getStoredGitHubCodingMode, setStoredGitHubCodingMode, ActiveRepoState } from '../utils/github';
import { getPersonaForProvider, type NovaPersona } from '../models/personas';
import { NovaOrb } from './NovaOrb';
import { CouncilActivityCard } from './CouncilActivityCard';
import { clsx } from 'clsx';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, text: string) => void;
  onToggleStar?: (id: string) => void;
  onContinue?: () => void;
  activeRepo?: ActiveRepoState | null;
  codingModeEnabled?: boolean;
  onEnableCodingMode?: () => void;
  persona?: NovaPersona;
}

export const MessageBubble = React.memo(function MessageBubble({
  message,
  isStreaming = false,
  onDelete,
  onEdit,
  onToggleStar: propOnToggleStar,
  onContinue,
  activeRepo: propActiveRepo,
  codingModeEnabled: propCodingModeEnabled,
  onEnableCodingMode,
  persona: personaProp
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const activeRepo = propActiveRepo !== undefined ? propActiveRepo : getStoredActiveRepo();
  const persona = personaProp || getPersonaForProvider(message.providerUsed);
  const codingModeEnabled = propCodingModeEnabled !== undefined ? propCodingModeEnabled : getStoredGitHubCodingMode();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanSpeech = cleanDisplayText
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/[#*_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanSpeech.slice(0, 1800));
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (onEdit && editText.trim() !== message.text) {
      onEdit(message.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleEnableCodingMode = () => {
    setStoredGitHubCodingMode(true);
    if (onEnableCodingMode) onEnableCodingMode();
  };

  const hasEnableActionTag = message.text.includes('[ENABLE_GITHUB_CODING_ACTION]');
  
  const { cleanDisplayText, parsed } = React.useMemo(() => {
    let clean = message.text.replace(/\[ENABLE_GITHUB_CODING_ACTION\]/g, '').trim();
    clean = clean.replace(/tool:\s*["']?terminal["']?\s*/gi, '').trim();
    clean = clean.replace(/\[\s*tool:\s*["']?terminal["']?\s*\]/gi, '').trim();
    const p = parseMessageContent(clean, message.toolEvents, message.thinking);
    return { cleanDisplayText: clean, parsed: p };
  }, [message.text, message.toolEvents, message.thinking]);

  const markdownComponents = {
    code(props: any) {
      const { children, className, ...rest } = props;
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');

      if (match && (match[1] === 'void-coding-activity' || match[1] === 'github-coding-activity')) {
        const parsedActivity = parseCodingActivity(codeString);
        if (parsedActivity) {
          return (
            <CodingActivityPanel
              activity={parsedActivity}
              activeRepo={activeRepo}
              codingModeEnabled={codingModeEnabled}
              onEnableCodingMode={handleEnableCodingMode}
            />
          );
        }
      }

      if (match && (match[1] === 'void-tool-event' || match[1] === 'tool-event')) {
        try {
          const toolEvt = JSON.parse(codeString);
          if (toolEvt.tool === 'terminal') {
            terminalManager.registerToolEvent(toolEvt);
            return <TerminalToolComponent event={toolEvt} isStreaming={isStreaming} />;
          }
          if (toolEvt.tool === 'editor') {
            return <FileArtifactCard event={toolEvt} />;
          }
          if (toolEvt.tool === 'build' || toolEvt.tool === 'tests') {
            return <BuildTestCard event={toolEvt} />;
          }
        } catch (_) {}
      }

      const hasTerminalHeader = /tool:\s*["']?terminal["']?/i.test(codeString);
      const isShellLang = match && ['terminal', 'bash', 'sh', 'shell', 'console', 'void'].includes(match[1]);
      const trimmedCode = codeString.trim();
      const startsWithCmd = trimmedCode.startsWith('$') || /^(?:nmap|ping|curl|wget|npm|node|git|python|ls|cat)\b/i.test(trimmedCode);

      if (hasTerminalHeader || (isShellLang && startsWithCmd) || (match && startsWithCmd)) {
        const sanitized = codeString.replace(/tool:\s*["']?terminal["']?\s*/gi, '').trim();
        const lines = sanitized.split('\n');
        const firstLine = lines[0]?.trim() || '';
        const cmd = firstLine.startsWith('$') ? firstLine.replace(/^\$\s*/, '') : firstLine;
        const out = lines.slice(1).join('\n').trim();
        const isErr = out.toLowerCase().includes('error:') || out.toLowerCase().includes('failed');
        const termEvt: TerminalToolEvent = {
          id: 'term-' + Date.now(),
          type: 'tool',
          tool: 'terminal',
          status: isErr ? 'failed' : 'completed',
          command: cmd || 'command',
          output: out,
          startedAt: Date.now() - 2000,
          completedAt: Date.now(),
          durationMs: 2000,
          exitCode: isErr ? 1 : 0
        };
        terminalManager.registerToolEvent(termEvt);
        return (
          <TerminalToolComponent
            event={termEvt}
            isStreaming={isStreaming}
          />
        );
      }

      if (match || codeString.includes('\n')) {
        return (
          <CodeBlock
            language={match ? match[1] : ''}
            value={codeString}
          />
        );
      }

      return (
        <code
          {...rest}
          className="bg-[var(--bg-3)] text-[var(--text-primary)] px-1.5 py-0.5 rounded-md text-xs font-mono border border-[var(--line)] inline-block"
        >
          {children}
        </code>
      );
    },
    table(props: any) {
      return (
        <div className="overflow-x-auto my-4 border border-[var(--line)] rounded-xl shadow-[var(--shadow-sm)]">
          <table className="w-full text-left text-sm text-[var(--text-primary)] border-collapse">
            {props.children}
          </table>
        </div>
      );
    },
    thead(props: any) {
      return <thead className="bg-[var(--bg-2)] border-b border-[var(--line)] text-xs font-semibold uppercase text-[var(--text-secondary)]">{props.children}</thead>;
    },
    th(props: any) {
      return <th className="px-4 py-2.5 font-semibold border-r border-[var(--line)] last:border-r-0">{props.children}</th>;
    },
    td(props: any) {
      return <td className="px-4 py-2 border-t border-[var(--line)] border-r border-[var(--line)] last:border-r-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">{props.children}</td>;
    },
    a(props: any) {
      return (
        <a
          href={props.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium underline underline-offset-4 transition-colors"
          style={{ color: 'var(--accent-hover)' }}
        >
          {props.children}
          <ExternalLink size={12} className="shrink-0" />
        </a>
      );
    },
    img(props: any) {
      if (!props.src) return null;
      return (
        <span className="my-2 relative group inline-block max-w-full">
          <img
            src={props.src}
            alt={props.alt || 'Generated asset'}
            className="rounded-xl border border-[var(--line)] max-h-56 object-cover shadow-lg hover:brightness-105 transition-all cursor-pointer"
            onClick={() => props.src && setPreviewImage(props.src)}
          />
        </span>
      );
    }
  };

  return (
    <div className="group w-full py-3 px-3 sm:px-5 transition-colors contain-paint animate-messageIn">
      <div className={clsx(
        "max-w-3xl mx-auto flex w-full gap-2.5 sm:gap-3 relative items-start",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold glass text-[var(--text-secondary)] shadow-[var(--shadow-xs)]">
              <User size={14} />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full presence-ring overflow-hidden flex items-center justify-center glass">
              <NovaOrb
                size={34}
                state={isStreaming ? 'thinking' : isSpeaking ? 'speaking' : 'idle'}
                persona={persona}
                label={persona.name}
              />
            </div>
          )}
        </div>

        {/* Content Container */}
        <div className={clsx(
          "flex-1 overflow-hidden min-w-0 space-y-1 flex flex-col",
          isUser ? "items-end" : "items-start"
        )}>
          {/* Header info */}
          <div className={clsx(
            "flex items-center gap-2 mb-0.5 px-1",
            isUser ? "flex-row-reverse" : "flex-row"
          )}>
            <span className={clsx("text-xs font-semibold", isUser ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]")}>
              {isUser ? 'You' : (
                <span>
                  {persona.name}
                  <span className="ml-1.5 text-[10px] font-normal text-[var(--text-muted)]">· {persona.role}</span>
                </span>
              )}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Edit Mode vs Content */}
          {isEditing ? (
            <div className="w-full mt-1 space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full glass-strong border border-[var(--line-strong)] focus:border-[var(--accent-muted)] rounded-2xl p-3.5 text-[var(--text-primary)] min-h-[110px] outline-none text-sm transition-colors"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn btn-ghost px-3 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="btn btn-primary px-4 py-1.5 text-xs"
                >
                  Save & Resend
                </button>
              </div>
            </div>
          ) : (
            <div className={clsx(
              "text-sm leading-relaxed w-full",
              isUser
                ? "bubble-user text-[var(--text-primary)] p-3.5 sm:p-4 max-w-[92%] sm:max-w-[85%] text-left"
                : "bubble-model text-[var(--text-primary)] p-4 sm:p-5 w-full max-w-none text-left"
            )}>
              {!isUser && message.councilData && (
                <CouncilActivityCard data={message.councilData} isStreaming={isStreaming} />
              )}
              <div className={clsx(
                "prose dark:prose-invert max-w-none text-sm leading-relaxed w-full",
                "prose-headings:text-[var(--text-primary)] prose-headings:font-bold prose-headings:tracking-tight",
                "prose-p:text-[var(--text-primary)] prose-li:text-[var(--text-primary)] prose-strong:text-[var(--text-primary)]",
                "prose-h1:text-base sm:prose-h1:text-lg prose-h1:mt-2.5 prose-h1:mb-1.5 prose-h1:border-b prose-h1:border-[var(--line)] prose-h1:pb-1.5",
                "prose-h2:text-sm sm:prose-h2:text-base prose-h2:mt-2.5 prose-h2:mb-1",
                "prose-h3:text-sm prose-h3:mt-2 prose-h3:mb-1",
                "prose-p:my-1.5 prose-p:leading-relaxed",
                "prose-ul:my-1.5 prose-ul:pl-4 sm:prose-ul:pl-5 prose-ul:list-disc prose-li:my-0.5",
                "prose-ol:my-1.5 prose-ol:pl-4 sm:prose-ol:pl-5 prose-ol:list-decimal prose-li:my-0.5",
                "prose-blockquote:border-l-2 prose-blockquote:border-[var(--accent-muted)] prose-blockquote:bg-[var(--bg-2)] prose-blockquote:py-1.5 prose-blockquote:px-3 prose-blockquote:rounded-r-lg prose-blockquote:text-[var(--text-secondary)] prose-blockquote:not-italic prose-blockquote:my-2",
                "prose-hr:border-[var(--line)] prose-hr:my-3",
                isStreaming && "streaming-cursor"
              )}>
                {parsed.beforeText && (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={markdownComponents}
                  >
                    {parsed.beforeText}
                  </ReactMarkdown>
                )}

                {(parsed.thinking || parsed.toolEvents.length > 0) && (
                  <ToolHierarchyView
                    thinking={parsed.thinking}
                    toolEvents={parsed.toolEvents}
                    isStreaming={isStreaming}
                  />
                )}

                {parsed.afterText && (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={markdownComponents}
                  >
                    {parsed.afterText}
                  </ReactMarkdown>
                )}

                {!parsed.beforeText && !parsed.afterText && parsed.toolEvents.length === 0 && !parsed.thinking && (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={markdownComponents}
                  >
                    {cleanDisplayText}
                  </ReactMarkdown>
                )}

                {hasEnableActionTag && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={15} className="text-amber-500 shrink-0" />
                      <span>GitHub Coding Mode is currently OFF. Enable it to allow repository edits.</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleEnableCodingMode}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer shrink-0"
                    >
                      Enable Coding Mode
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Zero-Pill Telemetry Strip */}
          {!isUser && (message.tokensPerSec || message.latencyMs || message.modelUsed) && (
            <div className="pt-1 pb-0.5 px-1 flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-mono tabular-nums">
              {message.modelUsed && <span>{message.modelUsed}</span>}
              {message.modelUsed && (message.tokensPerSec || message.latencyMs) && <span aria-hidden="true">·</span>}
              {message.tokensPerSec && <span>{Math.round(message.tokensPerSec)} tok/s</span>}
              {message.tokensPerSec && message.ttftMs && <span aria-hidden="true">·</span>}
              {message.ttftMs && <span>TTFT {message.ttftMs}ms</span>}
              {(message.tokensPerSec || message.ttftMs) && message.latencyMs && <span aria-hidden="true">·</span>}
              {message.latencyMs && <span>{message.latencyMs}ms</span>}
            </div>
          )}

          {/* Action Toolbar */}
          {!isEditing && message.id !== 'temp' && (
            <div className={clsx(
              "pt-0.5 px-1 flex items-center flex-wrap gap-1 text-[var(--text-muted)] opacity-90 group-hover:opacity-100 transition-opacity",
              isUser ? "flex-row-reverse" : "flex-row"
            )}>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-lg transition-colors flex items-center gap-1 text-xs cursor-pointer"
                title="Copy message"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-emerald-500" />
                    <span className="text-[11px] text-emerald-500 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span className="text-[11px] hidden sm:inline">Copy</span>
                  </>
                )}
              </button>

              {!isUser && !isStreaming && onContinue && (
                <button
                  type="button"
                  onClick={onContinue}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-lg transition-colors flex items-center gap-1 text-xs cursor-pointer font-medium"
                  title="Continue and complete this task without restarting"
                >
                  <ArrowRightCircle size={13} />
                  <span className="text-[11px]">Continue</span>
                </button>
              )}

              {!isUser && (
                <>
                  <button
                    type="button"
                    onClick={handleSpeak}
                    className={clsx(
                      "p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer",
                      isSpeaking
                        ? "text-[var(--accent)] bg-[var(--accent-soft)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                    )}
                    title={isSpeaking ? "Stop reading" : "Read aloud"}
                  >
                    {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    <span className="text-[11px] hidden sm:inline">{isSpeaking ? 'Stop' : 'Read'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLiked(liked === true ? null : true)}
                    className={clsx(
                      "p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer",
                      liked === true
                        ? "text-emerald-500 bg-emerald-500/10"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                    )}
                    title="Helpful response"
                  >
                    <ThumbsUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiked(liked === false ? null : false)}
                    className={clsx(
                      "p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer",
                      liked === false
                        ? "text-rose-500 bg-rose-500/10"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                    )}
                    title="Needs improvement"
                  >
                    <ThumbsDown size={13} />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => propOnToggleStar?.(message.id)}
                className={clsx(
                  "p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer",
                  message.isStarred
                    ? "text-amber-500"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                )}
                title={message.isStarred ? "Unstar message" : "Star message"}
              >
                <Star size={13} className={message.isStarred ? "fill-amber-500" : ""} />
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('void_ai_fork_chat', {
                    detail: { messageId: message.id }
                  }));
                }}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-lg transition-colors flex items-center gap-1 text-xs cursor-pointer"
                title="Branch thread from this message"
              >
                <GitBranch size={13} />
                <span className="text-[10px] hidden md:inline">Branch</span>
              </button>

              {isUser && onEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-lg transition-colors flex items-center gap-1 text-xs cursor-pointer"
                  title="Edit message"
                >
                  <Edit2 size={13} />
                  <span className="text-[11px] hidden sm:inline">Edit</span>
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(message.id)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Delete message"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Expanded view"
            className="max-w-full max-h-[90vh] rounded-2xl border border-white/20 shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.text === next.message.text &&
    prev.message.isStarred === next.message.isStarred &&
    prev.message.councilData === next.message.councilData &&
    prev.isStreaming === next.isStreaming &&
    prev.persona?.id === next.persona?.id &&
    prev.codingModeEnabled === next.codingModeEnabled &&
    prev.activeRepo?.repo === next.activeRepo?.repo &&
    prev.activeRepo?.branch === next.activeRepo?.branch &&
    prev.activeRepo?.owner === next.activeRepo?.owner
  );
});
