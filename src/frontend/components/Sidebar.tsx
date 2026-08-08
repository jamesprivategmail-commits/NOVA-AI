import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, Edit2, Settings, LogOut, Shield, Crown, Mail, Search, Sparkles, X, Send, Mic, Terminal, Lock, Cpu, Brain, Flame, Key } from 'lucide-react';
import { Chat } from '../../models/types';
import { clsx } from 'clsx';

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onClearAllHistory?: () => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
  onOpenSubscription: () => void;
  onOpenAdmin: () => void;
  onOpenCampaignGenerator: () => void;
  onOpenLiveVoice?: () => void;
  onOpenApiKeys?: () => void;
  onLogout: () => void;
  isOpen: boolean;
  isAdmin: boolean;
  isSupportStaff?: boolean;
}

export function Sidebar({
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onClearAllHistory,
  onRenameChat,
  onOpenSettings,
  onOpenSupport,
  onOpenSubscription,
  onOpenAdmin,
  onOpenCampaignGenerator,
  onOpenLiveVoice,
  onOpenApiKeys,
  onLogout,
  isOpen,
  isAdmin,
  isSupportStaff
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-40 md:relative md:z-30 flex flex-col h-full bg-[#050103] transition-transform duration-150 ease-out w-72 shrink-0 border-r border-red-950/80 shadow-[5px_0_30px_rgba(150,0,0,0.2)]",
        !isOpen && "-translate-x-full md:w-0 md:-translate-x-full overflow-hidden opacity-0 pointer-events-none"
      )}
    >
      {/* Top Header Branding & Actions */}
      <div className="p-3.5 space-y-3 border-b border-red-950/90 bg-black/90">
        <div className="flex items-center justify-between px-1 py-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black border border-red-600/80 p-0.5 shadow-[0_0_12px_rgba(220,38,38,0.4)] flex items-center justify-center">
              <img 
                src="https://i.postimg.cc/8PVBFM75/file-00000000b40c82118dbaef206a9ebedc.png" 
                alt="VOID AI Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-wider text-red-500 flex items-center gap-1.5 uppercase font-mono">
                <span>VOID AI</span>
              </div>
              <p className="text-[10px] text-red-600/80 font-mono tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                <span>ONLINE</span>
              </p>
            </div>
          </div>
        </div>

        {/* New Chat Primary Button */}
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-black border border-red-600/80 hover:bg-red-950/50 text-red-500 font-bold py-2.5 px-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.25)] text-xs font-mono uppercase tracking-wider group cursor-pointer"
        >
          <Plus size={16} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform" />
          <span>+ NEW CHAT</span>
        </button>

        {/* Navigation Shortcut Menu */}
        <div className="space-y-1 pt-1 font-mono text-xs">
          {onOpenLiveVoice && (
            <button
              onClick={onOpenLiveVoice}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors cursor-pointer text-left font-semibold"
            >
              <Mic size={14} className="text-red-500" />
              <span>Live Voice Call</span>
            </button>
          )}
          {onOpenApiKeys && (
            <button
              onClick={onOpenApiKeys}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors cursor-pointer text-left font-semibold"
            >
              <Key size={14} className="text-red-500" />
              <span>Developer API Keys</span>
            </button>
          )}
          <button
            onClick={onOpenCampaignGenerator}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-amber-400 hover:bg-red-950/30 hover:text-amber-300 transition-colors cursor-pointer text-left font-semibold"
          >
            <Mail size={14} className="text-amber-500" />
            <span>Email Studio</span>
          </button>
          <button
            onClick={onOpenSubscription}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-300 hover:bg-red-950/30 hover:text-red-300 transition-colors cursor-pointer text-left"
          >
            <Crown size={14} className="text-amber-500" />
            <span>Plans & Usage</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-300 hover:bg-red-950/30 hover:text-red-300 transition-colors cursor-pointer text-left"
          >
            <Settings size={14} className="text-red-500" />
            <span>Settings</span>
          </button>
          <button
            onClick={onOpenSupport}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-300 hover:bg-red-950/30 hover:text-red-300 transition-colors cursor-pointer text-left"
          >
            <MessageSquare size={14} className="text-red-500" />
            <span>Support Desk</span>
          </button>
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-950/40 border border-red-900/40 transition-colors cursor-pointer text-left font-bold"
            >
              <Shield size={14} className="text-red-500" />
              <span>Admin Workspace</span>
            </button>
          )}
          {isSupportStaff && !isAdmin && (
            <button
              onClick={onOpenSupport}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-emerald-400 hover:bg-red-950/40 border border-emerald-900/40 transition-colors cursor-pointer text-left font-bold"
            >
              <Shield size={14} className="text-emerald-500" />
              <span>Support Desk</span>
            </button>
          )}
          <a
            href="https://t.me/novatechco"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2 bg-black/80 border border-red-950 hover:border-red-800 text-slate-300 py-1.5 px-3 rounded-lg transition-all font-medium text-xs shadow-sm mt-1"
          >
            <Send size={13} className="-rotate-45 text-sky-400 shrink-0" />
            <div className="flex items-center justify-between w-full overflow-hidden">
              <span className="truncate text-xs text-slate-200">Telegram</span>
              <span className="text-[10px] text-sky-400 font-mono">@novatechco</span>
            </div>
          </a>
        </div>

        {/* Search Input */}
        <div className="relative pt-1">
          <Search size={13} className="absolute left-3 top-3.5 text-red-600/70" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-black/90 border border-red-900/60 text-slate-200 text-xs rounded-xl pl-8 pr-16 py-2 outline-none focus:border-red-500 transition-colors placeholder:text-red-900/80 font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 px-2 py-0.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Clear search query"
            >
              <X size={11} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-[10px] font-bold tracking-widest text-red-600 uppercase font-mono">
            Recent Conversations ({filteredChats.length})
          </span>
          {chats.length > 0 && onClearAllHistory && (
            <button
              onClick={() => {
                if (confirm('Clear all search & conversation history? This will permanently delete all your chats.')) {
                  onClearAllHistory();
                }
              }}
              className="text-[10px] text-red-500 hover:text-red-300 font-mono font-bold flex items-center gap-1 hover:underline cursor-pointer transition-colors"
              title="Clear all chat history"
            >
              <Trash2 size={11} />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {filteredChats.length === 0 ? (
          <div className="p-4 text-center text-xs text-red-900/80 font-mono">
            {searchQuery ? 'No matching chats' : 'No recent chats'}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={clsx(
                "group relative flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all text-xs font-mono",
                currentChatId === chat.id
                  ? "bg-red-950/40 text-red-200 border border-red-800/80 shadow-[0_0_12px_rgba(220,38,38,0.15)]"
                  : "text-slate-400 hover:bg-black/60 hover:text-slate-200 border border-transparent"
              )}
            >
              <div className="flex items-center gap-2.5 overflow-hidden flex-1 pr-6">
                <MessageSquare size={13} className={clsx("shrink-0", currentChatId === chat.id ? "text-red-500" : "text-red-900/80")} />
                <span className="truncate">{chat.title || 'Untitled Chat'}</span>
              </div>

              {/* Rename / Delete buttons */}
              <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 pl-1.5 rounded-lg border border-red-950">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newTitle = prompt('Enter new conversation title:', chat.title);
                    if (newTitle && newTitle.trim()) {
                      onRenameChat(chat.id, newTitle.trim());
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-white hover:bg-red-950/60 rounded transition-colors"
                  title="Rename"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this conversation?')) {
                      onDeleteChat(chat.id);
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-950/60 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Demonic Branding Footer */}
      <div className="p-3 border-t border-red-950/90 bg-black/90 space-y-2">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-red-500 hover:bg-red-950/40 border border-red-900/40 transition-colors text-xs font-mono font-bold cursor-pointer uppercase"
        >
          <div className="flex items-center gap-2">
            <LogOut size={14} />
            <span>LOG OUT</span>
          </div>
        </button>

        <div className="pt-2 border-t border-red-950/60 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-red-950/80 border border-red-700/80 p-1 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(220,38,38,0.3)]">
            <Flame size={18} className="text-red-500 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">
              NOVA TECH CO.
            </div>
            <div className="text-[8px] text-red-700 font-mono uppercase tracking-wider">
              BUILT IN THE DARK FOR THOSE WHO DARE
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
