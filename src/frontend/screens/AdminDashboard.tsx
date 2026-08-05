import React, { useState, useEffect } from 'react';
import { UserProfile, SupportChat, PricingSettings, AIBrainSettings, SystemAPIKeys } from '../../models/types';
import { listenToAllUsers, updateUserTier, updateUserStatus, updateUserVerification, listenToAllSupportChats, getPricingSettings, updatePricingSettings, getAIBrainSettings, updateAIBrainSettings, getSystemAPIKeys, updateSystemAPIKeys } from '../../database/db';
import { X, ArrowLeft, Shield, Crown, User, RefreshCw, Ban, CheckCircle, BadgeCheck, MessageSquare, ChevronUp, ChevronDown, DollarSign, Cpu, Save, Sparkles, Key, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { SupportChatScreen } from './SupportChatScreen';

interface AdminDashboardProps {
  onClose: () => void;
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'support' | 'pricing' | 'brain' | 'apikeys'>('users');
  
  const [supportChats, setSupportChats] = useState<SupportChat[]>([]);
  const [activeSupportUserId, setActiveSupportUserId] = useState<string | null>(null);
  const [activeSupportUserName, setActiveSupportUserName] = useState<string | null>(null);

  const [pricing, setPricing] = useState<PricingSettings>({ premium: 5000, pro: 7000, vip: 10000 });
  const [savingPricing, setSavingPricing] = useState(false);

  const [groqKey, setGroqKey] = useState<string>('');
  const [showGroqKey, setShowGroqKey] = useState(false);
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
    
    getPricingSettings().then(setPricing);
    getAIBrainSettings().then(setBrain);
    getSystemAPIKeys().then(keys => setGroqKey(keys.groqApiKey || ''));
    
    return () => {
      unsubUsers();
      unsubChats();
    };
  }, []);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    try {
      await updateSystemAPIKeys({ groqApiKey: groqKey.trim() });
      setKeySaveSuccess(true);
      setTimeout(() => setKeySaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save API key", err);
    } finally {
      setSavingKey(false);
    }
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
    setActiveTab('support');
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-red-900/40 rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl shadow-red-950/20">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3 flex-wrap">
            <button 
              onClick={onClose}
              className="flex items-center gap-2 p-2 mr-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium text-sm hidden sm:inline">Back</span>
            </button>
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg hidden sm:block">
              <Shield size={20} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-wider">VOID AI ADMIN</h2>
            
            <div className="flex items-center bg-zinc-950/80 rounded-xl p-1 border border-zinc-800 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('users')}
                className={clsx("px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors", activeTab === 'users' ? "bg-red-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200")}
              >
                User Control
              </button>
              <button 
                onClick={() => setActiveTab('brain')}
                className={clsx("px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5", activeTab === 'brain' ? "bg-red-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200")}
              >
                <Cpu size={14} />
                AI Brain Rules
              </button>
              <button 
                onClick={() => setActiveTab('support')}
                className={clsx("px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5", activeTab === 'support' ? "bg-red-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200")}
              >
                Support Tickets
                {supportChats.reduce((acc, c) => acc + c.unreadAdmin, 0) > 0 && (
                  <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {supportChats.reduce((acc, c) => acc + c.unreadAdmin, 0)}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('pricing')}
                className={clsx("px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors", activeTab === 'pricing' ? "bg-red-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200")}
              >
                Pricing (₦)
              </button>
              <button 
                onClick={() => setActiveTab('apikeys')}
                className={clsx("px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5", activeTab === 'apikeys' ? "bg-red-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200")}
              >
                <Key size={14} />
                API Keys
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'users' ? (
            loading ? (
              <div className="flex justify-center py-12">
                <RefreshCw size={24} className="text-red-500 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-zinc-400 border-b border-zinc-800">
                      <th className="pb-3 px-2 font-medium cursor-pointer hover:text-zinc-200 transition-colors" onClick={() => handleSort('email')}>
                        <div className="flex items-center gap-1">User {sortField === 'email' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                      </th>
                      <th className="pb-3 px-2 font-medium cursor-pointer hover:text-zinc-200 transition-colors" onClick={() => handleSort('email')}>
                        Email
                      </th>
                      <th className="pb-3 px-2 font-medium cursor-pointer hover:text-zinc-200 transition-colors" onClick={() => handleSort('role')}>
                        <div className="flex items-center gap-1">Role {sortField === 'role' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                      </th>
                      <th className="pb-3 px-2 font-medium cursor-pointer hover:text-zinc-200 transition-colors" onClick={() => handleSort('status')}>
                        <div className="flex items-center gap-1">Status {sortField === 'status' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                      </th>
                      <th className="pb-3 px-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {sortedUsers.map(user => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === 'brain' ? (
            <form onSubmit={handleSaveBrain} className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-zinc-950 border border-red-900/30 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu size={20} className="text-red-500" />
                    <h3 className="text-lg font-bold text-white">VOID AI System Brain & Rules</h3>
                  </div>
                  <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-mono font-bold">
                    ADMIN-ONLY
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Only authorized system admin accounts can configure the AI brain instructions for each tier.
                </p>

                {brainSaveSuccess && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span>AI Brain rules updated successfully!</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-1">
                    Global System Persona (Base AI Brain)
                  </label>
                  <textarea
                    rows={3}
                    value={brain.globalPrompt}
                    onChange={(e) => setBrain({ ...brain, globalPrompt: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-zinc-100 text-sm focus:border-red-500 outline-none"
                    placeholder="Enter global system instructions..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Free Tier */}
                  <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Free Tier Config
                    </label>
                    <div>
                      <span className="text-[11px] text-zinc-500 block mb-1">System Behavior Prompt</span>
                      <textarea
                        rows={3}
                        value={brain.freePrompt}
                        onChange={(e) => setBrain({ ...brain, freePrompt: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg p-2.5 text-zinc-100 text-xs focus:border-red-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-zinc-400 block mb-1">Daily Msgs Limit</span>
                        <input
                          type="number"
                          value={brain.freeLimit}
                          onChange={(e) => setBrain({ ...brain, freeLimit: parseInt(e.target.value) || 0 })}
                          className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-zinc-100 text-xs outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-zinc-400 block mb-1">Max Output Tokens</span>
                        <input
                          type="number"
                          value={brain.freeMaxTokens}
                          onChange={(e) => setBrain({ ...brain, freeMaxTokens: parseInt(e.target.value) || 0 })}
                          className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-zinc-100 text-xs outline-none focus:border-red-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pro Tier */}
                  <div className="p-4 bg-zinc-900/60 border border-blue-950/60 rounded-xl space-y-3">
                    <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider">
                      Pro Tier Config
                    </label>
                    <div>
                      <span className="text-[11px] text-zinc-500 block mb-1">System Behavior Prompt</span>
                      <textarea
                        rows={3}
                        value={brain.proPrompt}
                        onChange={(e) => setBrain({ ...brain, proPrompt: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg p-2.5 text-zinc-100 text-xs focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-zinc-400 block mb-1">Daily Msgs Limit</span>
                        <input
                          type="number"
                          value={brain.proLimit}
                          onChange={(e) => setBrain({ ...brain, proLimit: parseInt(e.target.value) || 0 })}
                          className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-zinc-100 text-xs outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-zinc-400 block mb-1">Max Output Tokens</span>
                        <input
                          type="number"
                          value={brain.proMaxTokens}
                          onChange={(e) => setBrain({ ...brain, proMaxTokens: parseInt(e.target.value) || 0 })}
                          className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-zinc-100 text-xs outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Premium Tier */}
                  <div className="p-4 bg-zinc-900/60 border border-amber-950/60 rounded-xl space-y-3">
                    <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Premium Tier Config
                    </label>
                    <div>
                      <span className="text-[11px] text-zinc-500 block mb-1">System Behavior Prompt</span>
                      <textarea
                        rows={3}
                        value={brain.premiumPrompt}
                        onChange={(e) => setBrain({ ...brain, premiumPrompt: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg p-2.5 text-zinc-100 text-xs focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-zinc-400 block mb-1">Daily Msgs Limit</span>
                        <input
                          type="number"
                          value={brain.premiumLimit}
                          onChange={(e) => setBrain({ ...brain, premiumLimit: parseInt(e.target.value) || 0 })}
                          className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-zinc-100 text-xs outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-zinc-400 block mb-1">Max Output Tokens</span>
                        <input
                          type="number"
                          value={brain.premiumMaxTokens}
                          onChange={(e) => setBrain({ ...brain, premiumMaxTokens: parseInt(e.target.value) || 0 })}
                          className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-zinc-100 text-xs outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* VIP Tier */}
                  <div className="p-4 bg-zinc-900/60 border border-purple-950/60 rounded-xl space-y-3">
                    <label className="block text-xs font-bold text-purple-400 uppercase tracking-wider">
                      VIP Tier Config
                    </label>
                    <div>
                      <span className="text-[11px] text-zinc-500 block mb-1">System Behavior Prompt</span>
                      <textarea
                        rows={3}
                        value={brain.vipPrompt}
                        onChange={(e) => setBrain({ ...brain, vipPrompt: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg p-2.5 text-zinc-100 text-xs focus:border-purple-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-zinc-400 block mb-1">Daily Msgs Limit</span>
                        <input
                          type="number"
                          value={brain.vipLimit}
                          onChange={(e) => setBrain({ ...brain, vipLimit: parseInt(e.target.value) || 0 })}
                          className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-zinc-100 text-xs outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-zinc-400 block mb-1">Max Output Tokens</span>
                        <input
                          type="number"
                          value={brain.vipMaxTokens}
                          onChange={(e) => setBrain({ ...brain, vipMaxTokens: parseInt(e.target.value) || 0 })}
                          className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-zinc-100 text-xs outline-none focus:border-purple-500"
                        />
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
          ) : activeTab === 'support' ? (() => {
            const displaySupportChats = [...supportChats];
            if (activeSupportUserId && !displaySupportChats.some(c => c.userId === activeSupportUserId)) {
              displaySupportChats.unshift({
                id: activeSupportUserId,
                userId: activeSupportUserId,
                userName: activeSupportUserName || 'User',
                lastMessage: 'Direct Admin Chat initiated...',
                lastMessageTime: Date.now(),
                unreadAdmin: 0,
                unreadUser: 0
              });
            }
            return (
              <div className="flex flex-col md:flex-row h-[600px] border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/80">
                {/* Left Pane: Ticket Directory */}
                <div className={clsx(
                  "w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col h-full bg-zinc-950",
                  activeSupportUserId && "hidden md:flex"
                )}>
                  <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider">
                      Support Tickets ({displaySupportChats.length})
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/40 text-[10px] font-bold">
                      LIVE DESK
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {displaySupportChats.length === 0 ? (
                      <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                        No active support tickets found.
                      </div>
                    ) : (
                      displaySupportChats.map(chat => {
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
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
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
            );
          })() : activeTab === 'pricing' ? (
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
            <div className="max-w-2xl mx-auto space-y-6">
              <form onSubmit={handleSaveApiKey} className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-950/80 border border-red-800/60 rounded-xl text-red-400">
                    <Key size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-100">Global Groq API Key Config</h3>
                    <p className="text-xs text-zinc-400">Configure your system-wide Groq AI provider credentials.</p>
                  </div>
                </div>

                {/* Security Vault Banner */}
                <div className="mb-6 p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                    <ShieldCheck size={16} />
                    <span>SECURE BACKEND STORAGE</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    This key is stored securely in your private database setting (`/settings/apikeys`) with strict Admin-only permissions.
                    All users consume AI through the backend proxy (`/api/chat`). <strong className="text-zinc-200">Regular users cannot view, extract, or inspect your API key.</strong>
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider mb-2">
                      Groq API Key (gsk_...)
                    </label>
                    <div className="relative">
                      <input 
                        type={showGroqKey ? "text" : "password"} 
                        value={groqKey}
                        onChange={(e) => setGroqKey(e.target.value)}
                        placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full bg-zinc-900 border border-zinc-700 focus:border-red-500 rounded-xl pl-4 pr-12 py-3 text-zinc-100 focus:outline-none font-mono text-xs transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGroqKey(!showGroqKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-1"
                      >
                        {showGroqKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {keySaveSuccess && (
                  <div className="mt-4 p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span>API key successfully updated and saved securely! All user AI requests now use this key.</span>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-800">
                  <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                    <Lock size={12} className="text-zinc-400" />
                    <span>Admin Only Access</span>
                  </div>
                  <button 
                    type="submit"
                    disabled={savingKey}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold rounded-xl transition-all shadow-lg shadow-red-950/50 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={14} />
                    <span>{savingKey ? 'SAVING...' : 'SAVE API KEY'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
