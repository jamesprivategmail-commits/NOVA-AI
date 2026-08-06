import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, Edit2, Settings, LogOut, Shield, Crown, Mail, Search, Sparkles, X, Send, Mic } from 'lucide-react';
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
  onOpenLiveVoice?: () => void;
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
  onRenameChat,
  onOpenSettings,
  onOpenSupport,
  onOpenSubscription,
  onOpenAdmin,
  onOpenCampaignGenerator,
  onOpenLiveVoice,
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
        "fixed inset-y-0 left-0 z-40 md:relative md:z-30 flex flex-col h-full bg-[#0B0C0E] transition-transform duration-150 ease-out w-72 shrink-0 border-r border-[#1E222D]",
        !isOpen && "-translate-x-full md:w-0 md:-translate-x-full overflow-hidden opacity-0 pointer-events-none"
      )}
    >
      {/* Top Action Header */}
      <div className="p-3 space-y-2 border-b border-[#1E222D] bg-[#0A0C13]">
        <div className="flex items-center gap-2.5 px-1 py-1 mb-1">
          <img 
            src="https://i.postimg.cc/8PVBFM75/file-00000000b40c82118dbaef206a9ebedc.png" 
            alt="VOID AI Logo" 
            className="w-7 h-7 rounded-lg object-contain bg-[#0D1018] border border-[#272C3A] p-0.5 shadow-sm"
          />
          <div>
            <div className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>VOID AI</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-800 font-bold uppercase">v2.5</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">Next-Gen AI Workspace</p>
          </div>
        </div>

        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-between bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-3.5 rounded-xl transition-all shadow-sm text-xs group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Plus size={16} strokeWidth={2.5} />
            <span>New Chat</span>
          </div>
          <Sparkles size={14} className="text-red-200" />
        </button>

        <a
          href="https://t.me/novatechco"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2 bg-[#141720] border border-[#272C3A] hover:border-slate-500 text-slate-300 py-2 px-3 rounded-xl transition-all font-medium text-xs shadow-sm"
        >
          <Send size={13} className="-rotate-45 text-sky-400" />
          <div className="flex items-center justify-between w-full overflow-hidden">
            <span className="truncate text-xs font-semibold text-slate-200">Telegram Channel</span>
            <span className="text-[10px] text-sky-400 font-mono">@novatechco</span>
          </div>
        </a>

        {/* Search Input */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats or tasks..."
            className="w-full bg-[#141720] border border-[#272C3A] text-slate-200 text-xs rounded-xl pl-8 pr-16 py-2 outline-none focus:border-slate-500 transition-colors placeholder:text-slate-500 font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1.5 px-2 py-0.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
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
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase font-mono">
            Recent Chats ({filteredChats.length})
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[10px] font-bold text-red-400 hover:text-red-300 underline cursor-pointer"
            >
              Reset Search
            </button>
          )}
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
                "group relative flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all text-xs font-medium",
                currentChatId === chat.id
                  ? "bg-[#1A1D27] text-slate-100 border border-[#2B3142]"
                  : "text-slate-400 hover:bg-[#141720] hover:text-slate-200 border border-transparent"
              )}
            >
              <div className="flex items-center gap-2.5 overflow-hidden flex-1 pr-6">
                <MessageSquare size={14} className={clsx("shrink-0", currentChatId === chat.id ? "text-red-400" : "text-slate-500")} />
                <span className="truncate">{chat.title || 'Untitled Chat'}</span>
              </div>

              {/* Rename / Delete buttons */}
              <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1A1D27] pl-1.5 rounded-lg">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newTitle = prompt('Enter new conversation title:', chat.title);
                    if (newTitle && newTitle.trim()) {
                      onRenameChat(chat.id, newTitle.trim());
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-slate-100 hover:bg-[#252A38] rounded transition-colors"
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
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-[#252A38] rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Menu & Settings */}
      <div className="p-2.5 border-t border-[#1E222D] space-y-0.5 bg-[#0B0C0E]">
        {onOpenLiveVoice && (
          <button
            onClick={onOpenLiveVoice}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-red-400 hover:bg-red-950/20 transition-colors text-xs font-semibold cursor-pointer"
          >
            <Mic size={15} className="text-red-500" />
            <span>Live Voice Call</span>
          </button>
        )}
        <button
          onClick={onOpenCampaignGenerator}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl text-amber-400 hover:bg-amber-950/20 transition-colors text-xs font-semibold cursor-pointer"
        >
          <Mail size={15} className="text-amber-500" />
          <span>Email Studio</span>
        </button>
        {isAdmin && (
          <button
            onClick={onOpenAdmin}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-red-400 hover:bg-red-950/30 border border-transparent transition-colors text-xs font-bold cursor-pointer"
          >
            <Shield size={15} />
            <span>Admin Workspace</span>
          </button>
        )}
        {isSupportStaff && !isAdmin && (
          <button
            onClick={onOpenSupport}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 transition-colors text-xs font-bold cursor-pointer"
          >
            <Shield size={15} />
            <span>Support Desk</span>
          </button>
        )}
        <button
          onClick={onOpenSubscription}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-200 hover:bg-[#141720] transition-colors text-xs font-medium cursor-pointer"
        >
          <Crown size={15} className="text-amber-400" />
          <span>Plans & Usage</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-300 hover:bg-[#141720] transition-colors text-xs font-medium cursor-pointer"
        >
          <Settings size={15} />
          <span>Settings</span>
        </button>
        <button
          onClick={onOpenSupport}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-300 hover:bg-[#141720] transition-colors text-xs font-medium cursor-pointer"
        >
          <MessageSquare size={15} />
          <span>Support Desk</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors text-xs font-medium cursor-pointer"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
