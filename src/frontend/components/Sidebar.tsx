import React from 'react';
import { Plus, MessageSquare, Trash2, Edit2, Settings, LogOut, Shield, Crown } from 'lucide-react';
import { Chat } from '../../models/types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  onLogout,
  isOpen,
  isAdmin
}: SidebarProps) {
  
  return (
    <div className={twMerge(
      clsx(
        "flex flex-col h-full bg-[#171717] transition-all duration-300 w-[260px] shrink-0 relative",
        !isOpen && "w-0 -translate-x-full overflow-hidden opacity-0"
      )
    )}>
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 bg-transparent hover:bg-zinc-800 text-zinc-100 py-3 px-3 rounded-lg transition-colors border border-zinc-700/50 hover:border-zinc-700 font-medium"
        >
          <div className="bg-zinc-100 text-zinc-900 rounded-full p-1 shadow-sm">
            <Plus size={16} strokeWidth={2.5} />
          </div>
          <span className="text-sm">New chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-0.5 mt-2">
        <div className="text-xs font-semibold text-zinc-500 px-3 py-2 mb-1">Recent</div>
        {chats.map(chat => (
          <div
            key={chat.id}
            className={clsx(
              "group relative flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-200",
              currentChatId === chat.id ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-300"
            )}
            onClick={() => onSelectChat(chat.id)}
          >
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              <span className="text-sm truncate pr-6">{chat.title}</span>
            </div>
            
            {/* Gradient overlay for long text */}
            <div className={clsx(
              "absolute right-12 top-0 bottom-0 w-8 bg-gradient-to-l from-[#171717] to-transparent group-hover:from-zinc-800",
              currentChatId === chat.id && "from-zinc-800 group-hover:from-zinc-800"
            )} />

            <div className="absolute right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800/60 pl-2 rounded-r-lg">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const newTitle = prompt("Enter new name for chat:", chat.title);
                  if (newTitle && newTitle.trim()) {
                    onRenameChat(chat.id, newTitle.trim());
                  }
                }}
                className="p-1 hover:text-zinc-100 transition-colors"
                title="Rename"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this chat?")) {
                    onDeleteChat(chat.id);
                  }
                }}
                className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 mt-auto">
        {isAdmin && (
          <button
            onClick={onOpenAdmin}
            className="w-full flex items-center gap-3 p-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <Shield size={18} />
            <span className="text-sm font-medium">Admin Panel</span>
          </button>
        )}
        <button
          onClick={onOpenSubscription}
          className="w-full flex items-center gap-3 p-3 rounded-lg text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 transition-colors"
        >
          <Crown size={18} />
          <span className="text-sm font-medium">Upgrade Plan</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 p-3 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
        >
          <Settings size={18} />
          <span className="text-sm font-medium">Settings</span>
        </button>
        <button
          onClick={onOpenSupport}
          className="w-full flex items-center gap-3 p-3 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
        >
          <MessageSquare size={18} />
          <span className="text-sm font-medium">Customer Support</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 p-3 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Log out</span>
        </button>
      </div>
    </div>
  );
}
