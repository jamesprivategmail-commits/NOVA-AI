import React from 'react';
import { NovaOrb } from './NovaOrb';
import { getPersona, type NovaPersona } from '../models/personas';

const STEPS = ['Understanding your question', 'Gathering context', 'Composing a response'];

export function ThinkingIndicator({ persona }: { persona?: NovaPersona }) {
  const activePersona = persona || getPersona(
    (typeof localStorage !== 'undefined' && localStorage.getItem('void_ai_selected_provider')) || 'groq',
    (typeof localStorage !== 'undefined' && localStorage.getItem('void_ai_selected_model')) || 'auto'
  );
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => {
      setStep(s => (s + 1) % STEPS.length);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="w-full py-3 px-3 sm:px-4 animate-fadeIn">
      <div className="max-w-3xl mx-auto flex gap-2.5 items-start">
        {/* Nova mascot — thinking state */}
        <NovaOrb size={36} state="thinking" label={activePersona.name} className="shrink-0 mt-0.5" />

        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="presence-dot" aria-hidden="true" />
            <span className="text-xs font-medium text-slate-200">{activePersona.name}</span>
            <span className="text-[11px] text-slate-500">is thinking</span>
          </div>

          {/* Staged reasoning steps — calm fade between stages */}
          <div className="thinking-steps flex flex-col gap-1" aria-live="polite">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className="flex items-center gap-2 transition-opacity duration-500"
                style={{ opacity: i === step ? 0.95 : i === (step + STEPS.length - 1) % STEPS.length ? 0.4 : 0.15 }}
              >
                <span
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{ background: i <= step ? 'var(--accent)' : 'rgba(245,240,230,0.3)' }}
                />
                <span className="text-xs text-[#6B6A67]">{label}</span>
              </div>
            ))}
          </div>

          {/* Gentle breathing dots */}
          <div className="flex items-center gap-1 py-0.5">
            {[0, 200, 400].map(delay => (
              <span
                key={delay}
                className="w-1.5 h-1.5 rounded-full bg-slate-400"
                style={{ animation: 'dot-breathe 1.4s ease-in-out infinite', animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
