import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Key, Save, Server } from 'lucide-react';
import { clsx } from 'clsx';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [customKey, setCustomKey] = useState('');
  const [provider, setProvider] = useState('gemini');

  useEffect(() => {
    const savedKey = localStorage.getItem('NOVA_CUSTOM_KEY') || localStorage.getItem('NOVA_OPENAI_KEY') || '';
    const savedProvider = localStorage.getItem('NOVA_PROVIDER') || 'gemini';
    setCustomKey(savedKey);
    setProvider(savedProvider);
  }, []);

  const handleSave = () => {
    localStorage.setItem('NOVA_CUSTOM_KEY', customKey);
    localStorage.setItem('NOVA_PROVIDER', provider);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-zinc-800 bg-zinc-900/50">
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
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Settings</h2>
          </div>
        </div>
        
        <div className="p-4 md:p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">AI Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              <option value="gemini">Google Gemini (Default)</option>
              <option value="groq">Groq (Requires API Key)</option>
              <option value="cohere">Cohere (Requires API Key)</option>
            </select>
          </div>

          {(provider === 'groq' || provider === 'cohere') && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">API Key</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Key size={18} />
                </div>
                <input 
                  type="password"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder={`Enter your ${provider === 'groq' ? 'Groq' : 'Cohere'} key`}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Your key is stored locally in your browser and never sent to our servers, except directly to the provider.
              </p>
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Save size={18} />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
