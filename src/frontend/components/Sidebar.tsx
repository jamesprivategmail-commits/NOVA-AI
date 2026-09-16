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
        "fixed inset-y-0 left-0 z-40 md:relative md:z-30 flex flex-col h-full bg-[#1a1a1c] text-white transition-all duration-200 ease-out w-64 sm:w-72 shrink-0 border-r border-[#38383b] text-xs select-none",
        !isOpen && "-translate-x-full md:w-0 md:-translate-x-full overflow-hidden opacity-0 pointer-events-none"
      )}
    >
      {/* Top Drawer Header */}
      <div className="p-3 border-b border-[#38383b] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#202022] border border-[#38383b] p-0.5 flex items-center justify-center">
            <img 
              src="https://i.postimg.cc/8PVBFM75/file-00000000b40c82118dbaef206a9ebedc.png" 
              alt="VOID Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-bold text-sm text-white">
            VOID AI
          </span>
        </div>

        <button 
          onClick={() => setIsSearching(!isSearching)}
          className={clsx(
            "w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer",
            isSearching 
              ? "bg-[#252527] border-[#454547] text-white" 
              : "bg-[#202022] hover:bg-[#252527] border-[#38383b] text-[#8d8d91] hover:text-white"
          )}
          title="Search Conversations"
        >
          <Search size={14} />
        </button>
      </div>

      {/* Expandable Search Input */}
      {isSearching && (
        <div className="p-2 border-b border-[#38383b] relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recent chats..."
            autoFocus
            className="w-full bg-[#202022] border border-[#38383b] text-white text-[11px] rounded-lg pl-7 pr-7 py-1.5 outline-none focus:border-[#454547]"
          />
          <Search size={12} className="absolute left-4 top-3.5 text-[#8d8d91]" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-3.5 text-[#8d8d91] hover:text-white cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Primary Action: New Chat */}
      <div className="p-2.5 border-b border-[#38383b]">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-[#3f86ff] hover:opacity-90 text-white font-medium py-2 px-3 rounded-lg transition-all cursor-pointer text-xs"
        >
          <Plus size={15} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Recents Section Header */}
      <div className="px-3 pt-3 pb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium text-[#8d8d91] uppercase tracking-wide">
          Recent
        </span>
        {chats.length > 0 && onClearAllHistory && (
          <button
            onClick={() => {
              if (confirm('Clear all conversation history?')) {
                onClearAllHistory();
              }
            }}
            className="text-[10px] text-[#8d8d91] hover:text-white transition-colors cursor-pointer"
            title="Clear History"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {filteredChats.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-[#8d8d91]">
            {searchQuery ? 'No matching conversations' : 'No recent chats'}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={clsx(
                "group relative flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all text-xs font-medium",
                currentChatId === chat.id
                  ? "bg-[#252527] text-white"
                  : "hover:bg-[#202022] text-[#8d8d91] hover:text-white"
              )}
            >
              <span className="truncate pr-4 flex-1 text-[11px] leading-tight">{chat.title || 'Untitled Chat'}</span>

              <div className="absolute right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#252527] px-1 py-0.5 rounded">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newTitle = prompt('Rename chat:', chat.title);
                    if (newTitle && newTitle.trim()) {
                      onRenameChat(chat.id, newTitle.trim());
                    }
                  }}
                  className="p-1 text-[#8d8d91] hover:text-white cursor-pointer"
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
                  className="p-1 text-[#8d8d91] hover:text-rose-400 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Footer */}
      <div className="p-2.5 border-t border-[#38383b] flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onOpenSettings}
            className="flex-1 flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#202022] transition-all text-left cursor-pointer min-w-0"
            title="Open Settings & Profile"
          >
            <div className="w-7 h-7 rounded-full bg-[#3f86ff] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
              {userName ? userName.slice(0, 2).toUpperCase() : 'MT'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-white truncate leading-tight">{userName}</div>
              <div className="text-[9px] text-[#8d8d91] truncate leading-none mt-0.5">{userEmail}</div>
            </div>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-lg bg-[#202022] hover:bg-[#252527] text-[#8d8d91] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Settings & Control Center"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
