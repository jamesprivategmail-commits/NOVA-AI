import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Sparkles, ArrowLeft, Hand } from 'lucide-react';
import { sendMessageToGroq } from '../../api/client';
import { NOVA_PERSONAS, getPersona, type NovaPersona } from '../models/personas';
import { NovaOrb, type NovaOrbState } from './NovaOrb';
import { clsx } from 'clsx';
import { motion } from 'motion/react';

interface LiveVoiceModalProps {
  onClose: () => void;
  userId: string;
  userTier?: string;
  persona?: NovaPersona;
  onSelectPersona?: (persona: NovaPersona) => void;
}

export function LiveVoiceModal({
  onClose,
  userId,
  userTier = 'free',
  persona: initialPersona,
  onSelectPersona,
}: LiveVoiceModalProps) {
  const [activePersona, setActivePersona] = useState<NovaPersona>(
    initialPersona || getPersona('groq', 'qwen/qwen3.8-27b', 'shii')
  );
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponseText, setAiResponseText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [conversationHistory, setConversationHistory] = useState<{ role: string; text: string }[]>([]);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (initialPersona) setActivePersona(initialPersona);
  }, [initialPersona?.id]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;

      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => setIsListening(true);

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);

          if (event.results[event.results.length - 1].isFinal) {
            handleUserVoiceInput(currentTranscript);
          }
        };

        recognitionRef.current.onerror = () => setIsListening(false);
        recognitionRef.current.onend = () => setIsListening(false);

        startListening();
      }
    }

    return () => {
      stopListening();
      stopSpeaking();
    };
  }, []);

  const startListening = () => {
    if (isMuted || !recognitionRef.current) return;
    try {
      stopSpeaking();
      recognitionRef.current.start();
      setIsListening(true);
    } catch (_) {}
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  };

  const speakText = (text: string, personaForVoice: NovaPersona) => {
    if (!isAudioEnabled || !synthRef.current) return;
    stopSpeaking();

    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block generated.')
      .replace(/[*_#`~]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = personaForVoice.vibe === 'swift' ? 1.07 : 1.01;
    utterance.pitch = personaForVoice.id === 'kael' ? 0.94 : 1.03;

    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(
      (v) => (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel')) && v.lang.startsWith('en')
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsListening(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setTimeout(() => {
        if (!isMuted) startListening();
      }, 420);
    };

    utterance.onerror = () => setIsSpeaking(false);

    currentUtteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const handleUserVoiceInput = async (spokenText: string) => {
    if (!spokenText.trim()) return;

    stopListening();
    setIsThinking(true);
    setAiResponseText('');

    const newHistory = [...conversationHistory, { role: 'user', text: spokenText }];
    setConversationHistory(newHistory);

    let accumulatedResponse = '';

    try {
      await sendMessageToGroq(
        newHistory,
        `You are ${activePersona.name} (${activePersona.role}) in Muse Face-to-Face Live Voice Mode. Maintain conversation continuity seamlessly and reply warmly, naturally, and concisely (1-3 crisp sentences suited for spoken conversation).`,
        (chunk) => {
          accumulatedResponse += chunk;
          setAiResponseText(accumulatedResponse);
        },
        undefined,
        userId,
        userTier,
        activePersona.provider,
        activePersona.modelId,
        undefined,
        undefined,
        undefined,
        {
          personaId: activePersona.id,
          personaName: activePersona.name,
          characterDirective: activePersona.systemDirective,
        }
      );

      setIsThinking(false);
      setConversationHistory((prev) => [...prev, { role: 'assistant', text: accumulatedResponse }]);
      speakText(accumulatedResponse, activePersona);
    } catch (err) {
      console.error('Voice AI error:', err);
      setIsThinking(false);
      const errorMsg = 'I had a brief hiccup hearing that. Please speak again.';
      setAiResponseText(errorMsg);
      speakText(errorMsg, activePersona);
    }
  };

  const handleInterruptOrListen = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsMuted(false);
      startListening();
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      setIsMuted(false);
      startListening();
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      startListening();
    } else {
      setIsMuted(true);
      stopListening();
    }
  };

  const toggleAudioOutput = () => {
    if (isAudioEnabled) {
      stopSpeaking();
      setIsAudioEnabled(false);
    } else {
      setIsAudioEnabled(true);
      if (aiResponseText) speakText(aiResponseText, activePersona);
    }
  };

  const handleSwitchCharacter = (next: NovaPersona) => {
    setActivePersona(next);
    onSelectPersona?.(next);
  };

  const orbState: NovaOrbState = isThinking
    ? 'thinking'
    : isSpeaking
    ? 'speaking'
    : isListening
    ? 'listening'
    : 'idle';

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-0)]/92 backdrop-blur-3xl flex flex-col justify-between items-center p-4 sm:p-8 select-none overflow-hidden text-[var(--text-primary)] animate-fadeIn">
      {/* Ambient Character Aura Glow */}
      <motion.div
        aria-hidden="true"
        animate={{
          scale: isSpeaking ? [1, 1.22, 1.05, 1.25, 1] : isListening ? [1, 1.14, 1] : [1, 1.04, 1],
          opacity: isSpeaking ? [0.45, 0.72, 0.45] : isListening ? [0.32, 0.55, 0.32] : 0.25,
        }}
        transition={{
          duration: isSpeaking ? 1.4 : isListening ? 2.2 : 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[26rem] h-[26rem] sm:w-[36rem] sm:h-[36rem] rounded-full blur-3xl pointer-events-none"
        style={{ background: activePersona.palette.glow }}
      />

      {/* Top Navigation Pill Bar */}
      <div className="relative z-10 w-full max-w-3xl flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost h-10 px-3.5 rounded-full text-xs whitespace-nowrap"
          title="Return to Chat"
        >
          <ArrowLeft size={15} />
          <span>Back to Chat</span>
        </button>

        <div className="glass-thick px-4 py-2 rounded-full flex items-center gap-2.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: activePersona.palette.mid }}
          />
          <span className="text-xs font-bold tracking-wide text-[var(--text-primary)] whitespace-nowrap">
            {activePersona.name} · Face-to-Face
          </span>
        </div>

        <button
          type="button"
          onClick={toggleAudioOutput}
          className="w-10 h-10 rounded-full glass hover:bg-black/[0.05] dark:hover:bg-white/[0.1] text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer shrink-0"
          title={isAudioEnabled ? 'Mute voice playback' : 'Enable voice playback'}
        >
          {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {/* Main Living Face-to-Face Character Stage */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-xl my-auto py-3">
        <button
          type="button"
          onClick={handleInterruptOrListen}
          className="relative group flex flex-col items-center justify-center cursor-pointer focus:outline-none"
          title={isSpeaking ? 'Tap to interrupt and speak' : isListening ? 'Tap to pause listening' : 'Tap to speak'}
        >
          <div className="muse-glass-panel rounded-[2.4rem] p-3 sm:p-4 transition-transform group-active:scale-[0.98]">
            <NovaOrb
              size={220}
              persona={activePersona}
              state={orbState}
              shape="rounded"
              showAudioBars
              interactiveTilt
              label={activePersona.name}
              className="sm:!w-[250px] sm:!h-[250px]"
            />
          </div>
        </button>

        {/* Live State Indicator */}
        <div className="mt-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full glass text-xs font-semibold text-[var(--text-primary)]">
          {isThinking ? (
            <>
              <Sparkles size={13} style={{ color: activePersona.palette.mid }} />
              <span>{activePersona.name} is thinking...</span>
            </>
          ) : isSpeaking ? (
            <>
              <Volume2 size={13} style={{ color: activePersona.palette.mid }} />
              <span>Speaking · Tap portrait to interrupt</span>
            </>
          ) : isListening ? (
            <>
              <Mic size={13} style={{ color: activePersona.palette.mid }} />
              <span>Listening to you...</span>
            </>
          ) : (
            <>
              <MicOff size={13} />
              <span>Tap portrait or mic to speak</span>
            </>
          )}
        </div>

        {/* Live Captions & Transcript */}
        <div className="w-full text-center px-3 space-y-2.5 min-h-[84px] flex flex-col justify-center mt-3">
          {transcript && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] italic glass px-4 py-2 rounded-2xl max-w-md mx-auto">
              "{transcript}"
            </p>
          )}

          {aiResponseText && (
            <p className="text-sm sm:text-base font-medium text-[var(--text-primary)] glass-thick px-4 py-3 rounded-2xl max-w-lg mx-auto line-clamp-3 leading-relaxed">
              {aiResponseText}
            </p>
          )}

          {!transcript && !aiResponseText && (
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {activePersona.role} — speak naturally anytime. You can interrupt mid-sentence or switch Muse companions below.
            </p>
          )}
        </div>

        {/* Quick Character Carousel */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full px-2 py-1">
          {NOVA_PERSONAS.map((p) => {
            const selected = p.id === activePersona.id;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => handleSwitchCharacter(p)}
                className={clsx(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shrink-0',
                  selected
                    ? 'glass-thick text-[var(--text-primary)]'
                    : 'glass-subtle text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
                style={selected ? { borderColor: p.palette.mid } : undefined}
              >
                <NovaOrb size={22} persona={p} shape="circle" />
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Floating Call Dock */}
      <div className="relative z-10 muse-glass-panel rounded-full px-4 py-2.5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={toggleMute}
          className={clsx(
            'w-12 h-12 rounded-full border transition-all flex items-center justify-center cursor-pointer',
            isMuted ? 'glass text-[var(--text-muted)]' : 'glass-thick text-[var(--text-primary)]'
          )}
          title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {isSpeaking && (
          <button
            type="button"
            onClick={handleInterruptOrListen}
            className="btn btn-ghost h-12 px-4 rounded-full text-xs whitespace-nowrap"
            title="Interrupt and speak"
          >
            <Hand size={16} style={{ color: activePersona.palette.mid }} />
            <span>Interrupt</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
          title="End Face-to-Face Call"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}
