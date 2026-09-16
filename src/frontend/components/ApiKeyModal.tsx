import React, { useState, useEffect } from 'react';
import { X, Key, Plus, Copy, Check, Trash2, Code2, ShieldAlert, Sparkles, Terminal, Cpu, DollarSign, Activity, Crown, Lock, Tag, Layers, Wallet, Send } from 'lucide-react';
import { UserApiKey, UserProfile, PricingSettings } from '../../models/types';
import { getUserApiKeys, generateUserApiKey, deleteUserApiKey, listenToPricingSettings, purchaseApiKeyAccessWithWallet } from '../../database/db';
import { clsx } from 'clsx';

interface ApiKeyModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenSubscription: () => void;
}

export function ApiKeyModal({ user, isOpen, onClose, onOpenSubscription }: ApiKeyModalProps) {
  const [activeTab, setActiveTab] = useState<'keys' | 'code' | 'billing'>('keys');
  const [apiKeys, setApiKeys] = useState<UserApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [buyingSuite, setBuyingSuite] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [visibleKeyIds, setVisibleKeyIds] = useState<Set<string>>(new Set());
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [apiBillingCycle, setApiBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://voidai.app';
  const isPaidTier = !!(user?.tier && user.tier !== 'free') || !!user?.hasApiKeyAccess;
  const walletBalance = user?.walletBalance || 0;

  useEffect(() => {
    const unsub = listenToPricingSettings((settings) => setPricing(settings));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isOpen && user?.uid) {
      loadKeys();
    }
  }, [isOpen, user?.uid]);

  const loadKeys = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const keys = await getUserApiKeys(user.uid);
      setApiKeys(keys);
    } catch (err) {
      console.error("Failed to load user API keys:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleWalletPurchaseApiSuite = async () => {
    if (!user?.uid) return;
    const cost = apiBillingCycle === 'yearly' ? (pricing?.apiKeyYearly ?? 200000) : (pricing?.apiKeyMonthly ?? 20000);

    if (walletBalance < cost) {
      alert(`Insufficient Wallet Balance!\n\nYour Balance: ₦${walletBalance.toLocaleString()}\nRequired: ₦${cost.toLocaleString()}\n\nPlease ask Admin to fund your wallet.`);
      return;
    }

    if (!confirm(`Purchase Developer API Key Suite Access for ₦${cost.toLocaleString()} using your Wallet Balance?`)) {
      return;
    }

    setBuyingSuite(true);
    try {
      const res = await purchaseApiKeyAccessWithWallet(user.uid, cost, apiBillingCycle === 'yearly' ? 'Yearly Suite' : 'Monthly Suite');
      if (res.success) {
        alert(`🎉 ${res.message}\nNew Wallet Balance: ₦${(res.newBalance || 0).toLocaleString()}`);
        user.hasApiKeyAccess = true;
        if (res.newBalance !== undefined) {
          user.walletBalance = res.newBalance;
        }
        setActiveTab('keys');
      } else {
        alert(`⚠️ ${res.message}`);
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to purchase API key suite: " + err.message);
    } finally {
      setBuyingSuite(false);
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    if (!isPaidTier) {
      alert("You must subscribe to a paid plan (Pro, Premium, or VIP) to generate API keys.");
      onClose();
      onOpenSubscription();
      return;
    }
    setGenerating(true);
    try {
      const created = await generateUserApiKey(user.uid, newKeyName || 'VOID AI Key');
      setNewKeyName('');
      setNewlyCreatedKey(created.key);
      await loadKeys();
    } catch (err) {
      console.error("Failed to generate API key:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (confirm("Revoke and delete this API key? Any applications using it will lose access immediately.")) {
      try {
        await deleteUserApiKey(keyId);
        await loadKeys();
      } catch (err) {
        console.error("Failed to delete key:", err);
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const toggleKeyVisibility = (keyId: string) => {
    const next = new Set(visibleKeyIds);
    if (next.has(keyId)) {
      next.delete(keyId);
    } else {
      next.add(keyId);
    }
    setVisibleKeyIds(next);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#050205] overflow-y-auto min-h-screen text-white flex flex-col animate-fadeIn selection:bg-[#202022] selection:text-white">
      
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-black/95 border-b border-[#38383b]  px-3 sm:px-6 py-2.5 flex items-center justify-between ">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#252527] hover:bg-[#202022] border border-[#38383b] text-[#8d8d91] hover:text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer shadow group"
          >
            <X size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="uppercase tracking-wider">Back</span>
          </button>

          <div className="h-5 w-px bg-[#252527] hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2b0709] border border-[#3f86ff]/80 p-1.5 shadow-[0_0_15px_rgba(220,38,38,0.3)] flex items-center justify-center text-[#3f86ff] shrink-0">
              <Key size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xs sm:text-sm font-black text-[#3f86ff] uppercase tracking-widest">
                  DEVELOPER API KEYS
                </h1>
                <span className="text-[9px] px-2 py-0.2 rounded-full bg-[#252527] text-[#8d8d91] border border-[#38383b] font-bold uppercase tracking-wider">
                  nvn_live_...
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right User Status Badges */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#2b0709] border border-[#38383b] rounded-lg text-[10px]">
            <Crown size={12} className="text-amber-400" />
            <span className="text-white font-bold">Tier:</span>
            <span className="text-amber-400 font-extrabold uppercase">{user?.tier || 'free'}</span>
          </div>

          <a
            href="https://t.me/nova_tech_1"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 bg-[#3f86ff]/20 hover:bg-[#3f86ff] border border-[#3f86ff]/80 text-[#8d8d91] hover:text-white font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer uppercase tracking-wider shadow"
          >
            <span>Admin</span>
          </a>
        </div>
      </header>

      {/* Main Compact Workspace Content */}
      <main className="max-w-5xl mx-auto w-full p-3 sm:p-5 space-y-4 flex-1">
        
        {/* Banner Alert on Brain Sync */}
        <div className="p-3 bg-gradient-to-r from-[#202022]/80 via-[#2b0709] to-[#202022] border border-[#38383b] rounded-xl flex items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#252527] border border-[#38383b] text-[#8d8d91] rounded-lg shrink-0">
              <Cpu size={16} />
            </div>
            <div>
              <h3 className="text-[11px] sm:text-xs font-bold text-[#8d8d91] uppercase tracking-wider flex items-center gap-1.5">
                <span>AI Brain Synchronization</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </h3>
              <p className="text-[10px] text-white leading-tight">
                Keys inherit active prompt rules, provider fallbacks, and model parameters.
              </p>
            </div>
          </div>
        </div>

        {/* Compact Tab Controls */}
        <div className="flex border-b border-[#38383b] bg-black/60 rounded-xl p-1 gap-1 overflow-x-auto shadow-inner text-xs">
          <button
            onClick={() => setActiveTab('keys')}
            className={clsx(
              "flex-1 min-w-[130px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer uppercase tracking-wider",
              activeTab === 'keys' 
                ? "bg-[#3f86ff] text-white shadow" 
                : "text-[#8d8d91] hover:text-white hover:bg-[#252527]/60"
            )}
          >
            <Key size={13} />
            <span>1. Keys Vault ({apiKeys.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className={clsx(
              "flex-1 min-w-[130px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer uppercase tracking-wider",
              activeTab === 'billing' 
                ? "bg-[#3f86ff] text-white shadow" 
                : "text-[#8d8d91] hover:text-white hover:bg-[#252527]/60"
            )}
          >
            <DollarSign size={13} />
            <span>2. Pricing & Plans</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={clsx(
              "flex-1 min-w-[130px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer uppercase tracking-wider",
              activeTab === 'code' 
                ? "bg-[#3f86ff] text-white shadow" 
                : "text-[#8d8d91] hover:text-white hover:bg-[#252527]/60"
            )}
          >
            <Code2 size={13} />
            <span>3. Integration Guide</span>
          </button>
        </div>

        {/* Tab 1: Keys Vault */}
        {activeTab === 'keys' && (
          <div className="space-y-6">
            {!isPaidTier ? (
              <div className="bg-gradient-to-r from-[#202022]/90 via-[#2b0709] to-[#202022]/90 border border-[#3f86ff] rounded-3xl p-8 shadow-2xl space-y-4 text-center max-w-3xl mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-[#252527] border border-[#3f86ff] flex items-center justify-center mx-auto text-[#8d8d91] shadow-[0_0_30px_rgba(220,38,38,0.5)]">
                  <Lock size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-white uppercase tracking-wider">
                    Paid Account Required to Unlock API Keys
                  </h3>
                  <p className="text-sm text-white leading-relaxed max-w-xl mx-auto">
                    Developer API keys (<code className="text-[#8d8d91] font-bold">nvn_live_...</code>) are dedicated to subscribed accounts. Upgrade your account plan or purchase a developer API key suite to start sending requests.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSubscription();
                    }}
                    className="px-8 py-3.5 bg-[#3f86ff] hover:opacity-90 text-white font-bold text-xs rounded-xl transition-all shadow-xl inline-flex items-center gap-2.5 uppercase tracking-wider cursor-pointer"
                  >
                    <Crown size={18} />
                    <span>View Account Subscription Plans</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Generator Form */
              <form onSubmit={handleGenerateKey} className="bg-black/90 border border-[#38383b] rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#38383b] pb-3">
                  <h3 className="text-base font-bold text-[#8d8d91] uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={18} />
                    <span>Generate New Developer API Key</span>
                  </h3>
                  <span className="text-xs text-[#8d8d91]">Prefix format: <code className="text-[#8d8d91] font-bold">nvn_live_...</code></span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-1">
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Enter key name or alias (e.g. Production Web App, Telegram AI Bot)"
                    className="flex-1 bg-[#202022] border border-[#38383b] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#3f86ff] transition-colors placeholder:text-zinc-600 "
                  />
                  <button
                    type="submit"
                    disabled={generating}
                    className="px-6 py-3 bg-[#3f86ff] hover:opacity-90 text-white font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 uppercase tracking-wider"
                  >
                    <Plus size={18} />
                    <span>{generating ? 'Generating...' : '+ Create API Key'}</span>
                  </button>
                </div>

                {newlyCreatedKey && (
                  <div className="p-4 bg-[#252527] border border-[#3f86ff] rounded-xl space-y-2 animate-fadeIn mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#8d8d91] font-bold flex items-center gap-1.5">
                        <Check size={16} className="text-emerald-400" />
                        <span>Key Created Successfully! Copy now (hidden after leaving screen):</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(newlyCreatedKey, 'newly-created')}
                        className="px-3 py-1.5 bg-[#3f86ff] hover:opacity-90 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKeyId === 'newly-created' ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedKeyId === 'newly-created' ? 'Copied!' : 'Copy Secret Key'}</span>
                      </button>
                    </div>
                    <code className="block p-3 bg-[#2b0709] rounded-lg border border-[#38383b] text-[#8d8d91] text-sm break-all selection:bg-[#202022]">
                      {newlyCreatedKey}
                    </code>
                  </div>
                )}
              </form>
            )}

            {/* Active Keys List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1 border-b border-[#38383b] pb-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Key size={16} className="text-[#3f86ff]" />
                  <span>Your Vault Keys ({apiKeys.length})</span>
                </h3>
                <span className="text-xs text-[#8d8d91]">
                  Compatible with standard OpenAI REST SDKs
                </span>
              </div>

              {loading ? (
                <div className="p-12 text-center text-sm text-[#8d8d91] animate-pulse">
                  Loading keys from vault...
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="p-12 text-center bg-black/60 border border-[#38383b] rounded-2xl space-y-3">
                  <Key size={32} className="mx-auto text-[#8d8d91]" />
                  <p className="text-sm text-white font-bold">No API keys generated yet.</p>
                  <p className="text-xs text-[#8d8d91]">Create a key above to start making requests with <code className="text-[#8d8d91]">nvn_live_...</code></p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {apiKeys.map((k) => {
                    const isVisible = visibleKeyIds.has(k.id);
                    const maskedKey = k.key.length > 16 
                      ? `${k.key.slice(0, 12)}...${k.key.slice(-4)}`
                      : k.key;

                    return (
                      <div
                        key={k.id}
                        className="bg-black/90 border border-[#38383b] hover:border-[#38383b] rounded-2xl p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
                      >
                        <div className="space-y-1.5 overflow-hidden">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-white">{k.name}</span>
                            <span className="text-[10px] bg-[#252527] text-[#8d8d91] border border-[#38383b] px-2.5 py-0.5 rounded font-bold">
                              ACTIVE
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <code className="text-xs md:text-sm text-[#8d8d91] bg-[#202022] px-3 py-1.5 rounded-xl border border-[#38383b] select-all">
                              {isVisible ? k.key : maskedKey}
                            </code>
                            <button
                              onClick={() => toggleKeyVisibility(k.id)}
                              className="text-xs text-[#8d8d91] hover:text-white underline cursor-pointer"
                            >
                              {isVisible ? 'Hide' : 'Reveal'}
                            </button>
                          </div>
                          <div className="text-xs text-[#8d8d91] flex items-center gap-4 pt-1">
                            <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                            {k.lastUsedAt && (
                              <span>Last used: {new Date(k.lastUsedAt).toLocaleTimeString()}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            onClick={() => handleCopy(k.key, k.id)}
                            className="px-4 py-2 bg-[#252527] hover:bg-[#38383b] border border-[#38383b] text-white text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer font-bold"
                          >
                            {copiedKeyId === k.id ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                            <span>{copiedKeyId === k.id ? 'Copied' : 'Copy Secret Key'}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteKey(k.id)}
                            className="p-2 text-[#8d8d91] hover:text-[#8d8d91] hover:bg-[#252527] rounded-xl transition-colors cursor-pointer"
                            title="Revoke & Delete Key"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Token & Subscription Pricing */}
        {activeTab === 'billing' && (
          <div className="space-y-8">
            
            {/* DEDICATED SEPARATE DEVELOPER API KEY SUITE CARD */}
            <div className="p-6 md:p-8 bg-gradient-to-br from-[#202022]/90 via-[#2b0709] to-[#202022] border border-[#38383b] rounded-3xl relative overflow-hidden shadow-2xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#38383b]">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-[#2b0709] border border-[#3f86ff] text-[#3f86ff] rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                    <Key size={32} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl md:text-2xl font-black text-[#3f86ff] uppercase tracking-widest">
                        1. DEDICATED DEVELOPER API KEY SUITE
                      </h2>
                      <span className="text-[10px] bg-[#252527] text-[#8d8d91] border border-[#38383b] px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                        SEPARATE API PRICING
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-white mt-1">
                      Independent API key access for external web platforms, mobile apps, commercial bots, and background microservices.
                    </p>
                  </div>
                </div>

                {/* Billing Cycle Selector for API Key */}
                <div className="flex items-center gap-2 bg-black/90 border border-[#38383b] p-1.5 rounded-2xl shrink-0">
                  <button
                    onClick={() => setApiBillingCycle('monthly')}
                    className={clsx(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer uppercase tracking-wider",
                      apiBillingCycle === 'monthly' ? "bg-[#3f86ff] text-white shadow-lg" : "text-[#8d8d91] hover:text-white"
                    )}
                  >
                    Monthly Billing
                  </button>
                  <button
                    onClick={() => setApiBillingCycle('yearly')}
                    className={clsx(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 uppercase tracking-wider",
                      apiBillingCycle === 'yearly' ? "bg-emerald-600 text-white shadow-lg" : "text-[#8d8d91] hover:text-white"
                    )}
                  >
                    <span>Yearly Billing</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/80 px-2 py-0.5 rounded font-bold">
                      {pricing?.apiKeyDiscount ?? 20}% OFF
                    </span>
                  </button>
                </div>
              </div>

              {/* API Key Dedicated Price Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="p-6 bg-black/90 border border-[#38383b] rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-[#8d8d91] uppercase tracking-widest block">DEVELOPER ACCESS RATE</span>
                  <div className="text-3xl font-black text-[#8d8d91] ">
                    {apiBillingCycle === 'yearly' 
                      ? `₦${(pricing?.apiKeyYearly ?? 200000).toLocaleString()}` 
                      : `₦${(pricing?.apiKeyMonthly ?? 20000).toLocaleString()}`}
                    <span className="text-xs text-[#8d8d91] font-normal ml-1">
                      {apiBillingCycle === 'yearly' ? '/year' : '/month'}
                    </span>
                  </div>
                  {apiBillingCycle === 'yearly' && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 pt-1">
                      <Tag size={13} />
                      <span>Annual Discount Applied ({pricing?.apiKeyDiscount ?? 20}% OFF)</span>
                    </span>
                  )}
                </div>

                <div className="p-6 bg-black/90 border border-[#38383b] rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-[#8d8d91] uppercase tracking-widest block">INCLUDED CAPABILITIES</span>
                  <ul className="text-xs text-white space-y-2 ">
                    <li className="flex items-center gap-2 text-emerald-400">✓ Unlimited Key Generation</li>
                    <li className="flex items-center gap-2 text-emerald-400">✓ OpenAI `/v1/chat/completions`</li>
                    <li className="flex items-center gap-2 text-emerald-400">✓ Groq, Cohere & Failover Trees</li>
                  </ul>
                </div>

                <div className="p-6 bg-black/90 border border-[#38383b] rounded-2xl flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-bold text-[#8d8d91] uppercase tracking-widest block">INSTANT WALLET UNLOCK</span>
                    <p className="text-xs text-white leading-relaxed mt-1">
                      Wallet Balance: <strong className="text-emerald-400">₦{walletBalance.toLocaleString()}</strong>. Purchase API access suite directly with your balance.
                    </p>
                  </div>
                  {user?.hasApiKeyAccess ? (
                    <div className="px-4 py-3 bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold text-xs rounded-xl text-center uppercase tracking-wider">
                      ✓ API Suite Active
                    </div>
                  ) : (
                    <button
                      onClick={handleWalletPurchaseApiSuite}
                      disabled={buyingSuite}
                      className={clsx(
                        "px-4 py-3 text-white font-bold text-xs rounded-xl text-center transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider",
                        walletBalance >= (apiBillingCycle === 'yearly' ? (pricing?.apiKeyYearly ?? 200000) : (pricing?.apiKeyMonthly ?? 20000))
                          ? "bg-emerald-600 hover:bg-emerald-500 font-black"
                          : "bg-[#202022] hover:bg-[#3f86ff] border border-[#38383b]",
                        buyingSuite ? "animate-pulse" : ""
                      )}
                    >
                      <Wallet size={15} />
                      <span>
                        {buyingSuite 
                          ? 'Processing...' 
                          : `Pay ₦${(apiBillingCycle === 'yearly' ? (pricing?.apiKeyYearly ?? 200000) : (pricing?.apiKeyMonthly ?? 20000)).toLocaleString()} from Wallet`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Account Plan Banner */}
            <div className="p-6 md:p-8 bg-gradient-to-r from-[#202022]/90 via-[#2b0709] to-[#202022] border border-[#38383b] rounded-3xl space-y-6 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#38383b]">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Crown size={24} className="text-amber-400" />
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest">
                      2. WEBSITE USER SUBSCRIPTIONS
                    </h2>
                  </div>
                  <p className="text-xs md:text-sm text-white">
                    Website plans dictate your daily chat window message caps on the main interface.
                  </p>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onOpenSubscription();
                  }}
                  className="px-6 py-3 bg-[#3f86ff] hover:opacity-90 text-white font-bold text-xs rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer uppercase tracking-wider shrink-0"
                >
                  <Crown size={16} />
                  <span>Upgrade Website Account</span>
                </button>
              </div>

              {/* Website Subscription Tier Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-black/90 border border-[#38383b] rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-[#8d8d91] uppercase tracking-widest">FREE PLAN</div>
                  <div className="text-2xl font-extrabold text-white">₦0 <span className="text-xs text-[#8d8d91] font-normal">/mo</span></div>
                  <ul className="text-xs text-[#8d8d91] space-y-2 pt-3 border-t border-[#38383b] ">
                    <li>• 5 Messages / Day</li>
                    <li>• Standard Speed</li>
                    <li>• Model: void-ai-fast</li>
                  </ul>
                </div>

                <div className="p-5 bg-black/90 border border-blue-900/80 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-blue-400 uppercase tracking-widest">PRO PLAN</div>
                  <div className="text-2xl font-extrabold text-blue-400">
                    {apiBillingCycle === 'yearly' 
                      ? `₦${(pricing?.proYearly ?? 70000).toLocaleString()}` 
                      : `₦${(pricing?.pro ?? 7000).toLocaleString()}`} 
                    <span className="text-xs text-[#8d8d91] font-normal">{apiBillingCycle === 'yearly' ? '/yr' : '/mo'}</span>
                  </div>
                  <ul className="text-xs text-white space-y-2 pt-3 border-t border-[#38383b] ">
                    <li>• 50 Messages / Day</li>
                    <li>• Fast Priority Engine</li>
                    <li>• Live Voice Mode</li>
                  </ul>
                </div>

                <div className="p-5 bg-black/90 border border-amber-900/80 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-widest">PREMIUM PLAN</div>
                  <div className="text-2xl font-extrabold text-amber-400">
                    {apiBillingCycle === 'yearly' 
                      ? `₦${(pricing?.premiumYearly ?? 150000).toLocaleString()}` 
                      : `₦${(pricing?.premium ?? 15000).toLocaleString()}`} 
                    <span className="text-xs text-[#8d8d91] font-normal">{apiBillingCycle === 'yearly' ? '/yr' : '/mo'}</span>
                  </div>
                  <ul className="text-xs text-white space-y-2 pt-3 border-t border-[#38383b] ">
                    <li>• 250 Messages / Day</li>
                    <li>• High Token Limits</li>
                    <li>• Multi-Model Failover</li>
                  </ul>
                </div>

                <div className="p-5 bg-black/90 border border-purple-900/80 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-purple-400 uppercase tracking-widest">VIP PLAN</div>
                  <div className="text-2xl font-extrabold text-purple-400">
                    {apiBillingCycle === 'yearly' 
                      ? `₦${(pricing?.vipYearly ?? 300000).toLocaleString()}` 
                      : `₦${(pricing?.vip ?? 30000).toLocaleString()}`} 
                    <span className="text-xs text-[#8d8d91] font-normal">{apiBillingCycle === 'yearly' ? '/yr' : '/mo'}</span>
                  </div>
                  <ul className="text-xs text-white space-y-2 pt-3 border-t border-[#38383b] ">
                    <li>• Unlimited Messages</li>
                    <li>• Maximum Context Tokens</li>
                    <li>• Direct Admin Support</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Admin Support Notice */}
            <div className="p-5 bg-[#202022] border border-[#38383b] rounded-2xl space-y-2">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-500" />
                <span>Custom Token Grants & Manual Upgrades</span>
              </div>
              <p className="text-xs text-[#8d8d91] leading-relaxed">
                Need higher token limits or custom API quotas for your business? Message the admin on Telegram (<a href="https://t.me/nova_tech_1" target="_blank" rel="noreferrer" className="text-[#8d8d91] hover:underline">@nova_tech_1</a>) or request a tier grant through the Support Desk.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Code Examples */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            <div className="p-6 bg-black/90 border border-[#38383b] rounded-2xl space-y-3 shadow-lg">
              <h3 className="text-sm font-bold text-[#8d8d91] uppercase tracking-wider flex items-center gap-2">
                <Terminal size={18} />
                <span>OpenAI-Compatible REST API Endpoint</span>
              </h3>
              <div className="flex items-center gap-3 bg-[#202022] p-3.5 rounded-xl border border-[#38383b]">
                <code className="text-xs md:text-sm text-[#8d8d91] flex-1 select-all break-all font-bold">
                  {appUrl}/v1/chat/completions
                </code>
                <button
                  onClick={() => handleCopy(`${appUrl}/v1/chat/completions`, 'base-url')}
                  className="px-4 py-2 bg-[#3f86ff] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 uppercase tracking-wider"
                >
                  {copiedKeyId === 'base-url' ? 'Copied Endpoint!' : 'Copy Endpoint URL'}
                </button>
              </div>
            </div>

            {/* Python Example */}
            <div className="bg-black/90 border border-[#38383b] rounded-2xl p-6 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-400 flex items-center gap-2 ">
                  <span>Python (openai SDK)</span>
                </span>
                <button
                  onClick={() => handleCopy(`import openai

client = openai.OpenAI(
    base_url="${appUrl}/v1",
    api_key="nvn_live_YOUR_KEY_HERE"
)

response = client.chat.completions.create(
    model="void-ai-fast",
    messages=[{"role": "user", "content": "Hello VOID AI"}]
)

print(response.choices[0].message.content)`, 'python-code')}
                  className="text-xs text-white hover:text-white flex items-center gap-1.5 cursor-pointer font-bold bg-[#252527] px-3 py-1.5 rounded-lg border border-[#38383b]"
                >
                  <Copy size={14} />
                  <span>Copy Python Code</span>
                </button>
              </div>
              <pre className="p-4 bg-[#202022] rounded-xl text-white text-xs overflow-x-auto leading-relaxed border border-[#38383b] select-all">
{`import openai

client = openai.OpenAI(
    base_url="${appUrl}/v1",
    api_key="nvn_live_YOUR_KEY_HERE"
)

response = client.chat.completions.create(
    model="void-ai-fast",
    messages=[{"role": "user", "content": "Hello VOID AI"}]
)

print(response.choices[0].message.content)`}
              </pre>
            </div>

            {/* JavaScript / Node.js Example */}
            <div className="bg-black/90 border border-[#38383b] rounded-2xl p-6 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-400 flex items-center gap-2 ">
                  <span>JavaScript / Node.js</span>
                </span>
                <button
                  onClick={() => handleCopy(`import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: '${appUrl}/v1',
  apiKey: 'nvn_live_YOUR_KEY_HERE',
});

const completion = await openai.chat.completions.create({
  model: 'void-ai-fast',
  messages: [{ role: 'user', content: 'Hello VOID AI' }],
});

console.log(completion.choices[0].message.content);`, 'js-code')}
                  className="text-xs text-white hover:text-white flex items-center gap-1.5 cursor-pointer font-bold bg-[#252527] px-3 py-1.5 rounded-lg border border-[#38383b]"
                >
                  <Copy size={14} />
                  <span>Copy JS Code</span>
                </button>
              </div>
              <pre className="p-4 bg-[#202022] rounded-xl text-white text-xs overflow-x-auto leading-relaxed border border-[#38383b] select-all">
{`import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: '${appUrl}/v1',
  apiKey: 'nvn_live_YOUR_KEY_HERE',
});

const completion = await openai.chat.completions.create({
  model: 'void-ai-fast',
  messages: [{ role: 'user', content: 'Hello VOID AI' }],
});

console.log(completion.choices[0].message.content);`}
              </pre>
            </div>

            {/* cURL Example */}
            <div className="bg-black/90 border border-[#38383b] rounded-2xl p-6 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-sky-400 flex items-center gap-2 ">
                  <span>cURL Terminal Request</span>
                </span>
                <button
                  onClick={() => handleCopy(`curl -X POST ${appUrl}/v1/chat/completions \\
  -H "Authorization: Bearer nvn_live_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "void-ai-fast",
    "messages": [{"role": "user", "content": "Hi VOID AI"}]
  }'`, 'curl-code')}
                  className="text-xs text-white hover:text-white flex items-center gap-1.5 cursor-pointer font-bold bg-[#252527] px-3 py-1.5 rounded-lg border border-[#38383b]"
                >
                  <Copy size={14} />
                  <span>Copy cURL Command</span>
                </button>
              </div>
              <pre className="p-4 bg-[#202022] rounded-xl text-white text-xs overflow-x-auto leading-relaxed border border-[#38383b] select-all">
{`curl -X POST ${appUrl}/v1/chat/completions \\
  -H "Authorization: Bearer nvn_live_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "void-ai-fast",
    "messages": [{"role": "user", "content": "Hi VOID AI"}]
  }'`}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#38383b] bg-[#2b0709] py-4 px-8 text-center text-xs text-[#8d8d91]">
        VOID AI High-Performance Developer API Infrastructure • Powered by Groq, Cohere & Brain Sync Engine
      </footer>
    </div>
  );
}
