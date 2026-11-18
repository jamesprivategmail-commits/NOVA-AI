import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';

export type NovaOrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface NovaOrbProps {
  /** idle = breathing/float, listening = attentive pulse, thinking = orbit + ripple, speaking = lively shimmer */
  state?: NovaOrbState;
  /** Rendered pixel size (square). Defaults to 64. */
  size?: number;
  className?: string;
  /** Accessible label, e.g. "Nova" */
  label?: string;
}

/**
 * Nova — the assistant's mascot. A living, breathing orb with a gradient core,
 * soft glow and a quiet face. Motion is driven by the `motion` package so
 * states ease into each other instead of snapping. Every color comes from the
 * CSS accent vars, so it recolors with the appearance switcher. Pure
 * component; persists nothing.
 */
export function NovaOrb({ state = 'idle', size = 64, className, label = 'Nova' }: NovaOrbProps) {
  const stateClass = `nova-orb nova-orb--${state}`;

  // Per-state motion language
  const breathing = state === 'idle';
  const listening = state === 'listening';
  const thinking = state === 'thinking';
  const speaking = state === 'speaking';

  // Core breath: slow and deep when idle, brighter and tighter when engaged
  const breatheScale = breathing ? 1.045 : listening ? 1.08 : thinking ? 1.03 : 1.06;
  const breatheDuration = breathing ? 4.6 : listening ? 2.2 : thinking ? 3.6 : 1.6;
  // Halo glow: warm, wide, and alive
  const haloOpacity = breathing ? [0.35, 0.55, 0.35] : listening ? [0.5, 0.75, 0.5] : thinking ? [0.45, 0.6, 0.45] : [0.55, 0.8, 0.55];

  // Face: eyes widen to listen, half-close when thinking (deep in thought)
  const eyeRy = listening ? 4.6 : thinking ? 2.1 : speaking ? 3.4 : 3.1;

  return (
    <div
      role="img"
      aria-label={label}
      className={clsx(stateClass, className)}
      style={{ width: size, height: size }}
    >
      {/* Expanding ripple rings — listening & thinking */}
      {(listening || thinking) && (
        <>
          <motion.span
            className="nova-orb__ripple"
            initial={{ scale: 0.85, opacity: 0.5 }}
            animate={{ scale: 1.35, opacity: 0 }}
            transition={{ duration: 2.4, ease: 'easeOut', repeat: Infinity }}
          />
          <motion.span
            className="nova-orb__ripple nova-orb__ripple--2"
            initial={{ scale: 0.85, opacity: 0.5 }}
            animate={{ scale: 1.35, opacity: 0 }}
            transition={{ duration: 2.4, ease: 'easeOut', repeat: Infinity, delay: 1.2 }}
          />
        </>
      )}

      <svg viewBox="0 0 100 100" width={size} height={size} className="nova-orb__svg">
        <defs>
          {/* Gradient core — highlight, warm mid-tone, deep rim */}
          <radialGradient id="novaCore" cx="42%" cy="36%" r="72%">
            <stop offset="0%" stopColor="rgba(245,240,230,0.42)" />
            <stop offset="34%" stopColor="rgba(245,240,230,0.14)" />
            <stop offset="68%" stopColor="var(--accent-soft)" />
            <stop offset="100%" stopColor="var(--accent-muted)" />
          </radialGradient>
          {/* Inner depth sphere */}
          <radialGradient id="novaDepth" cx="50%" cy="58%" r="50%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="78%" stopColor="transparent" />
            <stop offset="100%" stopColor="var(--accent-muted)" />
          </radialGradient>
          <radialGradient id="novaGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-soft)" />
            <stop offset="62%" stopColor="var(--accent-muted)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <linearGradient id="novaShimmer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(245,240,230,0.38)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Ambient halo */}
        <motion.circle
          cx="50" cy="50" r="48" fill="url(#novaGlow)"
          className="nova-orb__halo"
          animate={{ opacity: haloOpacity }}
          transition={{ duration: breatheDuration, ease: 'easeInOut', repeat: Infinity }}
        />

        {/* Orbiting particles — thinking only */}
        <AnimatePresence>
          {thinking && (
            <motion.g
              key="orbit"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{
                opacity: { duration: 0.35 },
                scale: { duration: 0.35, ease: 'easeOut' },
                rotate: { duration: 7, ease: 'linear', repeat: Infinity },
              }}
              style={{ transformOrigin: '50px 50px' }}
            >
              {[
                { deg: 0, r: 2.6, o: 0.9 },
                { deg: 120, r: 2.0, o: 0.6 },
                { deg: 240, r: 2.6, o: 0.9 },
              ].map(({ deg, r, o }) => (
                <circle
                  key={deg}
                  cx="50" cy="8" r={r}
                  fill="var(--accent)"
                  opacity={o}
                  transform={`rotate(${deg} 50 50)`}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Core orb body */}
        <motion.g
          className="nova-orb__body"
          animate={{ scale: [1, breatheScale, 1], y: breathing ? [0, -2.5, 0] : 0 }}
          transition={{ duration: breatheDuration, ease: 'easeInOut', repeat: Infinity }}
          style={{ transformOrigin: '50px 50px' }}
        >
          <circle cx="50" cy="50" r="30" fill="url(#novaCore)" />
          {/* Depth shading — grounds the orb in space */}
          <circle cx="50" cy="50" r="30" fill="url(#novaDepth)" />
          {/* Rim light */}
          <circle cx="50" cy="50" r="29.4" fill="none" stroke="var(--accent-muted)" strokeWidth="1.4" opacity="0.9" />
          {/* Soft inner highlight */}
          <ellipse cx="41" cy="38" rx="10" ry="6.5" fill="rgba(245,240,230,0.16)" />

          {/* The face — two quiet eyes + a gentle mouth */}
          <g className="nova-orb__face">
            <motion.ellipse
              cx="41" cy="47" rx="2.5" fill="var(--accent)" opacity="0.95"
              animate={{ ry: eyeRy }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
            <motion.ellipse
              cx="59" cy="47" rx="2.5" fill="var(--accent)" opacity="0.95"
              animate={{ ry: eyeRy }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
            {/* mouth — calm arc; talks when speaking, else gentle idle sway */}
            {speaking ? (
              <motion.path
                d="M44 58 Q50 62 56 58"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.85"
                animate={{ scaleY: [1, 0.4, 0.85, 0.5, 1] }}
                transition={{ duration: 0.85, ease: 'easeInOut', repeat: Infinity }}
                style={{ transformOrigin: '50px 58px' }}
              />
            ) : (
              <path
                d="M44 58 Q50 62 56 58"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.8"
              />
            )}
          </g>

          {/* Speaking shimmer sweep */}
          <AnimatePresence>
            {speaking && (
              <motion.g
                key="shimmer"
                initial={{ x: -46, opacity: 0 }}
                animate={{ x: 120, opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity }}
              >
                <rect x="0" y="18" width="18" height="64" rx="9" fill="url(#novaShimmer)" />
              </motion.g>
            )}
          </AnimatePresence>
        </motion.g>
      </svg>
    </div>
  );
}
