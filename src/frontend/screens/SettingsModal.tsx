import React, { useState } from 'react';
import { 
  ArrowLeft, Edit3, Sliders, Database, Cpu, Briefcase, Sparkles, Shield, 
  Mail, Sun, Palette, Bell, Key, Radio, Wallet, Bot, AudioLines, 
  HelpCircle, MessageSquare, LogOut, ChevronDown, ChevronRight, Trash2, Check, Send, Crown, ExternalLink
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
  isAdmin?: boolean;
  onClearHistory?: () => void;
  userEmail?: string;
  userName?: string;
  onLogout?: () => void;
  onOpenSubscription?: () => void;
  onOpenApiKeys?: () => void;
  onOpenSupport?: () => void;
  onOpenAdmin?: () => void;
  onOpenCampaignGenerator?: () => void;
  onOpenLiveVoice?: () => void;
  onOpenTelegram?: () => void;
  walletBalance?: number;
}

export function SettingsModal({ 
  onClose, 
  isAdmin = false, 
  onClearHistory,
  userEmail = 'mrnovatech4@gmail.com',
  userName = 'Mr nova tech',
  onLogout,
  onOpenSubscription,
  onOpenApiKeys,
  onOpenSupport,
  onOpenAdmin,
  onOpenCampaignGenerator,
  onOpenLiveVoice,
  onOpenTelegram,
  walletBalance = 0
}: SettingsModalProps) {
  const [appearance, setAppearance] = useState('Dark (VOID)');
  const [accentColor, setAccentColor] = useState('Crimson Red');
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isAccentOpen, setIsAccentOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(userName);

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-y-auto font-sans text-slate-100 flex flex-col text-xs select-none">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-red-900/80 px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-[0_0_25px_rgba(220,38,38,0.25)]">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-300 hover:text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer shadow-[0_0_12px_rgba(220,38,38,0.3)] group font-mono"
            title="Back to chat"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="uppercase tracking-wider">Back</span>
          </button>
          
          <div className="h-4 w-px bg-red-900/60 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black tracking-widest text-red-500 uppercase font-mono drop-shadow-[0_0_12px_rgba(220,38,38,0.6)]">
              CONTROL CENTER & SETTINGS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/80 border border-red-900/80 text-red-400 font-mono font-bold shadow">
            v2.4 DEMONIC
          </span>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 max-w-xl mx-auto w-full p-3 sm:p-5 space-y-4 pb-12">

        {/* 1. PROFILE SECTION */}
        <div className="bg-gradient-to-b from-red-950/40 via-zinc-950 to-black border border-red-900/70 rounded-2xl p-3.5 space-y-3 shadow-[0_0_20px_rgba(220,38,38,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              USER PROFILE
            </span>
            <button 
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="text-[10px] text-red-400 hover:text-white flex items-center gap-1 cursor-pointer font-mono"
            >
              <Edit3 size={11} />
              <span>{isEditingProfile ? 'Cancel' : 'Edit'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-900 via-black to-zinc-950 border border-red-600 flex items-center justify-center text-red-300 font-bold text-base shadow-[0_0_20px_rgba(220,38,38,0.4)] font-mono shrink-0">
              {displayName.slice(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              {isEditingProfile ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-black border border-red-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-red-500 font-sans"
                  />
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold cursor-pointer font-mono"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <h2 className="text-sm font-bold text-white tracking-tight truncate flex items-center gap-2 font-mono">
                  <span>{displayName}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-800 uppercase font-mono">OPERATOR</span>
                </h2>
              )}
              <p className="text-[11px] text-red-400/90 font-mono truncate mt-0.5">{userEmail}</p>
            </div>
          </div>
        </div>

        {/* 2. VOID AI PREFERENCES */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-red-500 px-1 block uppercase tracking-widest font-mono">
            VOID AI PREFERENCES
          </span>
          <div className="bg-gradient-to-b from-red-950/30 via-zinc-950 to-black border border-red-900/60 rounded-2xl overflow-hidden divide-y divide-red-950/60 shadow-[0_0_15px_rgba(220,38,38,0.1)]">
            <div 
              onClick={() => alert('Personalization set to: GOD MODE System Rules Active.')}
              className="p-3 flex items-center justify-between hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Sliders size={16} className="text-red-500 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-100 block font-mono">Personalization & System Prompt</span>
                  <span className="text-[10px] text-red-400/80 font-mono">Persona set to DEMONIC GOD MODE Engine</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-red-500/60" />
            </div>

            <div 
              onClick={() => {
                if (onClearHistory) onClearHistory();
              }}
              className="p-3 flex items-center justify-between hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Database size={16} className="text-red-400 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-100 block font-mono">Memory & Chat History Logs</span>
                  <span className="text-[10px] text-red-400/80 font-mono">Manage saved session memory</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-red-500/60" />
            </div>
          </div>
        </div>

        {/* 3. ACCOUNT & BILLING */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-red-500 px-1 block uppercase tracking-widest font-mono">
            ACCOUNT & BILLING
          </span>
          <div className="bg-gradient-to-b from-red-950/30 via-zinc-950 to-black border border-red-900/60 rounded-2xl overflow-hidden divide-y divide-red-950/60 shadow-[0_0_15px_rgba(220,38,38,0.1)]">
            {/* Wallet Balance Card */}
            <div 
              onClick={() => {
                if (onOpenSubscription) { onClose(); onOpenSubscription(); }
              }}
              className="p-3 flex items-center justify-between hover:bg-red-950/40 transition-colors cursor-pointer bg-red-950/20"
            >
              <div className="flex items-center gap-2.5">
                <Wallet size={16} className="text-red-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-red-400 block font-mono">Wallet Balance</span>
                  <span className="text-[11px] font-mono font-black text-white">₦{walletBalance.toLocaleString()}</span>
                </div>
              </div>
              <button className="px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer uppercase tracking-wider shadow-[0_0_10px_rgba(220,38,38,0.4)] font-mono">
                Fund Wallet
              </button>
            </div>

            {/* Subscription Upgrade */}
            <div 
              onClick={() => {
                if (onOpenSubscription) { onClose(); onOpenSubscription(); }
              }}
              className="p-3 flex items-center justify-between hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Crown size={16} className="text-amber-500 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-100 block font-mono">Subscription & Tier Limits</span>
                  <span className="text-[10px] text-red-400/80 font-mono">View Free, Pro, & VIP Plans</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-red-500/60" />
            </div>
          </div>
        </div>

        {/* 4. TOOLS & INTEGRATIONS */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-red-500 px-1 block uppercase tracking-widest font-mono">
            TOOLS & INTEGRATIONS
          </span>
          <div className="bg-gradient-to-b from-red-950/30 via-zinc-950 to-black border border-red-900/60 rounded-2xl overflow-hidden divide-y divide-red-950/60 shadow-[0_0_15px_rgba(220,38,38,0.1)]">
            {/* Email Campaign Generator */}
            {onOpenCampaignGenerator && (
              <div 
                onClick={() => { onClose(); onOpenCampaignGenerator(); }}
                className="p-3 flex items-center justify-between hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Mail size={16} className="text-red-400 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-100 block font-mono">Email Campaign Generator</span>
                    <span className="text-[10px] text-red-400/80 font-mono">Craft AI marketing emails & newsletters</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-red-500/60" />
              </div>
            )}

            {/* Live Voice Mode */}
            {onOpenLiveVoice && (
              <div 
                onClick={() => { onClose(); onOpenLiveVoice(); }}
                className="p-3 flex items-center justify-between hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <AudioLines size={16} className="text-red-400 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-100 block font-mono">Live Voice Mode</span>
                    <span className="text-[10px] text-red-400/80 font-mono">Real-time conversational voice assistant</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-red-500/60" />
              </div>
            )}

            {/* Telegram Bot Integration */}
            {onOpenTelegram && (
              <div 
                onClick={() => { onClose(); onOpenTelegram(); }}
                className="p-3 flex items-center justify-between hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Bot size={16} className="text-red-400 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-100 block font-mono">Telegram Bot Integration</span>
                    <span className="text-[10px] text-red-400/80 font-mono">Connect VOID AI directly to Telegram</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-red-500/60" />
              </div>
            )}

            {/* API Keys & Developer */}
            {onOpenApiKeys && (
              <div 
                onClick={() => { onClose(); onOpenApiKeys(); }}
                className="p-3 flex items-center justify-between hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Key size={16} className="text-red-400 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-100 block font-mono">Developer API Keys</span>
                    <span className="text-[10px] text-red-400/80 font-mono">Generate nvn_live_ keys for app integration</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-red-500/60" />
              </div>
            )}
          </div>
        </div>

        {/* 5. SUPPORT CENTER */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-red-500 px-1 block uppercase tracking-widest font-mono">
            SUPPORT & HELP
          </span>
          <div className="bg-gradient-to-b from-red-950/30 via-zinc-950 to-black border border-red-900/60 rounded-2xl overflow-hidden divide-y divide-red-950/60 shadow-[0_0_15px_rgba(220,38,38,0.1)]">
            {onOpenSupport && (
              <div 
                onClick={() => { onClose(); onOpenSupport(); }}
                className="p-3 flex items-center justify-between hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare size={16} className="text-red-400 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-100 block font-mono">Support Desk & Live Chat</span>
                    <span className="text-[10px] text-red-400/80 font-mono">Get help from support team</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-red-500/60" />
              </div>
            )}

            <a 
              href="https://t.me/nova_tech_1" 
              target="_blank" 
              rel="noreferrer"
              className="p-3 flex items-center justify-between hover:bg-red-950/30 transition-colors cursor-pointer block"
            >
              <div className="flex items-center gap-2.5">
                <Send size={16} className="text-red-400 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-100 block font-mono">Contact Admin Telegram</span>
                  <span className="text-[10px] text-red-400/80 font-mono">Direct assistance @nova_tech_1</span>
                </div>
              </div>
              <ExternalLink size={14} className="text-red-500/60" />
            </a>
          </div>
        </div>

        {/* 6. ADMIN CONTROL PANEL (Only if Admin) */}
        {isAdmin && onOpenAdmin && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-red-500 px-1 block uppercase tracking-widest font-mono">
              ADMINISTRATION
            </span>
            <div className="bg-gradient-to-b from-red-950/50 via-black to-zinc-950 border border-red-800/80 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(220,38,38,0.2)]">
              <div 
                onClick={() => { onClose(); onOpenAdmin(); }}
                className="p-3 flex items-center justify-between hover:bg-red-950/60 transition-colors cursor-pointer bg-red-950/30"
              >
                <div className="flex items-center gap-2.5">
                  <Shield size={16} className="text-red-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-red-300 block font-mono">Admin Control Panel</span>
                    <span className="text-[10px] text-red-200/80 font-mono">Manage users, broadcasts, wallets & keys</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-red-400" />
              </div>
            </div>
          </div>
        )}

        {/* 7. DANGER ZONE */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-red-500 px-1 block uppercase tracking-widest font-mono">
            DANGER ZONE
          </span>
          <div className="bg-gradient-to-b from-red-950/60 via-black to-zinc-950 border border-red-800/90 rounded-2xl overflow-hidden divide-y divide-red-950/80 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
            {onClearHistory && (
              <div 
                onClick={() => {
                  if (confirm('Are you sure you want to clear all history and memory logs?')) {
                    onClearHistory();
                    onClose();
                  }
                }}
                className="p-3 flex items-center justify-between hover:bg-red-950/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 size={16} className="text-red-500 shrink-0" />
                  <span className="text-xs font-semibold text-red-400 font-mono">Clear All Chat Logs</span>
                </div>
              </div>
            )}

            <button
              onClick={onLogout || onClose}
              className="w-full p-3 flex items-center gap-2.5 text-red-400 font-bold text-xs hover:bg-red-950/60 transition-colors cursor-pointer text-left font-mono"
            >
              <LogOut size={16} className="text-red-500 shrink-0" />
              <span>Log out of Account</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
