import React, { useEffect, useRef, useState } from 'react';
import { Palette, Check, Sun, Moon } from 'lucide-react';
import { clsx } from 'clsx';

const ACCENTS = [
  { id: 'clay', label: 'Warm Clay', color: '#c87f60' },
  { id: 'amber', label: 'Honey Amber', color: '#d49b4b' },
  { id: 'sage', label: 'Forest Sage', color: '#7ea47c' },
  { id: 'plum', label: 'Velvet Plum', color: '#a87c9d' },
  { id: 'slate', label: 'Slate Dusk', color: '#6e8ba8' },
] as const;

const SIZES = [
  { id: 'compact', label: 'Compact', scale: 0.94 },
  { id: 'default', label: 'Default', scale: 1 },
  { id: 'large', label: 'Large', scale: 1.1 },
] as const;

export function applyAppearance() {
  const accent = localStorage.getItem('void_ai_accent') || 'clay';
  const size = localStorage.getItem('void_ai_font_scale') || 'default';
  const mode = localStorage.getItem('void_ai_theme_mode') || 'light';
  document.documentElement.dataset.accent = accent;
  document.documentElement.classList.toggle('dark', mode === 'dark');
  const found = SIZES.find(s => s.id === size);
  document.documentElement.style.setProperty('--font-scale', String(found?.scale ?? 1));
}

export function AppearanceMenu() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('void_ai_theme_mode') === 'dark' ? 'dark' : 'light')
  );
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

  const pickMode = (nextMode: 'light' | 'dark') => {
    setMode(nextMode);
    localStorage.setItem('void_ai_theme_mode', nextMode);
    applyAppearance();
  };

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
        type="button"
        onClick={() => setOpen(o => !o)}
        className={clsx(
          "w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer glass",
          open
            ? "glow-ring text-[var(--text-primary)]"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        )}
        title="Appearance: Glass theme, accent & typography"
      >
        <Palette size={15} style={{ color: open ? 'var(--accent)' : undefined }} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-64 glass-thick rounded-2xl p-4 z-50 animate-riseIn text-[var(--text-primary)]">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Liquid Glass Surface
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            <button
              type="button"
              onClick={() => pickMode('light')}
              className={clsx(
                "py-2 px-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border",
                mode === 'light'
                  ? "text-[var(--text-primary)] shadow-sm"
                  : "bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
              )}
              style={mode === 'light' ? { background: 'var(--accent-soft)', borderColor: 'var(--accent-muted)' } : undefined}
            >
              <Sun size={13} style={{ color: mode === 'light' ? 'var(--accent)' : undefined }} />
              <span>Warm Ivory</span>
            </button>
            <button
              type="button"
              onClick={() => pickMode('dark')}
              className={clsx(
                "py-2 px-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border",
                mode === 'dark'
                  ? "text-[var(--text-primary)] shadow-sm"
                  : "bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
              )}
              style={mode === 'dark' ? { background: 'var(--accent-soft)', borderColor: 'var(--accent-muted)' } : undefined}
            >
              <Moon size={13} style={{ color: mode === 'dark' ? 'var(--accent)' : undefined }} />
              <span>Obsidian</span>
            </button>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Warm Accent
          </div>
          <div className="flex items-center justify-between gap-2 mb-4">
            {ACCENTS.map(a => (
              <button
                type="button"
                key={a.id}
                onClick={() => pickAccent(a.id)}
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border-2",
                  accent === a.id
                    ? "border-[var(--text-primary)] scale-105 shadow-md"
                    : "border-white/40 hover:scale-105"
                )}
                style={{ background: a.color }}
                title={a.label}
              >
                {accent === a.id && <Check size={13} className="text-white drop-shadow" strokeWidth={3} />}
              </button>
            ))}
          </div>

          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Text Scale
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {SIZES.map(s => (
              <button
                type="button"
                key={s.id}
                onClick={() => pickSize(s.id)}
                className={clsx(
                  "py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer border",
                  size === s.id
                    ? "text-[var(--text-primary)]"
                    : "bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
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
