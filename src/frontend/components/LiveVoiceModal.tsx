import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Sparkles, Radio, MessageSquare, Bot } from 'lucide-react';
import { sendMessageToGroq } from '../../api/client';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

interface LiveVoiceModalProps {
  onClose: () => void;
  userId: string;
  userTier?: string;
}

export function LiveVoiceModal({ onClose, userId, userTier = 'free' }: LiveVoiceModalProps) {
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

  // Initialize Speech Recognition & Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;

      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
        };

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);

          // If result is final, send to AI
          if (event.results[event.results.length - 1].isFinal) {
            handleUserVoiceInput(currentTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };

        // Start listening automatically on open
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
    } catch (e) {
      // already started or busy
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  };

  const speakText = (text: string) => {
    if (!isAudioEnabled || !synthRef.current) return;

    stopSpeaking();

    // Clean text from markdown formatting prior to TTS
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block generated.')
      .replace(/[*_#`~]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
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
      // Automatically resume listening hands-free after AI finishes speaking!
      setTimeout(() => {
        if (!isMuted) {
          startListening();
        }
      }, 500);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

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
        'You are VOID AI in Live Voice Mode. Keep your answers conversational, natural, concise, and direct (1-3 sentences max) suited for spoken speech.',
        (chunk) => {
          accumulatedResponse += chunk;
          setAiResponseText(accumulatedResponse);
        },
        undefined,
        userId,
        userTier
      );

      setIsThinking(false);
      setConversationHistory((prev) => [...prev, { role: 'assistant', text: accumulatedResponse }]);
      speakText(accumulatedResponse);
    } catch (err) {
      console.error('Voice AI error:', err);
      setIsThinking(false);
      const errorMsg = 'I encountered a connection issue. Please speak again.';
      setAiResponseText(errorMsg);
      speakText(errorMsg);
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
      if (aiResponseText) {
        speakText(aiResponseText);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between items-center p-6 sm:p-10 select-none overflow-hidden">
      {/* Top Header */}
      <div className="w-full max-w-2xl flex items-center justify-between text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-zinc-200">
            VOID AI • Live Voice Mode
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleAudioOutput}
            className={clsx(
              "p-2.5 rounded-full border transition-all",
              isAudioEnabled ? "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800" : "bg-red-950/60 border-red-800 text-red-400"
            )}
            title={isAudioEnabled ? "Mute Voice Output" : "Enable Voice Output"}
          >
            {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Main Animated Voice Orb / Visualizer */}
      <div className="flex-1 flex flex-col items-center justify-center relative w-full max-w-md my-auto">
        <div className="relative flex items-center justify-center my-8">
          {/* Outer Pulsing Aura */}
          <motion.div
            animate={{
              scale: isSpeaking ? [1, 1.35, 1.1, 1.4, 1] : isListening ? [1, 1.2, 1] : isThinking ? [1, 1.15, 1] : 1,
              opacity: isSpeaking ? [0.6, 0.9, 0.6] : isListening ? [0.4, 0.7, 0.4] : 0.2,
            }}
            transition={{
              duration: isSpeaking ? 1.2 : isListening ? 2 : 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={clsx(
              "absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-3xl transition-colors duration-500",
              isSpeaking
                ? "bg-gradient-to-r from-red-600 via-amber-600 to-purple-600"
                : isListening
                ? "bg-gradient-to-r from-blue-600 to-indigo-600"
                : isThinking
                ? "bg-gradient-to-r from-purple-600 to-pink-600 animate-pulse"
                : "bg-zinc-800"
            )}
          />

          {/* Glowing Center Voice Sphere */}
          <motion.button
            onClick={isListening ? stopListening : startListening}
            whileTap={{ scale: 0.95 }}
            animate={{
              scale: isSpeaking ? [1, 1.08, 0.96, 1.05, 1] : isListening ? [1, 1.04, 1] : 1,
            }}
            transition={{
              duration: isSpeaking ? 0.8 : 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={clsx(
              "relative z-10 w-44 h-44 sm:w-52 sm:h-52 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-500 border-2",
              isSpeaking
                ? "bg-gradient-to-br from-red-900 via-red-950 to-black border-red-500/80 shadow-red-950/80"
                : isListening
                ? "bg-gradient-to-br from-blue-900 via-zinc-950 to-black border-blue-500/80 shadow-blue-950/80"
                : isThinking
                ? "bg-gradient-to-br from-purple-900 via-zinc-950 to-black border-purple-500/80 shadow-purple-950/80"
                : "bg-zinc-900 border-zinc-800 shadow-zinc-950"
            )}
          >
            {isThinking ? (
              <div className="flex flex-col items-center gap-2">
                <Sparkles size={36} className="text-purple-400 animate-spin" />
                <span className="text-xs font-mono font-bold text-purple-300 tracking-wider">THINKING</span>
              </div>
            ) : isSpeaking ? (
              <div className="flex flex-col items-center gap-2">
                <Radio size={36} className="text-red-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-red-300 tracking-wider">SPEAKING</span>
              </div>
            ) : isListening ? (
              <div className="flex flex-col items-center gap-2">
                <Mic size={36} className="text-blue-400 animate-bounce" />
                <span className="text-xs font-mono font-bold text-blue-300 tracking-wider">LISTENING</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <MicOff size={36} className="text-zinc-500" />
                <span className="text-xs font-mono font-bold text-zinc-500 tracking-wider">TAP TO START</span>
              </div>
            )}
          </motion.button>
        </div>

        {/* Live Transcript Display */}
        <div className="w-full text-center px-4 space-y-2 min-h-[90px] flex flex-col justify-center">
          {transcript && (
            <p className="text-xs sm:text-sm text-zinc-400 italic bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3 max-w-sm mx-auto truncate">
              "{transcript}"
            </p>
          )}

          {aiResponseText && (
            <p className="text-sm sm:text-base font-medium text-zinc-100 max-w-md mx-auto line-clamp-3 leading-relaxed">
              {aiResponseText}
            </p>
          )}

          {!transcript && !aiResponseText && (
            <p className="text-xs text-zinc-500 font-mono">
              Speak naturally. VOID AI listens and replies instantly.
            </p>
          )}
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="w-full max-w-md flex items-center justify-center gap-6 pt-4 border-t border-zinc-900">
        <button
          onClick={toggleMute}
          className={clsx(
            "p-4 rounded-full border transition-all shadow-lg flex items-center justify-center",
            isMuted 
              ? "bg-red-950/80 border-red-800 text-red-400" 
              : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800"
          )}
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button
          onClick={onClose}
          className="p-5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-950/80 transition-all hover:scale-105 active:scale-95"
          title="End Live Voice Call"
        >
          <PhoneOff size={28} />
        </button>
      </div>
    </div>
  );
}
