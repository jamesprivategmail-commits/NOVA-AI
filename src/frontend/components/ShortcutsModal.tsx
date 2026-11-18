import React from 'react';
import { Keyboard, X } from 'lucide-react';

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Global Navigation',
    items: [
      ['⌘ K', 'Open command palette'],
      ['⌘ E', 'Toggle code workspace'],
      ['⌘ T', 'Toggle terminal'],
      ['?', 'Show keyboard shortcuts'],
    ],
  },
  {
    title: 'Conversation',
    items: [
      ['Enter', 'Send message'],
      ['Shift + Enter', 'Insert new line'],
      ['Esc', 'Stop generation or close overlays'],
    ],
  },
];

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/55 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="glass-thick rounded-3xl w-full max-w-md p-5 text-[var(--text-primary)] animate-riseIn"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--accent-muted)]"
              style={{ background: 'var(--accent-soft)' }}
            >
              <Keyboard size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">Keyboard Shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {GROUPS.map(group => (
            <div key={group.title}>
              <div className="section-label mb-1.5 px-1">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map(([keys, desc]) => (
                  <div
                    key={keys}
                    className="flex items-center justify-between py-2 px-3 rounded-xl glass-subtle"
                  >
                    <span className="text-xs font-medium text-[var(--text-secondary)]">{desc}</span>
                    <span className="flex gap-1">
                      {keys.split(' + ').map(k => (
                        <kbd key={k} className="kbd">{k}</kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
