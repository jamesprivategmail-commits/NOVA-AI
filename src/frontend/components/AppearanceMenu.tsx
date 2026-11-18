import React, { useEffect, useRef, useState } from 'react';
import { Palette, Check, Type } from 'lucide-react';
import { clsx } from 'clsx';

const ACCENTS = [
  { id: 'clay', label: 'Clay', color: '#c88468' },
  { id: 'sage', label: 'Sage', color: '#9aab89' },
  { id: 'slate', label: 'Slate', color: '#8fa3b8' },
  { id: 'plum', label: 'Plum', color: '#b18ca8' },
  { id: 'amber', label: 'Amber', color: '#c8a86b' },
] as const;

const SIZES = [
  { id: 'compact', label: 'Compact', scale: 0.94 },
  { id: 'default', label: 'Default', scale: 1 },
  { id: 'large', label: 'Large', scale: 1.1 },
] as const;

export function applyAppearance() {
  const accent = localStorage.getItem('void_ai_accent') || 'clay';
  const size = localStorage.getItem('void_ai_font_scale') || 'default';
  document.documentElement.dataset.accent = accent;
  const found = SIZES.find(s => s.id === size);
  document.documentElement.style.setProperty('--font-scale', String(found?.scale ?? 1));
}

export function AppearanceMenu() {
  const [open, setOpen] = useState(false);
  const [accent, setAccent] = useState(() => localStorage.getItem('void_ai_accent') || 'clay');
  const [size, setSize] = useState(() => localStorage.getItem('void_ai_font_scale') || 'default');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyAppearance();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const pickAccent = (id: string) => {
    setAccent(id);
    localStorage.setItem('void_ai_accent', id);
    applyAppearance();
  };

  const pickSize = (id: string) => {
    setSize(id);
    localStorage.setItem('void_ai_font_scale', id);
    applyAppearance();
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          "w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer",
          open
            ? "glow-ring text-[#1F1E1D]"
            : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-[#6B6A67] hover:text-[#1F1E1D]"
        )}
        title="Appearance: accent color & text size"
      >
        <Palette size={15} style={{ color: open ? 'var(--accent)' : undefined }} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-60 glass-strong rounded-2xl p-3.5 z-50 animate-riseIn">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6B6A67] mb-2">Accent</div>
          <div className="flex items-center gap-2 mb-4">
            {ACCENTS.map(a => (
              <button
                key={a.id}
                onClick={() => pickAccent(a.id)}
                className={clsx(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border",
                  accent === a.id ? "border-white/70" : "border-transparent hover:border-white/20"
                )}
                style={{ background: a.color }}
                title={a.label}
              >
                {accent === a.id && <Check size={13} className="text-black/70" strokeWidth={3} />}
              </button>
            ))}
          </div>

          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6B6A67] mb-2">Text size</div>
          <div className="grid grid-cols-3 gap-1.5">
            {SIZES.map(s => (
              <button
                key={s.id}
                onClick={() => pickSize(s.id)}
                className={clsx(
                  "py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer border",
                  size === s.id
                    ? "text-[#1F1E1D]"
                    : "bg-white/[0.04] border-transparent text-[#6B6A67] hover:text-[#1F1E1D]"
                )}
                style={size === s.id ? { background: 'var(--accent-soft)', borderColor: 'var(--accent-muted)' } : undefined}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
