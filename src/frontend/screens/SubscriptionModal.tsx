import React, { useEffect, useState } from 'react';
import { X, ArrowLeft, Check } from 'lucide-react';
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

  const plans = [
    {
      id: 'free' as UserTier,
      name: 'Free',
      price: '₦0',
      interval: '/forever',
      description: 'Standard AI assistant access for casual everyday tasks.',
      features: [
        '5 messages per day',
        'Standard response speed',
        'Basic email marketing assistance',
        'Community support'
      ],
      color: 'bg-zinc-900/90 border-zinc-800 text-zinc-200',
      buttonColor: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
    },
    {
      id: 'pro' as UserTier,
      name: 'Pro',
      price: pricing ? `₦${pricing.pro.toLocaleString()}` : '₦7,000',
      interval: '/month',
      description: 'Enhanced speeds and 50 messages/day for power users.',
      features: [
        '50 messages per day',
        'Fast response times',
        'Extended token output (1,024 tokens)',
        'Email campaign generator suite',
        'Live Voice Mode access'
      ],
      color: 'bg-blue-950/40 border-blue-800/80 text-blue-100',
      buttonColor: 'bg-blue-600 hover:bg-blue-500 text-white',
      popular: true
    },
    {
      id: 'premium' as UserTier,
      name: 'Premium',
      price: pricing ? `₦${pricing.premium.toLocaleString()}` : '₦5,000',
      interval: '/month',
      description: 'High volume limits & advanced multi-stage strategy suite.',
      features: [
        '250 messages per day',
        'Priority high-speed generation',
        '2,048 token max output limit',
        'Custom file exporter (PDF/CSV/Code)',
        '24/7 Priority Support Desk'
      ],
      color: 'bg-amber-950/40 border-amber-800/80 text-amber-100',
      buttonColor: 'bg-amber-600 hover:bg-amber-500 text-amber-950 font-bold'
    },
    {
      id: 'vip' as UserTier,
      name: 'VIP',
      price: pricing ? `₦${pricing.vip.toLocaleString()}` : '₦10,000',
      interval: '/month',
      description: 'Unrestricted elite AI capabilities and maximum power.',
      features: [
        'Unlimited daily messages',
        'Maximum output length (4,096 tokens)',
        'Custom fine-tuned system prompt',
        'Dedicated VIP Account Manager',
        'Instant direct admin chat line'
      ],
      color: 'bg-purple-950/40 border-purple-800/80 text-purple-100',
      buttonColor: 'bg-purple-600 hover:bg-purple-500 text-white font-bold'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 overflow-y-auto p-3 sm:p-5 flex items-center justify-center">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl md:rounded-3xl w-full max-w-6xl relative shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-800/50 flex items-center justify-center text-red-400 font-bold text-xs">
              <Check size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-100">
                Subscription & Pricing Tiers
              </h2>
              <p className="text-xs text-zinc-400">
                Current active plan: <span className="font-bold text-red-400 uppercase">{currentTier}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Supercharge your VOID AI Experience
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Upgrade your account to unlock higher message caps, maximum context outputs, faster processing speeds, and live direct admin support.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={clsx(
                  "relative rounded-2xl p-4 sm:p-5 border flex flex-col justify-between transition-all duration-200 hover:border-zinc-500/50 shadow-lg",
                  plan.color,
                  currentTier === plan.id ? "ring-2 ring-red-500 border-red-500/80 bg-red-950/20" : ""
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest py-0.5 px-3 rounded-full shadow-md">
                    Most Popular
                  </div>
                )}
                
                <div>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-base font-extrabold tracking-wide">{plan.name}</h3>
                      {currentTier === plan.id && (
                        <span className="text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl sm:text-3xl font-black tracking-tight">{plan.price}</span>
                      <span className="text-xs opacity-70 font-mono">{plan.interval}</span>
                    </div>
                    <p className="text-xs opacity-80 min-h-[36px] leading-snug">{plan.description}</p>
                  </div>
                  
                  <div className="pt-2 border-t border-white/10 mb-6">
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs font-medium">
                          <Check size={14} className="shrink-0 opacity-80 mt-0.5 text-emerald-400" />
                          <span className="leading-tight">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={currentTier === plan.id || loadingTier !== null}
                  className={clsx(
                    "w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center shadow-md",
                    plan.buttonColor,
                    currentTier === plan.id ? "opacity-40 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]",
                    loadingTier === plan.id ? "animate-pulse" : ""
                  )}
                >
                  {loadingTier === plan.id 
                    ? 'Processing...' 
                    : currentTier === plan.id 
                      ? 'Current Active Plan' 
                      : 'Upgrade to ' + plan.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
