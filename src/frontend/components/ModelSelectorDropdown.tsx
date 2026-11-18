import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronDown, Check, Sliders } from 'lucide-react';
import { clsx } from 'clsx';
import { NOVA_PERSONAS, getPersona } from '../models/personas';
import { NovaOrb } from './NovaOrb';

export interface ModelOption {
  provider: 'groq' | 'cohere' | 'bazaarlink' | 'gemini';
  id: string;
  name: string;
  tagline: string;
  speed: string;
  contextWindow: string;
  latencyBadge: string;
  recommendedFor: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    provider: 'groq',
    id: 'qwen/qwen3.8-27b',
    name: 'Shii (Qwen 3.8 27B)',
    tagline: 'Swift Muse · Rapid Builder & Real-Time Flow',
    speed: '~650 tok/s',
    contextWindow: '128k',
    latencyBadge: '< 60ms',
    recommendedFor: 'Fluid momentum, coding & live conversation',
  },
  {
    provider: 'groq',
    id: 'openai/gpt-oss-120b',
    name: 'Shiia (GPT OSS 120B)',
    tagline: 'Deep Architect · Full-System Muse',
    speed: '~280 tok/s',
    contextWindow: '128k',
    latencyBadge: '< 150ms',
    recommendedFor: 'Large multi-file builds, architecture & hard reasoning',
  },
  {
    provider: 'groq',
    id: 'auto',
    name: 'Muse Prime (Adaptive Matrix)',
    tagline: 'Smart Failover Router · Multi-Pool',
    speed: 'Adaptive',
    contextWindow: 'Auto',
    latencyBadge: 'Fastest',
    recommendedFor: 'Automatically routes across healthy pools & models',
  },
  {
    provider: 'cohere',
    id: 'command-r-08-2024',
    name: 'Lyra (Cohere Command R)',
    tagline: 'Grounded Scholar · Structured Precision',
    speed: '~180 tok/s',
    contextWindow: '128k',
    latencyBadge: '< 220ms',
    recommendedFor: 'Deep documentation, analysis & grounded clarity',
  },
  {
    provider: 'gemini',
    id: 'gemini-2.5-flash',
    name: 'Sora (Gemini 2.5 Flash)',
    tagline: 'Long-Context Oracle · 1M Context',
    speed: '~450 tok/s',
    contextWindow: '1M',
    latencyBadge: '< 120ms',
    recommendedFor: 'Full repositories, archives & multimodal reasoning',
  },
  {
    provider: 'bazaarlink',
    id: 'bazaarlink-fast',
    name: 'Kael (BazaarLink Fast)',
    tagline: 'Steady Strategist · Reserve Pipeline',
    speed: '~150 tok/s',
    contextWindow: '64k',
    latencyBadge: '< 300ms',
    recommendedFor: 'Reliable secondary pipeline & structured reasoning',
  },
];

interface ModelSelectorDropdownProps {
  selectedProvider: 'groq' | 'cohere' | 'bazaarlink' | 'gemini';
  selectedModel: string;
  selectedPersonaId?: string;
  onSelect: (provider: 'groq' | 'cohere' | 'bazaarlink' | 'gemini', model: string, personaId?: string) => void;
  lastTelemetry?: {
    latencyMs?: number;
    ttftMs?: number;
    tokensPerSec?: number;
  };
}

export function ModelSelectorDropdown({
  selectedProvider,
  selectedModel,
  selectedPersonaId,
  onSelect,
  lastTelemetry,
}: ModelSelectorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [temperature, setTemperature] = useState(() => {
    const saved = localStorage.getItem('void_ai_temperature');
    return saved ? parseFloat(saved) : 0.65;
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentPersona = getPersona(selectedProvider, selectedModel, selectedPersonaId);

  const handleTempChange = (val: number) => {
    setTemperature(val);
    localStorage.setItem('void_ai_temperature', val.toString());
  };

  return (
    <div className="relative inline-block text-left shrink-0" ref={dropdownRef}>
      {/* Trigger Button - Thick Liquid Glass header pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "h-9 px-2.5 sm:px-3.5 rounded-full border text-xs font-medium transition-all flex items-center gap-2 cursor-pointer select-none whitespace-nowrap",
          isOpen
            ? "glass-thick glow-ring text-[var(--text-primary)]"
            : "glass text-[var(--text-primary)] hover:border-[var(--line-strong)]"
        )}
        title="Choose active Muse character & intelligence engine"
      >
        <NovaOrb size={18} persona={currentPersona} className="shrink-0" label={currentPersona.name} />
        <span className="font-semibold truncate max-w-[110px] sm:max-w-[160px]">
          {currentPersona.name}
        </span>
        <span className="hidden md:inline text-[10px] text-[var(--text-muted)]">
          · {currentPersona.role}
        </span>

        {lastTelemetry?.tokensPerSec ? (
          <span className="hidden lg:inline text-[10px] font-mono tabular-nums text-[var(--text-muted)]">
            · {Math.round(lastTelemetry.tokensPerSec)} t/s
          </span>
        ) : null}

        <ChevronDown
          size={13}
          className={clsx("text-[var(--text-muted)] transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>

      {/* Flyout Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-[315px] sm:w-[400px] rounded-2xl glass-thick p-2.5 z-50 text-[var(--text-primary)] select-none animate-riseIn">
          {/* Header */}
          <div className="px-2.5 py-2 border-b border-[var(--line)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-bold tracking-tight">Muse Companions</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">Select persona</span>
          </div>

          {/* Character Choices List */}
          <div className="py-1.5 space-y-1 max-h-[340px] overflow-y-auto pr-0.5">
            {NOVA_PERSONAS.map((persona, i) => {
              const isSelected = selectedPersonaId
                ? selectedPersonaId === persona.id
                : (selectedModel === persona.modelId && selectedProvider === persona.provider);

              return (
                <button
                  type="button"
                  key={persona.id}
                  onClick={() => {
                    onSelect(persona.provider, persona.modelId, persona.id);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    "w-full text-left p-2.5 rounded-xl cursor-pointer transition-all border nova-menu-item",
                    isSelected
                      ? "text-[var(--text-primary)] shadow-sm"
                      : "bg-transparent border-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                  style={{
                    animationDelay: `${i * 30}ms`,
                    ...(isSelected
                      ? { background: 'var(--accent-soft)', borderColor: 'var(--accent-muted)' }
                      : {}),
                  }}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <NovaOrb size={34} persona={persona} className="shrink-0 mt-0.5" label={persona.name} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-bold text-[var(--text-primary)]">{persona.name}</span>
                          <span className="text-[10px] font-medium text-[var(--text-muted)]">· {persona.role}</span>
                          {isSelected && (
                            <span
                              className="text-[10px] font-mono font-semibold flex items-center gap-0.5"
                              style={{ color: 'var(--accent)' }}
                            >
                              <Check size={11} className="stroke-[3]" /> Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-0.5 leading-snug">
                          {persona.personality}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5 font-mono">
                          {persona.engine} · {persona.contextWindow}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono tabular-nums text-[10px] pt-0.5">
                      <div className="text-[var(--text-secondary)] font-medium">{persona.speed}</div>
                      <div className="text-[var(--text-muted)] mt-0.5">{persona.latencyBadge}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Precision Controls Section (Temperature) */}
          <div className="p-3 glass-subtle rounded-xl mt-1 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Sliders size={12} style={{ color: 'var(--accent)' }} />
                Temperature (Reasoning Style)
              </span>
              <span className="font-mono tabular-nums text-[var(--text-primary)] font-semibold text-[10px]">
                {temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => handleTempChange(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-lg cursor-pointer"
              style={{ accentColor: 'var(--accent)' }}
            />
            <div className="flex justify-between text-[9px] text-[var(--text-muted)] font-mono">
              <span>0.0 Exact Code</span>
              <span>0.65 Balanced</span>
              <span>1.0 Expressive</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
