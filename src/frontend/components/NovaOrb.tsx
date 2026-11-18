import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { NovaPersona, NOVA_PERSONAS } from '../models/personas';

export type NovaOrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface NovaOrbProps {
  /** idle = gentle breathing & presence, listening = attentive tilt & acoustic ripples, thinking = focused orbital halo, speaking = live harmonic shimmer & voice cadence */
  state?: NovaOrbState;
  /** Rendered pixel size (square). Defaults to 64. */
  size?: number;
  className?: string;
  /** Accessible label */
  label?: string;
  /** Muse character persona driving portrait, aura, and expressive palette */
  persona?: NovaPersona;
  /** Frame silhouette: circular avatar for chat/header, rounded glass frame for character stage */
  shape?: 'circle' | 'rounded';
  /** Render subtle animated voice equalizer bars overlay at the bottom when speaking or listening */
  showAudioBars?: boolean;
  /** Enable subtle pointer parallax response on large character stages */
  interactiveTilt?: boolean;
}

/**
 * Muse Living Character Companion — renders the studio portrait of Shii, Shiia,
 * Muse Prime, Lyra, Sora, or Kael inside a thick refractive Liquid Glass frame
 * with expressive idle, listening, thinking, and speaking states.
 */
export function NovaOrb({
  state = 'idle',
  size = 64,
  className,
  label,
  persona,
  shape = 'circle',
  showAudioBars = false,
  interactiveTilt = false,
}: NovaOrbProps) {
  const activePersona = persona || NOVA_PERSONAS[0];
  const pal = activePersona.palette;
  const [imgFailed, setImgFailed] = useState(false);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [blinkPulse, setBlinkPulse] = useState(false);

  // Reset image fallback if character switches
  useEffect(() => {
    setImgFailed(false);
  }, [activePersona.id, activePersona.avatarUrl]);

  // Subtle natural life-blink cadence (shifts vignette catchlight slightly on large portraits)
  useEffect(() => {
    if (size < 48) return;
    let t1: number;
    let t2: number;
    const loop = () => {
      t1 = window.setTimeout(() => {
        setBlinkPulse(true);
        t2 = window.setTimeout(() => {
          setBlinkPulse(false);
          loop();
        }, 160);
      }, 3400 + Math.random() * 2800);
    };
    loop();
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [size]);

  const isIdle = state === 'idle';
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isSpeaking = state === 'speaking';

  const isLarge = size >= 72;
  const radiusClass = shape === 'circle' ? 'rounded-full' : 'rounded-[1.6rem]';

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactiveTilt || !isLarge) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setTilt({ x: nx * 4, y: ny * -4 });
  };

  const handlePointerLeave = () => {
    if (interactiveTilt) setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      role="img"
      aria-label={label || `${activePersona.name} (${state})`}
      onPointerMove={interactiveTilt ? handlePointerMove : undefined}
      onPointerLeave={interactiveTilt ? handlePointerLeave : undefined}
      className={clsx(
        'nova-orb relative inline-flex items-center justify-center shrink-0 select-none',
        interactiveTilt && 'pointer-events-auto',
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Ambient aura behind character */}
      <motion.div
        aria-hidden="true"
        className={clsx('absolute -inset-2 blur-xl pointer-events-none', radiusClass)}
        style={{ background: pal.glow }}
        animate={{
          opacity: isSpeaking ? [0.55, 0.9, 0.55] : isListening ? [0.45, 0.8, 0.45] : isThinking ? [0.35, 0.65, 0.35] : [0.22, 0.42, 0.22],
          scale: isSpeaking ? [1, 1.09, 1] : isListening ? [1, 1.06, 1] : [0.98, 1.02, 0.98],
        }}
        transition={{
          duration: isSpeaking ? 1.2 : isListening ? 2.0 : isThinking ? 2.6 : 4.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Concentric acoustic ripples when listening or speaking */}
      {(isListening || isSpeaking) && isLarge && (
        <>
          <motion.span
            aria-hidden="true"
            className={clsx('absolute inset-0 border pointer-events-none', radiusClass)}
            style={{ borderColor: pal.mid }}
            initial={{ scale: 0.96, opacity: 0.65 }}
            animate={{ scale: 1.22, opacity: 0 }}
            transition={{ duration: isSpeaking ? 1.35 : 2.1, ease: 'easeOut', repeat: Infinity }}
          />
          <motion.span
            aria-hidden="true"
            className={clsx('absolute inset-0 border pointer-events-none', radiusClass)}
            style={{ borderColor: pal.core }}
            initial={{ scale: 0.96, opacity: 0.5 }}
            animate={{ scale: 1.22, opacity: 0 }}
            transition={{ duration: isSpeaking ? 1.35 : 2.1, ease: 'easeOut', repeat: Infinity, delay: isSpeaking ? 0.65 : 1.0 }}
          />
        </>
      )}

      {/* Rotating focus halo ring during thinking state */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            key="thinking-arc"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.25 },
              rotate: { duration: 2.8, ease: 'linear', repeat: Infinity },
            }}
            className={clsx('absolute -inset-[3px] pointer-events-none', radiusClass)}
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, ${pal.core} 70deg, ${pal.mid} 140deg, transparent 220deg)`,
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px))',
            }}
          />
        )}
      </AnimatePresence>

      {/* Main Liquid Glass Portrait Bezel */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.032, 0.995, 1.028, 1] : isListening ? [1, 1.022, 1] : isIdle && isLarge ? [1, 1.015, 1] : 1,
          y: isIdle && isLarge ? [0, -2, 0] : isListening && isLarge ? -1.5 : 0,
          rotate: isListening && isLarge ? [-0.8, 0.8, -0.8] : isThinking && isLarge ? [0, 1.2, 0] : 0,
        }}
        transition={{
          duration: isSpeaking ? 1.05 : isListening ? 2.4 : isThinking ? 3.0 : 4.4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          transform: interactiveTilt ? `perspective(600px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)` : undefined,
          borderColor: isListening || isSpeaking ? pal.mid : 'var(--glass-border)',
          boxShadow: isSpeaking
            ? `0 0 0 2px ${pal.mid}, var(--shadow-md)`
            : 'var(--shadow-sm)',
        }}
        className={clsx(
          'relative w-full h-full overflow-hidden border bg-[var(--bg-2)] transition-[border-color,box-shadow] duration-200',
          radiusClass
        )}
      >
        {/* Character Portrait or Styled Monogram Fallback */}
        {!imgFailed && activePersona.avatarUrl ? (
          <img
            src={activePersona.avatarUrl}
            alt={activePersona.name}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className={clsx(
              'w-full h-full object-cover object-[50%_20%] transition-transform duration-300',
              isLarge && blinkPulse && 'brightness-[0.96]',
              isSpeaking && isLarge && 'scale-[1.03]',
              isListening && isLarge && 'scale-[1.02]'
            )}
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-display font-semibold text-white"
            style={{
              fontSize: Math.max(11, Math.round(size * 0.36)),
              background: `radial-gradient(circle at 35% 30%, ${pal.core}, ${pal.mid} 55%, ${pal.rim})`,
            }}
          >
            {activePersona.name.slice(0, 2)}
          </div>
        )}

        {/* Specular liquid glass rim reflection overlay */}
        <div
          aria-hidden="true"
          className={clsx('absolute inset-0 pointer-events-none', radiusClass)}
          style={{
            boxShadow: 'inset 0 1.5px 0 rgba(255, 255, 255, 0.55), inset 0 -2px 8px rgba(20, 14, 10, 0.25)',
          }}
        />

        {/* Harmonic shimmer sweep when speaking */}
        <AnimatePresence>
          {isSpeaking && isLarge && (
            <motion.div
              key="speaking-sweep"
              aria-hidden="true"
              initial={{ x: '-110%', opacity: 0 }}
              animate={{ x: '130%', opacity: [0, 0.35, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeInOut', repeat: Infinity }}
              className="absolute inset-y-0 w-1/2 pointer-events-none bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-18deg]"
            />
          )}
        </AnimatePresence>

        {/* Bottom Scrim + Live Acoustic Equalizer on large stages */}
        {showAudioBars && isLarge && (
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 via-black/25 to-transparent flex items-end justify-center pb-2.5 gap-1 pointer-events-none">
            {[0.45, 0.85, 1, 0.7, 0.9, 0.55].map((h, idx) => (
              <span
                key={idx}
                className={clsx(
                  'w-1 rounded-full bg-white/90 transition-all',
                  (isSpeaking || isListening) ? 'muse-wave-bar' : 'opacity-45'
                )}
                style={{
                  height: (isSpeaking || isListening) ? `${Math.round(h * 18)}px` : '4px',
                  animationDelay: `${idx * 110}ms`,
                  animationDuration: isSpeaking ? '0.68s' : '1.35s',
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
