import React, { useState, useEffect } from 'react';
import { UserProfile, SupportChat, PricingSettings } from '../../models/types';
import { listenToAllUsers, updateUserTier, updateUserStatus, updateUserVerification, listenToAllSupportChats, getPricingSettings, updatePricingSettings } from '../../database/db';
import { X, ArrowLeft, Shield, Crown, User, RefreshCw, Ban, CheckCircle, BadgeCheck, MessageSquare, ChevronUp, ChevronDown, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';
import { SupportChatScreen } from './SupportChatScreen';

interface AdminDashboardProps {
  onClose: () => void;
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'support' | 'pricing'>('users');
  
  const [supportChats, setSupportChats] = useState<SupportChat[]>([]);
  const [activeSupportUserId, setActiveSupportUserId] = useState<string | null>(null);
  const [activeSupportUserName, setActiveSupportUserName] = useState<string | null>(null);

  const [pricing, setPricing] = useState<PricingSettings>({ premium: 5000, pro: 7000, vip: 10000 });
  const [savingPricing, setSavingPricing] = useState(false);

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
    
    return () => {
      unsubUsers();
      unsubChats();
    };
  }, []);

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="flex items-center gap-2 p-2 mr-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium text-sm hidden sm:inline">Back</span>
            </button>
            <div className="p-2 bg-blue-500/10 rounded-lg hidden sm:block">
              <Shield size={20} className="text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Admin</h2>
            
            <div className="flex items-center bg-zinc-800/50 rounded-lg p-1 ml-4 border border-zinc-800">
              <button 
                onClick={() => setActiveTab('users')}
                className={clsx("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", activeTab === 'users' ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200")}
              >
                Users
              </button>
              <button 
                onClick={() => setActiveTab('support')}
                className={clsx("px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5", activeTab === 'support' ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200")}
              >
                Support Tickets
                {supportChats.reduce((acc, c) => acc + c.unreadAdmin, 0) > 0 && (
                  <span className="bg-blue-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {supportChats.reduce((acc, c) => acc + c.unreadAdmin, 0)}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('pricing')}
                className={clsx("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", activeTab === 'pricing' ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200")}
              >
                Pricing
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'users' ? (
            loading ? (
              <div className="flex justify-center py-12">
                <RefreshCw size={24} className="text-zinc-500 animate-spin" />
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
                      <tr key={user.uid} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-2">
                          <div className="font-medium text-zinc-200 flex items-center gap-1">
                            {user.displayName || 'Unknown User'}
                            {user.isVerified && <BadgeCheck size={14} className="text-blue-400" />}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono mt-0.5">{user.uid.slice(0, 8)}...</div>
                        </td>
                        <td className="py-3 px-2 text-zinc-300">
                          {user.email}
                        </td>
                        <td className="py-3 px-2">
                          {user.isAdmin ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                              <Shield size={12} />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium">
                              <User size={12} />
                              User
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className={clsx(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                              user.isBanned ? "bg-red-500/10 text-red-500" :
                              user.tier === 'vip' ? "bg-purple-500/10 text-purple-400" :
                              user.tier === 'premium' ? "bg-amber-500/10 text-amber-400" :
                              user.tier === 'pro' ? "bg-blue-500/10 text-blue-400" :
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
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleUpdateTier(user.uid, 'free')}
                                className={clsx("px-3 py-1.5 rounded-md text-xs font-medium transition-colors border", user.tier === 'free' ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700")}
                              >
                                Free
                              </button>
                              <button
                                onClick={() => handleUpdateTier(user.uid, 'pro')}
                                className={clsx("px-3 py-1.5 rounded-md text-xs font-medium transition-colors border", user.tier === 'pro' ? "bg-blue-600 border-blue-500 text-white" : "bg-transparent border-zinc-800 text-zinc-500 hover:text-blue-400 hover:border-blue-900/50")}
                              >
                                Pro
                              </button>
                              <button
                                onClick={() => handleUpdateTier(user.uid, 'premium')}
                                className={clsx("px-3 py-1.5 rounded-md text-xs font-medium transition-colors border flex items-center gap-1", user.tier === 'premium' ? "bg-amber-500 border-amber-400 text-amber-950" : "bg-transparent border-zinc-800 text-zinc-500 hover:text-amber-400 hover:border-amber-900/50")}
                              >
                                <Crown size={12} />
                                Premium
                              </button>
                              <button
                                onClick={() => handleUpdateTier(user.uid, 'vip')}
                                className={clsx("px-3 py-1.5 rounded-md text-xs font-medium transition-colors border flex items-center gap-1", user.tier === 'vip' ? "bg-purple-500 border-purple-400 text-purple-950" : "bg-transparent border-zinc-800 text-zinc-500 hover:text-purple-400 hover:border-purple-900/50")}
                              >
                                <Crown size={12} />
                                VIP
                              </button>
                              <div className="w-px h-6 bg-zinc-800 mx-1"></div>
                              <button
                                onClick={() => handleToggleVerify(user.uid, user.isVerified || false)}
                                className={clsx(
                                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border flex items-center gap-1",
                                  user.isVerified 
                                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20" 
                                    : "bg-zinc-500/10 border-zinc-500/20 text-zinc-400 hover:bg-zinc-500/20"
                                )}
                              >
                                <BadgeCheck size={12} />
                                {user.isVerified ? 'Unverify' : 'Verify'}
                              </button>
                              <button
                                onClick={() => handleToggleBan(user.uid, user.isBanned || false)}
                                className={clsx(
                                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border flex items-center gap-1",
                                  user.isBanned 
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" 
                                    : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                                )}
                              >
                                {user.isBanned ? <CheckCircle size={12} /> : <Ban size={12} />}
                                {user.isBanned ? 'Unban' : 'Ban'}
                              </button>
                            </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === 'support' ? (
            <div className="space-y-2">
              {supportChats.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">No support tickets found.</div>
              ) : (
                supportChats.map(chat => (
                  <div 
                    key={chat.id}
                    onClick={() => {
                      setActiveSupportUserId(chat.userId);
                      setActiveSupportUserName(chat.userName);
                    }}
                    className="bg-zinc-800/30 border border-zinc-800 hover:border-zinc-700 rounded-lg p-4 cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-zinc-200">{chat.userName}</h3>
                        {chat.unreadAdmin > 0 && (
                          <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {chat.unreadAdmin} New
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 truncate max-w-xl">{chat.lastMessage}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-zinc-500">
                        {new Date(chat.lastMessageTime).toLocaleString()}
                      </span>
                      <button className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Reply <MessageSquare size={14} className="inline ml-1" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'pricing' ? (
            <div className="max-w-2xl mx-auto space-y-6">
              <form onSubmit={handleSavePricing} className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <DollarSign size={20} className="text-zinc-400" />
                  <h3 className="text-lg font-medium text-zinc-100">Subscription Pricing (₦)</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Premium Plan (₦)</label>
                    <input 
                      type="number" 
                      value={pricing.premium}
                      onChange={(e) => setPricing({ ...pricing, premium: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Pro Plan (₦)</label>
                    <input 
                      type="number" 
                      value={pricing.pro}
                      onChange={(e) => setPricing({ ...pricing, pro: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">VIP Plan (₦)</label>
                    <input 
                      type="number" 
                      value={pricing.vip}
                      onChange={(e) => setPricing({ ...pricing, vip: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button 
                    type="submit"
                    disabled={savingPricing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {savingPricing ? 'Saving...' : 'Save Pricing'}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </div>
      
      {activeSupportUserId && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl h-[80vh] relative overflow-hidden shadow-2xl">
            <SupportChatScreen 
              userId="" // Not used directly when isAdminView is true
              userName=""
              isAdminView={true}
              targetUserId={activeSupportUserId}
              targetUserName={activeSupportUserName || 'User'}
              onClose={() => {
                setActiveSupportUserId(null);
                setActiveSupportUserName(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
