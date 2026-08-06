import React, { useState, useEffect, useRef } from 'react';
import { SupportMessage, UserProfile } from '../../models/types';
import { sendSupportMessage, listenToSupportMessages, markSupportChatRead } from '../../database/db';
import { ArrowLeft, Send, Shield, User, Maximize2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SupportChatScreenProps {
  userId: string;
  userName: string;
  onClose: () => void;
  isAdminView?: boolean;
  targetUserId?: string;
  targetUserName?: string;
  onExpandFullScreen?: () => void;
}

export function SupportChatScreen({ userId, userName, onClose, isAdminView = false, targetUserId, targetUserName, onExpandFullScreen }: SupportChatScreenProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  
  const chatUserId = isAdminView ? (targetUserId || '') : userId;
  const chatUserName = isAdminView ? (targetUserName || '') : userName;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatUserId) return;
    
    // Mark as read initially
    markSupportChatRead(chatUserId, isAdminView);
    
    const unsubscribe = listenToSupportMessages(chatUserId, (msgs) => {
      setMessages(msgs);
      markSupportChatRead(chatUserId, isAdminView);
    });

    return () => unsubscribe();
  }, [chatUserId, isAdminView]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatUserId) return;
    
    const text = inputText.trim();
    setInputText('');
    
    await sendSupportMessage(chatUserId, chatUserName, text, isAdminView);
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-[#0d0d10] text-zinc-100 z-10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose} 
            className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors text-xs font-semibold"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-100">
                {isAdminView ? `Support Ticket: ${chatUserName}` : 'VOID AI Support Desk'}
              </h2>
              {isAdminView ? (
                <span className="px-2 py-0.5 rounded-full bg-red-950 border border-red-800/60 text-red-400 text-[10px] font-mono font-bold">
                  ADMIN REPLY MODE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800/60 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Support
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              {isAdminView ? `User ID: ${chatUserId}` : 'Instant direct line to VOID AI Support Team'}
            </p>
          </div>
        </div>

        {onExpandFullScreen && (
          <button
            type="button"
            onClick={onExpandFullScreen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
            title="Open Full Page Chat Screen"
          >
            <Maximize2 size={14} />
            <span>Full Screen Chat</span>
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto p-6">
            <div className="w-14 h-14 bg-red-950/40 border border-red-800/40 rounded-2xl flex items-center justify-center mb-3 text-red-400">
              <Shield size={28} />
            </div>
            <h3 className="text-base font-bold mb-1 text-zinc-100">
              {isAdminView ? 'No Messages Yet' : 'How can we help?'}
            </h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              {isAdminView 
                ? 'Type a message below to initiate contact with this user.'
                : 'Have questions about tier upgrades, payment requests, or custom features? Send us a message and our support staff will reply in real-time.'}
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = (isAdminView && msg.isAdmin) || (!isAdminView && !msg.isAdmin);
            const messageTime = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            
            return (
              <div key={msg.id} className={twMerge(clsx("flex w-full gap-2.5", isMe ? "justify-end" : "justify-start"))}>
                {!isMe && (
                  <div className={clsx(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border",
                    msg.isAdmin 
                      ? "bg-red-950 border-red-700/60 text-red-400" 
                      : "bg-zinc-800 border-zinc-700 text-zinc-300"
                  )}>
                    {msg.isAdmin ? <Shield size={14} /> : <User size={14} />}
                  </div>
                )}
                
                <div className="max-w-[80%] space-y-1">
                  <div className={clsx(
                    "rounded-2xl px-4 py-2.5 text-xs md:text-sm leading-relaxed shadow-sm",
                    isMe 
                      ? "bg-red-600 text-white rounded-tr-xs font-normal" 
                      : msg.isAdmin
                        ? "bg-red-950/80 border border-red-800/60 text-red-100 rounded-tl-xs"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-xs"
                  )}>
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>
                  {messageTime && (
                    <div className={clsx("text-[10px] text-zinc-500 font-mono px-1", isMe ? "text-right" : "text-left")}>
                      {messageTime} {msg.isAdmin && !isMe ? '• Official Admin' : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950">
        <div className="relative flex items-center bg-zinc-900 rounded-xl border border-zinc-800 focus-within:border-red-600/70 overflow-hidden transition-all">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isAdminView ? `Reply to ${chatUserName}...` : "Type support message..."}
            className="flex-1 bg-transparent py-3 pl-3.5 pr-12 outline-none text-xs md:text-sm text-zinc-100 placeholder:text-zinc-500"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="absolute right-1.5 p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg disabled:opacity-40 disabled:bg-zinc-800 transition-colors shadow-md"
            title="Send Message"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
