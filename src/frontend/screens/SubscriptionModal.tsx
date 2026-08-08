import React, { useEffect, useState } from 'react';
import { X, Check, Crown, ShieldAlert, Sparkles, MessageSquare, Tag, Zap, ArrowLeft, Send } from 'lucide-react';
import { UserTier, PricingSettings } from '../../models/types';
import { listenToPricingSettings } from '../../database/db';
import { clsx } from 'clsx';

interface SubscriptionModalProps {
  onClose: () => void;
  currentTier: UserTier;
  onRequestUpgrade?: (tier: UserTier) => void;
}

export function SubscriptionModal({ onClose, currentTier, onRequestUpgrade }: SubscriptionModalProps) {
  const [loadingTier, setLoadingTier] = useState<UserTier | null>(null);
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const unsub = listenToPricingSettings((settings) => {
      setPricing(settings);
    });
    return () => unsub();
  }, []);

  const handleSubscribe = async (tier: UserTier) => {
    if (tier === currentTier) return;
    setLoadingTier(tier);
    try {
      if (onRequestUpgrade) {
        onRequestUpgrade(tier);
      }
    } catch (e) {
      console.error(e);
      setLoadingTier(null);
    }
  };

  const isYearly = billingCycle === 'yearly';

  const plans = [
    {
      id: 'free' as UserTier,
      name: 'Free Plan',
      price: '₦0',
      interval: '/forever',
      discountTag: null,
      description: 'Standard AI assistant access for everyday casual prompts.',
      features: [
        '5 messages per day',
        'Standard response speed',
        'Basic email campaign generator',
        'Community user support'
      ],
      border: 'border-zinc-800',
      bg: 'bg-zinc-950/80',
      badgeBg: 'bg-zinc-800 text-zinc-300',
      buttonStyle: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
    },
    {
      id: 'pro' as UserTier,
      name: 'Pro Tier',
      price: isYearly 
        ? `₦${(pricing?.proYearly ?? 70000).toLocaleString()}` 
        : `₦${(pricing?.pro ?? 7000).toLocaleString()}`,
      interval: isYearly ? '/year' : '/month',
      discountTag: isYearly ? `${pricing?.proDiscount ?? 16}% OFF` : null,
      description: 'Enhanced speeds and 50 messages/day for active users.',
      features: [
        '50 messages per day',
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
      price: isYearly 
        ? `₦${(pricing?.premiumYearly ?? 150000).toLocaleString()}` 
        : `₦${(pricing?.premium ?? 15000).toLocaleString()}`,
      interval: isYearly ? '/year' : '/month',
      discountTag: isYearly ? `${pricing?.premiumDiscount ?? 16}% OFF` : null,
      description: 'High volume limits & multi-stage strategy suite.',
      features: [
        '250 messages per day',
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
      price: isYearly 
        ? `₦${(pricing?.vipYearly ?? 300000).toLocaleString()}` 
        : `₦${(pricing?.vip ?? 30000).toLocaleString()}`,
      interval: isYearly ? '/year' : '/month',
      discountTag: isYearly ? `${pricing?.vipDiscount ?? 16}% OFF` : null,
      description: 'Unrestricted elite AI capabilities and maximum context.',
      features: [
        'Unlimited daily messages',
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
    <div className="fixed inset-0 z-50 bg-[#050205] overflow-y-auto min-h-screen text-slate-100 font-mono flex flex-col animate-fadeIn selection:bg-red-900 selection:text-white">
      
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-black/95 border-b border-red-950 backdrop-blur-md px-4 md:px-8 py-4 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-2 bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-300 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="uppercase tracking-wider">← Back to Chat</span>
          </button>

          <div className="h-6 w-px bg-red-950 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black border border-amber-500/80 p-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center text-amber-400 shrink-0">
              <Crown size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base md:text-xl font-black text-amber-400 uppercase tracking-widest">
                  SUBSCRIPTION & PRICING TIERS
                </h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/80 font-bold uppercase tracking-wider">
                  ACTIVE: {currentTier.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Upgrade your account plan to unlock higher daily prompt limits, faster processing, and live support.
              </p>
            </div>
          </div>
        </div>

        {/* Right Telegram Link */}
        <a
          href="https://t.me/nova_tech_1"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 bg-sky-600/20 hover:bg-sky-600 border border-sky-500/80 text-sky-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider shadow-md"
        >
          <Send size={14} />
          <span className="hidden sm:inline">Message @nova_tech_1</span>
        </a>
      </header>

      {/* Main Spacious Content */}
      <main className="max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8 flex-1">
        
        {/* Banner */}
        <div className="p-5 md:p-6 bg-gradient-to-r from-red-950/80 via-black to-zinc-950 border border-red-900/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
          <div className="space-y-1">
            <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="text-amber-400" size={20} />
              <span>SUPERCHARGE YOUR VOID AI EXPERIENCE</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Select a tier below or contact admin directly for instant custom account grants and token top-ups.
            </p>
          </div>

          {/* Monthly / Yearly Billing Toggle */}
          <div className="flex items-center gap-3 bg-black/90 border border-zinc-800 p-2 rounded-2xl shrink-0 shadow-inner">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={clsx(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer uppercase tracking-wider",
                !isYearly ? "bg-red-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={clsx(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 uppercase tracking-wider",
                isYearly ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              <span>Yearly Billing</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/80 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                UP TO 20% OFF
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => {
            const isActive = currentTier === plan.id;

            return (
              <div 
                key={plan.id}
                className={clsx(
                  "relative rounded-3xl p-6 border flex flex-col justify-between transition-all duration-300 shadow-xl relative overflow-hidden",
                  plan.bg,
                  plan.border,
                  isActive ? "ring-2 ring-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.25)]" : "hover:border-slate-500"
                )}
              >
                {plan.popular && !isActive && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest py-1 px-4 rounded-bl-2xl shadow-md">
                    MOST POPULAR
                  </div>
                )}

                {isActive && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-zinc-950 text-[10px] font-black uppercase tracking-widest py-1 px-4 rounded-bl-2xl shadow-md">
                    CURRENT ACTIVE PLAN
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className={clsx("text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider inline-block", plan.badgeBg)}>
                      {plan.name}
                    </span>
                    <div className="text-3xl md:text-4xl font-black text-white font-mono tracking-tight pt-1">
                      {plan.price}
                      <span className="text-xs text-slate-400 font-normal ml-1 font-mono">{plan.interval}</span>
                    </div>
                    {plan.discountTag && (
                      <span className="inline-block text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-700 px-2 py-0.5 rounded font-mono font-bold">
                        {plan.discountTag}
                      </span>
                    )}
                    <p className="text-xs text-slate-300 leading-snug min-h-[38px] pt-1">
                      {plan.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-zinc-800 space-y-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">WHAT'S INCLUDED:</span>
                    <ul className="space-y-2">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                          <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-zinc-800/80">
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isActive || loadingTier !== null}
                    className={clsx(
                      "w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center justify-center cursor-pointer",
                      plan.buttonStyle,
                      isActive ? "opacity-50 cursor-not-allowed bg-zinc-800 text-zinc-400 border border-zinc-700" : "hover:scale-[1.02] active:scale-[0.98]",
                      loadingTier === plan.id ? "animate-pulse" : ""
                    )}
                  >
                    {loadingTier === plan.id 
                      ? 'Processing Upgrade...' 
                      : isActive 
                        ? 'Active Subscription' 
                        : 'Request Upgrade'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Grants Telegram Notice */}
        <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-400 rounded-2xl shrink-0">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Custom Enterprise Quotas & Manual Payments
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                Need customized daily message grants or direct bank transfer setup? Contact the administrator directly on Telegram (<strong className="text-red-400">@nova_tech_1</strong>).
              </p>
            </div>
          </div>

          <a
            href="https://t.me/nova_tech_1"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shrink-0 flex items-center gap-2 uppercase tracking-wider cursor-pointer"
          >
            <Send size={16} />
            <span>Contact @nova_tech_1</span>
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-red-950 bg-black py-4 px-8 text-center text-xs text-slate-500">
        VOID AI Subscription & Account Management Desk • All Rights Reserved
      </footer>
    </div>
  );
}
