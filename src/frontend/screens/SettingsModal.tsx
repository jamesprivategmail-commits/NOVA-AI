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
    <div className="fixed inset-0 bg-[#2b0709] z-50 overflow-y-auto font-sans text-white flex flex-col text-xs select-none">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-20 bg-black/95  border-b border-[#38383b] px-3 sm:px-6 py-2.5 flex items-center justify-between ">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#252527] hover:bg-[#202022] border border-[#38383b] text-[#8d8d91] hover:text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer  group "
            title="Back to chat"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="uppercase tracking-wider">Back</span>
          </button>
          
          <div className="h-4 w-px bg-[#252527] hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black tracking-widest text-[#3f86ff] uppercase ">
              CONTROL CENTER & SETTINGS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#252527] border border-[#38383b] text-[#8d8d91] font-bold shadow">
            v2.4 DEMONIC
          </span>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 max-w-xl mx-auto w-full p-3 sm:p-5 space-y-4 pb-12">

        {/* 1. PROFILE SECTION */}
        <div className="bg-gradient-to-b from-[#202022] via-[#202022] to-[#2b0709] border border-[#38383b]/70 rounded-2xl p-3.5 space-y-3  relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#3f86ff]/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#3f86ff] uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3f86ff] animate-pulse" />
              USER PROFILE
            </span>
            <button 
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="text-[10px] text-[#8d8d91] hover:text-white flex items-center gap-1 cursor-pointer "
            >
              <Edit3 size={11} />
              <span>{isEditingProfile ? 'Cancel' : 'Edit'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#202022] via-[#2b0709] to-[#202022] border border-[#3f86ff] flex items-center justify-center text-[#8d8d91] font-bold text-base  shrink-0">
              {displayName.slice(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              {isEditingProfile ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-[#2b0709] border border-[#38383b] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#3f86ff] font-sans"
                  />
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="px-2 py-1 bg-[#3f86ff] hover:opacity-90 text-white rounded text-[10px] font-bold cursor-pointer "
                  >
                    Save
                  </button>
                </div>
              ) : (
                <h2 className="text-sm font-bold text-white tracking-tight truncate flex items-center gap-2 ">
                  <span>{displayName}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#252527] text-[#8d8d91] border border-[#38383b] uppercase ">OPERATOR</span>
                </h2>
              )}
              <p className="text-[11px] text-[#8d8d91] truncate mt-0.5">{userEmail}</p>
            </div>
          </div>
        </div>

        {/* 2. VOID AI PREFERENCES */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-[#3f86ff] px-1 block uppercase tracking-widest ">
            VOID AI PREFERENCES
          </span>
          <div className="bg-gradient-to-b from-[#202022] via-[#202022] to-[#2b0709] border border-[#38383b] rounded-2xl overflow-hidden divide-y divide-[#38383b] ">
            <div 
              onClick={() => alert('Personalization set to: GOD MODE System Rules Active.')}
              className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Sliders size={16} className="text-[#3f86ff] shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-white block ">Personalization & System Prompt</span>
                  <span className="text-[10px] text-[#8d8d91] ">Persona set to DEMONIC GOD MODE Engine</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-[#8d8d91]" />
            </div>

            <div 
              onClick={() => {
                if (onClearHistory) onClearHistory();
              }}
              className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Database size={16} className="text-[#8d8d91] shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-white block ">Memory & Chat History Logs</span>
                  <span className="text-[10px] text-[#8d8d91] ">Manage saved session memory</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-[#8d8d91]" />
            </div>
          </div>
        </div>

        {/* 3. ACCOUNT & BILLING */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-[#3f86ff] px-1 block uppercase tracking-widest ">
            ACCOUNT & BILLING
          </span>
          <div className="bg-gradient-to-b from-[#202022] via-[#202022] to-[#2b0709] border border-[#38383b] rounded-2xl overflow-hidden divide-y divide-[#38383b] ">
            {/* Wallet Balance Card */}
            <div 
              onClick={() => {
                if (onOpenSubscription) { onClose(); onOpenSubscription(); }
              }}
              className="p-3 flex items-center justify-between hover:bg-[#252527]/40 transition-colors cursor-pointer bg-[#252527]/20"
            >
              <div className="flex items-center gap-2.5">
                <Wallet size={16} className="text-[#8d8d91] shrink-0" />
                <div>
                  <span className="text-xs font-bold text-[#8d8d91] block ">Wallet Balance</span>
                  <span className="text-[11px] font-black text-white">₦{walletBalance.toLocaleString()}</span>
                </div>
              </div>
              <button className="px-2.5 py-1 bg-[#3f86ff] hover:bg-[#3f86ff] text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer uppercase tracking-wider  ">
                Fund Wallet
              </button>
            </div>

            {/* Subscription Upgrade */}
            <div 
              onClick={() => {
                if (onOpenSubscription) { onClose(); onOpenSubscription(); }
              }}
              className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Crown size={16} className="text-amber-500 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-white block ">Subscription & Tier Limits</span>
                  <span className="text-[10px] text-[#8d8d91] ">View Free, Pro, & VIP Plans</span>
                </div>
              </div>
              <ChevronRight size={15} className="text-[#8d8d91]" />
            </div>
          </div>
        </div>

        {/* 4. TOOLS & INTEGRATIONS */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-[#3f86ff] px-1 block uppercase tracking-widest ">
            TOOLS & INTEGRATIONS
          </span>
          <div className="bg-gradient-to-b from-[#202022] via-[#202022] to-[#2b0709] border border-[#38383b] rounded-2xl overflow-hidden divide-y divide-[#38383b] ">
            {/* Email Campaign Generator */}
            {onOpenCampaignGenerator && (
              <div 
                onClick={() => { onClose(); onOpenCampaignGenerator(); }}
                className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Mail size={16} className="text-[#8d8d91] shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-white block ">Email Campaign Generator</span>
                    <span className="text-[10px] text-[#8d8d91] ">Craft AI marketing emails & newsletters</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-[#8d8d91]" />
              </div>
            )}

            {/* Live Voice Mode */}
            {onOpenLiveVoice && (
              <div 
                onClick={() => { onClose(); onOpenLiveVoice(); }}
                className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <AudioLines size={16} className="text-[#8d8d91] shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-white block ">Live Voice Mode</span>
                    <span className="text-[10px] text-[#8d8d91] ">Real-time conversational voice assistant</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-[#8d8d91]" />
              </div>
            )}

            {/* Telegram Bot Integration */}
            {onOpenTelegram && (
              <div 
                onClick={() => { onClose(); onOpenTelegram(); }}
                className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Bot size={16} className="text-[#8d8d91] shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-white block ">Telegram Bot Integration</span>
                    <span className="text-[10px] text-[#8d8d91] ">Connect VOID AI directly to Telegram</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-[#8d8d91]" />
              </div>
            )}

            {/* API Keys & Developer */}
            {onOpenApiKeys && (
              <div 
                onClick={() => { onClose(); onOpenApiKeys(); }}
                className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Key size={16} className="text-[#8d8d91] shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-white block ">Developer API Keys</span>
                    <span className="text-[10px] text-[#8d8d91] ">Generate nvn_live_ keys for app integration</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-[#8d8d91]" />
              </div>
            )}
          </div>
        </div>

        {/* 5. SUPPORT CENTER */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-[#3f86ff] px-1 block uppercase tracking-widest ">
            SUPPORT & HELP
          </span>
          <div className="bg-gradient-to-b from-[#202022] via-[#202022] to-[#2b0709] border border-[#38383b] rounded-2xl overflow-hidden divide-y divide-[#38383b] ">
            {onOpenSupport && (
              <div 
                onClick={() => { onClose(); onOpenSupport(); }}
                className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare size={16} className="text-[#8d8d91] shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-white block ">Support Desk & Live Chat</span>
                    <span className="text-[10px] text-[#8d8d91] ">Get help from support team</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-[#8d8d91]" />
              </div>
            )}

            <a 
              href="https://t.me/nova_tech_1" 
              target="_blank" 
              rel="noreferrer"
              className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer block"
            >
              <div className="flex items-center gap-2.5">
                <Send size={16} className="text-[#8d8d91] shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-white block ">Contact Admin Telegram</span>
                  <span className="text-[10px] text-[#8d8d91] ">Direct assistance @nova_tech_1</span>
                </div>
              </div>
              <ExternalLink size={14} className="text-[#8d8d91]" />
            </a>
          </div>
        </div>

        {/* 6. ADMIN CONTROL PANEL (Only if Admin) */}
        {isAdmin && onOpenAdmin && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#3f86ff] px-1 block uppercase tracking-widest ">
              ADMINISTRATION
            </span>
            <div className="bg-gradient-to-b from-[#202022]/50 via-[#2b0709] to-[#202022] border border-[#38383b] rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(220,38,38,0.2)]">
              <div 
                onClick={() => { onClose(); onOpenAdmin(); }}
                className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer bg-[#252527]"
              >
                <div className="flex items-center gap-2.5">
                  <Shield size={16} className="text-[#8d8d91] shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-[#8d8d91] block ">Admin Control Panel</span>
                    <span className="text-[10px] text-[#8d8d91] ">Manage users, broadcasts, wallets & keys</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-[#8d8d91]" />
              </div>
            </div>
          </div>
        )}

        {/* 7. DANGER ZONE */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-[#3f86ff] px-1 block uppercase tracking-widest ">
            DANGER ZONE
          </span>
          <div className="bg-gradient-to-b from-[#202022]/60 via-[#2b0709] to-[#202022] border border-[#38383b]/90 rounded-2xl overflow-hidden divide-y divide-[#38383b]/80 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
            {onClearHistory && (
              <div 
                onClick={() => {
                  if (confirm('Are you sure you want to clear all history and memory logs?')) {
                    onClearHistory();
                    onClose();
                  }
                }}
                className="p-3 flex items-center justify-between hover:bg-[#252527] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 size={16} className="text-[#3f86ff] shrink-0" />
                  <span className="text-xs font-semibold text-[#8d8d91] ">Clear All Chat Logs</span>
                </div>
              </div>
            )}

            <button
              onClick={onLogout || onClose}
              className="w-full p-3 flex items-center gap-2.5 text-[#8d8d91] font-bold text-xs hover:bg-[#252527] transition-colors cursor-pointer text-left "
            >
              <LogOut size={16} className="text-[#3f86ff] shrink-0" />
              <span>Log out of Account</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
