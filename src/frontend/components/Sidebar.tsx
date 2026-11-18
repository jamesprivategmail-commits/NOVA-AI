import React, { useState } from 'react';
import {
  Plus, Search, X, Edit2, Trash2, Settings, Pin, Download,
  MessageSquare, Github, AudioLines, Sparkles, Terminal, ShieldCheck, FlaskConical
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
  onOpenSupport?: () => void;
  onOpenSubscription?: () => void;
  onOpenAdmin?: () => void;
  onOpenCampaignGenerator?: () => void;
  onOpenLiveVoice?: () => void;
  onOpenPromptStudio?: () => void;
  onOpenEvolutionCentre?: () => void;
  onOpenApiKeys?: () => void;
  onOpenTelegram?: () => void;
  isAdmin?: boolean;
  isSupportStaff?: boolean;
  walletBalance?: number;
}

/** One conversation row — consistent icon + label alignment, tactile hover tray. */
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
        'group relative flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all text-[13px] font-medium stagger-item',
        active
          ? 'accent-bar bg-[var(--accent-soft)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
          : 'text-[var(--text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[var(--text-primary)]'
      )}
      style={{ animationDelay: `${Math.min(index * 24, 300)}ms` }}
    >
      <MessageSquare
        size={13}
        className={clsx('shrink-0', active ? 'text-[var(--accent)]' : 'opacity-55 group-hover:opacity-90')}
      />
      {chat.isPinned && (
        <Pin size={11} className="text-amber-500 shrink-0 fill-amber-500 rotate-45" />
      )}
      <span className="truncate flex-1 leading-tight min-w-0 pr-2">{chat.title || 'Untitled Chat'}</span>

      {/* Hover action tray */}
      <div className="absolute right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity glass-thick px-1 py-0.5 rounded-lg">
        {onTogglePin && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            className="p-1 text-[var(--text-muted)] hover:text-amber-500 cursor-pointer transition-colors"
            title={chat.isPinned ? 'Unpin conversation' : 'Pin conversation'}
          >
            <Pin size={12} className={chat.isPinned ? 'fill-amber-500 text-amber-500' : ''} />
          </button>
        )}
        {onExport && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onExport(); }}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
            title="Export as Markdown"
          >
            <Download size={12} />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRename(); }}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          title="Rename conversation"
        >
          <Edit2 size={12} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 text-[var(--text-muted)] hover:text-rose-500 cursor-pointer transition-colors"
          title="Delete conversation"
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
  onOpenLiveVoice,
  onOpenPromptStudio,
  onOpenEvolutionCentre,
  onOpenAdmin,
  onTogglePinChat,
  onExportChat,
  onClose,
  isOpen,
  isAdmin,
  userEmail = 'mrnovatech4@gmail.com',
  userName = 'Workspace User'
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
        'fixed inset-y-0 left-0 z-40 md:relative md:z-30 flex flex-col h-full muse-glass-panel md:rounded-[28px] text-[var(--text-primary)] transition-all duration-200 ease-out w-72 shrink-0 border-r md:border border-[var(--glass-border)] text-xs select-none overflow-hidden',
        !isOpen && '-translate-x-full md:w-0 md:-translate-x-full md:border-0 overflow-hidden opacity-0 pointer-events-none'
      )}
    >
      {/* ── Brand Header ─────────────────────────────────── */}
      <div className="p-3.5 border-b border-[var(--line)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl glass border border-[var(--line-strong)] p-0.5 flex items-center justify-center overflow-hidden shadow-[var(--shadow-xs)]">
            <img
              src="/void-logo.jpg?v=3"
              alt="NOVA Muse Logo"
              className="w-full h-full object-cover rounded-[10px]"
            />
          </div>
          <div className="leading-tight">
            <span className="font-display text-base font-semibold text-[var(--text-primary)] tracking-tight block">
              NOVA <span className="text-gradient">Muse</span>
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">Spaces &amp; Threads</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsSearching(!isSearching)}
            className={clsx(
              'w-8 h-8 rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0',
              isSearching
                ? 'bg-[var(--accent-soft)] border-[var(--accent-muted)] text-[var(--text-primary)]'
                : 'glass text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
            title="Search Conversations"
          >
            <Search size={15} />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl glass text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer shrink-0 md:hidden"
              title="Close sidebar"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Search Bar ────────────────────────────────────── */}
      {isSearching && (
        <div className="p-2.5 border-b border-[var(--line)] relative animate-fadeIn">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter conversations..."
            autoFocus
            className="w-full bg-[var(--bg-2)] border border-[var(--line)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-[12px] rounded-xl pl-8 pr-8 py-2 outline-none focus:border-[var(--accent-muted)] transition-colors"
          />
          <Search size={13} className="absolute left-[18px] top-[20px] text-[var(--text-muted)]" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-[18px] top-[20px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* ── Primary Actions & Studio Modules ──────────────── */}
      <div className="p-3 border-b border-[var(--line)] space-y-2.5">
        <button
          type="button"
          onClick={onNewChat}
          className="btn btn-primary w-full py-2.5 px-3.5 text-[13px]"
        >
          <Plus size={16} />
          <span>New Conversation</span>
        </button>

        {(onOpenGitHub || onOpenPromptStudio || onOpenLiveVoice || onOpenEvolutionCentre) && (
          <div className="space-y-1.5">
            <div className="section-label px-1">Studio Workspace</div>
            <div className="grid grid-cols-2 gap-1.5">
              {onOpenGitHub && (
                <button
                  type="button"
                  onClick={onOpenGitHub}
                  className="btn btn-ghost py-2 px-2.5 justify-start text-[11px] font-semibold"
                  title="Open GitHub Repository & Workspace"
                >
                  <Github size={14} className="text-[var(--accent)] shrink-0" />
                  <span className="truncate">GitHub Repo</span>
                </button>
              )}
              {onOpenPromptStudio && (
                <button
                  type="button"
                  onClick={onOpenPromptStudio}
                  className="btn btn-ghost py-2 px-2.5 justify-start text-[11px] font-semibold"
                  title="Open System Directive & Prompt Studio"
                >
                  <Sparkles size={14} className="text-[var(--accent)] shrink-0" />
                  <span className="truncate">Directives</span>
                </button>
              )}
              {onOpenEvolutionCentre && (
                <button
                  type="button"
                  onClick={onOpenEvolutionCentre}
                  className="btn btn-ghost py-2 px-2.5 justify-start text-[11px] font-semibold col-span-2"
                  title="Open Autonomous Self-Evolution Centre"
                >
                  <FlaskConical size={14} className="text-[var(--accent)] shrink-0" />
                  <span className="truncate">Evolution Centre</span>
                </button>
              )}
              {onOpenLiveVoice && (
                <button
                  type="button"
                  onClick={onOpenLiveVoice}
                  className="btn btn-ghost py-2 px-2.5 justify-start text-[11px] font-semibold"
                  title="Start Live Voice Companion"
                >
                  <AudioLines size={14} className="text-[var(--accent)] shrink-0" />
                  <span className="truncate">Live Voice</span>
                </button>
              )}
              {isAdmin && onOpenAdmin ? (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="btn btn-ghost py-2 px-2.5 justify-start text-[11px] font-semibold"
                  title="Open Admin Control Console"
                >
                  <ShieldCheck size={14} className="text-[var(--accent)] shrink-0" />
                  <span className="truncate">Admin Panel</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="btn btn-ghost py-2 px-2.5 justify-start text-[11px] font-semibold"
                  title="Workspace Preferences"
                >
                  <Terminal size={14} className="text-[var(--accent)] shrink-0" />
                  <span className="truncate">Preferences</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Conversation Library ──────────────────────────── */}
      <div className="px-3 pt-3 pb-1.5 flex items-center justify-between">
        <span className="section-label">
          {activeFolder === 'pinned' ? 'Pinned Threads' : 'Conversations'}
          <span className="ml-1.5 font-mono normal-case tracking-normal opacity-75 tabular-nums">
            {filteredChats.length}
          </span>
        </span>
        {chats.length > 0 && onClearAllHistory && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Clear all conversation history?')) {
                onClearAllHistory();
              }
            }}
            className="text-[11px] text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer py-0.5 px-1.5 rounded-md hover:bg-rose-500/10"
            title="Clear History"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Folder Segmented Tabs */}
      <div className="px-3 pb-2 flex items-center gap-1 text-[11px] overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'All' },
          { id: 'pinned', label: 'Pinned' },
          { id: 'work', label: 'Work' },
          { id: 'dev', label: 'Dev' },
        ].map(tab => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveFolder(tab.id)}
            className={clsx(
              'px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0 font-semibold border',
              activeFolder === tab.id
                ? 'text-[var(--text-primary)] bg-[var(--accent-soft)] border-[var(--accent-muted)] shadow-[var(--shadow-xs)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 space-y-0.5 pb-2">
        {filteredChats.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-[var(--text-muted)]">
            {searchQuery ? 'No matching conversations' : 'No threads in this collection yet'}
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
                const newTitle = prompt('Rename conversation:', chat.title);
                if (newTitle && newTitle.trim()) {
                  onRenameChat(chat.id, newTitle.trim());
                }
              }}
              onDelete={() => {
                if (confirm('Delete conversation?')) {
                  onDeleteChat(chat.id);
                }
              }}
            />
          ))
        )}
      </div>

      {/* ── Account & Settings Footer ─────────────────────── */}
      <div className="p-3 border-t border-[var(--line)]">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex-1 flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer min-w-0"
            title="Open Settings & Profile"
          >
            <div className="w-9 h-9 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-muted)] text-[var(--accent)] font-bold text-[11px] flex items-center justify-center shrink-0">
              {userName ? userName.slice(0, 2).toUpperCase() : 'MU'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[var(--text-primary)] truncate leading-tight">{userName}</div>
              <div className="text-[10px] text-[var(--text-muted)] truncate leading-none mt-0.5">{userEmail}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="btn btn-ghost w-9 h-9 !p-0"
            title="Control Center & Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
