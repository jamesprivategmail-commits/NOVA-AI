import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
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
    <div
      className={clsx(
        "group w-full py-2.5 px-3 sm:px-4 transition-colors",
        isUser ? "bg-transparent" : "bg-[#1a1a1c]"
      )}
    >
      <div className={clsx(
        "max-w-3xl mx-auto flex w-full gap-2.5 relative items-start",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#252527] flex items-center justify-center text-white text-xs font-bold">
              <User size={14} />
            </div>
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#202022] border border-[#38383b] p-1 flex items-center justify-center">
              <img 
                src="https://i.postimg.cc/8PVBFM75/file-00000000b40c82118dbaef206a9ebedc.png" 
                alt="VOID AI" 
                className="w-full h-full object-contain"
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
            "flex items-center gap-1.5 sm:gap-2 mb-0.5",
            isUser ? "flex-row-reverse" : "flex-row"
          )}>
            <span className={clsx("text-xs font-semibold", isUser ? "text-white" : "text-white")}>
              {isUser ? 'You' : 'VOID AI'}
            </span>
            <span className="text-[10px] text-[#8d8d91]">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Edit Mode vs Content */}
          {isEditing ? (
            <div className="w-full mt-1 space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-[#252527] border border-[#38383b] focus:border-[#454547] rounded-xl p-3 text-white min-h-[110px] outline-none text-sm"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-medium text-[#8d8d91] hover:text-white bg-[#202022] hover:bg-[#38383b] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 text-xs font-medium bg-[#3f86ff] hover:opacity-90 text-white rounded-lg transition-all cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className={clsx(
              "text-sm leading-relaxed w-full",
              isUser
                ? "bg-[#252527] text-white rounded-2xl rounded-tr-sm p-3.5 sm:p-4 max-w-[95%] sm:max-w-[85%] text-left"
                : "bg-transparent text-white w-full max-w-none text-left"
            )}>
              <div className={clsx(
                "prose prose-invert max-w-none text-sm leading-relaxed w-full",
                "prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight",
                "prose-h1:text-base sm:prose-h1:text-lg prose-h1:mt-2.5 prose-h1:mb-1.5 prose-h1:border-b prose-h1:border-[#38383b] prose-h1:pb-1.5",
                "prose-h2:text-sm sm:prose-h2:text-base prose-h2:mt-2.5 prose-h2:mb-1",
                "prose-h3:text-sm prose-h3:mt-2 prose-h3:mb-1",
                "prose-p:my-1.5 prose-p:leading-relaxed",
                "prose-ul:my-1.5 prose-ul:pl-4 sm:prose-ul:pl-5 prose-ul:list-disc prose-li:my-0.5",
                "prose-ol:my-1.5 prose-ol:pl-4 sm:prose-ol:pl-5 prose-ol:list-decimal prose-li:my-0.5",
                "prose-blockquote:border-l-2 prose-blockquote:border-[#3f86ff] prose-blockquote:bg-[#252527] prose-blockquote:py-1.5 prose-blockquote:px-3 prose-blockquote:rounded-r-lg prose-blockquote:text-[#8d8d91] prose-blockquote:not-italic prose-blockquote:my-2",
                "prose-hr:border-[#38383b] prose-hr:my-3",
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
                      if (!props.src) return null;
                      return (
                        <span className="my-2 relative group inline-block max-w-full">
                          <img
                            src={props.src}
                            alt={props.alt || 'Generated asset'}
                            className="rounded-lg border border-[#30363D] max-h-56 object-cover shadow-lg hover:brightness-110 transition-all cursor-pointer"
                            onClick={() => props.src && setPreviewImage(props.src)}
                          />
                        </span>
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
                className="p-1.5 text-[#8d8d91] hover:text-white hover:bg-[#252527] rounded-md transition-colors flex items-center gap-1 text-xs"
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
                      liked === true ? "text-emerald-400 bg-emerald-950/40" : "text-[#8d8d91] hover:text-white hover:bg-[#252527]"
                    )}
                    title="Good response"
                  >
                    <ThumbsUp size={14} />
                  </button>
                  <button
                    onClick={() => setLiked(liked === false ? null : false)}
                    className={clsx(
                      "p-1.5 rounded-md transition-colors text-xs flex items-center gap-1",
                      liked === false ? "text-rose-400 bg-rose-950/40" : "text-[#8d8d91] hover:text-white hover:bg-[#252527]"
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
                  className="p-1.5 text-[#8d8d91] hover:text-white hover:bg-[#252527] rounded-md transition-colors flex items-center gap-1 text-xs"
                  title="Edit message"
                >
                  <Edit2 size={14} />
                  <span className="text-[11px] hidden sm:inline">Edit</span>
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => onDelete(message.id)}
                  className="p-1.5 text-[#8d8d91] hover:text-rose-400 hover:bg-[#252527] rounded-md transition-colors"
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
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Expanded view"
            className="max-w-full max-h-[90vh] rounded-2xl border border-[#30363D] shadow-2xl"
          />
        </div>
      )}
    </div>
  );
});
