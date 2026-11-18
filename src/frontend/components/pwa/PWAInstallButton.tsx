import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { clsx } from 'clsx';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  className,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => {
          void install();
        }}
        className={clsx(
          'btn btn-ghost rounded-full text-xs whitespace-nowrap transition-all cursor-pointer',
          compact ? 'h-9 px-2.5 sm:px-3' : 'h-9 px-3.5',
          className
        )}
        title="Install NOVA AI as an app"
      >
        <Download size={14} style={{ color: 'var(--accent)' }} />
        <span className={compact ? 'hidden sm:inline' : ''}>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={clsx(
            'btn btn-ghost rounded-full text-xs whitespace-nowrap transition-all cursor-pointer',
            compact ? 'h-9 px-2.5 sm:px-3' : 'h-9 px-3.5',
            className
          )}
          title="Install NOVA AI on iPhone / iPad"
        >
          <Download size={14} style={{ color: 'var(--accent)' }} />
          <span className={compact ? 'hidden sm:inline' : ''}>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm glass-thick rounded-3xl p-6 text-[var(--text-primary)] shadow-[var(--shadow-lg)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/pwa-192x192.png"
                    alt="NOVA AI"
                    className="w-9 h-9 rounded-xl object-cover border border-[var(--line-strong)]"
                  />
                  <div>
                    <h3 className="text-sm font-semibold">Install NOVA AI</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">Add to iOS Home Screen</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="w-8 h-8 rounded-xl glass flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  aria-label="Close install instructions"
                >
                  <X size={15} />
                </button>
              </div>

              <ol className="space-y-2.5 text-xs text-[var(--text-secondary)] leading-relaxed my-4">
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-[var(--accent)]">1.</span>
                  <span>
                    Tap the <strong className="text-[var(--text-primary)] inline-flex items-center gap-1">Share <Share size={12} /></strong> button in Safari&apos;s toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-[var(--accent)]">2.</span>
                  <span>
                    Scroll down and select <strong className="text-[var(--text-primary)]">Add to Home Screen</strong>.
                  </span>
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="btn btn-primary w-full py-2.5 text-xs font-semibold rounded-2xl cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
