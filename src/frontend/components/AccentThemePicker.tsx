import React, { useEffect, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { clsx } from 'clsx';

const ACCENTS = [
  { id: 'violet', label: 'Nova Violet', swatch: '#8b7cff' },
  { id: 'ember', label: 'Ember', swatch: '#ff7847' },
  { id: 'mint', label: 'Signal Mint', swatch: '#3ddc97' },
  { id: 'rose', label: 'Pulse Rose', swatch: '#ff6b9d' },
] as const;

export type AccentId = (typeof ACCENTS)[number]['id'];

const STORAGE_KEY = 'nova_accent';

export function applyStoredAccent(): void {
  if (typeof document === 'undefined') return;
  const stored = localStorage.getItem(STORAGE_KEY) as AccentId | null;
  if (stored && ACCENTS.some((a) => a.id === stored)) {
    document.documentElement.dataset.accent = stored;
  }
}

interface AccentThemePickerProps {
  /** Render as a compact popover anchored to a palette button (default). */
  className?: string;
}

/**
 * Accent theme picker: retints the whole Nova UI live by flipping the
 * [data-accent] attribute the design-system CSS keys off. Choice persists
 * in localStorage and re-applies on boot.
 */
export function AccentThemePicker({ className }: AccentThemePickerProps) {
  const [open, setOpen] = useState(false);
  const [accent, setAccent] = useState<AccentId>('violet');

  useEffect(() => {
    applyStoredAccent();
    const stored = localStorage.getItem(STORAGE_KEY) as AccentId | null;
    if (stored && ACCENTS.some((a) => a.id === stored)) setAccent(stored);
  }, []);

  const choose = (id: AccentId) => {
    setAccent(id);
    localStorage.setItem(STORAGE_KEY, id);
    document.documentElement.dataset.accent = id;
    setOpen(false);
  };

  return (
    <div className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="nova-icon-btn"
        title="Accent theme"
        aria-label="Choose accent theme"
        aria-expanded={open}
      >
        <Palette size={17} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-48 nova-glass-strong rounded-xl p-1.5 animate-fadeIn">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--nova-text-3)]">
              Accent
            </div>
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => choose(a.id)}
                className={clsx(
                  'w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                  accent === a.id
                    ? 'bg-white/[0.07] text-white'
                    : 'text-[var(--nova-text-2)] hover:bg-white/[0.05] hover:text-white'
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                    style={{ background: `linear-gradient(135deg, ${a.swatch}, ${a.swatch}cc)` }}
                  />
                  {a.label}
                </span>
                {accent === a.id && <Check size={13} className="text-[var(--nova-accent)]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
