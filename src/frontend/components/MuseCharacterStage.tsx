import React from 'react';
import { Phone, Sparkles, Volume2, Mic, ArrowRightCircle, X, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { NOVA_PERSONAS, type NovaPersona } from '../models/personas';
import { NovaOrb, type NovaOrbState } from './NovaOrb';
import type { CouncilData } from '../../models/types';

export type MusePresenceMode = 'stage' | 'pip' | 'voice' | 'face';

interface MuseCharacterStageProps {
  mode: MusePresenceMode;
  onChangeMode: (mode: MusePresenceMode) => void;
  persona: NovaPersona;
  avatarState: NovaOrbState;
  onSelectPersona: (persona: NovaPersona) => void;
  onOpenFaceToFace: () => void;
  onQuickPrompt?: (prompt: string) => void;
  hasActiveMessages: boolean;
  onSpeakLatest?: () => void;
  isSpeakingReply?: boolean;
  squadMode?: boolean;
  squadPersonas?: NovaPersona[];
  liveCouncilData?: CouncilData | null;
  onOpenSquadRoster?: () => void;
}

function getStateLabel(state: NovaOrbState, personaName: string) {
  switch (state) {
    case 'listening':
      return `${personaName} is listening`;
    case 'thinking':
      return `${personaName} is thinking`;
    case 'speaking':
      return `${personaName} is responding`;
    default:
      return `${personaName} is present`;
  }
}

/**
 * Reproduces Muse AI's live companion stage across desktop (side-by-side glass pane),
 * floating Picture-in-Picture (PiP), compact Voice-Only bar, and responsive mobile header card.
 */
export function MuseCharacterStage({
  mode,
  onChangeMode,
  persona,
  avatarState,
  onSelectPersona,
  onOpenFaceToFace,
  onQuickPrompt,
  hasActiveMessages,
  onSpeakLatest,
  isSpeakingReply,
  squadMode = false,
  squadPersonas = NOVA_PERSONAS.slice(0, 4),
  liveCouncilData = null,
  onOpenSquadRoster,
}: MuseCharacterStageProps) {
  const getMemberLiveState = (memberId: string): NovaOrbState => {
    if (!squadMode || avatarState === 'idle') return avatarState;
    if (liveCouncilData) {
      if (liveCouncilData.phase === 'synthesis') {
        return memberId === 'shiia' ? 'speaking' : 'idle';
      }
      if (liveCouncilData.phase === 'discussion') {
        const d = liveCouncilData.discussions?.find((x) => x.agentId === memberId);
        return d?.status === 'thinking' ? 'thinking' : 'speaking';
      }
      if (liveCouncilData.phase === 'work') {
        const t = liveCouncilData.tasks?.find((x) => x.agentId === memberId);
        return t?.status === 'running' ? 'thinking' : 'speaking';
      }
    }
    return avatarState;
  };
  // Voice-Only Mode: ultra-clean minimal acoustic glass strip
  if (mode === 'voice') {
    return (
      <div className="px-3 sm:px-4 pt-2 shrink-0">
        <div className="max-w-3xl mx-auto muse-glass-panel rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-end gap-1 h-5 px-1 shrink-0" aria-hidden="true">
              {[0.4, 0.9, 0.65, 1, 0.75, 0.5].map((h, i) => (
                <span
                  key={i}
                  className={clsx(
                    'w-1 rounded-full transition-all',
                    avatarState !== 'idle' ? 'muse-wave-bar' : 'opacity-45'
                  )}
                  style={{
                    background: persona.palette.mid,
                    height: avatarState !== 'idle' ? `${Math.round(h * 18)}px` : '5px',
                    animationDelay: `${i * 95}ms`,
                  }}
                />
              ))}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {getStateLabel(avatarState, persona.name)}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">
                Voice-Only focus · {persona.role}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenFaceToFace}
              className="btn btn-primary h-9 px-3 text-xs whitespace-nowrap"
              title="Open Face-to-Face Voice Call"
            >
              <Phone size={13} />
              <span>Face-to-Face</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('stage')}
              className="btn btn-ghost h-9 px-2.5 text-xs whitespace-nowrap"
              title="Restore Visual Stage"
            >
              Stage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Picture-in-Picture (PiP) Mode: compact floating glass companion card
  if (mode === 'pip') {
    return (
      <div className="fixed bottom-24 right-4 sm:right-6 z-30 animate-riseIn">
        <div className="muse-glass-panel rounded-3xl p-2.5 flex items-center gap-3 max-w-[260px]">
          <NovaOrb
            size={54}
            state={avatarState}
            persona={persona}
            shape="rounded"
            showAudioBars
            className="shrink-0"
          />
          <div className="min-w-0 flex-1 pr-1">
            <div className="text-xs font-bold text-[var(--text-primary)] truncate">{persona.name}</div>
            <div className="text-[11px] text-[var(--text-secondary)] truncate">
              {avatarState === 'idle' ? 'Active companion' : getStateLabel(avatarState, persona.name)}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={onOpenFaceToFace}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold text-white cursor-pointer flex items-center gap-1 whitespace-nowrap"
                style={{ background: 'var(--accent)' }}
                title="Open Face-to-Face Call"
              >
                <Phone size={10} />
                <span>Call</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('stage')}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold glass text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap"
                title="Expand Side-by-Side Stage"
              >
                Expand
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChangeMode('voice')}
            className="self-start p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg cursor-pointer"
            title="Minimize to Voice-Only"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  // Side-by-Side Stage Mode:
  // On mobile/tablet (< lg) when messages are active, renders a sleek compact collapsible companion header strip;
  // On desktop (lg+), renders Muse's signature vertical floating Liquid Glass Stage panel!
  return (
    <>
      {/* Mobile / Tablet Compact Live Companion Bar (shown during active conversation) */}
      {hasActiveMessages && (
        <div className="lg:hidden px-3 pt-2 shrink-0">
          <div className="muse-glass-panel rounded-2xl p-2 px-3 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {squadMode ? (
                <div className="flex items-center -space-x-2 shrink-0">
                  {squadPersonas.slice(0, 4).map((sp) => (
                    <div key={sp.id} className="rounded-full ring-2 ring-[var(--bg-1)]">
                      <NovaOrb
                        size={32}
                        state={getMemberLiveState(sp.id)}
                        persona={sp}
                        shape="circle"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <NovaOrb
                  size={42}
                  state={avatarState}
                  persona={persona}
                  shape="rounded"
                  className="shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {squadMode ? '4-Model Muse Squad' : persona.name}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] truncate">
                  {squadMode
                    ? squadPersonas.slice(0, 4).map((s) => s.name).join(' · ')
                    : getStateLabel(avatarState, persona.name)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onSpeakLatest && (
                <button
                  type="button"
                  onClick={onSpeakLatest}
                  className={clsx(
                    'w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-colors',
                    isSpeakingReply
                      ? 'bg-[var(--accent-soft)] border-[var(--accent-muted)] text-[var(--accent)]'
                      : 'glass text-[var(--text-secondary)]'
                  )}
                  title="Read latest response aloud"
                >
                  <Volume2 size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => onChangeMode('pip')}
                className="btn btn-ghost h-10 px-2.5 text-xs whitespace-nowrap"
                title="Float as Picture-in-Picture"
              >
                PiP
              </button>
              <button
                type="button"
                onClick={onOpenFaceToFace}
                className="btn btn-primary h-10 px-3 text-xs whitespace-nowrap"
                title="Face-to-Face Voice Call"
              >
                <Phone size={14} />
                <span>Call</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Side-by-Side Muse Companion Glass Stage */}
      <aside className="hidden lg:flex flex-col w-72 xl:w-[304px] shrink-0 muse-glass-panel rounded-[28px] p-4 justify-between gap-4 overflow-y-auto no-scrollbar select-none">
        {/* Top Stage Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {squadMode ? '4-Model Collaboration' : 'Live Companion'}
            </div>
            <div className="font-display text-lg font-semibold text-[var(--text-primary)] truncate">
              {squadMode ? 'Muse Squad' : persona.name}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {squadMode && onOpenSquadRoster && (
              <button
                type="button"
                onClick={onOpenSquadRoster}
                className="btn btn-ghost h-8 px-2 text-[11px] whitespace-nowrap"
                title="Customize 4-Model Squad"
              >
                <Users size={12} />
                <span>Team</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onChangeMode('pip')}
              className="btn btn-ghost h-8 px-2.5 text-[11px] whitespace-nowrap"
              title="Switch to compact Picture-in-Picture"
            >
              PiP
            </button>
          </div>
        </div>

        {/* Expressive Portrait Showcase (Solo Muse OR 2x2 Living Squad Grid) */}
        {squadMode ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {squadPersonas.slice(0, 4).map((sp) => {
                const st = getMemberLiveState(sp.id);
                return (
                  <div
                    key={sp.id}
                    className="rounded-2xl glass-subtle border border-[var(--line)] p-2 flex flex-col items-center text-center"
                  >
                    <NovaOrb
                      size={78}
                      state={st}
                      persona={sp}
                      shape="rounded"
                      showAudioBars={st !== 'idle'}
                      interactiveTilt
                    />
                    <div className="mt-1.5 text-xs font-bold text-[var(--text-primary)] truncate w-full">
                      {sp.name}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate w-full">
                      {st === 'idle' ? sp.role.split('·')[0].trim() : st === 'thinking' ? 'Thinking…' : 'Contributing'}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-[var(--text-secondary)] text-center leading-relaxed px-1">
              All 4 models discuss your prompt, split workstreams in parallel, and merge one unified result.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <NovaOrb
              size={212}
              state={avatarState}
              persona={persona}
              shape="rounded"
              showAudioBars
              interactiveTilt
              className="shadow-xl"
            />

            <div className="mt-3.5 space-y-1 w-full">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: persona.palette.mid,
                    boxShadow: avatarState !== 'idle' ? `0 0 10px ${persona.palette.mid}` : undefined,
                  }}
                />
                <span>{getStateLabel(avatarState, persona.name)}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 px-1">
                {persona.personality}
              </p>
            </div>
          </div>
        )}

        {/* Interactive Companion Actions */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onOpenFaceToFace}
            className="btn btn-primary w-full py-2.5 text-xs whitespace-nowrap"
          >
            <Phone size={14} />
            <span>Face-to-Face Voice</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            {onSpeakLatest && hasActiveMessages ? (
              <button
                type="button"
                onClick={onSpeakLatest}
                className={clsx(
                  'btn h-9 px-2.5 text-[11px] whitespace-nowrap',
                  isSpeakingReply ? 'btn-primary' : 'btn-ghost'
                )}
              >
                <Volume2 size={13} />
                <span>{isSpeakingReply ? 'Stop Voice' : 'Read Reply'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onChangeMode('voice')}
                className="btn btn-ghost h-9 px-2.5 text-[11px] whitespace-nowrap"
              >
                <Mic size={13} />
                <span>Voice Focus</span>
              </button>
            )}

            {onQuickPrompt && hasActiveMessages ? (
              <button
                type="button"
                onClick={() => onQuickPrompt('Continue seamlessly from where you stopped and finish every remaining detail.')}
                className="btn btn-ghost h-9 px-2.5 text-[11px] whitespace-nowrap"
              >
                <ArrowRightCircle size={13} />
                <span>Continue</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onQuickPrompt?.('Help me plan and execute a complete project step by step.')}
                className="btn btn-ghost h-9 px-2.5 text-[11px] whitespace-nowrap"
              >
                <Sparkles size={13} />
                <span>Start Build</span>
              </button>
            )}
          </div>
        </div>

        {/* Companion Switcher Carousel */}
        <div className="pt-2 border-t border-[var(--line)]">
          <div className="flex items-center justify-between mb-2">
            <span className="section-label">Switch Muse</span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">{persona.speed}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {NOVA_PERSONAS.map((p) => {
              const active = p.id === persona.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => onSelectPersona(p)}
                  className={clsx(
                    'flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all cursor-pointer',
                    active
                      ? 'bg-[var(--accent-soft)] border-[var(--accent-muted)] text-[var(--text-primary)]'
                      : 'border-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[var(--text-secondary)]'
                  )}
                  title={`${p.name} · ${p.role}`}
                >
                  <NovaOrb size={34} persona={p} shape="circle" />
                  <span className="text-[10px] font-semibold truncate w-full text-center">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
