import React, { useState } from 'react';
import { 
  Plus, Search, X, Edit2, Trash2, Settings, User
} from 'lucide-react';
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
  onLogout?: () => void;
  isOpen: boolean;
  userEmail?: string;
  userName?: string;
  // Optional legacy props
  onOpenSupport?: () => void;
  onOpenSubscription?: () => void;
  onOpenAdmin?: () => void;
  onOpenCampaignGenerator?: () => void;
  onOpenLiveVoice?: () => void;
  onOpenApiKeys?: () => void;
  onOpenTelegram?: () => void;
  isAdmin?: boolean;
  isSupportStaff?: boolean;
  walletBalance?: number;
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
  isOpen,
  userEmail = 'mrnovatech4@gmail.com',
  userName = 'Mr nova tech'
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-40 md:relative md:z-30 flex flex-col h-full bg-[#09090b] text-slate-100 transition-all duration-200 ease-out w-64 sm:w-72 shrink-0 border-r border-red-950/60 shadow-2xl font-sans text-xs select-none",
        !isOpen && "-translate-x-full md:w-0 md:-translate-x-full overflow-hidden opacity-0 pointer-events-none"
      )}
    >
      {/* Top Drawer Header - Compact */}
      <div className="p-3 border-b border-zinc-800/80 bg-black flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-black border border-red-800 p-0.5 flex items-center justify-center shadow-[0_0_10px_rgba(220,38,38,0.3)]">
            <img 
              src="https://i.postimg.cc/8PVBFM75/file-00000000b40c82118dbaef206a9ebedc.png" 
              alt="VOID Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-black text-sm tracking-wider text-red-500 font-mono uppercase">
            VOID AI
          </span>
        </div>

        <button 
          onClick={() => setIsSearching(!isSearching)}
          className={clsx(
            "w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer",
            isSearching 
              ? "bg-red-950 border-red-700 text-red-400" 
              : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white"
          )}
          title="Search Conversations"
        >
          <Search size={14} />
        </button>
      </div>

      {/* Expandable Compact Search Input */}
      {isSearching && (
        <div className="p-2 bg-zinc-950 border-b border-zinc-800/80 animate-fadeIn relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recent chats..."
            autoFocus
            className="w-full bg-zinc-900 border border-zinc-700 text-slate-100 text-[11px] rounded-lg pl-7 pr-7 py-1.5 outline-none focus:border-red-500 font-mono"
          />
          <Search size={12} className="absolute left-4 top-3.5 text-zinc-400" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-3.5 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Primary Action: New Chat */}
      <div className="p-2.5 border-b border-zinc-800/80 bg-zinc-950/40">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-3 rounded-lg transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] cursor-pointer text-xs uppercase tracking-wider"
        >
          <Plus size={15} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Recents Section Header - Compact */}
      <div className="px-3 pt-3 pb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase font-mono">
          Recent Conversations
        </span>
        {chats.length > 0 && onClearAllHistory && (
          <button
            onClick={() => {
              if (confirm('Clear all conversation history?')) {
                onClearAllHistory();
              }
            }}
            className="text-[10px] text-zinc-500 hover:text-red-400 font-mono transition-colors cursor-pointer"
            title="Clear History"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {filteredChats.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-zinc-500 font-mono italic">
            {searchQuery ? 'No matching conversations' : 'No recent chats'}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={clsx(
                "group relative flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all text-xs font-medium border",
                currentChatId === chat.id
                  ? "bg-red-950/60 border-red-800/80 text-white font-semibold shadow-sm"
                  : "bg-transparent border-transparent hover:bg-zinc-900/80 hover:border-zinc-800 text-zinc-300 hover:text-white"
              )}
            >
              <span className="truncate pr-4 flex-1 text-[11px] leading-tight">{chat.title || 'Untitled Chat'}</span>

              <div className="absolute right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 px-1 py-0.5 rounded border border-zinc-700 shadow-sm">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newTitle = prompt('Rename chat:', chat.title);
                    if (newTitle && newTitle.trim()) {
                      onRenameChat(chat.id, newTitle.trim());
                    }
                  }}
                  className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                  title="Rename"
                >
                  <Edit2 size={11} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete chat?')) {
                      onDeleteChat(chat.id);
                    }
                  }}
                  className="p-1 text-zinc-400 hover:text-red-400 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Footer Control Bar */}
      <div className="p-2.5 border-t border-zinc-800/80 bg-black flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          {/* User Profile Info & Open Settings */}
          <button
            onClick={onOpenSettings}
            className="flex-1 flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all text-left cursor-pointer min-w-0"
            title="Open Settings & Profile"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-900 to-black border border-red-700/80 text-red-300 font-bold text-[11px] flex items-center justify-center shrink-0 font-mono shadow">
              {userName ? userName.slice(0, 2).toUpperCase() : 'MT'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-white truncate leading-tight">{userName}</div>
              <div className="text-[9px] text-zinc-400 truncate leading-none font-mono mt-0.5">{userEmail}</div>
            </div>
          </button>

          {/* Quick Settings Icon Button */}
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Settings & Control Center"
          >
            <Settings size={15} />
          </button>
        </div>

        {/* Demonic Branding Footer */}
        <div className="pt-2 border-t border-red-950/80 text-center font-mono text-[9px] text-red-500/70 tracking-widest leading-relaxed uppercase">
          <div>NOVA TECH CO.</div>
          <div className="text-[8px] text-zinc-600">BUILT IN THE DARK</div>
          <div className="text-[8px] text-red-600/80 font-bold">FOR THOSE WHO DARE</div>
        </div>
      </div>
    </aside>
  );
}
