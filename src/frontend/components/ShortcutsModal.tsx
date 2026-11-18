import React from 'react';
import { Keyboard, X } from 'lucide-react';

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Global',
    items: [
      ['⌘ K', 'Open command palette'],
      ['⌘ E', 'Toggle code workspace'],
      ['⌘ T', 'Toggle terminal'],
      ['?', 'Show this shortcut guide'],
    ],
  },
  {
    title: 'Messaging',
    items: [
      ['Enter', 'Send message'],
      ['Shift + Enter', 'New line'],
      ['Esc', 'Stop generation / close overlays'],
    ],
  },
];

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="glass-strong rounded-2xl w-full max-w-md p-5 animate-riseIn"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-soft)', boxShadow: '0 0 14px -4px var(--accent-glow)' }}
            >
              <Keyboard size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <h2 className="font-display text-base font-semibold text-white">Keyboard shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {GROUPS.map(group => (
            <div key={group.title}>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map(([keys, desc]) => (
                  <div
                    key={keys}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="text-xs text-slate-300">{desc}</span>
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
