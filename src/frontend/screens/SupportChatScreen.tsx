import React, { useState, useEffect, useRef } from 'react';
import { SupportMessage, UserProfile } from '../../models/types';
import { sendSupportMessage, listenToSupportMessages, markSupportChatRead } from '../../database/db';
import { ArrowLeft, Send, Shield, User } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SupportChatScreenProps {
  userId: string;
  userName: string;
  onClose: () => void;
  isAdminView?: boolean;
  targetUserId?: string;
  targetUserName?: string;
}

export function SupportChatScreen({ userId, userName, onClose, isAdminView = false, targetUserId, targetUserName }: SupportChatScreenProps) {
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
    <div className="flex flex-col h-full bg-[#212121] absolute inset-0 z-40">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800 bg-[#171717]">
        <button onClick={onClose} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
          <ArrowLeft size={20} />
          <span className="font-medium text-sm hidden sm:inline">Back</span>
        </button>
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            {isAdminView ? `Support Chat: ${chatUserName}` : 'Customer Support'}
          </h2>
          <p className="text-xs text-zinc-500">
            {isAdminView ? chatUserId : 'We typically reply within a few hours'}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
              <Shield size={28} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-zinc-100">
              {isAdminView ? 'No messages yet' : 'How can we help?'}
            </h3>
            <p className="text-zinc-400 text-sm">
              {isAdminView 
                ? 'Start the conversation with this user.'
                : 'Having issues with payments, account limits, or need a top-up? Send us a message and our admin team will help you right away.'}
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = (isAdminView && msg.isAdmin) || (!isAdminView && !msg.isAdmin);
            
            return (
              <div key={msg.id} className={twMerge(clsx("flex w-full gap-3", isMe ? "justify-end" : "justify-start"))}>
                {!isMe && (
                  <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", msg.isAdmin ? "bg-blue-600" : "bg-zinc-700")}>
                    {msg.isAdmin ? <Shield size={16} className="text-white" /> : <User size={16} className="text-zinc-300" />}
                  </div>
                )}
                
                <div className={clsx(
                  "max-w-[75%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
                  isMe ? "bg-[#10a37f] text-white rounded-tr-sm" : "bg-zinc-800 text-zinc-200 rounded-tl-sm"
                )}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-zinc-800 bg-[#171717]">
        <div className="max-w-3xl mx-auto relative flex items-center bg-[#2f2f2f] rounded-xl border border-zinc-700 focus-within:border-zinc-500 overflow-hidden">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message..."
            className="flex-1 bg-transparent py-4 pl-4 pr-12 outline-none text-zinc-100 placeholder:text-zinc-500"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="absolute right-2 p-2 bg-[#10a37f] hover:bg-[#10a37f]/90 text-white rounded-lg disabled:opacity-50 disabled:bg-zinc-600 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
