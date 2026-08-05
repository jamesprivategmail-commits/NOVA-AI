import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, Edit2, Settings, LogOut, Shield, Crown, Mail, Search, Sparkles, X, Send } from 'lucide-react';
import { Chat } from '../../models/types';
import { clsx } from 'clsx';

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
  onOpenSubscription: () => void;
  onOpenAdmin: () => void;
  onOpenCampaignGenerator: () => void;
  onLogout: () => void;
  isOpen: boolean;
  isAdmin: boolean;
}

export function Sidebar({
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onOpenSettings,
  onOpenSupport,
  onOpenSubscription,
  onOpenAdmin,
  onOpenCampaignGenerator,
  onLogout,
  isOpen,
  isAdmin
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-40 md:relative md:z-30 flex flex-col h-full bg-[#0D1117] transition-all duration-300 w-72 shrink-0 border-r border-[#30363D]",
        !isOpen && "-translate-x-full md:w-0 md:-translate-x-full overflow-hidden opacity-0 pointer-events-none"
      )}
    >
      {/* Top Action Header */}
      <div className="p-3.5 space-y-2.5 border-b border-[#30363D]">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-between bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-2.5 px-3.5 rounded-xl transition-all shadow-md shadow-red-950/40 text-sm group"
        >
          <div className="flex items-center gap-2.5">
            <Plus size={18} strokeWidth={2.5} />
            <span>New Conversation</span>
          </div>
          <Sparkles size={16} className="text-red-200 group-hover:rotate-12 transition-transform" />
        </button>

        <a
          href="https://t.me/novatechco"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2.5 bg-[#0088cc]/15 border border-[#0088cc]/35 hover:border-[#0088cc]/60 hover:bg-[#0088cc]/25 text-[#38bdf8] py-2 px-3 rounded-xl transition-all font-semibold text-xs shadow-sm group"
        >
          <div className="p-1 bg-[#0088cc]/30 rounded-lg text-white">
            <Send size={14} className="-rotate-45" />
          </div>
          <div className="flex flex-col text-left overflow-hidden">
            <span className="truncate text-[11px] font-bold text-slate-100">Join Telegram Channel</span>
            <span className="truncate text-[10px] text-[#38bdf8] font-mono">@novatechco</span>
          </div>
        </a>

        <button
          onClick={onOpenCampaignGenerator}
          className="w-full flex items-center gap-2.5 bg-[#161B22] border border-[#30363D] hover:border-red-500/50 text-slate-200 py-2.5 px-3 rounded-xl transition-all font-semibold text-xs shadow-sm group"
        >
          <div className="p-1 bg-red-950/70 border border-red-800/40 rounded-lg text-red-400">
            <Mail size={15} />
          </div>
          <span className="truncate">Email Campaign Studio</span>
        </button>

        {/* Search Input */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-[#161B22] border border-[#30363D] text-slate-200 text-xs rounded-xl pl-8 pr-7 py-2 outline-none focus:border-slate-500 transition-colors placeholder-slate-500 font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        <div className="text-[11px] font-bold tracking-wider text-slate-500 uppercase px-3 py-1.5 font-mono">
          Recent Chats ({filteredChats.length})
        </div>

        {filteredChats.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 font-mono">
            {searchQuery ? 'No matching chats' : 'No recent chats'}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={clsx(
                "group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all text-xs font-medium",
                currentChatId === chat.id
                  ? "bg-[#161B22] text-slate-100 border border-[#30363D] font-semibold"
                  : "text-slate-400 hover:bg-[#161B22]/60 hover:text-slate-200 border border-transparent"
              )}
            >
              <div className="flex items-center gap-2.5 overflow-hidden flex-1 pr-6">
                <MessageSquare size={14} className={clsx("shrink-0", currentChatId === chat.id ? "text-red-400" : "text-slate-500")} />
                <span className="truncate">{chat.title || 'Untitled Conversation'}</span>
              </div>

              {/* Rename / Delete buttons */}
              <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#161B22] pl-2 rounded-lg">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newTitle = prompt('Enter new conversation title:', chat.title);
                    if (newTitle && newTitle.trim()) {
                      onRenameChat(chat.id, newTitle.trim());
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-slate-100 hover:bg-[#21262D] rounded transition-colors"
                  title="Rename"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this conversation?')) {
                      onDeleteChat(chat.id);
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-[#21262D] rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Menu & Settings */}
      <div className="p-3 border-t border-[#30363D] space-y-1 bg-[#0D1117]">
        {isAdmin && (
          <button
            onClick={onOpenAdmin}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-900/40 transition-colors text-xs font-bold"
          >
            <Shield size={16} />
            <span>Admin Control Panel</span>
          </button>
        )}
        <button
          onClick={onOpenSubscription}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl text-amber-400 hover:bg-amber-950/30 border border-transparent hover:border-amber-900/40 transition-colors text-xs font-semibold"
        >
          <Crown size={16} />
          <span>Subscription Plans</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-300 hover:bg-[#161B22] transition-colors text-xs font-medium"
        >
          <Settings size={16} />
          <span>System Settings</span>
        </button>
        <button
          onClick={onOpenSupport}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-300 hover:bg-[#161B22] transition-colors text-xs font-medium"
        >
          <MessageSquare size={16} />
          <span>Live Support</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors text-xs font-medium"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
