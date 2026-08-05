import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { motion } from 'motion/react';
import { Bot, User, Copy, Check, Trash2, Edit2, ExternalLink, ThumbsUp, ThumbsDown, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Message } from '../../models/types';
import { CodeBlock } from './CodeBlock';
import { clsx } from 'clsx';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, text: string) => void;
}

export const MessageBubble = React.memo(function MessageBubble({ message, isStreaming = false, onDelete, onEdit }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={clsx(
        "group w-full py-4 px-3 md:px-6 transition-colors",
        isUser ? "bg-transparent" : "bg-[#161B22]/30 border-y border-[#21262D]/30"
      )}
    >
      <div className={clsx(
        "max-w-4xl mx-auto flex w-full gap-3 md:gap-4 relative items-start",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-red-800 border border-red-500/50 flex items-center justify-center text-white shadow-md">
              <User size={16} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-red-400 shadow-lg">
              <Bot size={17} />
            </div>
          )}
        </div>

        {/* Content Container */}
        <div className={clsx(
          "flex-1 overflow-hidden min-w-0 space-y-1.5 flex flex-col",
          isUser ? "items-end" : "items-start"
        )}>
          {/* Header info */}
          <div className={clsx(
            "flex items-center gap-2",
            isUser ? "flex-row-reverse" : "flex-row"
          )}>
            <span className={clsx("text-xs font-bold tracking-wide", isUser ? "text-red-400" : "text-zinc-200 font-mono")}>
              {isUser ? 'YOU' : 'VOID AI'}
            </span>
            {!isUser && (
              <span className="px-1.5 py-0.2 rounded bg-red-950/60 border border-red-800/40 text-[10px] text-red-400 font-mono">
                AI ENGINE
              </span>
            )}
            <span className="text-[11px] text-zinc-500 font-mono">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Edit Mode vs Content */}
          {isEditing ? (
            <div className="w-full mt-2 space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-[#161B22] border border-[#30363D] focus:border-red-500 rounded-xl p-3 text-slate-100 min-h-[110px] outline-none text-sm font-sans"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-[#21262D] hover:bg-[#30363D] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-md shadow-red-950/50"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className={clsx(
              "rounded-2xl p-4 text-sm md:text-[15px] leading-relaxed shadow-sm",
              isUser
                ? "bg-gradient-to-r from-red-950/80 to-red-900/70 border border-red-800/60 text-white rounded-tr-xs max-w-[85%] md:max-w-[75%] text-left"
                : "bg-[#161B22]/90 border border-[#30363D] text-slate-200 rounded-tl-xs w-full max-w-none text-left"
            )}>
              <div className={clsx(
                "prose prose-invert max-w-none text-sm md:text-[15px] leading-relaxed",
                "prose-headings:text-slate-100 prose-headings:font-bold prose-headings:tracking-tight",
                "prose-h1:text-xl prose-h1:mt-4 prose-h1:mb-2 prose-h1:border-b prose-h1:border-[#30363D] prose-h1:pb-2",
                "prose-h2:text-lg prose-h2:mt-4 prose-h2:mb-2",
                "prose-h3:text-base prose-h3:mt-3 prose-h3:mb-1",
                "prose-p:my-2 prose-p:leading-relaxed",
                "prose-ul:my-2 prose-ul:pl-5 prose-ul:list-disc prose-li:my-1",
                "prose-ol:my-2 prose-ol:pl-5 prose-ol:list-decimal prose-li:my-1",
                "prose-blockquote:border-l-4 prose-blockquote:border-red-600 prose-blockquote:bg-[#161B22] prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:text-slate-300 prose-blockquote:not-italic prose-blockquote:my-3",
                "prose-hr:border-[#30363D] prose-hr:my-4",
                isStreaming && "streaming-cursor"
              )}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code(props) {
                      const { children, className, node, ref, ...rest } = props;
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');

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
                          className="bg-[#21262D] text-sky-300 px-1.5 py-0.5 rounded text-xs font-mono border border-[#30363D] inline-block"
                        >
                          {children}
                        </code>
                      );
                    },
                    table(props) {
                      return (
                        <div className="overflow-x-auto my-4 border border-[#30363D] rounded-xl shadow-md">
                          <table className="w-full text-left text-sm text-slate-200 border-collapse">
                            {props.children}
                          </table>
                        </div>
                      );
                    },
                    thead(props) {
                      return <thead className="bg-[#161B22] border-b border-[#30363D] text-xs font-semibold uppercase text-slate-300">{props.children}</thead>;
                    },
                    th(props) {
                      return <th className="px-4 py-2.5 font-bold border-r border-[#30363D] last:border-r-0">{props.children}</th>;
                    },
                    td(props) {
                      return <td className="px-4 py-2 border-t border-[#30363D] border-r border-[#30363D] last:border-r-0 hover:bg-[#21262D]/50 transition-colors">{props.children}</td>;
                    },
                    a(props) {
                      return (
                        <a
                          href={props.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline underline-offset-4 inline-flex items-center gap-1 font-medium transition-colors"
                        >
                          {props.children}
                          <ExternalLink size={12} className="shrink-0" />
                        </a>
                      );
                    },
                    img(props) {
                      return (
                        <div className="my-3 relative group inline-block max-w-full">
                          <img
                            src={props.src}
                            alt={props.alt || 'Generated asset'}
                            className="rounded-xl border border-[#30363D] max-h-96 object-cover shadow-lg hover:brightness-105 transition-all cursor-pointer"
                            onClick={() => props.src && setPreviewImage(props.src)}
                          />
                          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-md rounded-md text-[10px] text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ImageIcon size={12} />
                            <span>Click to view</span>
                          </div>
                        </div>
                      );
                    }
                  }}
                >
                  {message.text}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Action Toolbar */}
          {!isEditing && message.id !== 'temp' && (
            <div className={clsx(
              "pt-1 flex items-center gap-1 text-slate-400 opacity-90 group-hover:opacity-100 transition-opacity",
              isUser ? "flex-row-reverse" : "flex-row"
            )}>
              <button
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-[#21262D] rounded-md transition-colors flex items-center gap-1 text-xs"
                title="Copy text"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span className="text-[11px] text-emerald-400 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span className="text-[11px] hidden sm:inline">Copy</span>
                  </>
                )}
              </button>

              {!isUser && (
                <>
                  <button
                    onClick={() => setLiked(liked === true ? null : true)}
                    className={clsx(
                      "p-1.5 rounded-md transition-colors text-xs flex items-center gap-1",
                      liked === true ? "text-emerald-400 bg-emerald-950/40" : "text-slate-400 hover:text-white hover:bg-[#21262D]"
                    )}
                    title="Good response"
                  >
                    <ThumbsUp size={14} />
                  </button>
                  <button
                    onClick={() => setLiked(liked === false ? null : false)}
                    className={clsx(
                      "p-1.5 rounded-md transition-colors text-xs flex items-center gap-1",
                      liked === false ? "text-rose-400 bg-rose-950/40" : "text-slate-400 hover:text-white hover:bg-[#21262D]"
                    )}
                    title="Poor response"
                  >
                    <ThumbsDown size={14} />
                  </button>
                </>
              )}

              {isUser && onEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-[#21262D] rounded-md transition-colors flex items-center gap-1 text-xs"
                  title="Edit message"
                >
                  <Edit2 size={14} />
                  <span className="text-[11px] hidden sm:inline">Edit</span>
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => onDelete(message.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#21262D] rounded-md transition-colors"
                  title="Delete message"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Expanded view"
            className="max-w-full max-h-[90vh] rounded-2xl border border-[#30363D] shadow-2xl"
          />
        </div>
      )}
    </motion.div>
  );
});
