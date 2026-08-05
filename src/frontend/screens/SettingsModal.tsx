import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Key, Save, Server, Shield, Lock } from 'lucide-react';
import { clsx } from 'clsx';

interface SettingsModalProps {
  onClose: () => void;
  isAdmin?: boolean;
}

export function SettingsModal({ onClose, isAdmin = false }: SettingsModalProps) {
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
              className="flex items-center gap-2 p-2 mr-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
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
          {!isAdmin ? (
            <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
                <Lock size={18} />
                <span>Centralized API Key & Brain Security</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                API Key management and AI Brain System rules are restricted strictly to the <span className="text-zinc-200 font-semibold font-mono">System Administrator</span>.
              </p>
              <div className="p-3 bg-red-950/30 border border-red-900/30 rounded-lg text-[11px] text-zinc-400 font-mono">
                Status: System Key & AI Brain Managed by Admin
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400 font-semibold">
                <Shield size={16} />
                <span>ADMIN ACCESS ENABLED: API Key Control</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">AI Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm"
                >
                  <option value="gemini">Google Gemini (Default System Key)</option>
                  <option value="groq">Groq (Requires Custom API Key)</option>
                  <option value="cohere">Cohere (Requires Custom API Key)</option>
                </select>
              </div>

              {(provider === 'groq' || provider === 'cohere') && (
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Custom API Key</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <Key size={18} />
                    </div>
                    <input 
                      type="password"
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm font-mono"
                      placeholder={`Enter custom ${provider === 'groq' ? 'Groq' : 'Cohere'} API key`}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleSave}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-950/50"
              >
                <Save size={18} />
                Save API Configuration
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

