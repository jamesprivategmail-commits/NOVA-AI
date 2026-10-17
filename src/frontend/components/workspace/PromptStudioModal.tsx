import React, { useState } from 'react';
import { X, Sliders, Sparkles, ShieldCheck, Zap, Lock, Database, FileText, Check } from 'lucide-react';
import { clsx } from 'clsx';

export interface PromptPreset {
  id: string;
  name: string;
  tagline: string;
  icon: React.ReactNode;
  prompt: string;
}

export const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: 'architect',
    name: 'Senior Architect & Tech Lead',
    tagline: 'High cohesion, strict typing, scalable patterns & zero bloat',
    icon: <ShieldCheck size={16} className="text-blue-400" />,
    prompt: 'You are a Senior Principal Software Architect. Prioritize robust type safety, zero dead code, clean functional separation of concerns, and defensive error boundaries. Explain architectural rationale concisely before code.'
  },
  {
    id: 'prototyper',
    name: 'Full-Stack Speed Prototyper',
    tagline: 'Working functional code fast, modern 2026 ergonomics',
    icon: <Zap size={16} className="text-amber-400" />,
    prompt: 'You are a rapid Full-Stack Prototyping engineer. Deliver working, turnkey code on the first attempt with zero placeholder stubs. Favor pragmatic, readable modern JavaScript/TypeScript and Tailwind CSS.'
  },
  {
    id: 'security',
    name: 'Offensive & Defensive Security Auditor',
    tagline: 'Zero-trust auditing, XSS/CSRF prevention, credential safety',
    icon: <Lock size={16} className="text-rose-400" />,
    prompt: 'You are a Lead Application Security Auditor. Rigorously inspect for injection flaws, authentication bypasses, insecure deserialization, and secret leaks. Always mandate principle of least privilege.'
  },
  {
    id: 'data-engineer',
    name: 'Data & Machine Learning Specialist',
    tagline: 'Vectorized computing, pipeline throughput, algorithmic precision',
    icon: <Database size={16} className="text-emerald-400" />,
    prompt: 'You are a Senior Data Systems & ML Engineer. Emphasize algorithmic complexity O(n), vectorized operations, memory-efficient data structures, and reproducible mathematical logic.'
  },
  {
    id: 'technical-writer',
    name: 'Clean Technical Writer & Educator',
    tagline: 'Concise scannable prose, real diagrams, no filler words',
    icon: <FileText size={16} className="text-purple-400" />,
    prompt: 'You are a Lead Technical Writer. Write scannable, crystal-clear explanations with bullet points and concrete examples. Avoid conversational filler, marketing hype, and repetition.'
  }
];

interface PromptStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt: string;
  onSavePrompt: (prompt: string) => void;
}

export function PromptStudioModal({
  isOpen,
  onClose,
  currentPrompt,
  onSavePrompt,
}: PromptStudioModalProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    const match = PROMPT_PRESETS.find(p => p.prompt === currentPrompt);
    return match ? match.id : 'custom';
  });
  const [customText, setCustomText] = useState(currentPrompt || PROMPT_PRESETS[0].prompt);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: PromptPreset) => {
    setSelectedPresetId(preset.id);
    setCustomText(preset.prompt);
  };

  const handleSave = () => {
    onSavePrompt(customText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn select-none">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#14151a] border border-[#272a38] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 text-white font-sans max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#222533] flex items-center justify-between bg-[#121319]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1f2230] border border-[#303548] flex items-center justify-center text-amber-400">
              <Sliders size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Prompt Engineering Studio</span>
                <span className="text-[10px] font-mono text-slate-500">2026 Engine</span>
              </h3>
              <p className="text-xs text-slate-400">
                Select an expert AI Persona or craft custom system directives.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#202330] rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Preset Cards Grid */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Curated Expert Personas
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PROMPT_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={clsx(
                      "p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between",
                      isSelected
                        ? "bg-[#1f2333] border-blue-500 text-white shadow-sm"
                        : "bg-[#161822] hover:bg-[#1b1e2a] border-[#252837] text-slate-300"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {preset.icon}
                          <span className="text-xs font-bold">{preset.name}</span>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white">
                            <Check size={10} className="stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {preset.tagline}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Prompt Text Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Active System Directive Prompt
              </label>
              <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                {customText.length} characters
              </span>
            </div>
            <textarea
              rows={5}
              value={customText}
              onChange={(e) => {
                setCustomText(e.target.value);
                setSelectedPresetId('custom');
              }}
              className="w-full p-3.5 bg-[#0e0f14] border border-[#232635] rounded-xl text-slate-200 text-xs font-mono leading-relaxed focus:outline-none resize-none focus:border-blue-500"
              placeholder="Enter custom instructions for how VOID AI responds..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#111218] border-t border-[#222533] flex items-center justify-between">
          <button
            onClick={() => handleSelectPreset(PROMPT_PRESETS[0])}
            className="text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Reset to Default
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-[#1f2230] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            >
              Apply to Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
