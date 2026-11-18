import React, { useState } from 'react';
import { X, Sliders, ShieldCheck, Zap, Lock, Database, FileText, Check } from 'lucide-react';
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
    tagline: 'High cohesion, strict typing, scalable architecture & complete delivery',
    icon: <ShieldCheck size={16} style={{ color: 'var(--accent)' }} />,
    prompt: 'You are a Senior Principal Software Architect. Prioritize clean type safety, zero dead code, thoughtful separation of concerns, and complete end-to-end delivery without omitting implementation details.'
  },
  {
    id: 'prototyper',
    name: 'Full-Stack Speed Prototyper',
    tagline: 'Production-ready working code on first pass with zero stubs',
    icon: <Zap size={16} className="text-amber-500" />,
    prompt: 'You are a rapid Full-Stack Prototyping engineer. Deliver working, turnkey code on the first attempt with zero placeholder stubs. Favor clean modern TypeScript and Tailwind CSS.'
  },
  {
    id: 'security',
    name: 'Application Security Auditor',
    tagline: 'Zero-trust inspection, XSS/CSRF prevention, least-privilege design',
    icon: <Lock size={16} className="text-rose-500" />,
    prompt: 'You are a Lead Application Security Auditor. Rigorously inspect for injection flaws, authentication bypasses, insecure deserialization, and credential leaks. Mandate principle of least privilege.'
  },
  {
    id: 'data-engineer',
    name: 'Algorithms & Systems Specialist',
    tagline: 'Algorithmic efficiency, streaming throughput, mathematical rigor',
    icon: <Database size={16} className="text-emerald-500" />,
    prompt: 'You are a Senior Systems & Data Engineer. Emphasize algorithmic clarity, memory-efficient data structures, and verifiable step-by-step logic.'
  },
  {
    id: 'technical-writer',
    name: 'Precision Writer & Mentor',
    tagline: 'Crisp scannable structure, concrete examples, zero fluff',
    icon: <FileText size={16} className="text-purple-500" />,
    prompt: 'You are a Lead Technical Writer & Mentor. Write clear, scannable explanations with concrete examples and direct answers. Avoid filler words and unnecessary repetition.'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-md animate-fadeIn select-none">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl glass-thick rounded-3xl overflow-hidden flex flex-col z-10 text-[var(--text-primary)] font-sans max-h-[90vh] animate-riseIn">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl border border-[var(--accent-muted)] flex items-center justify-center"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <Sliders size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>Prompt & Directive Studio</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Session Rules</span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Pair an expert role directive with your active Muse character.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="block section-label mb-2">
              Specialist Directives
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PROMPT_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    type="button"
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={clsx(
                      "p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between text-left",
                      isSelected
                        ? "text-[var(--text-primary)] shadow-sm"
                        : "glass-subtle text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                    style={isSelected ? { background: 'var(--accent-soft)', borderColor: 'var(--accent-muted)' } : undefined}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {preset.icon}
                          <span className="text-xs font-bold">{preset.name}</span>
                        </div>
                        {isSelected && (
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-white"
                            style={{ background: 'var(--accent)' }}
                          >
                            <Check size={10} className="stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {preset.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="section-label">
                Custom Directive Prompt
              </label>
              <span className="text-[10px] font-mono text-[var(--text-muted)] tabular-nums">
                {customText.length} chars
              </span>
            </div>
            <textarea
              rows={5}
              value={customText}
              onChange={(e) => {
                setCustomText(e.target.value);
                setSelectedPresetId('custom');
              }}
              className="w-full p-3.5 bg-[var(--bg-2)] border border-[var(--line)] focus:border-[var(--accent-muted)] rounded-2xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-xs font-mono leading-relaxed focus:outline-none resize-none"
              placeholder="Enter custom instructions for your Muse companion..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[var(--line)] glass-subtle flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleSelectPreset(PROMPT_PRESETS[0])}
            className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Reset to Default
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost px-3.5 py-2 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary px-4 py-2 text-xs"
            >
              Apply Directive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
