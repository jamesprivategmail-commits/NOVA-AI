import React, { useState, useEffect } from 'react';
import { UserProfile, SupportChat, PricingSettings, AIBrainSettings, SystemAPIKeys, BroadcastMessage, UserTier } from '../../models/types';
import { listenToAllUsers, updateUserTier, updateUserStatus, updateUserVerification, updateUserSupportStaff, listenToAllSupportChats, getPricingSettings, updatePricingSettings, getAIBrainSettings, updateAIBrainSettings, getSystemAPIKeys, updateSystemAPIKeys, sendBroadcastMessage, listenToBroadcasts, deleteBroadcast } from '../../database/db';
import { X, ArrowLeft, Shield, Crown, User, RefreshCw, Ban, CheckCircle, BadgeCheck, MessageSquare, ChevronUp, ChevronDown, DollarSign, Cpu, Save, Sparkles, Key, Eye, EyeOff, Lock, ShieldCheck, Trash2, Radio, Megaphone, Maximize2, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { SupportChatScreen } from './SupportChatScreen';
import { FullPageSupportDesk } from './FullPageSupportDesk';

interface AdminDashboardProps {
  onClose: () => void;
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'broadcast' | 'support' | 'pricing' | 'brain' | 'apikeys'>('users');
  
  const [supportChats, setSupportChats] = useState<SupportChat[]>([]);
  const [activeSupportUserId, setActiveSupportUserId] = useState<string | null>(null);
  const [activeSupportUserName, setActiveSupportUserName] = useState<string | null>(null);
  const [showFullSupportDesk, setShowFullSupportDesk] = useState(false);

  // Broadcast state
  const [broadcastsList, setBroadcastsList] = useState<BroadcastMessage[]>([]);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTargetTier, setBroadcastTargetTier] = useState<'all' | UserTier>('all');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const [pricing, setPricing] = useState<PricingSettings>({ premium: 5000, pro: 7000, vip: 10000 });
  const [savingPricing, setSavingPricing] = useState(false);

  const [groqKeysList, setGroqKeysList] = useState<string[]>(Array(10).fill(''));
  const [cohereKeysList, setCohereKeysList] = useState<string[]>(Array(10).fill(''));
  const [showKeys, setShowKeys] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keySaveSuccess, setKeySaveSuccess] = useState(false);

  const [brain, setBrain] = useState<AIBrainSettings>({
    globalPrompt: "You are VOID AI, an elite, hyper-intelligent, dangerous AI assistant and master email marketing campaign strategist.",
    freePrompt: "Free Tier Brain: Precise, focused email marketing and AI assistant responses.",
    proPrompt: "Pro Tier Brain: Advanced marketing strategy, extended copy variations, deeper campaign analytics insights.",
    premiumPrompt: "Premium Tier Brain: Full campaign strategy suite, multi-stage funnel email sequences, conversion rate optimization hacks.",
    vipPrompt: "VIP Tier Brain: Unrestricted elite AI capabilities, custom bespoke campaign designs, 1-on-1 copy teardowns.",
    freeLimit: 5,
    proLimit: 50,
    premiumLimit: 250,
    vipLimit: 99999,
    freeMaxTokens: 512,
    proMaxTokens: 1024,
    premiumMaxTokens: 2048,
    vipMaxTokens: 4096,
  });
  const [savingBrain, setSavingBrain] = useState(false);
  const [brainSaveSuccess, setBrainSaveSuccess] = useState(false);

  type SortField = 'email' | 'role' | 'status' | 'messages';
  const [sortField, setSortField] = useState<SortField>('email');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setLoading(true);
    const unsubUsers = listenToAllUsers((fetchedUsers) => {
      setUsers(fetchedUsers);
      setLoading(false);
    });
    const unsubChats = listenToAllSupportChats((chats) => setSupportChats(chats));
    const unsubBroadcasts = listenToBroadcasts((bList) => setBroadcastsList(bList));
    
    getPricingSettings().then(setPricing);
    getAIBrainSettings().then(setBrain);
    getSystemAPIKeys().then(keys => {
      const gKeys = keys.groqApiKeys && keys.groqApiKeys.length > 0 ? keys.groqApiKeys : (keys.groqApiKey ? [keys.groqApiKey] : []);
      const cKeys = keys.cohereApiKeys && keys.cohereApiKeys.length > 0 ? keys.cohereApiKeys : (keys.cohereApiKey ? [keys.cohereApiKey] : []);

      const gList = Array(10).fill('');
      gKeys.slice(0, 10).forEach((k, idx) => { gList[idx] = k; });
      setGroqKeysList(gList);

      const cList = Array(10).fill('');
      cKeys.slice(0, 10).forEach((k, idx) => { cList[idx] = k; });
      setCohereKeysList(cList);
    });
    
    return () => {
      unsubUsers();
      unsubChats();
      unsubBroadcasts();
    };
  }, []);

  const handleToggleSupportStaff = async (uid: string, currentStaffStatus: boolean) => {
    try {
      await updateUserSupportStaff(uid, !currentStaffStatus);
    } catch (e) {
      console.error("Failed to update support staff status", e);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setSendingBroadcast(true);
    try {
      await sendBroadcastMessage(broadcastTitle.trim(), broadcastMessage.trim(), 'Admin', broadcastTargetTier);
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (err) {
      console.error("Failed to publish broadcast", err);
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    if (confirm("Delete this broadcast message?")) {
      try {
        await deleteBroadcast(id);
      } catch (err) {
        console.error("Failed to delete broadcast", err);
      }
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    try {
      const parsedGroq = groqKeysList.map(k => k.trim()).filter(Boolean);
      const parsedCohere = cohereKeysList.map(k => k.trim()).filter(Boolean);

      await updateSystemAPIKeys({ 
        groqApiKey: parsedGroq[0] || '',
        groqApiKeys: parsedGroq,
        cohereApiKey: parsedCohere[0] || '',
        cohereApiKeys: parsedCohere
      });
      setKeySaveSuccess(true);
      setTimeout(() => setKeySaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save API keys", err);
    } finally {
      setSavingKey(false);
    }
  };

  const updateGroqKeySlot = (index: number, val: string) => {
    const updated = [...groqKeysList];
    updated[index] = val;
    setGroqKeysList(updated);
  };

  const updateCohereKeySlot = (index: number, val: string) => {
    const updated = [...cohereKeysList];
    updated[index] = val;
    setCohereKeysList(updated);
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPricing(true);
    try {
      await updatePricingSettings(pricing);
    } catch (err) {
      console.error("Failed to save pricing", err);
    } finally {
      setSavingPricing(false);
    }
  };

  const handleSaveBrain = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBrain(true);
    try {
      await updateAIBrainSettings(brain);
      setBrainSaveSuccess(true);
      setTimeout(() => setBrainSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save AI Brain settings", err);
    } finally {
      setSavingBrain(false);
    }
  };

  const handleUpdateTier = async (uid: string, tier: 'free' | 'pro' | 'premium' | 'vip') => {
    try {
      await updateUserTier(uid, tier);
    } catch (e) {
      console.error("Failed to update tier", e);
    }
  };

  const handleToggleBan = async (uid: string, currentBanStatus: boolean) => {
    try {
      await updateUserStatus(uid, !currentBanStatus);
    } catch (e) {
      console.error("Failed to update ban status", e);
    }
  };

  const handleToggleVerify = async (uid: string, currentVerifyStatus: boolean) => {
    try {
      await updateUserVerification(uid, !currentVerifyStatus);
    } catch (e) {
      console.error("Failed to update verify status", e);
    }
  };

  const handleMessageUserDirectly = (targetUser: UserProfile) => {
    setActiveSupportUserId(targetUser.uid);
    setActiveSupportUserName(targetUser.displayName || targetUser.email || 'User');
    setShowFullSupportDesk(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    let aVal: any = a[sortField === 'email' ? 'email' : sortField === 'role' ? 'isAdmin' : sortField === 'messages' ? 'messageCount' : 'tier'];
    let bVal: any = b[sortField === 'email' ? 'email' : sortField === 'role' ? 'isAdmin' : sortField === 'messages' ? 'messageCount' : 'tier'];
    
    if (sortField === 'email') {
      aVal = a.email || a.displayName || '';
      bVal = b.email || b.displayName || '';
    } else if (sortField === 'status') {
      aVal = a.isBanned ? 0 : a.tier === 'vip' ? 4 : a.tier === 'premium' ? 3 : a.tier === 'pro' ? 2 : 1;
      bVal = b.isBanned ? 0 : b.tier === 'vip' ? 4 : b.tier === 'premium' ? 3 : b.tier === 'pro' ? 2 : 1;
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredUsers = sortedUsers.filter(u => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    const nameMatch = (u.displayName || '').toLowerCase().includes(q);
    const emailMatch = (u.email || '').toLowerCase().includes(q);
    const uidMatch = (u.uid || '').toLowerCase().includes(q);
    return nameMatch || emailMatch || uidMatch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#090A0F] text-zinc-100 flex flex-col font-sans overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-16 px-4 md:px-6 bg-[#0D1117] border-b border-[#30363D] flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] rounded-xl text-xs font-bold text-slate-200 transition-all shadow-sm"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          <div className="h-5 w-[1px] bg-[#30363D] hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-red-800 border border-red-500/50 flex items-center justify-center font-bold text-white shadow-md">
              <Shield size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-wide uppercase">
                  VOID AI Management Console
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-red-950 border border-red-800 text-red-400 text-[10px] font-mono font-bold">
                  ADMINISTRATOR MODE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Full-page user management & system configuration desk
              </p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 bg-[#161B22] border border-[#30363D] px-3 py-1.5 rounded-xl text-xs text-slate-300 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Total Registered Users: <strong>{users.length}</strong></span>
        </div>
      </header>

      {/* Top Navigation Bar with Menu Tabs */}
      <nav className="bg-[#0D1117]/90 border-b border-[#30363D] px-4 md:px-6 py-2 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
        <button 
          onClick={() => setActiveTab('users')}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border",
            activeTab === 'users' 
              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-950/40" 
              : "bg-[#161B22] border-[#30363D] text-slate-300 hover:text-white hover:bg-[#21262D]"
          )}
        >
          <User size={15} />
          <span>User Control Center ({users.length})</span>
        </button>

        <button 
          onClick={() => setActiveTab('broadcast')}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border",
            activeTab === 'broadcast' 
              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-950/40" 
              : "bg-[#161B22] border-[#30363D] text-slate-300 hover:text-white hover:bg-[#21262D]"
          )}
        >
          <Radio size={15} />
          <span>Broadcast System</span>
        </button>

        <button 
          onClick={() => setActiveTab('brain')}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border",
            activeTab === 'brain' 
              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-950/40" 
              : "bg-[#161B22] border-[#30363D] text-slate-300 hover:text-white hover:bg-[#21262D]"
          )}
        >
          <Cpu size={15} />
          <span>AI Brain Rules & Prompts</span>
        </button>

        <button 
          onClick={() => setActiveTab('support')}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border",
            activeTab === 'support' 
              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-950/40" 
              : "bg-[#161B22] border-[#30363D] text-slate-300 hover:text-white hover:bg-[#21262D]"
          )}
        >
          <MessageSquare size={15} />
          <span>Live Support Tickets</span>
          {supportChats.reduce((acc, c) => acc + c.unreadAdmin, 0) > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {supportChats.reduce((acc, c) => acc + c.unreadAdmin, 0)}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('pricing')}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border",
            activeTab === 'pricing' 
              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-950/40" 
              : "bg-[#161B22] border-[#30363D] text-slate-300 hover:text-white hover:bg-[#21262D]"
          )}
        >
          <DollarSign size={15} />
          <span>Pricing Engine (₦)</span>
        </button>

        <button 
          onClick={() => setActiveTab('apikeys')}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border",
            activeTab === 'apikeys' 
              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-950/40" 
              : "bg-[#161B22] border-[#30363D] text-slate-300 hover:text-white hover:bg-[#21262D]"
          )}
        >
          <Key size={15} />
          <span>API Key Room Vault</span>
        </button>
      </nav>

      {/* Main Full Page Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#090A0F]">
        {activeTab === 'users' ? (
          loading ? (
            <div className="flex justify-center py-20">
              <RefreshCw size={28} className="text-red-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 max-w-7xl mx-auto">
              {/* User Search & Filter Bar */}
              <div className="p-4 bg-[#0D1117] border border-[#30363D] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <div className="relative w-full sm:w-96">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search users by name, email, or UID..."
                    className="w-full bg-[#161B22] border border-[#30363D] focus:border-red-500 rounded-xl pl-10 pr-20 py-2 text-xs text-slate-100 outline-none transition-colors placeholder:text-slate-500"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-2 top-1.5 px-2 py-1 rounded-lg bg-red-600/90 hover:bg-red-500 text-white text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                      title="Clear search"
                    >
                      <X size={12} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                <div className="text-xs font-mono text-slate-400 flex items-center gap-3 self-end sm:self-auto">
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="text-xs font-bold text-red-400 hover:text-red-300 underline cursor-pointer mr-2"
                    >
                      Reset All Filters
                    </button>
                  )}
                  <span>Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users</span>
                </div>
              </div>

              {/* Users Data Table */}
              <div className="bg-[#0D1117] border border-[#30363D] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm whitespace-nowrap">
                    <thead>
                      <tr className="text-slate-400 border-b border-[#30363D] bg-[#161B22]/80">
                        <th className="py-3.5 px-4 font-bold cursor-pointer hover:text-slate-200 transition-colors" onClick={() => handleSort('email')}>
                          <div className="flex items-center gap-1">User {sortField === 'email' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                        </th>
                        <th className="py-3.5 px-4 font-bold cursor-pointer hover:text-slate-200 transition-colors" onClick={() => handleSort('email')}>
                          Email
                        </th>
                        <th className="py-3.5 px-4 font-bold cursor-pointer hover:text-slate-200 transition-colors" onClick={() => handleSort('role')}>
                          <div className="flex items-center gap-1">Role {sortField === 'role' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                        </th>
                        <th className="py-3.5 px-4 font-bold cursor-pointer hover:text-slate-200 transition-colors" onClick={() => handleSort('status')}>
                          <div className="flex items-center gap-1">Status & Tier {sortField === 'status' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                        </th>
                        <th className="py-3.5 px-4 font-bold text-right">Actions / Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363D]/60">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-xs text-slate-500 font-mono">
                            No users matched "{userSearchQuery}"
                          </td>
                        </tr>
                      ) : (
                        sortedUsers.map(user => (
                          <tr key={user.uid} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-2">
                          <div className="font-medium text-zinc-200 flex items-center gap-1">
                            {user.displayName || 'User'}
                            {user.isVerified && <BadgeCheck size={14} className="text-blue-400" />}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono mt-0.5">{user.uid.slice(0, 8)}...</div>
                        </td>
                        <td className="py-3 px-2 text-zinc-300 font-mono text-xs">
                          {user.email || 'Google User'}
                        </td>
                        <td className="py-3 px-2">
                          {user.isAdmin ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                              <Shield size={12} />
                              Super Admin
                            </span>
                          ) : user.isSupportStaff ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                              <Shield size={12} />
                              Management Staff
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium">
                              <User size={12} />
                              User
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className={clsx(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                              user.isBanned ? "bg-red-500/20 text-red-500 border border-red-500/30" :
                              user.tier === 'vip' ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                              user.tier === 'premium' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                              user.tier === 'pro' ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                              "bg-zinc-800 text-zinc-400"
                            )}>
                              {user.isBanned ? <Ban size={10} className="mr-1" /> : (user.tier === 'premium' || user.tier === 'vip') && <Crown size={10} className="mr-1" />}
                              {user.isBanned ? 'BANNED' : user.tier}
                            </span>
                            <span className="text-xs text-zinc-500">
                              ({user.messageCount} msgs)
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdateTier(user.uid, 'free')}
                              className={clsx("px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border", user.tier === 'free' ? "bg-zinc-800 border-zinc-700 text-zinc-200" : "bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700")}
                            >
                              Free
                            </button>
                            <button
                              onClick={() => handleUpdateTier(user.uid, 'pro')}
                              className={clsx("px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border", user.tier === 'pro' ? "bg-blue-600 border-blue-500 text-white" : "bg-transparent border-zinc-800 text-zinc-500 hover:text-blue-400 hover:border-blue-900/50")}
                            >
                              Pro
                            </button>
                            <button
                              onClick={() => handleUpdateTier(user.uid, 'premium')}
                              className={clsx("px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border flex items-center gap-1", user.tier === 'premium' ? "bg-amber-500 border-amber-400 text-amber-950" : "bg-transparent border-zinc-800 text-zinc-500 hover:text-amber-400 hover:border-amber-900/50")}
                            >
                              <Crown size={11} />
                              Premium
                            </button>
                            <button
                              onClick={() => handleUpdateTier(user.uid, 'vip')}
                              className={clsx("px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border flex items-center gap-1", user.tier === 'vip' ? "bg-purple-600 border-purple-500 text-white" : "bg-transparent border-zinc-800 text-zinc-500 hover:text-purple-400 hover:border-purple-900/50")}
                            >
                              <Crown size={11} />
                              VIP
                            </button>
                            <div className="w-px h-5 bg-zinc-800 mx-1"></div>
                            <button
                              onClick={() => handleToggleVerify(user.uid, user.isVerified || false)}
                              className={clsx(
                                "px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border flex items-center gap-1",
                                user.isVerified 
                                  ? "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20" 
                                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                              )}
                            >
                              <BadgeCheck size={12} />
                              {user.isVerified ? 'Verified' : 'Verify'}
                            </button>
                            <button
                              onClick={() => handleToggleBan(user.uid, user.isBanned || false)}
                              className={clsx(
                                "px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border flex items-center gap-1",
                                user.isBanned 
                                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30" 
                                  : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                              )}
                            >
                              {user.isBanned ? <CheckCircle size={12} /> : <Ban size={12} />}
                              {user.isBanned ? 'Unban' : 'Ban'}
                            </button>
                            {!user.isAdmin && (
                              <button
                                onClick={() => handleToggleSupportStaff(user.uid, user.isSupportStaff || false)}
                                className={clsx(
                                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border flex items-center gap-1",
                                  user.isSupportStaff 
                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30" 
                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-emerald-300"
                                )}
                                title={user.isSupportStaff ? "Revoke Management Support Staff Role" : "Appoint to Management Support Team"}
                              >
                                <Shield size={12} />
                                {user.isSupportStaff ? 'Staff Role' : 'Appoint Staff'}
                              </button>
                            )}
                            <button
                              onClick={() => handleMessageUserDirectly(user)}
                              className="px-2.5 py-1 rounded-md text-xs font-bold transition-all border bg-red-600 hover:bg-red-500 text-white border-red-500 flex items-center gap-1 shadow-sm"
                              title={`Send direct message to ${user.displayName || user.email || 'user'}`}
                            >
                              <MessageSquare size={12} />
                              <span>Message</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )) : activeTab === 'broadcast' ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-zinc-950 border border-red-900/30 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-red-500 font-bold text-base">
                  <Radio size={20} />
                  <span>Send Broadcast System Message</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Broadcast announcements will be immediately visible to all users across their devices in real-time.
                </p>

                <form onSubmit={handleSendBroadcast} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-zinc-300">Broadcast Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ⚡ System Announcement"
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-300">Target Audience</label>
                      <select
                        value={broadcastTargetTier}
                        onChange={(e) => setBroadcastTargetTier(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 outline-none focus:border-red-500 cursor-pointer"
                      >
                        <option value="all">All Users (Global)</option>
                        <option value="free">Free Tier Only</option>
                        <option value="pro">Pro Tier Only</option>
                        <option value="premium">Premium Tier Only</option>
                        <option value="vip">VIP Tier Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">Announcement Message</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Type message content for all users..."
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 outline-none focus:border-red-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendingBroadcast}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-red-950/50 flex items-center gap-2"
                  >
                    <Radio size={16} />
                    <span>{sendingBroadcast ? 'Publishing Broadcast...' : '🚀 Publish Broadcast Message'}</span>
                  </button>
                </form>
              </div>

              {/* Active Broadcasts History */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Megaphone size={16} className="text-red-400" />
                  <span>Broadcast History ({broadcastsList.length})</span>
                </h3>

                {broadcastsList.length === 0 ? (
                  <p className="text-xs text-zinc-500 font-mono">No broadcasts published yet.</p>
                ) : (
                  <div className="space-y-3">
                    {broadcastsList.map(b => (
                      <div key={b.id} className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-zinc-100">{b.title}</span>
                            <span className="px-2 py-0.5 rounded-full bg-red-950 border border-red-800 text-red-400 text-[10px] font-mono font-bold uppercase">
                              Audience: {b.targetTier || 'all'}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {new Date(b.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap">{b.message}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteBroadcast(b.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
                          title="Delete Broadcast"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'brain' ? (
            <form onSubmit={handleSaveBrain} className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-zinc-950 border border-red-900/30 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu size={20} className="text-red-500" />
                    <h3 className="text-lg font-bold text-white">Master AI Brain Persona & System Instructions</h3>
                  </div>
                  <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded font-mono font-bold">
                    UNIFIED AI BRAIN
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Configure the single master AI system prompt below. This prompt directly controls the persona, rules, capabilities, and response guidelines for VOID AI across all users and models.
                </p>

                {brainSaveSuccess && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span>Master AI Brain instructions updated successfully!</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-red-400 uppercase tracking-wider">
                      Master AI Brain Prompt (Applies Globally)
                    </label>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {brain.globalPrompt.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={7}
                    value={brain.globalPrompt}
                    onChange={(e) => setBrain({ ...brain, globalPrompt: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl p-3.5 text-zinc-100 text-xs md:text-sm focus:border-red-500 outline-none font-mono leading-relaxed shadow-inner"
                    placeholder="Enter master system instructions for VOID AI..."
                  />
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
                    Tier Rate Limits & Token Controls
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Free Tier */}
                    <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2.5">
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Free Tier
                      </label>
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] text-zinc-400 block mb-1">Daily Msgs Limit</span>
                          <input
                            type="number"
                            value={brain.freeLimit}
                            onChange={(e) => setBrain({ ...brain, freeLimit: parseInt(e.target.value) || 0 })}
                            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs outline-none focus:border-red-500"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 block mb-1">Max Tokens</span>
                          <input
                            type="number"
                            value={brain.freeMaxTokens}
                            onChange={(e) => setBrain({ ...brain, freeMaxTokens: parseInt(e.target.value) || 0 })}
                            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs outline-none focus:border-red-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pro Tier */}
                    <div className="p-3.5 bg-zinc-900/60 border border-blue-950/60 rounded-xl space-y-2.5">
                      <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider">
                        Pro Tier
                      </label>
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] text-zinc-400 block mb-1">Daily Msgs Limit</span>
                          <input
                            type="number"
                            value={brain.proLimit}
                            onChange={(e) => setBrain({ ...brain, proLimit: parseInt(e.target.value) || 0 })}
                            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 block mb-1">Max Tokens</span>
                          <input
                            type="number"
                            value={brain.proMaxTokens}
                            onChange={(e) => setBrain({ ...brain, proMaxTokens: parseInt(e.target.value) || 0 })}
                            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Premium Tier */}
                    <div className="p-3.5 bg-zinc-900/60 border border-amber-950/60 rounded-xl space-y-2.5">
                      <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Premium Tier
                      </label>
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] text-zinc-400 block mb-1">Daily Msgs Limit</span>
                          <input
                            type="number"
                            value={brain.premiumLimit}
                            onChange={(e) => setBrain({ ...brain, premiumLimit: parseInt(e.target.value) || 0 })}
                            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 block mb-1">Max Tokens</span>
                          <input
                            type="number"
                            value={brain.premiumMaxTokens}
                            onChange={(e) => setBrain({ ...brain, premiumMaxTokens: parseInt(e.target.value) || 0 })}
                            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* VIP Tier */}
                    <div className="p-3.5 bg-zinc-900/60 border border-purple-950/60 rounded-xl space-y-2.5">
                      <label className="block text-xs font-bold text-purple-400 uppercase tracking-wider">
                        VIP Tier
                      </label>
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] text-zinc-400 block mb-1">Daily Msgs Limit</span>
                          <input
                            type="number"
                            value={brain.vipLimit}
                            onChange={(e) => setBrain({ ...brain, vipLimit: parseInt(e.target.value) || 0 })}
                            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs outline-none focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 block mb-1">Max Tokens</span>
                          <input
                            type="number"
                            value={brain.vipMaxTokens}
                            onChange={(e) => setBrain({ ...brain, vipMaxTokens: parseInt(e.target.value) || 0 })}
                            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingBrain}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-red-950/50 disabled:opacity-50"
                  >
                    <Save size={16} />
                    {savingBrain ? 'Updating Brain...' : 'Save AI Brain Rules'}
                  </button>
                </div>
              </div>
            </form>
          ) : activeTab === 'support' ? (
            <div className="flex flex-col md:flex-row h-[600px] border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/80">
              {/* Left Pane: Ticket Directory */}
              <div className={clsx(
                "w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col h-full bg-zinc-950",
                activeSupportUserId && "hidden md:flex"
              )}>
                <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider">
                    Support Tickets ({supportChats.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowFullSupportDesk(true)}
                    className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition-all shadow flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 size={12} />
                    <span>Full Page</span>
                  </button>
                </div>

                {/* Quick User Selector to Start Typing Immediately */}
                <div className="p-2.5 border-b border-zinc-800 bg-zinc-900/60">
                  <label className="text-[10px] text-red-400 font-mono font-bold block mb-1 uppercase tracking-wider">
                    ⚡ Select User to Start Typing:
                  </label>
                  <select
                    value={activeSupportUserId || ''}
                    onChange={(e) => {
                      const uId = e.target.value;
                      if (!uId) {
                        setActiveSupportUserId(null);
                        setActiveSupportUserName(null);
                        return;
                      }
                      const found = users.find(u => u.uid === uId);
                      if (found) {
                        setActiveSupportUserId(found.uid);
                        setActiveSupportUserName(found.displayName || found.email || 'User');
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs py-1.5 px-2 rounded-lg outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="">-- Choose Any User to Text Back --</option>
                    {users.map(u => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName || u.email || u.uid} ({u.tier || 'free'})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {supportChats.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                      No active support tickets found.
                    </div>
                  ) : (
                    supportChats.map(chat => {
                      const isActive = activeSupportUserId === chat.userId;
                      return (
                        <div
                          key={chat.id}
                          onClick={() => {
                            setActiveSupportUserId(chat.userId);
                            setActiveSupportUserName(chat.userName);
                          }}
                          className={clsx(
                            "p-3 rounded-xl cursor-pointer transition-all border text-left",
                            isActive
                              ? "bg-red-950/40 border-red-600/60 text-white shadow-lg shadow-red-950/30"
                              : "bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-300"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-xs truncate max-w-[140px] text-zinc-100">
                              {chat.userName}
                            </h4>
                            {chat.unreadAdmin > 0 && (
                              <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                                {chat.unreadAdmin} New
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate mb-1">
                            {chat.lastMessage}
                          </p>
                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-zinc-800/60">
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSupportUserId(chat.userId);
                                setActiveSupportUserName(chat.userName);
                                setShowFullSupportDesk(true);
                              }}
                              className="px-2 py-0.5 rounded bg-red-600/90 hover:bg-red-500 text-white text-[10px] font-bold transition-all flex items-center gap-1 shadow cursor-pointer"
                              title="Open Full Screen Chat with this customer"
                            >
                              <Maximize2 size={10} />
                              <span>Full Page</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Pane: Live Interactive Support Chat */}
              <div className={clsx(
                "flex-1 h-full relative bg-zinc-900/40 flex flex-col",
                !activeSupportUserId && "hidden md:flex"
              )}>
                {activeSupportUserId ? (
                  <SupportChatScreen 
                    userId=""
                    userName=""
                    isAdminView={true}
                    targetUserId={activeSupportUserId}
                    targetUserName={activeSupportUserName || 'User'}
                    onExpandFullScreen={() => setShowFullSupportDesk(true)}
                    onClose={() => {
                      setActiveSupportUserId(null);
                      setActiveSupportUserName(null);
                    }}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-800/40 flex items-center justify-center text-red-400">
                      <MessageSquare size={32} />
                    </div>
                    <div className="max-w-sm space-y-1">
                      <h3 className="text-base font-bold text-zinc-100">Real-Time Support Desk</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Select a support ticket or click "Message" next to any user in User Control to send them a direct message.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'pricing' ? (
            <div className="max-w-2xl mx-auto space-y-6">
              <form onSubmit={handleSavePricing} className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <DollarSign size={20} className="text-amber-500" />
                  <h3 className="text-lg font-bold text-zinc-100">Subscription Pricing (NAIRA - ₦)</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1">Pro Plan Price (₦)</label>
                    <input 
                      type="number" 
                      value={pricing.pro}
                      onChange={(e) => setPricing({ ...pricing, pro: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1">Premium Plan Price (₦)</label>
                    <input 
                      type="number" 
                      value={pricing.premium}
                      onChange={(e) => setPricing({ ...pricing, premium: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1">VIP Plan Price (₦)</label>
                    <input 
                      type="number" 
                      value={pricing.vip}
                      onChange={(e) => setPricing({ ...pricing, vip: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button 
                    type="submit"
                    disabled={savingPricing}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {savingPricing ? 'Saving...' : 'Save Pricing'}
                  </button>
                </div>
              </form>
            </div>
          ) : activeTab === 'apikeys' ? (
            <div className="max-w-5xl mx-auto space-y-6">
              <form onSubmit={handleSaveApiKey} className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl space-y-6">
                {/* Vault Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-950/90 border border-red-800/60 rounded-2xl text-red-400 shadow-inner">
                      <Key size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2 tracking-wide">
                        API ROOM VAULT
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800/60 font-mono font-bold">
                          10 GROQ + 10 COHERE SLOTS
                        </span>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Dedicated 1-key-per-box configuration room. Enter keys in individual slots below without messing up line breaks.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowKeys(!showKeys)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors shadow-sm"
                    >
                      {showKeys ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{showKeys ? 'MASK ALL KEYS' : 'SHOW ALL KEYS'}</span>
                    </button>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between px-3 py-2 bg-zinc-950/80 border border-red-950/60 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                      <span className="text-xs font-mono font-bold text-zinc-200">GROQ ENGINE POOL</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-red-400">
                      {groqKeysList.filter(k => k.trim()).length} / 10 ACTIVE SLOTS
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-3 py-2 bg-zinc-950/80 border border-blue-950/60 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                      <span className="text-xs font-mono font-bold text-zinc-200">COHERE ENGINE POOL</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-400">
                      {cohereKeysList.filter(k => k.trim()).length} / 10 ACTIVE SLOTS
                    </span>
                  </div>
                </div>

                {/* GROQ KEYS ROOM - 10 SLOTS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                    <h4 className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                      <Cpu size={14} />
                      Groq API Keys Room (10 Dedicated Boxes)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setGroqKeysList(Array(10).fill(''))}
                      className="text-[11px] font-mono text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      Wipe Groq Slots
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groqKeysList.map((keyVal, idx) => {
                      const isFilled = keyVal.trim().length > 0;
                      return (
                        <div key={`groq-slot-${idx}`} className={clsx(
                          "p-2.5 rounded-xl border transition-all flex flex-col gap-1.5",
                          isFilled ? "bg-red-950/20 border-red-800/50" : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700"
                        )}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-zinc-400 flex items-center gap-1.5">
                              <span className={clsx("w-2 h-2 rounded-full", isFilled ? "bg-red-500" : "bg-zinc-700")}></span>
                              GROQ SLOT #{String(idx + 1).padStart(2, '0')}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={clsx("text-[9px] font-mono font-bold px-1.5 py-0.5 rounded", isFilled ? "bg-red-950 text-red-300 border border-red-800/40" : "bg-zinc-800 text-zinc-500")}>
                                {isFilled ? 'ACTIVE' : 'EMPTY'}
                              </span>
                              {isFilled && (
                                <button
                                  type="button"
                                  onClick={() => updateGroqKeySlot(idx, '')}
                                  className="text-zinc-500 hover:text-red-400 transition-colors"
                                  title="Clear slot"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          <input
                            type={showKeys ? 'text' : 'password'}
                            value={keyVal}
                            onChange={(e) => updateGroqKeySlot(idx, e.target.value)}
                            placeholder={`Enter Groq API Key ${idx + 1} (gsk_...)`}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500 rounded-lg px-3 py-2 text-zinc-100 font-mono text-xs focus:outline-none transition-colors"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* COHERE KEYS ROOM - 10 SLOTS */}
                <div className="space-y-3 pt-4">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                    <h4 className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                      <Cpu size={14} />
                      Cohere API Keys Room (10 Dedicated Boxes)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setCohereKeysList(Array(10).fill(''))}
                      className="text-[11px] font-mono text-zinc-500 hover:text-blue-400 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      Wipe Cohere Slots
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cohereKeysList.map((keyVal, idx) => {
                      const isFilled = keyVal.trim().length > 0;
                      return (
                        <div key={`cohere-slot-${idx}`} className={clsx(
                          "p-2.5 rounded-xl border transition-all flex flex-col gap-1.5",
                          isFilled ? "bg-blue-950/20 border-blue-800/50" : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700"
                        )}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-zinc-400 flex items-center gap-1.5">
                              <span className={clsx("w-2 h-2 rounded-full", isFilled ? "bg-blue-500" : "bg-zinc-700")}></span>
                              COHERE SLOT #{String(idx + 1).padStart(2, '0')}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={clsx("text-[9px] font-mono font-bold px-1.5 py-0.5 rounded", isFilled ? "bg-blue-950 text-blue-300 border border-blue-800/40" : "bg-zinc-800 text-zinc-500")}>
                                {isFilled ? 'ACTIVE' : 'EMPTY'}
                              </span>
                              {isFilled && (
                                <button
                                  type="button"
                                  onClick={() => updateCohereKeySlot(idx, '')}
                                  className="text-zinc-500 hover:text-blue-400 transition-colors"
                                  title="Clear slot"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          <input
                            type={showKeys ? 'text' : 'password'}
                            value={keyVal}
                            onChange={(e) => updateCohereKeySlot(idx, e.target.value)}
                            placeholder={`Enter Cohere API Key ${idx + 1} (cohere_...)`}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-lg px-3 py-2 text-zinc-100 font-mono text-xs focus:outline-none transition-colors"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {keySaveSuccess && (
                  <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-emerald-400 text-xs flex items-center gap-2 font-semibold">
                    <CheckCircle size={16} />
                    <span>API Room Vault updated successfully! Automatic load balancer & key rotation re-indexed.</span>
                  </div>
                )}

                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                    <Lock size={12} className="text-zinc-400" />
                    <span>All keys stored encrypted in system database</span>
                  </div>
                  <button 
                    type="submit"
                    disabled={savingKey}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold rounded-xl transition-all shadow-lg shadow-red-950/50 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={14} />
                    <span>{savingKey ? 'SAVING VAULT...' : 'SAVE ALL 20 KEY SLOTS'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : null}

        {showFullSupportDesk && (
          <FullPageSupportDesk
            userId="admin"
            userName="Admin"
            isAdminView={true}
            initialTargetUserId={activeSupportUserId || undefined}
            initialTargetUserName={activeSupportUserName || undefined}
            onClose={() => setShowFullSupportDesk(false)}
          />
        )}
      </div>
    </div>
  );
}
