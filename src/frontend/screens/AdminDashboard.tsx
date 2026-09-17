import React, { useState, useEffect } from 'react';
import { UserProfile, SupportChat, PricingSettings, AIBrainSettings, SystemAPIKeys, BroadcastMessage, UserTier, WalletTransaction } from '../../models/types';
import { listenToAllUsers, updateUserTier, updateUserStatus, updateUserVerification, updateUserSupportStaff, listenToAllSupportChats, getPricingSettings, updatePricingSettings, getAIBrainSettings, updateAIBrainSettings, getSystemAPIKeys, updateSystemAPIKeys, sendBroadcastMessage, listenToBroadcasts, deleteBroadcast, grantUserWalletFunds, withdrawUserWalletFunds, resetUserWalletBalance, listenToWalletTransactions } from '../../database/db';
import { X, ArrowLeft, Shield, Crown, User, RefreshCw, Ban, CheckCircle, BadgeCheck, MessageSquare, ChevronUp, ChevronDown, DollarSign, Cpu, Save, Sparkles, Key, Eye, EyeOff, Lock, ShieldCheck, Trash2, Radio, Megaphone, Maximize2, Search, Check, Wallet, CreditCard, History, Plus, Activity } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'users' | 'wallet' | 'broadcast' | 'support' | 'pricing' | 'brain' | 'apikeys'>('users');
  
  // Wallet Funding state
  const [fundingUser, setFundingUser] = useState<UserProfile | null>(null);
  const [walletUserSearch, setWalletUserSearch] = useState<string>('');
  const [fundAmount, setFundAmount] = useState<number>(10000);
  const [fundNote, setFundNote] = useState<string>('Admin Wallet Credit');
  const [isGranting, setIsGranting] = useState<boolean>(false);
  const [allWalletTxs, setAllWalletTxs] = useState<WalletTransaction[]>([]);
  
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

  const [pricing, setPricing] = useState<PricingSettings>({
    pro: 7000,
    proYearly: 70000,
    proDiscount: 16,
    premium: 15000,
    premiumYearly: 150000,
    premiumDiscount: 16,
    vip: 30000,
    vipYearly: 300000,
    vipDiscount: 16,
    apiKeyMonthly: 20000,
    apiKeyYearly: 200000,
    apiKeyDiscount: 20
  });
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingSaveSuccess, setPricingSaveSuccess] = useState(false);

  const [groqKeysList, setGroqKeysList] = useState<string[]>(Array(10).fill(''));
  const [cohereKeysList, setCohereKeysList] = useState<string[]>(Array(10).fill(''));
  const [bazaarLinkKeysList, setBazaarLinkKeysList] = useState<string[]>(Array(10).fill(''));
  const [bulkGroqText, setBulkGroqText] = useState<string>('');
  const [bulkCohereText, setBulkCohereText] = useState<string>('');
  const [bulkBazaarLinkText, setBulkBazaarLinkText] = useState<string>('');
  const [keyInputMode, setKeyInputMode] = useState<'slots' | 'bulk'>('bulk');
  const [showKeys, setShowKeys] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keySaveSuccess, setKeySaveSuccess] = useState(false);
  const [keyHealth, setKeyHealth] = useState<any>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const [brain, setBrain] = useState<AIBrainSettings>({
    globalPrompt: "",
    freePrompt: "",
    proPrompt: "",
    premiumPrompt: "",
    vipPrompt: "",
    freeLimit: 5,
    proLimit: 20,
    premiumLimit: 50,
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
      const bKeys = keys.bazaarLinkApiKeys && keys.bazaarLinkApiKeys.length > 0 ? keys.bazaarLinkApiKeys : (keys.bazaarLinkApiKey ? [keys.bazaarLinkApiKey] : []);

      setBulkGroqText(gKeys.join('\n'));
      setBulkCohereText(cKeys.join('\n'));
      setBulkBazaarLinkText(bKeys.join('\n'));

      const gList = Array(10).fill('');
      gKeys.slice(0, 10).forEach((k, idx) => { gList[idx] = k; });
      setGroqKeysList(gList);

      const cList = Array(10).fill('');
      cKeys.slice(0, 10).forEach((k, idx) => { cList[idx] = k; });
      setCohereKeysList(cList);

      const bList = Array(10).fill('');
      bKeys.slice(0, 10).forEach((k, idx) => { bList[idx] = k; });
      setBazaarLinkKeysList(bList);
    });

    const unsubTxs = listenToWalletTransactions(null, (list) => {
      setAllWalletTxs(list);
    });
    
    return () => {
      unsubUsers();
      unsubChats();
      unsubBroadcasts();
      unsubTxs();
    };
  }, []);

  const handleGrantFunds = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fundingUser) return;
    if (!fundAmount || fundAmount === 0) {
      alert("Please enter a valid non-zero funding amount.");
      return;
    }
    setIsGranting(true);
    try {
      const res = await grantUserWalletFunds(fundingUser.uid, fundAmount, fundNote || (fundAmount >= 0 ? "Admin Wallet Grant" : "Admin Wallet Debit"));
      alert(`🎉 Successfully ${fundAmount >= 0 ? 'credited' : 'debited'} ₦${Math.abs(fundAmount).toLocaleString()} for ${fundingUser.displayName || fundingUser.email || 'User'}!\n\nNew Wallet Balance: ₦${res.newBalance.toLocaleString()}`);
      setFundingUser(null);
    } catch (err: any) {
      console.error("Failed to process wallet transaction:", err);
      alert("Error processing wallet transaction: " + err.message);
    } finally {
      setIsGranting(false);
    }
  };

  const handleWithdrawFunds = async (targetUser: UserProfile) => {
    const currentBalance = targetUser.walletBalance || 0;
    if (currentBalance <= 0) {
      alert("User wallet balance is ₦0. Nothing to withdraw.");
      return;
    }
    const inputAmount = prompt(`Withdraw / Debit funds for ${targetUser.displayName || targetUser.email || 'User'}:\nCurrent Wallet Balance: ₦${currentBalance.toLocaleString()}\n\nEnter amount to withdraw in Naira (or leave as full balance):`, currentBalance.toString());
    if (inputAmount === null) return;
    const withdrawAmt = Number(inputAmount);
    if (isNaN(withdrawAmt) || withdrawAmt <= 0) {
      alert("Invalid withdrawal amount.");
      return;
    }
    if (confirm(`Are you sure you want to withdraw ₦${withdrawAmt.toLocaleString()} from ${targetUser.displayName || targetUser.email}?`)) {
      try {
        const res = await withdrawUserWalletFunds(targetUser.uid, withdrawAmt, "Admin Security Withdrawal");
        alert(`Successfully withdrew ₦${withdrawAmt.toLocaleString()} from user's wallet.\n\nNew Balance: ₦${res.newBalance.toLocaleString()}`);
      } catch (err: any) {
        alert("Withdrawal failed: " + err.message);
      }
    }
  };

  const handleResetWallet = async (targetUser: UserProfile) => {
    const currentBalance = targetUser.walletBalance || 0;
    if (confirm(`⚠️ EMERGENCY SECURITY RESET / FREEZE:\nAre you sure you want to reset ${targetUser.displayName || targetUser.email || 'User'}'s wallet balance from ₦${currentBalance.toLocaleString()} to ₦0?\n\nThis will prevent unauthorized purchases and log a security reset transaction.`)) {
      try {
        await resetUserWalletBalance(targetUser.uid, "Emergency Security Reset / Anti-Hack Freeze");
        alert(`Wallet balance for ${targetUser.displayName || targetUser.email} has been reset to ₦0.`);
      } catch (err: any) {
        alert("Reset failed: " + err.message);
      }
    }
  };

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

  const parseRawKeyInput = (text: string, list: string[]): string[] => {
    const fromText = text.split(/[\n,;\s]+/).map(k => k.trim()).filter(k => k.length > 5);
    const fromList = list.map(k => k.trim()).filter(k => k.length > 5);
    const combined = Array.from(new Set([...fromText, ...fromList]));
    return combined;
  };

  const checkKeyHealth = async () => {
    setCheckingHealth(true);
    try {
      const res = await fetch('/api/admin/key-health');
      const data = await res.json();
      setKeyHealth(data);
    } catch (err) {
      console.error("Failed to check key health", err);
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    try {
      const parsedGroq = parseRawKeyInput(bulkGroqText, groqKeysList);
      const parsedCohere = parseRawKeyInput(bulkCohereText, cohereKeysList);
      const parsedBazaarLink = parseRawKeyInput(bulkBazaarLinkText, bazaarLinkKeysList);

      await updateSystemAPIKeys({ 
        groqApiKey: parsedGroq[0] || '',
        groqApiKeys: parsedGroq,
        cohereApiKey: parsedCohere[0] || '',
        cohereApiKeys: parsedCohere,
        bazaarLinkApiKey: parsedBazaarLink[0] || '',
        bazaarLinkApiKeys: parsedBazaarLink
      });

      // Update bulk text and slots view to reflect saved keys
      setBulkGroqText(parsedGroq.join('\n'));
      setBulkCohereText(parsedCohere.join('\n'));
      setBulkBazaarLinkText(parsedBazaarLink.join('\n'));

      const newGList = Array(10).fill('');
      parsedGroq.slice(0, 10).forEach((k, idx) => { newGList[idx] = k; });
      setGroqKeysList(newGList);

      const newCList = Array(10).fill('');
      parsedCohere.slice(0, 10).forEach((k, idx) => { newCList[idx] = k; });
      setCohereKeysList(newCList);

      const newBList = Array(10).fill('');
      parsedBazaarLink.slice(0, 10).forEach((k, idx) => { newBList[idx] = k; });
      setBazaarLinkKeysList(newBList);

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

  const updateBazaarLinkKeySlot = (index: number, val: string) => {
    const updated = [...bazaarLinkKeysList];
    updated[index] = val;
    setBazaarLinkKeysList(updated);
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPricing(true);
    try {
      await updatePricingSettings(pricing);
      setPricingSaveSuccess(true);
      setTimeout(() => setPricingSaveSuccess(false), 3000);
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
    <div className="fixed inset-0 z-50 bg-[#090A0F] text-white flex flex-col font-sans overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-16 px-4 md:px-6 bg-[#0D1117] border-b border-[#30363D] flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] rounded-xl text-xs font-bold text-white transition-all shadow-sm"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          <div className="h-5 w-[1px] bg-[#30363D] hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3f86ff] to-[#3f86ff] border border-[#3f86ff]/50 flex items-center justify-center font-bold text-white shadow-md">
              <Shield size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-wide uppercase">
                  VOID AI Management Console
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-[#252527] border border-[#38383b] text-[#8d8d91] text-[10px] font-bold">
                  ADMINISTRATOR MODE
                </span>
              </div>
              <p className="text-[11px] text-[#8d8d91] ">
                Full-page user management & system configuration desk
              </p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 bg-[#161B22] border border-[#30363D] px-3 py-1.5 rounded-xl text-xs text-white ">
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
              ? "bg-[#3f86ff] border-[#3f86ff] text-white shadow-md " 
              : "bg-[#161B22] border-[#30363D] text-white hover:text-white hover:bg-[#21262D]"
          )}
        >
          <User size={15} />
          <span>User Control Center ({users.length})</span>
        </button>

        <button 
          onClick={() => setActiveTab('wallet')}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border",
            activeTab === 'wallet' 
              ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-950/40" 
              : "bg-[#161B22] border-[#30363D] text-white hover:text-white hover:bg-[#21262D]"
          )}
        >
          <Wallet size={15} className="text-emerald-400" />
          <span>Wallet & Finances (₦)</span>
        </button>

        <button 
          onClick={() => setActiveTab('broadcast')}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border",
            activeTab === 'broadcast' 
              ? "bg-[#3f86ff] border-[#3f86ff] text-white shadow-md " 
              : "bg-[#161B22] border-[#30363D] text-white hover:text-white hover:bg-[#21262D]"
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
              ? "bg-[#3f86ff] border-[#3f86ff] text-white shadow-md " 
              : "bg-[#161B22] border-[#30363D] text-white hover:text-white hover:bg-[#21262D]"
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
              ? "bg-[#3f86ff] border-[#3f86ff] text-white shadow-md " 
              : "bg-[#161B22] border-[#30363D] text-white hover:text-white hover:bg-[#21262D]"
          )}
        >
          <MessageSquare size={15} />
          <span>Live Support Tickets</span>
          {supportChats.reduce((acc, c) => acc + c.unreadAdmin, 0) > 0 && (
            <span className="bg-[#3f86ff] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {supportChats.reduce((acc, c) => acc + c.unreadAdmin, 0)}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('pricing')}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border",
            activeTab === 'pricing' 
              ? "bg-[#3f86ff] border-[#3f86ff] text-white shadow-md " 
              : "bg-[#161B22] border-[#30363D] text-white hover:text-white hover:bg-[#21262D]"
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
              ? "bg-[#3f86ff] border-[#3f86ff] text-white shadow-md " 
              : "bg-[#161B22] border-[#30363D] text-white hover:text-white hover:bg-[#21262D]"
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
              <RefreshCw size={28} className="text-[#3f86ff] animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 max-w-7xl mx-auto">
              {/* User Search & Filter Bar */}
              <div className="p-4 bg-[#0D1117] border border-[#30363D] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <div className="relative w-full sm:w-96">
                  <Search size={16} className="absolute left-3.5 top-3 text-[#8d8d91]" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search users by name, email, or UID..."
                    className="w-full bg-[#161B22] border border-[#30363D] focus:border-[#3f86ff] rounded-xl pl-10 pr-20 py-2 text-xs text-white outline-none transition-colors placeholder:text-[#8d8d91]"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-2 top-1.5 px-2 py-1 rounded-lg bg-[#3f86ff]/90 hover:opacity-90 text-white text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                      title="Clear search"
                    >
                      <X size={12} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                <div className="text-xs text-[#8d8d91] flex items-center gap-3 self-end sm:self-auto">
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="text-xs font-bold text-[#8d8d91] hover:text-[#8d8d91] underline cursor-pointer mr-2"
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
                      <tr className="text-[#8d8d91] border-b border-[#30363D] bg-[#161B22]/80">
                        <th className="py-3.5 px-4 font-bold cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('email')}>
                          <div className="flex items-center gap-1">User {sortField === 'email' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                        </th>
                        <th className="py-3.5 px-4 font-bold cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('email')}>
                          Email
                        </th>
                        <th className="py-3.5 px-4 font-bold cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('role')}>
                          <div className="flex items-center gap-1">Role {sortField === 'role' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                        </th>
                        <th className="py-3.5 px-4 font-bold cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('status')}>
                          <div className="flex items-center gap-1">Status & Tier {sortField === 'status' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                        </th>
                        <th className="py-3.5 px-4 font-bold text-emerald-400">Wallet Balance</th>
                        <th className="py-3.5 px-4 font-bold text-right">Actions / Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363D]/60">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-xs text-[#8d8d91] ">
                            No users matched "{userSearchQuery}"
                          </td>
                        </tr>
                      ) : (
                        sortedUsers.map((user, idx) => (
                          <tr key={user.uid ? user.uid : `user-row-${idx}`} className="hover:bg-[#38383b]/40 transition-colors">
                        <td className="py-3 px-2">
                          <div className="font-medium text-white flex items-center gap-1">
                            {user.displayName || 'User'}
                            {user.isVerified && <BadgeCheck size={14} className="text-blue-400" />}
                          </div>
                          <div className="text-xs text-[#8d8d91] mt-0.5">{(user.uid || 'unknown').slice(0, 8)}...</div>
                        </td>
                        <td className="py-3 px-2 text-white text-xs">
                          {user.email || 'Google User'}
                        </td>
                        <td className="py-3 px-2">
                          {user.isAdmin ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#3f86ff]/20 text-[#8d8d91] text-xs font-bold border border-[#3f86ff]/30">
                              <Shield size={12} />
                              Super Admin
                            </span>
                          ) : user.isSupportStaff ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                              <Shield size={12} />
                              Management Staff
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#38383b] text-[#8d8d91] text-xs font-medium">
                              <User size={12} />
                              User
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className={clsx(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                              user.isBanned ? "bg-[#3f86ff]/20 text-[#3f86ff] border border-[#3f86ff]/30" :
                              user.tier === 'vip' ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                              user.tier === 'premium' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                              user.tier === 'pro' ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                              "bg-[#38383b] text-[#8d8d91]"
                            )}>
                              {user.isBanned ? <Ban size={10} className="mr-1" /> : (user.tier === 'premium' || user.tier === 'vip') && <Crown size={10} className="mr-1" />}
                              {user.isBanned ? 'BANNED' : user.tier}
                            </span>
                            <span className="text-xs text-[#8d8d91]">
                              ({user.messageCount} msgs)
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 font-bold text-emerald-400 text-xs">
                          ₦{(user.walletBalance || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setFundingUser(user);
                                setFundAmount(10000);
                                setFundNote('Admin Wallet Credit');
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-bold transition-all bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white flex items-center gap-1 cursor-pointer"
                              title="Grant or credit funds to this user's wallet"
                            >
                              <Wallet size={12} />
                              <span>₦{(user.walletBalance || 0).toLocaleString()}</span>
                            </button>
                            {(user.walletBalance || 0) > 0 && (
                              <>
                                <button
                                  onClick={() => handleWithdrawFunds(user)}
                                  className="px-2 py-1 rounded-md text-xs font-bold transition-all border bg-amber-950/80 border-amber-800 hover:border-amber-500 text-amber-400 flex items-center gap-1 shadow-sm cursor-pointer"
                                  title="Withdraw / Debit funds from user's wallet"
                                >
                                  <span>Withdraw</span>
                                </button>
                                <button
                                  onClick={() => handleResetWallet(user)}
                                  className="px-2 py-1 rounded-md text-xs font-bold transition-all border bg-[#252527] border-[#38383b] hover:border-[#3f86ff] text-[#8d8d91] flex items-center gap-1 shadow-sm cursor-pointer"
                                  title="Emergency security reset / freeze (Set wallet to ₦0)"
                                >
                                  <span>Freeze/Reset</span>
                                </button>
                              </>
                            )}
                            <div className="w-px h-5 bg-[#38383b] mx-0.5"></div>
                            <button
                              onClick={() => handleUpdateTier(user.uid, 'free')}
                              className={clsx("px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border", user.tier === 'free' ? "bg-[#38383b] border-[#38383b] text-white" : "bg-transparent border-[#38383b] text-[#8d8d91] hover:text-white hover:border-[#38383b]")}
                            >
                              Free
                            </button>
                            <button
                              onClick={() => handleUpdateTier(user.uid, 'pro')}
                              className={clsx("px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border", user.tier === 'pro' ? "bg-blue-600 border-blue-500 text-white" : "bg-transparent border-[#38383b] text-[#8d8d91] hover:text-blue-400 hover:border-blue-900/50")}
                            >
                              Pro
                            </button>
                            <button
                              onClick={() => handleUpdateTier(user.uid, 'premium')}
                              className={clsx("px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border flex items-center gap-1", user.tier === 'premium' ? "bg-amber-500 border-amber-400 text-amber-950" : "bg-transparent border-[#38383b] text-[#8d8d91] hover:text-amber-400 hover:border-amber-900/50")}
                            >
                              <Crown size={11} />
                              Premium
                            </button>
                            <button
                              onClick={() => handleUpdateTier(user.uid, 'vip')}
                              className={clsx("px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border flex items-center gap-1", user.tier === 'vip' ? "bg-purple-600 border-purple-500 text-white" : "bg-transparent border-[#38383b] text-[#8d8d91] hover:text-purple-400 hover:border-purple-900/50")}
                            >
                              <Crown size={11} />
                              VIP
                            </button>
                            <div className="w-px h-5 bg-[#38383b] mx-1"></div>
                            <button
                              onClick={() => handleToggleVerify(user.uid, user.isVerified || false)}
                              className={clsx(
                                "px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border flex items-center gap-1",
                                user.isVerified 
                                  ? "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20" 
                                  : "bg-[#38383b] border-[#38383b] text-[#8d8d91] hover:bg-[#454547]"
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
                                  : "bg-[#3f86ff]/10 border-[#3f86ff]/30 text-[#8d8d91] hover:opacity-90/20"
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
                                    : "bg-[#38383b] border-[#38383b] text-[#8d8d91] hover:bg-[#454547] hover:text-emerald-300"
                                )}
                                title={user.isSupportStaff ? "Revoke Management Support Staff Role" : "Appoint to Management Support Team"}
                              >
                                <Shield size={12} />
                                {user.isSupportStaff ? 'Staff Role' : 'Appoint Staff'}
                              </button>
                            )}
                            <button
                              onClick={() => handleMessageUserDirectly(user)}
                              className="px-2.5 py-1 rounded-md text-xs font-bold transition-all border bg-[#3f86ff] hover:opacity-90 text-white border-[#3f86ff] flex items-center gap-1 shadow-sm"
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
        )) : activeTab === 'wallet' ? (
          <div className="space-y-6 max-w-7xl mx-auto ">
            
            {/* Top Financial Stat Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 bg-[#0D1117] border border-emerald-900/60 rounded-2xl space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#8d8d91]">TOTAL SYSTEM WALLET BALANCE</span>
                  <Wallet size={20} />
                </div>
                <div className="text-3xl font-black text-emerald-400 ">
                  ₦{users.reduce((acc, u) => acc + (u.walletBalance || 0), 0).toLocaleString()}
                </div>
                <p className="text-[11px] text-[#8d8d91]">Combined unspent credit across all registered user accounts.</p>
              </div>

              <div className="p-5 bg-[#0D1117] border border-blue-900/60 rounded-2xl space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-blue-400">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#8d8d91]">ACTIVE FUNDED WALLETS</span>
                  <CreditCard size={20} />
                </div>
                <div className="text-3xl font-black text-blue-400 ">
                  {users.filter(u => (u.walletBalance || 0) > 0).length} <span className="text-sm font-normal text-[#8d8d91]">/ {users.length} Users</span>
                </div>
                <p className="text-[11px] text-[#8d8d91]">User accounts currently holding ₦1 or more in credit.</p>
              </div>

              <div className="p-5 bg-[#0D1117] border border-amber-900/60 rounded-2xl space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#8d8d91]">WALLET AUDIT LOGS</span>
                  <History size={20} />
                </div>
                <div className="text-3xl font-black text-amber-400 ">
                  {allWalletTxs.length}
                </div>
                <p className="text-[11px] text-[#8d8d91]">Total recorded wallet top-ups, grants, & purchases.</p>
              </div>
            </div>

            {/* Quick Wallet Grant Panel */}
            <div className="p-6 bg-[#0D1117] border border-[#38383b] rounded-2xl space-y-5 shadow-[0_0_30px_rgba(220,38,38,0.15)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#3f86ff]/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-[#30363D] pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#252527] border border-[#38383b] text-[#8d8d91] rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2 ">
                      <span>USER WALLET FUNDING PORTAL</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#252527] text-[#8d8d91] border border-[#38383b]">SYSTEM VIP</span>
                    </h3>
                    <p className="text-xs text-[#8d8d91]">
                      Instantly search any user by email address to grant or debit wallet credits with live balance reflection.
                    </p>
                  </div>
                </div>
              </div>

              {/* User Search & Selection Box */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 text-[#8d8d91]" size={16} />
                    <input
                      type="text"
                      placeholder="Search user by email or name..."
                      value={walletUserSearch}
                      onChange={(e) => setWalletUserSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#161B22] border border-[#30363D] focus:border-[#3f86ff] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all shadow-inner "
                    />
                    {walletUserSearch && (
                      <button
                        type="button"
                        onClick={() => setWalletUserSearch('')}
                        className="absolute right-3 top-3 text-xs text-[#8d8d91] hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="sm:w-80">
                    <select
                      value={fundingUser?.uid || ''}
                      onChange={(e) => {
                        const target = users.find(u => u.uid === e.target.value);
                        setFundingUser(target || null);
                      }}
                      className="w-full bg-[#161B22] border border-[#30363D] focus:border-[#3f86ff] rounded-xl p-3 text-xs text-[#8d8d91] outline-none cursor-pointer font-bold"
                    >
                      <option value="">-- Choose User Account ({users.filter(u => !walletUserSearch || u.email?.toLowerCase().includes(walletUserSearch.toLowerCase()) || u.displayName?.toLowerCase().includes(walletUserSearch.toLowerCase())).length} found) --</option>
                      {users
                        .filter(u => !walletUserSearch || u.email?.toLowerCase().includes(walletUserSearch.toLowerCase()) || u.displayName?.toLowerCase().includes(walletUserSearch.toLowerCase()))
                        .map(u => (
                          <option key={u.uid} value={u.uid}>
                            {u.email || u.displayName || 'User'} — Wallet: ₦{(u.walletBalance || 0).toLocaleString()}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Selected User Info Card */}
                {fundingUser && (
                  <div className="p-3.5 bg-gradient-to-r from-[#202022]/60 via-zinc-900 to-[#2b0709] border border-[#38383b] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#202022] border border-[#38383b] flex items-center justify-center text-[#8d8d91] font-bold uppercase ">
                        {(fundingUser.email || 'U')[0]}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{fundingUser.displayName || 'User'}</span>
                          <span className="text-[10px] text-[#8d8d91] bg-[#252527] px-2 py-0.5 rounded border border-[#38383b]">
                            {fundingUser.email}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#8d8d91] mt-0.5">
                          UID: {fundingUser.uid} | Tier: <span className="text-amber-400 uppercase font-bold">{fundingUser.tier || 'free'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-[#38383b]">
                      <div className="text-[10px] text-[#8d8d91] uppercase">Current Balance</div>
                      <div className="text-lg font-black text-emerald-400 ">
                        ₦{(fundingUser.walletBalance || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleGrantFunds} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fund Amount */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white uppercase tracking-wider block ">AMOUNT TO CREDIT (₦)</label>
                    <input
                      type="number"
                      required
                      value={fundAmount}
                      onChange={(e) => setFundAmount(Number(e.target.value))}
                      placeholder="e.g. 10000"
                      className="w-full bg-[#161B22] border border-[#30363D] focus:border-[#3f86ff] rounded-xl p-3 text-sm text-emerald-400 font-black outline-none shadow-inner"
                    />
                  </div>

                  {/* Reason Note */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white uppercase tracking-wider block ">REASON / DEPOSIT NOTE</label>
                    <input
                      type="text"
                      value={fundNote}
                      onChange={(e) => setFundNote(e.target.value)}
                      placeholder="e.g. Direct Bank Transfer Deposit"
                      className="w-full bg-[#161B22] border border-[#30363D] focus:border-[#3f86ff] rounded-xl p-3 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {/* Quick Amount Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-[#8d8d91] uppercase tracking-wider mr-2 ">QUICK AMOUNTS:</span>
                  {[5000, 10000, 20000, 50000, 100000, 200000, 300000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setFundAmount(amt)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer",
                        fundAmount === amt 
                          ? "bg-[#3f86ff] border-[#3f86ff] text-white " 
                          : "bg-[#161B22] border-[#30363D] text-white hover:text-white hover:border-[#38383b]"
                      )}
                    >
                      +₦{amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={!fundingUser || isGranting}
                    className={clsx(
                      "px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-lg flex items-center gap-2 cursor-pointer ",
                      fundingUser && !isGranting 
                        ? "bg-[#3f86ff] hover:opacity-90 font-black shadow-[0_0_20px_rgba(220,38,38,0.5)]" 
                        : "bg-[#38383b] text-[#8d8d91] cursor-not-allowed"
                    )}
                  >
                    <Wallet size={16} />
                    <span>{isGranting ? 'Processing Transaction...' : `Credit ₦${(fundAmount || 0).toLocaleString()} to User`}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Live Wallet Audit Transactions Log */}
            <div className="bg-[#0D1117] border border-[#30363D] rounded-2xl overflow-hidden shadow-2xl space-y-3 p-5">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <History size={16} />
                <span>REAL-TIME SYSTEM WALLET TRANSACTION AUDIT LOG</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-[#8d8d91] border-b border-[#30363D] bg-[#161B22]/80">
                      <th className="py-3 px-3 font-bold">DATE & TIME</th>
                      <th className="py-3 px-3 font-bold">USER UID</th>
                      <th className="py-3 px-3 font-bold">TRANSACTION TYPE</th>
                      <th className="py-3 px-3 font-bold">DESCRIPTION</th>
                      <th className="py-3 px-3 font-bold text-right">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363D]/60">
                    {allWalletTxs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-[#8d8d91]">
                          No wallet transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      allWalletTxs.map((tx) => (
                        <tr key={tx.id} className="hover:bg-[#38383b]/40 transition-colors">
                          <td className="py-3 px-3 text-[#8d8d91] text-[11px]">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-white text-xs">
                            {(tx.userId || 'unknown').slice(0, 12)}...
                          </td>
                          <td className="py-3 px-3">
                            <span className={clsx(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              tx.type === 'admin_grant' ? "bg-emerald-950 text-emerald-300 border border-emerald-800" :
                              tx.type === 'subscription_purchase' ? "bg-blue-950 text-blue-300 border border-blue-800" :
                              "bg-purple-950 text-purple-300 border border-purple-800"
                            )}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-white">
                            {tx.description}
                          </td>
                          <td className={clsx("py-3 px-3 text-right font-bold text-xs", tx.amount >= 0 ? "text-emerald-400" : "text-[#8d8d91]")}>
                            {tx.amount >= 0 ? `+₦${tx.amount.toLocaleString()}` : `-₦${Math.abs(tx.amount).toLocaleString()}`}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : activeTab === 'broadcast' ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-[#202022] border border-[#38383b] rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-[#3f86ff] font-bold text-base">
                  <Radio size={20} />
                  <span>Send Broadcast System Message</span>
                </div>
                <p className="text-xs text-[#8d8d91]">
                  Broadcast announcements will be immediately visible to all users across their devices in real-time.
                </p>

                <form onSubmit={handleSendBroadcast} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-white">Broadcast Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ⚡ System Announcement"
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        className="w-full bg-[#252527] border border-[#38383b] rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#3f86ff]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-white">Target Audience</label>
                      <select
                        value={broadcastTargetTier}
                        onChange={(e) => setBroadcastTargetTier(e.target.value as any)}
                        className="w-full bg-[#252527] border border-[#38383b] rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#3f86ff] cursor-pointer"
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
                    <label className="text-xs font-bold text-white">Announcement Message</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Type message content for all users..."
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      className="w-full bg-[#252527] border border-[#38383b] rounded-xl p-3 text-xs text-white outline-none focus:border-[#3f86ff]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendingBroadcast}
                    className="px-5 py-2.5 bg-[#3f86ff] hover:opacity-90 text-white font-bold text-xs rounded-xl transition-all shadow-lg  flex items-center gap-2"
                  >
                    <Radio size={16} />
                    <span>{sendingBroadcast ? 'Publishing Broadcast...' : '🚀 Publish Broadcast Message'}</span>
                  </button>
                </form>
              </div>

              {/* Active Broadcasts History */}
              <div className="bg-[#202022] border border-[#38383b] rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Megaphone size={16} className="text-[#8d8d91]" />
                  <span>Broadcast History ({broadcastsList.length})</span>
                </h3>

                {broadcastsList.length === 0 ? (
                  <p className="text-xs text-[#8d8d91] ">No broadcasts published yet.</p>
                ) : (
                  <div className="space-y-3">
                    {broadcastsList.map((b, idx) => (
                      <div key={b.id ? b.id : `bcast-${idx}`} className="p-4 bg-[#252527]/80 border border-[#38383b] rounded-xl flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-white">{b.title}</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#252527] border border-[#38383b] text-[#8d8d91] text-[10px] font-bold uppercase">
                              Audience: {b.targetTier || 'all'}
                            </span>
                            <span className="text-[10px] text-[#8d8d91] ">
                              {new Date(b.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-white font-sans leading-relaxed whitespace-pre-wrap">{b.message}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteBroadcast(b.id)}
                          className="p-1.5 text-[#8d8d91] hover:text-[#8d8d91] hover:bg-[#38383b] rounded-lg transition-colors shrink-0"
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
              <div className="bg-[#202022] border border-[#38383b] rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu size={20} className="text-[#3f86ff]" />
                    <h3 className="text-lg font-bold text-white">Master AI Brain Persona & System Instructions</h3>
                  </div>
                  <span className="text-xs bg-[#3f86ff]/20 text-[#8d8d91] border border-[#3f86ff]/30 px-2.5 py-1 rounded font-bold">
                    UNIFIED AI BRAIN
                  </span>
                </div>
                <p className="text-xs text-[#8d8d91] leading-relaxed">
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
                    <label className="block text-xs font-bold text-[#8d8d91] uppercase tracking-wider">
                      Master AI Brain Prompt (Applies Globally)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBrain({ ...brain, globalPrompt: '' })}
                        className="px-2.5 py-1 rounded-lg bg-[#38383b] hover:bg-[#252527] text-white hover:text-[#8d8d91] text-[10px] font-bold border border-[#38383b] hover:border-[#38383b] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 size={11} />
                        <span>Empty Brain</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrain({ ...brain, globalPrompt: "" })}
                        className="px-2.5 py-1 rounded-lg bg-[#38383b] hover:bg-[#454547] text-white text-[10px] font-bold border border-[#38383b] transition-colors cursor-pointer"
                      >
                        Reset Default
                      </button>
                      <span className="text-[11px] text-[#8d8d91] ">
                        {brain.globalPrompt.length} chars
                      </span>
                    </div>
                  </div>
                  <textarea
                    rows={8}
                    value={brain.globalPrompt}
                    onChange={(e) => setBrain({ ...brain, globalPrompt: e.target.value })}
                    className="w-full bg-[#252527] border border-[#38383b]/80 rounded-xl p-3.5 text-white text-xs md:text-sm focus:border-[#3f86ff] outline-none leading-relaxed shadow-inner"
                    placeholder="Enter master system instructions for VOID AI (or leave blank for raw default AI responses)..."
                  />
                  
                  <div className="p-3 bg-[#252527] border border-[#38383b] rounded-xl flex items-center gap-2.5 text-xs text-[#8d8d91] ">
                    <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                    <span>
                      <strong className="text-emerald-400 uppercase tracking-wide">Brain Confidentiality Active:</strong> Server-side security guardrails are active. Whatever you type into the brain will NEVER be disclosed, quoted, or revealed to users or third parties by the AI.
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                    Tier Rate Limits & Token Controls
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Free Tier */}
                    <div className="p-3.5 bg-[#252527]/60 border border-[#38383b] rounded-xl space-y-2.5">
                      <label className="block text-xs font-bold text-[#8d8d91] uppercase tracking-wider">
                        Free Tier
                      </label>
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] text-[#8d8d91] block mb-1">3-Hour Msgs Limit</span>
                          <input
                            type="number"
                            value={brain.freeLimit}
                            onChange={(e) => setBrain({ ...brain, freeLimit: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#202022] border border-[#38383b]/80 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-[#3f86ff]"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-[#8d8d91] block mb-1">Max Tokens</span>
                          <input
                            type="number"
                            value={brain.freeMaxTokens}
                            onChange={(e) => setBrain({ ...brain, freeMaxTokens: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#202022] border border-[#38383b]/80 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-[#3f86ff]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pro Tier */}
                    <div className="p-3.5 bg-[#252527]/60 border border-blue-950/60 rounded-xl space-y-2.5">
                      <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider">
                        Pro Tier
                      </label>
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] text-[#8d8d91] block mb-1">3-Hour Msgs Limit</span>
                          <input
                            type="number"
                            value={brain.proLimit}
                            onChange={(e) => setBrain({ ...brain, proLimit: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#202022] border border-[#38383b]/80 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-[#8d8d91] block mb-1">Max Tokens</span>
                          <input
                            type="number"
                            value={brain.proMaxTokens}
                            onChange={(e) => setBrain({ ...brain, proMaxTokens: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#202022] border border-[#38383b]/80 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Premium Tier */}
                    <div className="p-3.5 bg-[#252527]/60 border border-amber-950/60 rounded-xl space-y-2.5">
                      <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Premium Tier
                      </label>
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] text-[#8d8d91] block mb-1">3-Hour Msgs Limit</span>
                          <input
                            type="number"
                            value={brain.premiumLimit}
                            onChange={(e) => setBrain({ ...brain, premiumLimit: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#202022] border border-[#38383b]/80 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-[#8d8d91] block mb-1">Max Tokens</span>
                          <input
                            type="number"
                            value={brain.premiumMaxTokens}
                            onChange={(e) => setBrain({ ...brain, premiumMaxTokens: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#202022] border border-[#38383b]/80 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* VIP Tier */}
                    <div className="p-3.5 bg-[#252527]/60 border border-purple-950/60 rounded-xl space-y-2.5">
                      <label className="block text-xs font-bold text-purple-400 uppercase tracking-wider">
                        VIP Tier
                      </label>
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] text-[#8d8d91] block mb-1">3-Hour Msgs Limit</span>
                          <input
                            type="number"
                            value={brain.vipLimit}
                            onChange={(e) => setBrain({ ...brain, vipLimit: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#202022] border border-[#38383b]/80 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-[#8d8d91] block mb-1">Max Tokens</span>
                          <input
                            type="number"
                            value={brain.vipMaxTokens}
                            onChange={(e) => setBrain({ ...brain, vipMaxTokens: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#202022] border border-[#38383b]/80 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-purple-500"
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
                    className="px-5 py-2.5 bg-[#3f86ff] hover:opacity-90 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-lg  disabled:opacity-50"
                  >
                    <Save size={16} />
                    {savingBrain ? 'Updating Brain...' : 'Save AI Brain Rules'}
                  </button>
                </div>
              </div>
            </form>
          ) : activeTab === 'support' ? (
            <div className="flex flex-col md:flex-row h-[600px] border border-[#38383b] rounded-2xl overflow-hidden bg-[#202022]/80">
              {/* Left Pane: Ticket Directory */}
              <div className={clsx(
                "w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-[#38383b] flex flex-col h-full bg-[#202022]",
                activeSupportUserId && "hidden md:flex"
              )}>
                <div className="p-3.5 border-b border-[#38383b] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#8d8d91] uppercase tracking-wider">
                    Support Tickets ({supportChats.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowFullSupportDesk(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#3f86ff] hover:opacity-90 text-white text-[11px] font-bold transition-all shadow flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 size={12} />
                    <span>Full Page</span>
                  </button>
                </div>

                {/* Quick User Selector to Start Typing Immediately */}
                <div className="p-2.5 border-b border-[#38383b] bg-[#252527]/60">
                  <label className="text-[10px] text-[#8d8d91] font-bold block mb-1 uppercase tracking-wider">
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
                    className="w-full bg-[#202022] border border-[#38383b] text-white text-xs py-1.5 px-2 rounded-lg outline-none focus:border-[#3f86ff] cursor-pointer"
                  >
                    <option value="">-- Choose Any User to Text Back --</option>
                    {users.map((u, idx) => (
                      <option key={u.uid ? `opt-${u.uid}` : `opt-idx-${idx}`} value={u.uid || ''}>
                        {u.displayName || u.email || u.uid} ({u.tier || 'free'})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {supportChats.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#8d8d91] ">
                      No active support tickets found.
                    </div>
                  ) : (
                    supportChats.map((chat, idx) => {
                      const isActive = activeSupportUserId === chat.userId;
                      return (
                        <div
                          key={chat.id ? chat.id : `chat-${chat.userId || idx}`}
                          onClick={() => {
                            setActiveSupportUserId(chat.userId);
                            setActiveSupportUserName(chat.userName);
                          }}
                          className={clsx(
                            "p-3 rounded-xl cursor-pointer transition-all border text-left",
                            isActive
                              ? "bg-[#252527]/40 border-[#3f86ff]/60 text-white shadow-lg "
                              : "bg-[#252527]/60 border-[#38383b]/80 hover:bg-[#252527] hover:border-[#38383b] text-white"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-xs truncate max-w-[140px] text-white">
                              {chat.userName}
                            </h4>
                            {chat.unreadAdmin > 0 && (
                              <span className="bg-[#3f86ff] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                                {chat.unreadAdmin} New
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#8d8d91] truncate mb-1">
                            {chat.lastMessage}
                          </p>
                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-[#38383b]/60">
                            <span className="text-[10px] text-[#8d8d91] ">
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
                              className="px-2 py-0.5 rounded bg-[#3f86ff]/90 hover:opacity-90 text-white text-[10px] font-bold transition-all flex items-center gap-1 shadow cursor-pointer"
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
                "flex-1 h-full relative bg-[#252527]/40 flex flex-col",
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
                    <div className="w-16 h-16 rounded-2xl bg-[#252527]/40 border border-[#38383b]/40 flex items-center justify-center text-[#8d8d91]">
                      <MessageSquare size={32} />
                    </div>
                    <div className="max-w-sm space-y-1">
                      <h3 className="text-base font-bold text-white">Real-Time Support Desk</h3>
                      <p className="text-xs text-[#8d8d91] leading-relaxed">
                        Select a support ticket or click "Message" next to any user in User Control to send them a direct message.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'pricing' ? (
            <div className="max-w-4xl mx-auto space-y-6">
              <form onSubmit={handleSavePricing} className="space-y-6">
                
                {pricingSaveSuccess && (
                  <div className="p-4 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 rounded-2xl flex items-center gap-3 animate-fadeIn text-xs">
                    <Check size={18} className="text-emerald-400" />
                    <span>ALL PRICING MATRICES & DEVELOPER API RATES SAVED SUCCESSFULLY!</span>
                  </div>
                )}

                {/* SECTION 1: WEBSITE USER SUBSCRIPTIONS */}
                <div className="bg-[#202022]/80 border border-[#38383b] rounded-2xl p-6 space-y-6 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#38383b] pb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-950/80 border border-amber-800/60 rounded-xl text-amber-400">
                        <DollarSign size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-white">1. Website User Subscriptions (NAIRA - ₦)</h3>
                        <p className="text-xs text-[#8d8d91]">Configure monthly rates, yearly rates, and discount percentage tags for users on the platform.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* PRO PLAN */}
                    <div className="bg-[#252527]/60 border border-blue-900/40 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-blue-400 uppercase">PRO PLAN</span>
                        <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded ">50 MSGS/DAY</span>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#8d8d91] mb-1">Monthly Rate (₦/mo)</label>
                        <input 
                          type="number" 
                          value={pricing.pro}
                          onChange={(e) => setPricing({ ...pricing, pro: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#202022] border border-[#38383b] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#8d8d91] mb-1">Yearly Rate (₦/yr)</label>
                        <input 
                          type="number" 
                          value={pricing.proYearly ?? (pricing.pro * 10)}
                          onChange={(e) => setPricing({ ...pricing, proYearly: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#202022] border border-[#38383b] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#8d8d91] mb-1">Yearly Discount Tag (% OFF)</label>
                        <input 
                          type="number" 
                          value={pricing.proDiscount ?? 16}
                          onChange={(e) => setPricing({ ...pricing, proDiscount: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#202022] border border-[#38383b] rounded-xl px-3 py-2 text-amber-400 text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* PREMIUM PLAN */}
                    <div className="bg-[#252527]/60 border border-amber-900/40 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-amber-400 uppercase">PREMIUM PLAN</span>
                        <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded ">250 MSGS/DAY</span>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#8d8d91] mb-1">Monthly Rate (₦/mo)</label>
                        <input 
                          type="number" 
                          value={pricing.premium}
                          onChange={(e) => setPricing({ ...pricing, premium: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#202022] border border-[#38383b] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#8d8d91] mb-1">Yearly Rate (₦/yr)</label>
                        <input 
                          type="number" 
                          value={pricing.premiumYearly ?? (pricing.premium * 10)}
                          onChange={(e) => setPricing({ ...pricing, premiumYearly: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#202022] border border-[#38383b] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#8d8d91] mb-1">Yearly Discount Tag (% OFF)</label>
                        <input 
                          type="number" 
                          value={pricing.premiumDiscount ?? 16}
                          onChange={(e) => setPricing({ ...pricing, premiumDiscount: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#202022] border border-[#38383b] rounded-xl px-3 py-2 text-amber-400 text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* VIP PLAN */}
                    <div className="bg-[#252527]/60 border border-purple-900/40 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-purple-400 uppercase">VIP PLAN</span>
                        <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded ">UNLIMITED</span>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#8d8d91] mb-1">Monthly Rate (₦/mo)</label>
                        <input 
                          type="number" 
                          value={pricing.vip}
                          onChange={(e) => setPricing({ ...pricing, vip: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#202022] border border-[#38383b] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#8d8d91] mb-1">Yearly Rate (₦/yr)</label>
                        <input 
                          type="number" 
                          value={pricing.vipYearly ?? (pricing.vip * 10)}
                          onChange={(e) => setPricing({ ...pricing, vipYearly: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#202022] border border-[#38383b] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#8d8d91] mb-1">Yearly Discount Tag (% OFF)</label>
                        <input 
                          type="number" 
                          value={pricing.vipDiscount ?? 16}
                          onChange={(e) => setPricing({ ...pricing, vipDiscount: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#202022] border border-[#38383b] rounded-xl px-3 py-2 text-amber-400 text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: SEPARATE DEVELOPER API KEY ACCESS PRICING */}
                <div className="bg-[#202022]/80 border border-[#38383b] rounded-2xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#38383b] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#252527] border border-[#38383b] text-[#3f86ff] rounded-xl shadow-inner">
                        <Key size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-extrabold text-[#3f86ff] uppercase tracking-wide">
                            2. Developer API Key Dedicated Pricing
                          </h3>
                          <span className="text-[10px] bg-[#252527] text-[#8d8d91] border border-[#38383b] px-2 py-0.5 rounded font-bold">
                            SEPARATE API PRICING
                          </span>
                        </div>
                        <p className="text-xs text-[#8d8d91] mt-0.5">
                          Set the independent rate for third-party developers, web platforms, and bots connecting directly via <code className="text-[#8d8d91]">nvn_live_...</code> keys.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#252527]/40 border border-[#38383b] p-4 rounded-2xl">
                    <div>
                      <label className="block text-xs font-semibold text-white mb-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#3f86ff]"></span>
                        <span>API Key Per Month (₦/mo)</span>
                      </label>
                      <input 
                        type="number" 
                        value={pricing.apiKeyMonthly ?? 20000}
                        onChange={(e) => setPricing({ ...pricing, apiKeyMonthly: parseInt(e.target.value) || 0 })}
                        className="w-full bg-[#202022] border border-[#38383b] rounded-xl px-4 py-2.5 text-[#8d8d91] text-sm focus:outline-none focus:border-[#3f86ff] font-bold"
                      />
                      <p className="text-[11px] text-[#8d8d91] mt-1">Monthly fee for developer API access</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white mb-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>API Key Per Year (₦/yr)</span>
                      </label>
                      <input 
                        type="number" 
                        value={pricing.apiKeyYearly ?? 200000}
                        onChange={(e) => setPricing({ ...pricing, apiKeyYearly: parseInt(e.target.value) || 0 })}
                        className="w-full bg-[#202022] border border-[#38383b] rounded-xl px-4 py-2.5 text-amber-400 text-sm focus:outline-none focus:border-amber-500 font-bold"
                      />
                      <p className="text-[11px] text-[#8d8d91] mt-1">Annual fee for developer API access</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white mb-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>API Annual Discount (% OFF)</span>
                      </label>
                      <input 
                        type="number" 
                        value={pricing.apiKeyDiscount ?? 20}
                        onChange={(e) => setPricing({ ...pricing, apiKeyDiscount: parseInt(e.target.value) || 0 })}
                        className="w-full bg-[#202022] border border-[#38383b] rounded-xl px-4 py-2.5 text-emerald-400 text-sm focus:outline-none focus:border-emerald-500 font-bold"
                      />
                      <p className="text-[11px] text-[#8d8d91] mt-1">Discount percentage shown to annual API key buyers</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button 
                    type="submit"
                    disabled={savingPricing}
                    className="px-6 py-3 bg-[#3f86ff] hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg  flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save size={16} />
                    <span>{savingPricing ? 'SAVING PRICING...' : 'SAVE ALL PRICING MATRICES'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : activeTab === 'apikeys' ? (
            <div className="max-w-5xl mx-auto space-y-6">
              <form onSubmit={handleSaveApiKey} className="bg-[#202022]/80 border border-[#38383b] rounded-2xl p-6 relative overflow-hidden shadow-2xl space-y-6">
                {/* Vault Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#38383b]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#252527]/90 border border-[#38383b] rounded-2xl text-[#8d8d91] shadow-inner">
                      <Key size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-wide">
                        API ROOM VAULT
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#252527] text-[#8d8d91] border border-[#38383b] font-bold">
                          UP TO 100 GROQ & COHERE KEYS
                        </span>
                      </h3>
                      <p className="text-xs text-[#8d8d91] mt-0.5">
                        Paste up to 100 Groq keys at once into the bulk vault below, or use the individual slot boxes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="bg-[#252527] border border-[#38383b] rounded-xl p-1 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setKeyInputMode('bulk')}
                        className={clsx(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          keyInputMode === 'bulk' ? "bg-[#3f86ff] text-white shadow-md" : "text-[#8d8d91] hover:text-white"
                        )}
                      >
                        ⚡ Bulk Paste (100 Keys)
                      </button>
                      <button
                        type="button"
                        onClick={() => setKeyInputMode('slots')}
                        className={clsx(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          keyInputMode === 'slots' ? "bg-[#3f86ff] text-white shadow-md" : "text-[#8d8d91] hover:text-white"
                        )}
                      >
                        📦 Slot Boxes (10 Slots)
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowKeys(!showKeys)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#252527] border border-[#38383b] text-xs font-bold text-white hover:text-white hover:border-[#38383b] transition-colors shadow-sm"
                    >
                      {showKeys ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{showKeys ? 'MASK' : 'SHOW'}</span>
                    </button>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[#252527]/60 border border-[#38383b] rounded-xl">
                  <div className="flex items-center justify-between px-3 py-2 bg-[#202022]/80 border border-[#38383b] rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3f86ff] animate-pulse"></span>
                      <span className="text-xs font-bold text-white">GROQ POOL</span>
                    </div>
                    <span className="text-xs font-bold text-[#8d8d91]">
                      {parseRawKeyInput(bulkGroqText, groqKeysList).length} GROQ KEYS
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-3 py-2 bg-[#202022]/80 border border-blue-950/60 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-white">COHERE POOL</span>
                    </div>
                    <span className="text-xs font-bold text-blue-400">
                      {parseRawKeyInput(bulkCohereText, cohereKeysList).length} COHERE KEYS
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-3 py-2 bg-[#202022]/80 border border-amber-950/60 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-white">BAZAARLINK POOL</span>
                    </div>
                    <span className="text-xs font-bold text-amber-400">
                      {parseRawKeyInput(bulkBazaarLinkText, bazaarLinkKeysList).length} BAZAARLINK KEYS
                    </span>
                  </div>
                </div>

                {/* Key Life Detector */}
                <div className="bg-[#202022]/80 border border-[#38383b] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity size={16} className="text-[#3f86ff]" />
                      <h4 className="text-sm font-bold text-white">Key Life Detector</h4>
                      {keyHealth?.summary && (
                        <div className="flex items-center gap-2 text-[11px] font-bold">
                          <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                            {keyHealth.summary.alive} ALIVE
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                            {keyHealth.summary.dead} DEAD
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={checkKeyHealth}
                      disabled={checkingHealth}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3f86ff] text-white text-xs font-bold hover:bg-[#3f86ff]/80 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <RefreshCw size={12} className={checkingHealth ? 'animate-spin' : ''} />
                      {checkingHealth ? 'Scanning...' : 'Scan Keys'}
                    </button>
                  </div>

                  {keyHealth && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {[...keyHealth.groq, ...keyHealth.cohere, ...keyHealth.bazaarlink]
                        .filter((k: any) => k.status !== 'empty')
                        .map((k: any, i: number) => (
                          <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-[#252527]/60 border border-[#38383b]/50 rounded-lg text-xs">
                            <div className="flex items-center gap-2">
                              <span className={clsx(
                                "w-2 h-2 rounded-full",
                                k.status === 'alive' ? "bg-green-500" : "bg-red-500"
                              )} />
                              <span className="font-bold text-white">{k.provider.toUpperCase()}</span>
                              <span className="text-[#8d8d91]">#{k.index}</span>
                              <span className="text-[#8d8d91] font-mono">{k.masked}</span>
                            </div>
                            <span className={clsx(
                              "font-bold text-[10px] px-2 py-0.5 rounded",
                              k.status === 'alive'
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            )}>
                              {k.status === 'alive' ? '✓ ALIVE' : `✗ ${k.reason}`}
                            </span>
                          </div>
                        ))}
                      {keyHealth && [...keyHealth.groq, ...keyHealth.cohere, ...keyHealth.bazaarlink].filter((k: any) => k.status !== 'empty').length === 0 && (
                        <p className="text-xs text-[#8d8d91] text-center py-2">No keys configured. Add keys above and save first.</p>
                      )}
                    </div>
                  )}
                  {!keyHealth && (
                    <p className="text-xs text-[#8d8d91] text-center py-2">Click "Scan Keys" to check which API keys are alive or dead.</p>
                  )}
                </div>

                {keyInputMode === 'bulk' ? (
                  <div className="space-y-6">
                    {/* BULK GROQ KEYS TEXTAREA */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#8d8d91] uppercase tracking-wider flex items-center gap-2">
                          <Cpu size={14} />
                          <span>Bulk Groq API Keys Vault (Paste up to 100 Keys)</span>
                        </label>
                        <span className="text-[11px] text-[#8d8d91] ">
                          {parseRawKeyInput(bulkGroqText, []).length} keys detected (1 per line)
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8d8d91]">
                        Paste all your Groq API keys (`gsk_...`) here separated by newlines or commas. VOID AI will automatically rotate through all keys.
                      </p>
                      <textarea
                        rows={8}
                        value={bulkGroqText}
                        onChange={(e) => setBulkGroqText(e.target.value)}
                        placeholder="gsk_key1...\ngsk_key2...\ngsk_key3..."
                        className={clsx(
                          "w-full bg-[#202022] border border-[#38383b] rounded-xl p-3 text-white text-xs focus:border-[#3f86ff] outline-none leading-relaxed",
                          !showKeys && "security-mask"
                        )}
                        style={!showKeys ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties) : undefined}
                      />
                    </div>

                    {/* BULK COHERE KEYS TEXTAREA */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                          <Cpu size={14} />
                          <span>Bulk Cohere API Keys Vault</span>
                        </label>
                        <span className="text-[11px] text-[#8d8d91] ">
                          {parseRawKeyInput(bulkCohereText, []).length} keys detected
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={bulkCohereText}
                        onChange={(e) => setBulkCohereText(e.target.value)}
                        placeholder="cohere_key1...\ncohere_key2..."
                        className="w-full bg-[#202022] border border-[#38383b] rounded-xl p-3 text-white text-xs focus:border-blue-500 outline-none leading-relaxed"
                        style={!showKeys ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties) : undefined}
                      />
                    </div>

                    {/* BULK BAZAARLINK KEYS TEXTAREA */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                          <Cpu size={14} />
                          <span>Bulk BazaarLink API Keys Vault (Paste up to 100 Keys)</span>
                        </label>
                        <span className="text-[11px] text-[#8d8d91] ">
                          {parseRawKeyInput(bulkBazaarLinkText, []).length} keys detected
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8d8d91]">
                        Paste your BazaarLink API keys here. VOID AI will automatically rotate through all active BazaarLink keys with load balancing.
                      </p>
                      <textarea
                        rows={4}
                        value={bulkBazaarLinkText}
                        onChange={(e) => setBulkBazaarLinkText(e.target.value)}
                        placeholder="bazaarlink_key1...\nbazaarlink_key2..."
                        className="w-full bg-[#202022] border border-[#38383b] rounded-xl p-3 text-white text-xs focus:border-amber-500 outline-none leading-relaxed"
                        style={!showKeys ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties) : undefined}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* GROQ KEYS ROOM - 10 SLOTS */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-[#38383b]/80 pb-2">
                        <h4 className="text-xs font-bold text-[#8d8d91] uppercase tracking-wider flex items-center gap-2">
                          <Cpu size={14} />
                          Groq API Keys Room (10 Dedicated Boxes)
                        </h4>
                        <button
                          type="button"
                          onClick={() => setGroqKeysList(Array(10).fill(''))}
                          className="text-[11px] text-[#8d8d91] hover:text-[#8d8d91] transition-colors flex items-center gap-1 cursor-pointer"
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
                              isFilled ? "bg-[#252527]/20 border-[#38383b]/50" : "bg-[#252527]/40 border-[#38383b]/80 hover:border-[#38383b]"
                            )}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#8d8d91] flex items-center gap-1.5">
                                  <span className={clsx("w-2 h-2 rounded-full", isFilled ? "bg-[#3f86ff]" : "bg-[#454547]")}></span>
                                  GROQ SLOT #{String(idx + 1).padStart(2, '0')}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded", isFilled ? "bg-[#252527] text-[#8d8d91] border border-[#38383b]/40" : "bg-[#38383b] text-[#8d8d91]")}>
                                    {isFilled ? 'ACTIVE' : 'EMPTY'}
                                  </span>
                                  {isFilled && (
                                    <button
                                      type="button"
                                      onClick={() => updateGroqKeySlot(idx, '')}
                                      className="text-[#8d8d91] hover:text-[#8d8d91] transition-colors"
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
                                className="w-full bg-[#202022] border border-[#38383b] focus:border-[#3f86ff] rounded-lg px-3 py-2 text-white text-xs focus:outline-none transition-colors"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* COHERE KEYS ROOM - 10 SLOTS */}
                    <div className="space-y-3 pt-4">
                      <div className="flex items-center justify-between border-b border-[#38383b]/80 pb-2">
                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                          <Cpu size={14} />
                          Cohere API Keys Room (10 Dedicated Boxes)
                        </h4>
                        <button
                          type="button"
                          onClick={() => setCohereKeysList(Array(10).fill(''))}
                          className="text-[11px] text-[#8d8d91] hover:text-blue-400 transition-colors flex items-center gap-1 cursor-pointer"
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
                              isFilled ? "bg-blue-950/20 border-blue-800/50" : "bg-[#252527]/40 border-[#38383b]/80 hover:border-[#38383b]"
                            )}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#8d8d91] flex items-center gap-1.5">
                                  <span className={clsx("w-2 h-2 rounded-full", isFilled ? "bg-blue-500" : "bg-[#454547]")}></span>
                                  COHERE SLOT #{String(idx + 1).padStart(2, '0')}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded", isFilled ? "bg-blue-950 text-blue-300 border border-blue-800/40" : "bg-[#38383b] text-[#8d8d91]")}>
                                    {isFilled ? 'ACTIVE' : 'EMPTY'}
                                  </span>
                                  {isFilled && (
                                    <button
                                      type="button"
                                      onClick={() => updateCohereKeySlot(idx, '')}
                                      className="text-[#8d8d91] hover:text-blue-400 transition-colors"
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
                                className="w-full bg-[#202022] border border-[#38383b] focus:border-blue-500 rounded-lg px-3 py-2 text-white text-xs focus:outline-none transition-colors"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* BAZAARLINK KEYS ROOM - 10 SLOTS */}
                    <div className="space-y-3 pt-4">
                      <div className="flex items-center justify-between border-b border-[#38383b]/80 pb-2">
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                          <Cpu size={14} />
                          BazaarLink API Keys Room (10 Dedicated Boxes)
                        </h4>
                        <button
                          type="button"
                          onClick={() => setBazaarLinkKeysList(Array(10).fill(''))}
                          className="text-[11px] text-[#8d8d91] hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                          Wipe BazaarLink Slots
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {bazaarLinkKeysList.map((keyVal, idx) => {
                          const isFilled = keyVal.trim().length > 0;
                          return (
                            <div key={`bazaarlink-slot-${idx}`} className={clsx(
                              "p-2.5 rounded-xl border transition-all flex flex-col gap-1.5",
                              isFilled ? "bg-amber-950/20 border-amber-800/50" : "bg-[#252527]/40 border-[#38383b]/80 hover:border-[#38383b]"
                            )}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#8d8d91] flex items-center gap-1.5">
                                  <span className={clsx("w-2 h-2 rounded-full", isFilled ? "bg-amber-500" : "bg-[#454547]")}></span>
                                  BAZAARLINK SLOT #{String(idx + 1).padStart(2, '0')}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded", isFilled ? "bg-amber-950 text-amber-300 border border-amber-800/40" : "bg-[#38383b] text-[#8d8d91]")}>
                                    {isFilled ? 'ACTIVE' : 'EMPTY'}
                                  </span>
                                  {isFilled && (
                                    <button
                                      type="button"
                                      onClick={() => updateBazaarLinkKeySlot(idx, '')}
                                      className="text-[#8d8d91] hover:text-amber-400 transition-colors"
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
                                onChange={(e) => updateBazaarLinkKeySlot(idx, e.target.value)}
                                placeholder={`Enter BazaarLink API Key ${idx + 1}`}
                                className="w-full bg-[#202022] border border-[#38383b] focus:border-amber-500 rounded-lg px-3 py-2 text-white text-xs focus:outline-none transition-colors"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {keySaveSuccess && (
                  <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-emerald-400 text-xs flex items-center gap-2 font-semibold">
                    <CheckCircle size={16} />
                    <span>API Room Vault updated successfully! Automatic load balancer & key rotation re-indexed.</span>
                  </div>
                )}

                <div className="pt-4 border-t border-[#38383b] flex items-center justify-between">
                  <div className="text-[11px] text-[#8d8d91] flex items-center gap-1.5">
                    <Lock size={12} className="text-[#8d8d91]" />
                    <span>All keys stored encrypted in system database</span>
                  </div>
                  <button 
                    type="submit"
                    disabled={savingKey}
                    className="px-6 py-2.5 bg-[#3f86ff] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all shadow-lg  flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={14} />
                    <span>{savingKey ? 'SAVING VAULT...' : 'SAVE ALL KEY VAULTS'}</span>
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

        {/* Funding User Modal Overlay */}
        {fundingUser && (
          <div className="fixed inset-0 z-50 bg-black/80  flex items-center justify-center p-4">
            <div className="bg-[#0D1117] border border-[#30363D] rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl text-white animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase">
                  <Wallet size={18} />
                  <span>CREDIT USER WALLET</span>
                </div>
                <button
                  onClick={() => setFundingUser(null)}
                  className="text-[#8d8d91] hover:text-white p-1 rounded-lg hover:bg-[#38383b] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1 bg-[#161B22] p-3 rounded-xl border border-[#30363D]">
                <div className="text-xs font-bold text-white">{fundingUser.displayName || fundingUser.email || 'User'}</div>
                <div className="text-[11px] text-[#8d8d91]">{fundingUser.email || fundingUser.uid}</div>
                <div className="text-xs font-bold text-emerald-400 pt-1">
                  Current Balance: ₦{(fundingUser.walletBalance || 0).toLocaleString()}
                </div>
              </div>

              <form onSubmit={handleGrantFunds} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white uppercase tracking-wider block">CREDIT / DEBIT AMOUNT (₦)</label>
                  <input
                    type="number"
                    required
                    value={fundAmount}
                    onChange={(e) => setFundAmount(Number(e.target.value))}
                    placeholder="e.g. 10000"
                    className="w-full bg-[#161B22] border border-[#30363D] focus:border-emerald-500 rounded-xl p-3 text-sm font-bold text-emerald-400 outline-none "
                  />
                  <p className="text-[10px] text-[#8d8d91]">Tip: Positive = grant funds, negative = debit balance.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[5000, 10000, 20000, 50000, 100000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setFundAmount(amt)}
                      className={clsx(
                        "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                        fundAmount === amt ? "bg-emerald-600 text-white border-emerald-500" : "bg-[#161B22] border-[#30363D] text-white"
                      )}
                    >
                      +₦{amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white uppercase tracking-wider block">NOTE / REASON</label>
                  <input
                    type="text"
                    value={fundNote}
                    onChange={(e) => setFundNote(e.target.value)}
                    placeholder="e.g. Bank Deposit Confirmed"
                    className="w-full bg-[#161B22] border border-[#30363D] focus:border-emerald-500 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFundingUser(null)}
                    className="w-1/3 py-2.5 rounded-xl border border-[#30363D] text-white hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGranting}
                    className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-950/50"
                  >
                    {isGranting ? 'Processing...' : 'Apply Credit / Debit'}
                  </button>
                </div>

                {(fundingUser.walletBalance || 0) > 0 && (
                  <div className="pt-3 border-t border-[#30363D] space-y-2">
                    <span className="text-[10px] font-bold text-[#8d8d91] uppercase tracking-wider block">SECURITY ACTIONS</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const target = fundingUser;
                          setFundingUser(null);
                          await handleWithdrawFunds(target);
                        }}
                        className="py-2 px-3 rounded-xl bg-amber-950/80 border border-amber-800 hover:border-amber-500 text-amber-300 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Withdraw Funds
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const target = fundingUser;
                          setFundingUser(null);
                          await handleResetWallet(target);
                        }}
                        className="py-2 px-3 rounded-xl bg-[#252527] border border-[#38383b] hover:border-[#3f86ff] text-[#8d8d91] text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Reset to ₦0
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
