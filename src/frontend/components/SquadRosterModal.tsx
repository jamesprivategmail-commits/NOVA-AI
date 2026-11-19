import React from 'react';
import { X, Users, Check, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { NOVA_PERSONAS, type NovaPersona } from '../models/personas';
import { NovaOrb } from './NovaOrb';

interface SquadRosterModalProps {
  selectedIds: string[];
  onChangeSquad: (ids: string[]) => void;
  onClose: () => void;
}

const SQUAD_PRESETS: { name: string; subtitle: string; ids: string[] }[] = [
  {
    name: 'Core Engineering Squad',
    subtitle: 'Shii + Shiia + Lyra + Sora',
    ids: ['shii', 'shiia', 'lyra', 'sora'],
  },
  {
    name: 'Research & Strategy Squad',
    subtitle: 'Muse Prime + Shiia + Lyra + Kael',
    ids: ['muse-prime', 'shiia', 'lyra', 'kael'],
  },
  {
    name: 'Ultra-Fast Parallel Build',
    subtitle: 'Shii + Muse Prime + Sora + Kael',
    ids: ['shii', 'muse-prime', 'sora', 'kael'],
  },
];

export function SquadRosterModal({ selectedIds, onChangeSquad, onClose }: SquadRosterModalProps) {
  const toggleMember = (id: string) => {
    const exists = selectedIds.includes(id);
    if (exists) {
      if (selectedIds.length <= 2) return; // Keep meaningful roster while editing
      onChangeSquad(selectedIds.filter((x) => x !== id));
    } else {
      if (selectedIds.length >= 4) {
        onChangeSquad([...selectedIds.slice(1), id]);
      } else {
        onChangeSquad([...selectedIds, id]);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-[28px] muse-glass-panel p-5 sm:p-6 space-y-5 text-[var(--text-primary)] animate-riseIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0"
              style={{ background: 'var(--accent)' }}
            >
              <Users size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold leading-tight">
                4-Model Collaboration Squad
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Pick 4 Muse models ({selectedIds.length}/4 active). They discuss together, split tasks in parallel, and synthesize one complete output.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost w-9 h-9 !p-0 rounded-full shrink-0"
            title="Close squad roster"
          >
            <X size={16} />
          </button>
        </div>

        {/* Presets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SQUAD_PRESETS.map((preset) => {
            const isMatch =
              preset.ids.length === selectedIds.length &&
              preset.ids.every((id) => selectedIds.includes(id));
            return (
              <button
                type="button"
                key={preset.name}
                onClick={() => onChangeSquad(preset.ids)}
                className={clsx(
                  'p-2.5 rounded-2xl border text-left transition-all cursor-pointer',
                  isMatch ? 'glass-thick' : 'glass hover:border-[var(--line-strong)]'
                )}
                style={isMatch ? { borderColor: 'var(--accent-muted)', background: 'var(--accent-soft)' } : undefined}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                  <Sparkles size={11} style={{ color: 'var(--accent)' }} />
                  <span className="truncate">{preset.name}</span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                  {preset.subtitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* All 6 Muse Personas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[46vh] overflow-y-auto pr-0.5">
          {NOVA_PERSONAS.map((p: NovaPersona) => {
            const isSelected = selectedIds.includes(p.id);
            const seatNum = selectedIds.indexOf(p.id) + 1;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => toggleMember(p.id)}
                className={clsx(
                  'p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3',
                  isSelected ? 'glass-thick' : 'glass hover:border-[var(--line-strong)]'
                )}
                style={isSelected ? { borderColor: 'var(--accent-muted)', background: 'var(--accent-soft)' } : undefined}
              >
                <NovaOrb size={42} persona={p} shape="circle" className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {p.name}
                    </span>
                    {isSelected ? (
                      <span
                        className="text-[10px] font-mono font-bold flex items-center gap-0.5 shrink-0"
                        style={{ color: 'var(--accent)' }}
                      >
                        <Check size={11} className="stroke-[3]" /> Seat {seatNum}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">Tap to add</span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] truncate">
                    {p.role}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)] truncate mt-0.5">
                    {p.engine}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary h-10 px-5 rounded-full text-xs"
          >
            Done ({selectedIds.length} Selected)
          </button>
        </div>
      </div>
    </div>
  );
}
