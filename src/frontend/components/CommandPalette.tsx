import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Terminal, Code2, Sparkles, Plus, Trash2, Download, 
  GitBranch, Mic, Settings, Sliders, ArrowRight, X, Cpu, MessageSquare, Shield
} from 'lucide-react';
import { Chat } from '../../models/types';
import { NOVA_PERSONAS } from '../models/personas';
import { NovaOrb } from './NovaOrb';
import { clsx } from 'clsx';

export interface CommandItem {
  id: string;
  category: 'Actions' | 'Characters' | 'Tools' | 'Chats' | 'Presets';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Chat[];
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onClearHistory: () => void;
  onOpenSettings: () => void;
  onOpenWorkspace: (tab?: string) => void;
  onSelectModel: (provider: 'groq' | 'cohere' | 'bazaarlink' | 'gemini', model: string, personaId?: string) => void;
  onOpenPromptStudio: () => void;
  onOpenLiveVoice: () => void;
  onExportCurrentChat?: () => void;
  onToggleCodingMode?: () => void;
  codingModeEnabled?: boolean;
}

export function CommandPalette({
  isOpen,
  onClose,
  chats,
  onSelectChat,
  onNewChat,
  onClearHistory,
  onOpenSettings,
  onOpenWorkspace,
  onSelectModel,
  onOpenPromptStudio,
  onOpenLiveVoice,
  onExportCurrentChat,
  onToggleCodingMode,
  codingModeEnabled,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allItems: CommandItem[] = [
    {
      id: 'action-new-chat',
      category: 'Actions',
      title: 'New Conversation',
      subtitle: 'Start a fresh context session',
      icon: <Plus size={15} style={{ color: 'var(--accent)' }} />,
      shortcut: '⌘N',
      onSelect: () => { onNewChat(); onClose(); },
    },
    ...NOVA_PERSONAS.map((persona) => ({
      id: `persona-${persona.id}`,
      category: 'Characters' as const,
      title: `Switch to ${persona.name} · ${persona.role}`,
      subtitle: `${persona.personality} (${persona.engine})`,
      icon: <NovaOrb size={18} persona={persona} />,
      onSelect: () => { onSelectModel(persona.provider, persona.modelId, persona.id); onClose(); },
    })),
    {
      id: 'action-workspace-editor',
      category: 'Tools',
      title: 'Code Workspace & Editor',
      subtitle: 'Interactive split-pane code editor and file inspector',
      icon: <Code2 size={15} className="text-emerald-500" />,
      shortcut: '⌘E',
      onSelect: () => { onOpenWorkspace('editor'); onClose(); },
    },
    {
      id: 'action-workspace-terminal',
      category: 'Tools',
      title: 'Interactive Terminal & Sandbox',
      subtitle: 'Execute shell commands, run tests, and inspect processes',
      icon: <Terminal size={15} className="text-amber-500" />,
      shortcut: '⌘T',
      onSelect: () => { onOpenWorkspace('terminal'); onClose(); },
    },
    {
      id: 'action-workspace-rungraph',
      category: 'Tools',
      title: 'Agent Execution Run-Graph',
      subtitle: 'Inspect live multi-step coding pipeline and task timeline',
      icon: <Sparkles size={15} className="text-purple-500" />,
      onSelect: () => { onOpenWorkspace('rungraph'); onClose(); },
    },
    {
      id: 'action-workspace-git',
      category: 'Tools',
      title: 'Git Branching & Commit Creator',
      subtitle: 'Branch, stage, and commit workspace changes',
      icon: <GitBranch size={15} className="text-orange-500" />,
      onSelect: () => { onOpenWorkspace('git'); onClose(); },
    },
    {
      id: 'action-workspace-playground',
      category: 'Tools',
      title: 'Live Code Playground & Regex Tester',
      subtitle: 'Evaluate JavaScript snippets and regex patterns',
      icon: <Code2 size={15} className="text-cyan-500" />,
      onSelect: () => { onOpenWorkspace('playground'); onClose(); },
    },
    {
      id: 'action-workspace-memory',
      category: 'Tools',
      title: 'Context Window & Memory Manager',
      subtitle: 'Inspect token budget, continuity state, and project memory',
      icon: <Cpu size={15} className="text-indigo-500" />,
      onSelect: () => { onOpenWorkspace('memory'); onClose(); },
    },
    {
      id: 'action-voice-dictation',
      category: 'Actions',
      title: 'Live Voice Companion',
      subtitle: 'Natural hands-free spoken dialogue',
      icon: <Mic size={15} className="text-rose-500" />,
      onSelect: () => { onOpenLiveVoice(); onClose(); },
    },
    {
      id: 'action-prompt-studio',
      category: 'Presets',
      title: 'Prompt & Directive Studio',
      subtitle: 'Choose specialist roles or customize system instructions',
      icon: <Sliders size={15} className="text-amber-500" />,
      onSelect: () => { onOpenPromptStudio(); onClose(); },
    },
    {
      id: 'action-export-chat',
      category: 'Actions',
      title: 'Export Conversation to Markdown',
      subtitle: 'Download active thread transcript as .md',
      icon: <Download size={15} className="text-[var(--text-secondary)]" />,
      onSelect: () => { onExportCurrentChat?.(); onClose(); },
    },
    {
      id: 'action-toggle-agent',
      category: 'Actions',
      title: codingModeEnabled ? 'Disable GitHub Coding Mode' : 'Enable GitHub Coding Mode',
      subtitle: 'Toggle direct repository write operations',
      icon: <Shield size={15} className={codingModeEnabled ? "text-emerald-500" : "text-[var(--text-muted)]"} />,
      onSelect: () => { onToggleCodingMode?.(); onClose(); },
    },
    {
      id: 'action-settings',
      category: 'Actions',
      title: 'Settings & Control Center',
      subtitle: 'API keys, GitHub integrations, and preferences',
      icon: <Settings size={15} className="text-[var(--text-secondary)]" />,
      onSelect: () => { onOpenSettings(); onClose(); },
    },
    {
      id: 'action-clear-all',
      category: 'Actions',
      title: 'Clear All Conversation History',
      subtitle: 'Permanently erase saved chat history',
      icon: <Trash2 size={15} className="text-rose-500" />,
      onSelect: () => { onClearHistory(); onClose(); },
    },
    ...chats.slice(0, 8).map(chat => ({
      id: `chat-${chat.id}`,
      category: 'Chats' as const,
      title: chat.title || 'Untitled Session',
      subtitle: `Updated ${new Date(chat.updatedAt || chat.createdAt).toLocaleDateString()}`,
      icon: <MessageSquare size={15} className="text-[var(--text-muted)]" />,
      onSelect: () => { onSelectChat(chat.id); onClose(); },
    })),
  ];

  const filtered = allItems.filter(item => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/55 backdrop-blur-md animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-xl glass-thick rounded-3xl overflow-hidden flex flex-col z-10 select-none text-[var(--text-primary)] animate-riseIn"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--line)]">
          <Search size={18} className="text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Switch to Shii or Shiia, run tools, or search conversations..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="kbd hidden sm:inline-block">ESC</kbd>
        </div>

        <div className="max-h-[380px] overflow-y-auto p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)] text-xs font-medium">
              No matching commands, Muse characters, or conversations found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={clsx(
                    "flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all border",
                    isSelected
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]"
                  )}
                  style={isSelected ? { background: 'var(--accent-soft)', borderColor: 'var(--accent-muted)' } : undefined}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl glass flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-normal">
                          · {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.shortcut && <kbd className="kbd">{item.shortcut}</kbd>}
                    {isSelected && <ArrowRight size={13} style={{ color: 'var(--accent)' }} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2.5 glass-subtle border-t border-[var(--line)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span><kbd className="kbd">↑↓</kbd> navigate</span>
            <span><kbd className="kbd">↵</kbd> run</span>
          </div>
          <div className="font-mono text-[10px]">
            Muse Command Launcher
          </div>
        </div>
      </div>
    </div>
  );
}
