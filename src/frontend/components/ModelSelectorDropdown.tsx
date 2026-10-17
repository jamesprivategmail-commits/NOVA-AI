import React, { useState, useRef, useEffect } from 'react';
import { Cpu, Zap, ChevronDown, Check, Sliders, Sparkles, Activity } from 'lucide-react';
import { clsx } from 'clsx';

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
    provider: 'gemini',
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    tagline: 'Google AI · Next-Gen Multimodal Reasoning',
    speed: '~450 tok/s',
    contextWindow: '1M',
    latencyBadge: '< 120ms',
    recommendedFor: 'Long context, rapid multimodal coding & reasoning',
  },
  {
    provider: 'gemini',
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    tagline: 'Google AI · Real-Time Intelligence',
    speed: '~380 tok/s',
    contextWindow: '1M',
    latencyBadge: '< 150ms',
    recommendedFor: 'Real-time tool actions & speed',
  },
  {
    provider: 'groq',
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    tagline: 'Groq LPUs · High Speed Reasoning',
    speed: '~320 tok/s',
    contextWindow: '128k',
    latencyBadge: '< 180ms',
    recommendedFor: 'Full-stack coding, architectural design & diffs',
  },
  {
    provider: 'groq',
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    tagline: 'Groq LPUs · Ultra-Low Latency',
    speed: '~850 tok/s',
    contextWindow: '128k',
    latencyBadge: '< 65ms',
    recommendedFor: 'Rapid prototyping, quick questions & refactoring',
  },
  {
    provider: 'cohere',
    id: 'command-r-plus',
    name: 'Cohere Command R+',
    tagline: 'Cohere API · Enterprise Grounding',
    speed: '~140 tok/s',
    contextWindow: '128k',
    latencyBadge: '< 350ms',
    recommendedFor: 'Multi-step tool integration & citations',
  },
  {
    provider: 'bazaarlink',
    id: 'deepseek-r1',
    name: 'DeepSeek R1 Reasoning',
    tagline: 'BazaarLink · Chain-of-Thought',
    speed: '~95 tok/s',
    contextWindow: '64k',
    latencyBadge: '< 550ms',
    recommendedFor: 'Complex algorithmic & mathematical verification',
  },
  {
    provider: 'groq',
    id: 'auto',
    name: 'Auto Intelligent Matrix',
    tagline: 'VOID Dynamic Router',
    speed: 'Adaptive',
    contextWindow: 'Auto',
    latencyBadge: 'Fastest',
    recommendedFor: 'Automatically routes to optimal available provider',
  },
];

interface ModelSelectorDropdownProps {
  selectedProvider: 'groq' | 'cohere' | 'bazaarlink' | 'gemini';
  selectedModel: string;
  onSelect: (provider: 'groq' | 'cohere' | 'bazaarlink' | 'gemini', model: string) => void;
  lastTelemetry?: {
    latencyMs?: number;
    ttftMs?: number;
    tokensPerSec?: number;
  };
}

export function ModelSelectorDropdown({
  selectedProvider,
  selectedModel,
  onSelect,
  lastTelemetry,
}: ModelSelectorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [temperature, setTemperature] = useState(() => {
    const saved = localStorage.getItem('void_ai_temperature');
    return saved ? parseFloat(saved) : 0.6;
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

  const currentOption = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

  const handleTempChange = (val: number) => {
    setTemperature(val);
    localStorage.setItem('void_ai_temperature', val.toString());
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button - Clean 2026 header style */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "h-9 px-2.5 sm:px-3 rounded-lg border text-xs font-medium transition-all flex items-center gap-2 cursor-pointer select-none",
          isOpen
            ? "bg-[#1f222d] border-[#383d4e] text-white shadow-sm"
            : "bg-[#14151a] hover:bg-[#1a1c23] border-[#262833] text-slate-200"
        )}
        title="Select AI Model & Inspect Latency Matrix"
      >
        <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
        <span className="font-semibold truncate max-w-[120px] sm:max-w-[170px]">
          {currentOption.name.replace(' Versatile', '').replace(' Instant', '')}
        </span>

        {/* Real-time telemetry snippet if available */}
        {lastTelemetry?.tokensPerSec ? (
          <span className="hidden lg:inline text-[10px] font-mono tabular-nums text-slate-400">
            · {Math.round(lastTelemetry.tokensPerSec)} t/s
          </span>
        ) : (
          <span className="hidden lg:inline text-[10px] font-mono tabular-nums text-slate-400">
            · {currentOption.speed}
          </span>
        )}

        <ChevronDown size={13} className={clsx("text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Flyout Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#14151a] border border-[#272a36] shadow-2xl p-2 z-50 text-white select-none animate-fadeIn">
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#222430] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-blue-400" />
              <span className="text-xs font-bold tracking-tight">AI Engine Matrix</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">2026 Router</span>
          </div>

          {/* Model Choices List */}
          <div className="py-1.5 space-y-1">
            {AVAILABLE_MODELS.map((model) => {
              const isSelected = selectedModel === model.id;
              return (
                <div
                  key={model.id}
                  onClick={() => {
                    onSelect(model.provider, model.id);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    "p-2.5 rounded-xl cursor-pointer transition-all border",
                    isSelected
                      ? "bg-[#1d202b] border-[#383d4f] text-white"
                      : "bg-transparent border-transparent hover:bg-[#181a22] text-slate-300 hover:text-white"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">{model.name}</span>
                        {isSelected && (
                          <span className="text-[10px] text-blue-400 font-mono flex items-center gap-0.5">
                            <Check size={11} className="stroke-[3]" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {model.tagline}
                      </p>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {model.recommendedFor}
                      </p>
                    </div>

                    <div className="text-right shrink-0 font-mono tabular-nums text-[10px]">
                      <div className="text-slate-300 font-medium">{model.speed}</div>
                      <div className="text-slate-500 mt-0.5">{model.latencyBadge}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Precision Controls Section (Temperature & Sampling) */}
          <div className="p-3 bg-[#101116] rounded-xl border border-[#222430] mt-1 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders size={12} className="text-slate-400" />
                Temperature (Creativity)
              </span>
              <span className="font-mono tabular-nums text-slate-400 text-[10px]">
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
              className="w-full accent-blue-500 h-1 bg-[#232633] rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>0.0 (Strict Code)</span>
              <span>0.6 (Balanced)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
