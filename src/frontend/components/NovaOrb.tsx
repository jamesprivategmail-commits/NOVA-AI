import React from 'react';
import { clsx } from 'clsx';

export type NovaOrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface NovaOrbProps {
  /** idle = gentle breathing/float, listening = soft pulse, thinking = orbiting particles + ripple, speaking = shimmer */
  state?: NovaOrbState;
  /** Rendered pixel size (square). Defaults to 64. */
  size?: number;
  className?: string;
  /** Accessible label, e.g. "Nova" */
  label?: string;
}

/**
 * Nova — the assistant's mascot. A calm, elegant breathing orb with a quiet
 * face. Not sci-fi neon: warm charcoal core, one muted accent, soft light.
 * Fully theme-aware — every color comes from the CSS accent vars, so it
 * recolors with the appearance switcher. Pure component; persists nothing.
 */
export function NovaOrb({ state = 'idle', size = 64, className, label = 'Nova' }: NovaOrbProps) {
  const stateClass = `nova-orb--${state}`;

  return (
    <div
      role="img"
      aria-label={label}
      className={clsx('nova-orb', stateClass, className)}
      style={{ width: size, height: size }}
    >
      {/* Ripple rings — thinking */}
      {(state === 'thinking' || state === 'listening') && (
        <>
          <span className="nova-orb__ripple" />
          <span className="nova-orb__ripple nova-orb__ripple--2" />
        </>
      )}

      <svg viewBox="0 0 100 100" width={size} height={size} className="nova-orb__svg">
        <defs>
          <radialGradient id="novaCore" cx="42%" cy="36%" r="72%">
            <stop offset="0%" stopColor="rgba(245,240,230,0.32)" />
            <stop offset="38%" stopColor="rgba(245,240,230,0.10)" />
            <stop offset="72%" stopColor="var(--accent-soft)" />
            <stop offset="100%" stopColor="var(--accent-muted)" />
          </radialGradient>
          <radialGradient id="novaGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-soft)" />
            <stop offset="70%" stopColor="var(--accent-muted)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <linearGradient id="novaShimmer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(245,240,230,0.35)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Ambient halo */}
        <circle cx="50" cy="50" r="48" fill="url(#novaGlow)" className="nova-orb__halo" opacity="0.55" />

        {/* Orbiting particles — thinking only */}
        {state === 'thinking' && (
          <g className="nova-orb__orbit">
            {[0, 120, 240].map(deg => (
              <circle
                key={deg}
                cx="50"
                cy="8"
                r="2.6"
                fill="var(--accent)"
                transform={`rotate(${deg} 50 50)`}
                opacity="0.85"
              />
            ))}
          </g>
        )}

        {/* Core orb */}
        <g className="nova-orb__body">
          <circle cx="50" cy="50" r="30" fill="url(#novaCore)" />
          {/* rim light */}
          <circle cx="50" cy="50" r="30" fill="none" stroke="var(--accent-muted)" strokeWidth="1.4" opacity="0.9" />
          {/* soft inner highlight */}
          <ellipse cx="41" cy="38" rx="10" ry="6.5" fill="rgba(245,240,230,0.14)" />

          {/* The face — two quiet eyes + a gentle mouth */}
          <g className="nova-orb__face">
            <ellipse cx="41" cy="47" rx="2.5" ry={state === 'listening' ? 4.4 : 3.1} fill="var(--accent)" opacity="0.95" />
            <ellipse cx="59" cy="47" rx="2.5" ry={state === 'listening' ? 4.4 : 3.1} fill="var(--accent)" opacity="0.95" />
            {/* mouth — small calm arc */}
            <path
              d="M44 58 Q50 62 56 58"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.8"
              className={state === 'speaking' ? 'nova-orb__mouth' : undefined}
            />
          </g>

          {/* Speaking shimmer sweep */}
          {state === 'speaking' && (
            <g className="nova-orb__shimmer">
              <rect x="-20" y="18" width="18" height="64" rx="9" fill="url(#novaShimmer)" opacity="0.8" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
