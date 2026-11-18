import React, { useState } from 'react';
import {
  Plus, Search, X, Edit2, Trash2, Settings, Pin, Download, MessageSquare, Github
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
  onOpenGitHub?: () => void;
  onLogout?: () => void;
  onTogglePinChat?: (id: string, isPinned: boolean) => void;
  onExportChat?: (id: string) => void;
  onClose?: () => void;
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

/** One conversation row — consistent icon + label alignment, hover action tray. */
function ChatRow({
  chat,
  active,
  index,
  onSelect,
  onTogglePin,
  onExport,
  onRename,
  onDelete,
}: {
  chat: Chat;
  active: boolean;
  index: number;
  onSelect: () => void;
  onTogglePin?: () => void;
  onExport?: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={clsx(
        'group relative flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-colors text-[13px] font-medium stagger-item',
        active
          ? 'accent-bar bg-[var(--accent-soft)] text-[var(--text-primary)]'
          : 'text-[var(--text-secondary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]'
      )}
      style={{ animationDelay: `${Math.min(index * 28, 350)}ms` }}
    >
      <MessageSquare
        size={13}
        className={clsx('shrink-0', active ? 'text-[var(--accent)]' : 'opacity-60 group-hover:opacity-90')}
      />
      {chat.isPinned && (
        <Pin size={11} className="text-amber-400 shrink-0 fill-amber-400 rotate-45" />
      )}
      <span className="truncate flex-1 leading-tight min-w-0 pr-2">{chat.title || 'Untitled Chat'}</span>

      {/* Hover action tray */}
      <div className="absolute right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-2)] border border-[var(--line)] px-0.5 py-0.5 rounded-lg shadow-md">
        {onTogglePin && (
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            className="p-1 text-[var(--text-muted)] hover:text-amber-400 cursor-pointer transition-colors"
            title={chat.isPinned ? 'Unpin chat' : 'Pin chat to top'}
          >
            <Pin size={12} className={chat.isPinned ? 'fill-amber-400' : ''} />
          </button>
        )}
        {onExport && (
          <button
            onClick={(e) => { e.stopPropagation(); onExport(); }}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
            title="Export chat as Markdown"
          >
            <Download size={12} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onRename(); }}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          title="Rename"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer transition-colors"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
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
  onOpenGitHub,
  onTogglePinChat,
  onExportChat,
  onClose,
  isOpen,
  userEmail = 'mrnovatech4@gmail.com',
  userName = 'Mr nova tech'
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string>('all');

  const filteredChats = chats
    .filter(chat => {
      const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeFolder === 'all') return true;
      if (activeFolder === 'pinned') return !!chat.isPinned;
      return chat.folder?.toLowerCase() === activeFolder;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40 md:relative md:z-30 flex flex-col h-full glass-strong text-[#1F1E1D] transition-all duration-200 ease-out w-64 sm:w-72 shrink-0 border-r border-[var(--line)] text-xs select-none',
        !isOpen && '-translate-x-full md:w-0 md:-translate-x-full overflow-hidden opacity-0 pointer-events-none'
      )}
    >
      {/* ── Brand ─────────────────────────────────────────── */}
      <div className="p-3.5 border-b border-[var(--line)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/70 border border-[var(--line)] p-0.5 flex items-center justify-center overflow-hidden shadow-[var(--shadow-xs)]">
            <img
              src="/void-logo.jpg?v=3"
              alt="VOID Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-display text-base font-medium text-[var(--text-primary)] tracking-tight">
            VOID <span className="text-gradient">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsSearching(!isSearching)}
            className={clsx(
              'w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0',
              isSearching
                ? 'bg-[var(--bg-3)] border-[var(--line-strong)] text-[var(--text-primary)]'
                : 'bg-white/[0.03] hover:bg-white/[0.07] border-[var(--line)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
            title="Search Conversations"
          >
            <Search size={16} />
          </button>

          {/* Close drawer on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-[var(--line)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer shrink-0 md:hidden"
              title="Close sidebar"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────── */}
      {isSearching && (
        <div className="p-2.5 border-b border-[var(--line)] relative animate-fadeIn">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recent chats..."
            autoFocus
            className="w-full bg-[var(--bg-2)] border border-[var(--line)] text-[var(--text-primary)] text-[12px] rounded-lg pl-8 pr-8 py-2 outline-none focus:border-[var(--accent-muted)] transition-colors"
          />
          <Search size={13} className="absolute left-[18px] top-[19px] text-[var(--text-muted)]" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-[18px] top-[19px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────── */}
      <div className="p-3 border-b border-[var(--line)] space-y-2">
        <button
          onClick={onNewChat}
          className="btn btn-primary w-full py-2.5 px-3.5 text-[13px]"
        >
          <Plus size={17} />
          <span>New Chat</span>
        </button>

        {onOpenGitHub && (
          <button
            onClick={onOpenGitHub}
            className="btn btn-ghost w-full justify-between p-2 px-2.5 text-xs"
            title="Open GitHub Workspace & Settings"
          >
            <span className="flex items-center gap-2 min-w-0">
              <Github size={15} className="text-[var(--accent)] shrink-0" />
              <span className="font-semibold text-[11px] truncate">GitHub Workspace</span>
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">Workspace</span>
          </button>
        )}
      </div>

      {/* ── Chats ─────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-1.5 flex items-center justify-between">
        <span className="section-label">
          {activeFolder === 'pinned' ? 'Pinned' : 'Chats'}
          <span className="ml-1.5 font-mono normal-case tracking-normal opacity-70">{filteredChats.length}</span>
        </span>
        {chats.length > 0 && onClearAllHistory && (
          <button
            onClick={() => {
              if (confirm('Clear all conversation history?')) {
                onClearAllHistory();
              }
            }}
            className="text-[11px] text-[var(--text-muted)] hover:text-rose-300 transition-colors cursor-pointer py-0.5 px-1.5 rounded hover:bg-white/[0.05]"
            title="Clear History"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter segmented control */}
      <div className="px-3 pb-1.5 flex items-center gap-1 text-[11px] overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'All' },
          { id: 'pinned', label: 'Pinned' },
          { id: 'work', label: 'Work' },
          { id: 'dev', label: 'Dev' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFolder(tab.id)}
            className={clsx(
              'px-2 py-1 rounded-md transition-colors cursor-pointer shrink-0 font-medium',
              activeFolder === tab.id
                ? 'text-[var(--text-primary)] bg-[var(--accent-soft)] border border-[var(--accent-muted)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 space-y-0.5">
        {filteredChats.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-[var(--text-muted)]">
            {searchQuery ? 'No matching conversations' : 'No chats in this folder'}
          </div>
        ) : (
          filteredChats.map((chat, index) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              active={currentChatId === chat.id}
              index={index}
              onSelect={() => onSelectChat(chat.id)}
              onTogglePin={onTogglePinChat ? () => onTogglePinChat(chat.id, !chat.isPinned) : undefined}
              onExport={onExportChat ? () => onExportChat(chat.id) : undefined}
              onRename={() => {
                const newTitle = prompt('Rename chat:', chat.title);
                if (newTitle && newTitle.trim()) {
                  onRenameChat(chat.id, newTitle.trim());
                }
              }}
              onDelete={() => {
                if (confirm('Delete chat?')) {
                  onDeleteChat(chat.id);
                }
              }}
            />
          ))
        )}
      </div>

      {/* ── Account ───────────────────────────────────────── */}
      <div className="p-3 border-t border-[var(--line)]">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onOpenSettings}
            className="flex-1 flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white/[0.05] transition-colors text-left cursor-pointer min-w-0"
            title="Open Settings & Profile"
          >
            <div className="w-9 h-9 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-muted)] text-[var(--accent-hover)] font-semibold text-[11px] flex items-center justify-center shrink-0">
              {userName ? userName.slice(0, 2).toUpperCase() : 'MT'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-[var(--text-primary)] truncate leading-tight">{userName}</div>
              <div className="text-[10px] text-[var(--text-muted)] truncate leading-none mt-0.5">{userEmail}</div>
            </div>
          </button>

          <button
            onClick={onOpenSettings}
            className="btn btn-ghost w-9 h-9 !p-0"
            title="Settings & Control Center"
          >
            <Settings size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}
