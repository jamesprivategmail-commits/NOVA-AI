import React, { useState } from 'react';
import { ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';

interface TermsModalProps {
  onAccept: () => void;
  onDecline?: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ onAccept, onDecline }) => {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl glass-thick rounded-3xl flex flex-col max-h-[92vh] overflow-hidden text-[var(--text-primary)] animate-riseIn">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[var(--line)] flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl border border-[var(--accent-muted)] flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)] tracking-tight">
              NOVA Muse Workspace Terms
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Responsible engineering, research, and autonomous development guidelines
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto text-xs text-[var(--text-primary)] space-y-4 leading-relaxed">
          <div className="p-3.5 glass-subtle rounded-2xl text-[var(--text-primary)] font-medium text-center">
            NOVA AI & Muse characters are engineered for software development, systems research, design, and ethical automation.
          </div>

          <div className="space-y-1.5">
            <div className="section-label" style={{ color: 'var(--accent)' }}>
              Educational & Authorized Research
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Security concepts, diagnostics, and technical analyses are provided strictly for education, defense hardening, and authorized testing environments.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="section-label" style={{ color: 'var(--accent)' }}>
              Prohibited Activities
            </div>
            <ul className="list-disc list-inside space-y-1 text-[var(--text-secondary)]">
              <li>Never target real individuals or unauthorized infrastructure.</li>
              <li>Never use automation tools for unauthorized access or disruption.</li>
              <li>Never generate deceptive campaigns for fraud or harm.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <div className="section-label" style={{ color: 'var(--accent)' }}>
              User Responsibility
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              You are responsible for ensuring all code, research, and integrations executed from this workspace comply with applicable laws and authorized permissions.
            </p>
          </div>

          <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-muted)] font-medium">Project Portal</span>
            <a
              href="https://home-of-void.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold flex items-center gap-1 hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              home-of-void.netlify.app
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 glass-subtle border-t border-[var(--line)] space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
              style={{ accentColor: 'var(--accent)' }}
            />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              I understand and agree to use NOVA AI responsibly and ethically.
            </span>
          </label>

          <div className="flex items-center gap-2.5">
            {onDecline && (
              <button
                type="button"
                onClick={onDecline}
                className="btn btn-ghost w-1/3 py-2.5 text-xs"
              >
                Decline
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsChecked(true);
                onAccept();
              }}
              className="btn btn-primary flex-1 py-2.5 text-xs"
            >
              <ShieldCheck size={16} />
              <span>Accept & Continue</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
