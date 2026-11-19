import React from 'react';
import { NovaOrb } from './NovaOrb';
import { getPersona, type NovaPersona } from '../models/personas';

const STEPS = [
  'Reading full conversation thread',
  'Synthesizing architectural plan',
  'Composing complete response'
];

export function ThinkingIndicator({ persona }: { persona?: NovaPersona }) {
  const activePersona = persona || getPersona(
    (typeof localStorage !== 'undefined' && localStorage.getItem('void_ai_selected_provider')) || 'groq',
    (typeof localStorage !== 'undefined' && localStorage.getItem('void_ai_selected_model')) || 'qwen/qwen3.8-27b',
    (typeof localStorage !== 'undefined' && localStorage.getItem('void_ai_selected_persona')) || undefined
  );
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => {
      setStep(s => (s + 1) % STEPS.length);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="w-full py-3 px-3 sm:px-5 animate-fadeIn">
      <div className="max-w-3xl mx-auto flex gap-3 items-start">
        <NovaOrb
          size={38}
          state="thinking"
          persona={activePersona}
          label={activePersona.name}
          className="shrink-0 mt-0.5"
        />

        <div className="flex flex-col gap-2 glass-strong px-4 py-3 rounded-2xl min-w-[230px]">
          <div className="flex items-center gap-2">
            <span className="presence-dot" aria-hidden="true" />
            <span className="text-xs font-bold text-[var(--text-primary)]">{activePersona.name}</span>
            <span className="text-[11px] text-[var(--text-muted)]">is working on it</span>
          </div>

          <div className="thinking-steps flex flex-col gap-1" aria-live="polite">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className="flex items-center gap-2 transition-opacity duration-500"
                style={{ opacity: i === step ? 0.95 : i === (step + STEPS.length - 1) % STEPS.length ? 0.45 : 0.2 }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: i <= step ? 'var(--accent)' : 'var(--text-muted)' }}
                />
                <span className="text-[11px] font-medium text-[var(--text-secondary)]">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            {[0, 200, 400].map(delay => (
              <span
                key={delay}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: 'var(--accent)',
                  animation: 'dot-breathe 1.4s ease-in-out infinite',
                  animationDelay: `${delay}ms`
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
