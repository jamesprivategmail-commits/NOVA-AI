import React, { useEffect, useState } from 'react';
import { X, Check, Crown, ShieldAlert, Sparkles, Wallet, ArrowLeft, Send, CreditCard, History, Plus } from 'lucide-react';
import { UserTier, PricingSettings, WalletTransaction } from '../../models/types';
import { listenToPricingSettings, purchaseTierWithWallet, listenToWalletTransactions } from '../../database/db';
import { clsx } from 'clsx';

interface SubscriptionModalProps {
  userId?: string;
  walletBalance?: number;
  onClose: () => void;
  currentTier: UserTier;
  onRequestUpgrade?: (tier: UserTier) => void;
}

export function SubscriptionModal({ userId, walletBalance = 0, onClose, currentTier, onRequestUpgrade }: SubscriptionModalProps) {
  const [loadingTier, setLoadingTier] = useState<UserTier | null>(null);
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [txs, setTxs] = useState<WalletTransaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const unsub = listenToPricingSettings((settings) => {
      setPricing(settings);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (userId) {
      const unsubTx = listenToWalletTransactions(userId, (list) => {
        setTxs(list);
      });
      return () => unsubTx();
    }
  }, [userId]);

  const isYearly = billingCycle === 'yearly';

  const getPlanCost = (tier: UserTier): number => {
    if (tier === 'free') return 0;
    if (tier === 'pro') return isYearly ? (pricing?.proYearly ?? 70000) : (pricing?.pro ?? 7000);
    if (tier === 'premium') return isYearly ? (pricing?.premiumYearly ?? 150000) : (pricing?.premium ?? 15000);
    if (tier === 'vip') return isYearly ? (pricing?.vipYearly ?? 300000) : (pricing?.vip ?? 30000);
    return 0;
  };

  const handleWalletPurchase = async (tier: UserTier) => {
    if (!userId) {
      alert("Please log in to purchase using your wallet.");
      return;
    }
    const cost = getPlanCost(tier);
    if (cost <= 0) return;

    if (walletBalance < cost) {
      alert(`Insufficient Wallet Balance!\n\nYour Balance: ₦${walletBalance.toLocaleString()}\nRequired: ₦${cost.toLocaleString()}\n\nPlease click "Fund Wallet via Admin" to ask Admin to grant or credit funds to your account.`);
      return;
    }

    if (!confirm(`Confirm purchase of ${tier.toUpperCase()} Tier (${isYearly ? 'Yearly' : 'Monthly'}) for ₦${cost.toLocaleString()} using your Wallet Balance?`)) {
      return;
    }

    setLoadingTier(tier);
    try {
      const res = await purchaseTierWithWallet(userId, tier, cost, isYearly ? 'Yearly Plan' : 'Monthly Plan');
      if (res.success) {
        alert(`🎉 ${res.message}\nNew Wallet Balance: ₦${(res.newBalance || 0).toLocaleString()}`);
      } else {
        alert(`⚠️ ${res.message}`);
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to complete wallet transaction: " + err.message);
    } finally {
      setLoadingTier(null);
    }
  };

  const handleRequestAdminUpgrade = (tier: UserTier) => {
    if (onRequestUpgrade) {
      onRequestUpgrade(tier);
    } else {
      window.open("https://t.me/nova_tech_1", "_blank");
    }
  };

  const plans = [
    {
      id: 'free' as UserTier,
      name: 'Free Plan',
      priceNum: 0,
      priceStr: '₦0',
      interval: '/forever',
      discountTag: null,
      description: 'Standard AI assistant access with 5 free messages every 3 hours.',
      features: [
        '5 free messages per 3 hours',
        'Standard response speed',
        'Basic email campaign generator',
        'Community user support'
      ],
      border: 'border-[#38383b]',
      bg: 'bg-[#202022]/80',
      badgeBg: 'bg-[#38383b] text-white',
      buttonStyle: 'bg-[#38383b] hover:bg-[#454547] text-white'
    },
    {
      id: 'pro' as UserTier,
      name: 'Pro Tier',
      priceNum: getPlanCost('pro'),
      priceStr: `₦${getPlanCost('pro').toLocaleString()}`,
      interval: isYearly ? '/year' : '/month',
      discountTag: isYearly ? `${pricing?.proDiscount ?? 16}% OFF` : null,
      description: 'Enhanced speeds with 20 messages every 3 hours.',
      features: [
        '20 messages per 3 hours',
        'Fast response generation',
        'Extended context tokens (1,024 max)',
        'Full Email Marketing Suite',
        'Live Voice Mode enabled'
      ],
      border: 'border-blue-600/80',
      bg: 'bg-blue-950/20',
      badgeBg: 'bg-blue-950 text-blue-300 border border-blue-700',
      buttonStyle: 'bg-blue-600 hover:bg-blue-500 text-white font-bold',
      popular: true
    },
    {
      id: 'premium' as UserTier,
      name: 'Premium Tier',
      priceNum: getPlanCost('premium'),
      priceStr: `₦${getPlanCost('premium').toLocaleString()}`,
      interval: isYearly ? '/year' : '/month',
      discountTag: isYearly ? `${pricing?.premiumDiscount ?? 16}% OFF` : null,
      description: 'High volume limits with 50 messages every 3 hours.',
      features: [
        '50 messages per 3 hours',
        'High-priority generation speed',
        '2,048 token max output limit',
        'Custom file exporter (PDF/CSV/Code)',
        '24/7 Priority Support Desk'
      ],
      border: 'border-amber-600/80',
      bg: 'bg-amber-950/20',
      badgeBg: 'bg-amber-950 text-amber-300 border border-amber-700',
      buttonStyle: 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black'
    },
    {
      id: 'vip' as UserTier,
      name: 'VIP Tier',
      priceNum: getPlanCost('vip'),
      priceStr: `₦${getPlanCost('vip').toLocaleString()}`,
      interval: isYearly ? '/year' : '/month',
      discountTag: isYearly ? `${pricing?.vipDiscount ?? 16}% OFF` : null,
      description: 'Unrestricted elite AI capabilities with unlimited messages.',
      features: [
        'UNLIMITED messages (No rate limits)',
        'Maximum output length (4,096 tokens)',
        'Custom AI Brain settings override',
        'Dedicated VIP Account Manager',
        'Instant direct admin support chat'
      ],
      border: 'border-purple-600/80',
      bg: 'bg-purple-950/20',
      badgeBg: 'bg-purple-950 text-purple-300 border border-purple-700',
      buttonStyle: 'bg-purple-600 hover:bg-purple-500 text-white font-bold'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#050205] overflow-y-auto min-h-screen text-white flex flex-col animate-fadeIn selection:bg-[#202022] selection:text-white">
      
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-black/95 border-b border-[#38383b]  px-3 sm:px-6 py-2.5 flex items-center justify-between ">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#252527] hover:bg-[#202022] border border-[#38383b] text-[#8d8d91] hover:text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer  group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="uppercase tracking-wider">Back</span>
          </button>

          <div className="h-5 w-px bg-[#252527] hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2b0709] border border-[#3f86ff] p-1.5 shadow-[0_0_15px_rgba(220,38,38,0.4)] flex items-center justify-center text-[#8d8d91] shrink-0">
              <Crown size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xs sm:text-sm font-black text-[#3f86ff] uppercase tracking-widest drop-shadow">
                  SUBSCRIPTION & WALLET STORE
                </h1>
                <span className="text-[9px] px-2 py-0.2 rounded-full bg-[#252527] text-[#8d8d91] border border-[#38383b] font-bold uppercase tracking-wider">
                  ACTIVE: {currentTier.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Live Wallet Balance Badge */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 bg-[#252527] border border-[#38383b] rounded-lg flex items-center gap-2 ">
            <Wallet size={14} className="text-[#8d8d91]" />
            <div>
              <div className="text-[8px] text-[#8d8d91] font-bold uppercase tracking-widest">BALANCE</div>
              <div className="text-xs font-black text-[#8d8d91] ">₦{walletBalance.toLocaleString()}</div>
            </div>
          </div>

          <a
            href="https://t.me/nova_tech_1"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 bg-[#3f86ff] hover:bg-[#3f86ff] border border-[#3f86ff] text-white font-bold text-[10px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider shrink-0 "
          >
            <Send size={12} />
            <span className="hidden sm:inline">Fund Wallet</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full p-3 sm:p-5 space-y-4 flex-1">
        
        {/* Banner with Billing Toggle and Wallet Summary */}
        <div className="p-3.5 bg-gradient-to-r from-[#202022]/90 via-[#2b0709] to-[#202022] border border-[#38383b] rounded-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-xl">
          <div className="space-y-0.5 max-w-lg">
            <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="text-amber-400" size={16} />
              <span>DIRECT WALLET PURCHASES</span>
            </h2>
            <p className="text-[11px] text-white leading-snug">
              Instant plan upgrades using account wallet. Need top-ups? Contact Admin (<strong className="text-[#8d8d91]">@nova_tech_1</strong>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* History Toggle Button */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-2.5 py-1 bg-[#252527] border border-[#38383b] hover:border-zinc-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            >
              <History size={13} className="text-amber-400" />
              <span>{showHistory ? 'Hide' : 'Logs'}</span>
            </button>

            {/* Monthly / Yearly Billing Toggle */}
            <div className="flex items-center gap-1 bg-black/90 border border-[#38383b] p-1 rounded-xl">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer uppercase tracking-wider",
                  !isYearly ? "bg-[#3f86ff] text-white shadow" : "text-[#8d8d91] hover:text-white"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 uppercase tracking-wider",
                  isYearly ? "bg-emerald-600 text-white shadow" : "text-[#8d8d91] hover:text-white"
                )}
              >
                <span>Yearly</span>
                <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700/80 px-1 py-0.2 rounded font-bold">
                  20% OFF
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Wallet History Drawer */}
        {showHistory && (
          <div className="p-5 bg-[#202022] border border-[#38383b] rounded-2xl space-y-3 animate-fadeIn">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <History size={16} />
              <span>ACCOUNT WALLET TRANSACTION HISTORY</span>
            </h3>
            {txs.length === 0 ? (
              <p className="text-xs text-[#8d8d91]">No transaction records found yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {txs.map((tx) => (
                  <div key={tx.id} className="p-3 bg-[#252527]/90 border border-[#38383b] rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{tx.description}</div>
                      <div className="text-[10px] text-[#8d8d91]">{new Date(tx.createdAt).toLocaleString()}</div>
                    </div>
                    <div className={clsx("font-bold text-sm ", tx.amount >= 0 ? "text-emerald-400" : "text-[#8d8d91]")}>
                      {tx.amount >= 0 ? `+₦${tx.amount.toLocaleString()}` : `-₦${Math.abs(tx.amount).toLocaleString()}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pricing Cards Grid - Compact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
          {plans.map((plan) => {
            const isActive = currentTier === plan.id;
            const canAfford = walletBalance >= plan.priceNum;

            return (
              <div 
                key={plan.id}
                className={clsx(
                  "relative rounded-xl p-3.5 border flex flex-col justify-between transition-all duration-200 shadow-md overflow-hidden text-xs",
                  plan.bg,
                  plan.border,
                  isActive ? "ring-2 ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]" : "hover:border-slate-500"
                )}
              >
                {plan.popular && !isActive && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest py-0.5 px-2.5 rounded-bl-lg shadow">
                    POPULAR
                  </div>
                )}

                {isActive && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-zinc-950 text-[8px] font-black uppercase tracking-widest py-0.5 px-2.5 rounded-bl-lg shadow">
                    CURRENT
                  </div>
                )}

                <div className="space-y-2">
                  <div className="space-y-1">
                    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block", plan.badgeBg)}>
                      {plan.name}
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {plan.priceStr}
                      <span className="text-[10px] text-[#8d8d91] font-normal ml-0.5 ">{plan.interval}</span>
                    </div>
                    {plan.discountTag && (
                      <span className="inline-block text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-700 px-1.5 py-0.2 rounded font-bold">
                        {plan.discountTag}
                      </span>
                    )}
                    <p className="text-[11px] text-white leading-tight min-h-[28px]">
                      {plan.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#38383b] space-y-1">
                    <span className="text-[9px] font-bold text-[#8d8d91] uppercase tracking-widest block">INCLUDED:</span>
                    <ul className="space-y-1">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px] text-white">
                          <Check size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-[#38383b]/80 space-y-1.5">
                  {isActive ? (
                    <button
                      disabled
                      className="w-full py-1.5 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[#38383b] text-[#8d8d91] border border-[#38383b] cursor-not-allowed opacity-60"
                    >
                      Active Plan
                    </button>
                  ) : plan.id === 'free' ? (
                    <button
                      onClick={() => handleWalletPurchase('free')}
                      className="w-full py-1.5 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[#38383b] hover:bg-[#454547] text-white transition-all cursor-pointer"
                    >
                      Switch to Free
                    </button>
                  ) : (
                    <>
                      {/* 1-Click Pay from Wallet Button */}
                      <button
                        onClick={() => handleWalletPurchase(plan.id)}
                        disabled={loadingTier !== null}
                        className={clsx(
                          "w-full py-1.5 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer",
                          canAfford 
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white font-black" 
                            : "bg-[#252527] border border-[#38383b] text-[#8d8d91] hover:bg-[#252527]/40",
                          loadingTier === plan.id ? "animate-pulse" : ""
                        )}
                      >
                        <Wallet size={12} />
                        <span className="truncate">
                          {loadingTier === plan.id 
                            ? 'Processing...' 
                            : canAfford 
                              ? `Pay ₦${plan.priceNum.toLocaleString()}` 
                              : `Short (₦${walletBalance.toLocaleString()})`}
                        </span>
                      </button>

                      {/* Request Admin Option */}
                      <button
                        onClick={() => handleRequestAdminUpgrade(plan.id)}
                        className="w-full py-1 px-2 rounded-lg text-[9px] font-bold uppercase tracking-wider text-[#8d8d91] hover:text-white bg-black/60 hover:bg-[#38383b] border border-[#38383b] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Send size={10} />
                        <span>Fund via Admin</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Admin Wallet Credit Info Card */}
        <div className="p-6 bg-[#202022] border border-[#38383b] rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#252527] border border-[#38383b] text-[#8d8d91] rounded-2xl shrink-0">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Instant Account Wallet Top-Ups & Bank Transfers
              </h3>
              <p className="text-xs text-[#8d8d91] leading-relaxed mt-0.5">
                Send funds to Admin on Telegram (<strong className="text-[#8d8d91]">@nova_tech_1</strong>) or through the in-app support desk. Your wallet balance will be credited instantly upon confirmation.
              </p>
            </div>
          </div>

          <a
            href="https://t.me/nova_tech_1"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3 bg-[#3f86ff] hover:opacity-90 text-white font-bold text-xs rounded-xl transition-all shadow-lg shrink-0 flex items-center gap-2 uppercase tracking-wider cursor-pointer"
          >
            <Send size={16} />
            <span>Fund Wallet (@nova_tech_1)</span>
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#38383b] bg-[#2b0709] py-4 px-8 text-center text-xs text-[#8d8d91]">
        VOID AI Subscription & Account Wallet Desk • All Rights Reserved
      </footer>
    </div>
  );
}
