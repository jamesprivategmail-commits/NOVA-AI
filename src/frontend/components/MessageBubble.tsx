import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Bot, User, Copy, Check, Trash2, Edit2 } from 'lucide-react';
import { Message } from '../../models/types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface MessageBubbleProps {
  message: Message;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, text: string) => void;
}

export function MessageBubble({ message, onDelete, onEdit }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

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
    <div className={twMerge(clsx("group flex w-full py-6 px-4 md:px-6 lg:px-8", isUser ? "bg-transparent" : "bg-transparent"))}>
      <div className="max-w-3xl mx-auto flex w-full gap-4 md:gap-5 relative">
        <div className={clsx("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1", isUser ? "bg-zinc-700" : "bg-[#10a37f]")}>
          {isUser ? <User size={16} className="text-zinc-200" /> : <Bot size={16} className="text-white" />}
        </div>
        <div className="flex-1 overflow-hidden min-w-0">
          <div className="font-semibold text-zinc-100 mb-1 text-[15px]">
            {isUser ? 'You' : 'NOVA AI'}
          </div>
          
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-[#2f2f2f] border border-zinc-700 rounded-lg p-3 text-zinc-100 min-h-[100px] outline-none focus:border-zinc-500 text-sm"
              />
              <div className="flex items-center gap-2 mt-2 justify-end">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-zinc-300 hover:text-zinc-100 bg-[#2f2f2f] rounded-lg">Cancel</button>
                <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-[#10a37f] text-white rounded-lg hover:bg-[#10a37f]/90">Save</button>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-zinc-200 prose-p:leading-7 prose-pre:my-0 prose-pre:bg-[#0d0d0d] prose-pre:border prose-pre:border-zinc-800/50 prose-a:text-blue-400">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code(props) {
                    const {children, className, node, ref, ...rest} = props;
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                      <div className="rounded-md my-4 overflow-hidden border border-zinc-800/50 bg-[#0d0d0d]">
                        <div className="flex items-center justify-between px-4 py-2 bg-[#2f2f2f] text-xs text-zinc-400 font-mono">
                          <span>{match[1]}</span>
                        </div>
                        <SyntaxHighlighter
                          {...rest}
                          PreTag="div"
                          children={String(children).replace(/\n$/, '')}
                          language={match[1]}
                          style={vscDarkPlus as any}
                          customStyle={{ margin: 0, background: 'transparent', padding: '1rem' }}
                        />
                      </div>
                    ) : (
                      <code {...rest} className={clsx("bg-zinc-800 px-1.5 py-0.5 rounded-md text-sm text-zinc-200 font-mono", className)}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Hover Actions */}
        {!isEditing && message.id !== 'temp' && (
          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[#212121] pl-2 pb-2 rounded-bl-lg">
            <button
              onClick={handleCopy}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
              title="Copy"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
            {isUser && onEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
