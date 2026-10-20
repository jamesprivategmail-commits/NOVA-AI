import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Terminal, Code2, Sparkles, Plus, Trash2, Download, 
  GitBranch, Mic, Settings, Sliders, ArrowRight, X, Cpu, MessageSquare, BookOpen, Shield
} from 'lucide-react';
import { Chat } from '../../models/types';
import { clsx } from 'clsx';

export interface CommandItem {
  id: string;
  category: 'Actions' | 'Models' | 'Tools' | 'Chats' | 'Presets';
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
  onSelectModel: (provider: 'groq' | 'cohere' | 'bazaarlink', model: string) => void;
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
    // 1. Quick Actions
    {
      id: 'action-new-chat',
      category: 'Actions',
      title: 'New Conversation',
      subtitle: 'Start a fresh context session',
      icon: <Plus size={15} className="text-blue-400" />,
      shortcut: '⌘N',
      onSelect: () => { onNewChat(); onClose(); },
    },
    {
      id: 'action-workspace-editor',
      category: 'Tools',
      title: 'Open Code Workspace & Editor',
      subtitle: 'Interactive split-pane code editor and file inspector',
      icon: <Code2 size={15} className="text-emerald-400" />,
      shortcut: '⌘E',
      onSelect: () => { onOpenWorkspace('editor'); onClose(); },
    },
    {
      id: 'action-workspace-terminal',
      category: 'Tools',
      title: 'Open Interactive Terminal & Sandbox',
      subtitle: 'Execute shell commands, run tests, and inspect processes',
      icon: <Terminal size={15} className="text-amber-400" />,
      shortcut: '⌘T',
      onSelect: () => { onOpenWorkspace('terminal'); onClose(); },
    },
    {
      id: 'action-workspace-rungraph',
      category: 'Tools',
      title: 'Agent Execution Run-Graph',
      subtitle: 'Inspect live multi-step coding pipeline and task timeline',
      icon: <Sparkles size={15} className="text-purple-400" />,
      onSelect: () => { onOpenWorkspace('rungraph'); onClose(); },
    },
    {
      id: 'action-workspace-git',
      category: 'Tools',
      title: 'Git Branching & GitHub Commit Creator',
      subtitle: 'One-click branch, staging, and pull request generation',
      icon: <GitBranch size={15} className="text-orange-400" />,
      onSelect: () => { onOpenWorkspace('git'); onClose(); },
    },
    {
      id: 'action-workspace-playground',
      category: 'Tools',
      title: 'Live Code Playground & Regex Tester',
      subtitle: 'Run JS/TS snippets and evaluate regex patterns instantly',
      icon: <Code2 size={15} className="text-cyan-400" />,
      onSelect: () => { onOpenWorkspace('playground'); onClose(); },
    },
    {
      id: 'action-workspace-memory',
      category: 'Tools',
      title: 'Context Window & Memory Manager',
      subtitle: 'Inspect token budget, compress context, and manage persistent memory',
      icon: <Cpu size={15} className="text-indigo-400" />,
      onSelect: () => { onOpenWorkspace('memory'); onClose(); },
    },
    {
      id: 'action-voice-dictation',
      category: 'Actions',
      title: 'Voice Push-to-Talk Dictation',
      subtitle: 'Speak your prompt with real-time speech-to-text',
      icon: <Mic size={15} className="text-rose-400" />,
      onSelect: () => { onOpenLiveVoice(); onClose(); },
    },
    {
      id: 'action-prompt-studio',
      category: 'Presets',
      title: 'Prompt Engineering Studio',
      subtitle: 'Switch AI Persona: Senior Architect, Security Auditor, Prototyper',
      icon: <Sliders size={15} className="text-amber-400" />,
      onSelect: () => { onOpenPromptStudio(); onClose(); },
    },
    {
      id: 'action-export-chat',
      category: 'Actions',
      title: 'Export Conversation to Markdown',
      subtitle: 'Save active chat transcript as .md document',
      icon: <Download size={15} className="text-slate-300" />,
      onSelect: () => { onExportCurrentChat?.(); onClose(); },
    },
    {
      id: 'action-toggle-agent',
      category: 'Actions',
      title: codingModeEnabled ? 'Disable Autonomous Coding Mode' : 'Enable Autonomous Coding Mode',
      subtitle: 'Toggle direct GitHub repo write operations',
      icon: <Shield size={15} className={codingModeEnabled ? "text-emerald-400" : "text-slate-400"} />,
      onSelect: () => { onToggleCodingMode?.(); onClose(); },
    },
    {
      id: 'action-settings',
      category: 'Actions',
      title: 'Open Settings & Integrations',
      subtitle: 'Configure API keys, GitHub tokens, and appearance',
      icon: <Settings size={15} className="text-slate-300" />,
      onSelect: () => { onOpenSettings(); onClose(); },
    },
    {
      id: 'action-clear-all',
      category: 'Actions',
      title: 'Clear All Conversation History',
      subtitle: 'Permanently erase all chat messages',
      icon: <Trash2 size={15} className="text-rose-400" />,
      onSelect: () => { onClearHistory(); onClose(); },
    },

    // 2. Models Matrix Hot-Switching
    {
      id: 'model-groq-llama33',
      category: 'Models',
      title: 'Groq Llama 3.3 70B Versatile',
      subtitle: 'Ultra-fast inference ~320 tokens/sec, best for general coding and logic',
      icon: <Cpu size={15} className="text-blue-400" />,
      onSelect: () => { onSelectModel('groq', 'llama-3.3-70b-versatile'); onClose(); },
    },
    {
      id: 'model-groq-llama31-8b',
      category: 'Models',
      title: 'Groq Llama 3.1 8B Instant',
      subtitle: 'Sub-100ms TTFT, ~850 tokens/sec, optimal for rapid prototyping',
      icon: <Cpu size={15} className="text-cyan-400" />,
      onSelect: () => { onSelectModel('groq', 'llama-3.1-8b-instant'); onClose(); },
    },
    {
      id: 'model-cohere-r-plus',
      category: 'Models',
      title: 'Cohere Command R+',
      subtitle: 'Extended 128k context, specialized in enterprise tool calls and search',
      icon: <Cpu size={15} className="text-purple-400" />,
      onSelect: () => { onSelectModel('cohere', 'command-r-plus'); onClose(); },
    },
    {
      id: 'model-bazaarlink-deepseek',
      category: 'Models',
      title: 'BazaarLink DeepSeek R1 Reasoning',
      subtitle: 'Chain-of-thought mathematical and algorithmic verification',
      icon: <Cpu size={15} className="text-emerald-400" />,
      onSelect: () => { onSelectModel('bazaarlink', 'deepseek-r1'); onClose(); },
    },

    // 3. Recent Chats Navigation
    ...chats.slice(0, 8).map(chat => ({
      id: `chat-${chat.id}`,
      category: 'Chats' as const,
      title: chat.title || 'Untitled Session',
      subtitle: `Opened ${new Date(chat.updatedAt || chat.createdAt).toLocaleDateString()}`,
      icon: <MessageSquare size={15} className="text-slate-400" />,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-xl bg-[#14151a] border border-[#2a2d39] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 select-none text-white"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#242733]">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, search chats, tools, or switch models..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-[#1e2029] border border-[#2e313f] rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-transparent">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-medium">
              No matching commands or conversations found.
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
                    "flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                    isSelected 
                      ? "bg-[#202330] text-white" 
                      : "text-slate-300 hover:bg-[#1a1c24] hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={clsx(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                      isSelected ? "bg-[#272b3c] border-[#3a3f55]" : "bg-[#181a22] border-[#262835]"
                    )}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          · {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-[#191b24] border border-[#2a2d3b] rounded">
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <ArrowRight size={13} className="text-blue-400" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2 bg-[#101116] border-t border-[#222530] flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono text-[10px] text-slate-400">↑↓</kbd> to navigate</span>
            <span><kbd className="font-mono text-[10px] text-slate-400">↵</kbd> to select</span>
          </div>
          <div className="font-mono text-[10px]">
            VOID AI 2026 Core
          </div>
        </div>
      </div>
    </div>
  );
}
