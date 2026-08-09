import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Send, Square, Paperclip, Mic, MicOff, X, Image as ImageIcon, FileText, Plus, AudioLines } from 'lucide-react';
import { clsx } from 'clsx';

interface InputAreaProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  onStop?: () => void;
  onOpenLiveVoice?: () => void;
}

interface Attachment {
  name: string;
  type: string;
  dataUrl?: string;
}

export function InputArea({ onSend, isLoading, onStop, onOpenLiveVoice }: InputAreaProps) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 36), 140);
    textarea.style.height = `${newHeight}px`;
  }, [text]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        };

        recognition.onerror = (event: any) => {
          setIsListening(false);
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            setSpeechError('Voice input unavailable');
            setTimeout(() => setSpeechError(null), 3000);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('Speech recognition init warning:', err);
      }
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      setSpeechError('Voice input not supported on this browser');
      setTimeout(() => setSpeechError(null), 3000);
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsListening(false);
    } else {
      try {
        setSpeechError(null);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        type: file.type,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if ((trimmed || attachment) && !isLoading) {
      let fullMessage = trimmed;
      if (attachment) {
        if (attachment.type.startsWith('image/') && attachment.dataUrl) {
          fullMessage = `![${attachment.name}](${attachment.dataUrl})\n\n${fullMessage}`;
        } else {
          fullMessage = `📁 [Attachment: ${attachment.name}]\n\n${fullMessage}`;
        }
      }
      onSend(fullMessage);
      setText('');
      setAttachment(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = '36px';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-2.5 pb-2 pt-0.5">
      {/* Speech Error Banner */}
      {speechError && (
        <div className="mb-1.5 p-1.5 px-2.5 bg-red-950/90 border border-red-800 rounded-lg text-[11px] text-red-200 flex items-center justify-between">
          <span>{speechError}</span>
          <button onClick={() => setSpeechError(null)} className="p-0.5 text-red-300 hover:text-white">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Attachment Preview Card */}
      {attachment && (
        <div className="mb-1.5 p-1.5 px-2.5 bg-zinc-900 border border-zinc-700 rounded-lg flex items-center justify-between gap-2 text-xs text-slate-200 animate-fadeIn">
          <div className="flex items-center gap-1.5 truncate">
            {attachment.type.startsWith('image/') ? (
              <ImageIcon size={14} className="text-sky-400 shrink-0" />
            ) : (
              <FileText size={14} className="text-purple-400 shrink-0" />
            )}
            <span className="truncate font-mono text-[11px]">{attachment.name}</span>
          </div>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="p-0.5 hover:bg-zinc-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Main Pill Input Box - Compact Demonic Red Box */}
      <div className="relative flex items-center w-full bg-gradient-to-r from-red-950/90 via-black to-zinc-950 border border-red-800/80 focus-within:border-red-500 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.25)] transition-all px-2 py-1 gap-1.5">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.txt"
          className="hidden"
        />

        {/* Plus (+) Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-7 h-7 rounded-full bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow"
          title="Attach image or file"
        >
          <Plus size={18} />
        </button>

        {/* Text Input Field */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask VOID AI..."
          rows={1}
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck={true}
          className="flex-1 min-h-[32px] max-h-[140px] bg-transparent text-red-100 placeholder:text-red-500/60 border-0 focus:ring-0 resize-none py-1.5 px-1 outline-none text-xs sm:text-sm leading-snug font-mono"
        />

        {/* Mic Button */}
        <button
          type="button"
          onClick={toggleSpeechRecognition}
          className={clsx(
            "w-7 h-7 rounded-full bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow",
            isListening && "text-red-400 animate-pulse bg-red-900"
          )}
          title={isListening ? "Stop listening" : "Voice input"}
        >
          {isListening ? <MicOff size={15} className="text-red-400" /> : <Mic size={16} />}
        </button>

        {/* Send / Live Voice Audio Button */}
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="w-7 h-7 bg-red-700 hover:bg-red-600 text-white rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-[0_0_12px_rgba(220,38,38,0.5)]"
            title="Stop generating"
          >
            <Square size={12} fill="currentColor" />
          </button>
        ) : text.trim() || attachment ? (
          <button
            type="button"
            onClick={handleSend}
            className="w-7 h-7 bg-red-600 hover:bg-red-500 text-white rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.6)] active:scale-95"
            title="Send message"
          >
            <Send size={13} fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenLiveVoice}
            className="w-7 h-7 bg-red-600 hover:bg-red-500 text-white rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.6)] hover:scale-105"
            title="Live voice mode"
          >
            <AudioLines size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
