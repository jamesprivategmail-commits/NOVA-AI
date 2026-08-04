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
      id: 'premium' as UserTier,
      name: 'Premium',
      price: pricing ? `₦${pricing.premium.toLocaleString()}` : '₦5,000',
      interval: '/month',
      description: 'Perfect for professionals needing more power.',
      features: [
        'Higher message limits',
        'Faster response times',
        'Priority support',
        'Access to new features'
      ],
      color: 'bg-zinc-800 border-zinc-700 text-zinc-100',
      buttonColor: 'bg-zinc-700 hover:bg-zinc-600 text-white'
    },
    {
      id: 'pro' as UserTier,
      name: 'Pro',
      price: pricing ? `₦${pricing.pro.toLocaleString()}` : '₦7,000',
      interval: '/month',
      description: 'For power users who need the best performance.',
      features: [
        'Unlimited messages',
        'Fastest response times',
        '24/7 dedicated support',
        'Advanced customization',
        'API access'
      ],
      color: 'bg-blue-900/20 border-blue-800 text-blue-100',
      buttonColor: 'bg-blue-600 hover:bg-blue-500 text-white',
      popular: true
    },
    {
      id: 'vip' as UserTier,
      name: 'VIP',
      price: pricing ? `₦${pricing.vip.toLocaleString()}` : '₦10,000',
      interval: '/month',
      description: 'The ultimate experience for enterprise needs.',
      features: [
        'Everything in Pro',
        'Dedicated account manager',
        'Custom model fine-tuning',
        'White-glove onboarding',
        'SLA guarantee'
      ],
      color: 'bg-amber-900/20 border-amber-800 text-amber-100',
      buttonColor: 'bg-amber-600 hover:bg-amber-500 text-white'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-5xl relative shadow-2xl my-8">
        <div className="flex items-center p-6 pb-0">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors z-10"
          >
            <ArrowLeft size={20} />
            <span className="font-medium text-sm">Back to Chat</span>
          </button>
        </div>
        
        <div className="px-6 pb-12 pt-6 md:px-12 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-zinc-100 mb-4 tracking-tight">
            Upgrade your plan
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-12">
            Get more out of your AI assistant with our premium subscription plans. Choose the tier that best fits your needs.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={clsx(
                  "relative rounded-2xl p-6 md:p-8 border flex flex-col h-full transition-transform hover:-translate-y-1",
                  plan.color,
                  currentTier === plan.id ? "ring-2 ring-white" : ""
                )}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs font-bold uppercase tracking-widest py-1 px-3 rounded-full">
                    Most Popular
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                    <span className="text-sm opacity-80 font-medium">{plan.interval}</span>
                  </div>
                  <p className="text-sm opacity-80 min-h-[40px]">{plan.description}</p>
                </div>
                
                <div className="flex-1">
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm font-medium">
                        <Check size={18} className="shrink-0 opacity-80 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={currentTier === plan.id || loadingTier !== null}
                  className={clsx(
                    "w-full py-3.5 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center",
                    plan.buttonColor,
                    currentTier === plan.id ? "opacity-50 cursor-not-allowed" : "",
                    loadingTier === plan.id ? "animate-pulse" : ""
                  )}
                >
                  {loadingTier === plan.id 
                    ? 'Processing...' 
                    : currentTier === plan.id 
                      ? 'Current Plan' 
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
