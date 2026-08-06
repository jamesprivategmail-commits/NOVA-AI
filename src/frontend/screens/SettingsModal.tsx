import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Key, Save, Server, Shield, Lock, Zap, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

interface SettingsModalProps {
  onClose: () => void;
  isAdmin?: boolean;
  onClearHistory?: () => void;
}

export function SettingsModal({ onClose, isAdmin = false, onClearHistory }: SettingsModalProps) {
  const [customKey, setCustomKey] = useState('');
  const [provider, setProvider] = useState('gemini');

  useEffect(() => {
    const savedKey = localStorage.getItem('NOVA_CUSTOM_KEY') || localStorage.getItem('NOVA_OPENAI_KEY') || '';
    const savedProvider = localStorage.getItem('NOVA_PROVIDER') || 'gemini';
    setCustomKey(savedKey);
    setProvider(savedProvider);
  }, []);

  const handleSave = () => {
    if (isAdmin) {
      localStorage.setItem('NOVA_CUSTOM_KEY', customKey);
      localStorage.setItem('NOVA_PROVIDER', provider);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="flex items-center gap-2 p-2 mr-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft size={20} />
              <span className="font-medium text-sm hidden sm:inline">Back</span>
            </button>
            <div className="p-2 bg-zinc-800 rounded-lg hidden sm:block">
              <Server size={20} className="text-zinc-300" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">System Settings</h2>
          </div>
        </div>
        
        <div className="p-4 md:p-6 space-y-6">
          <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4">
            <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
              <Zap size={18} className="text-red-500" />
              <span>Dedicated AI Engine: Groq High-Speed Intelligence</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This system is exclusively powered by the <span className="text-slate-100 font-bold">Groq LLaMA-3 Intelligence Pipeline</span> for ultra-fast generation speeds.
            </p>
            <div className="p-3 bg-red-950/40 border border-red-900/40 rounded-lg text-xs text-zinc-300 font-mono space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">AI Model:</span>
                <span className="text-red-400 font-bold">Groq LLaMA 3.1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Key Storage:</span>
                <span className="text-emerald-400 font-bold">Server-Side Hardcoded</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Tier Brain Rules:</span>
                <span className="text-amber-400 font-bold">Active & Configured</span>
              </div>
            </div>
          </div>

          {/* Data & History Management */}
          {onClearHistory && (
            <div className="p-5 bg-zinc-950 border border-red-950 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <Trash2 size={18} className="text-red-500" />
                <span>Clear Data & Chat History</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Permanently delete all your AI chat logs, saved searches, and active task history.
              </p>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete all your search tasks and chat history? This cannot be undone.')) {
                    onClearHistory();
                    onClose();
                  }
                }}
                className="w-full py-2.5 px-4 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 font-mono font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Trash2 size={14} />
                <span>Clear Search Tasks & Chat History</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

