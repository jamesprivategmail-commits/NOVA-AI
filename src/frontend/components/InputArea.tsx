import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Send, Square, Paperclip, Mic, MicOff, X, Image as ImageIcon, FileText, Plus, AudioLines } from 'lucide-react';
import { clsx } from 'clsx';

interface InputAreaProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  onStop?: () => void;
  onOpenLiveVoice?: () => void;
  onImageGenerate?: (text: string) => void;
}

interface Attachment {
  name: string;
  type: string;
  dataUrl?: string;
}

export function InputArea({ onSend, isLoading, onStop, onOpenLiveVoice, onImageGenerate }: InputAreaProps) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState(false);
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
      if (imageMode && onImageGenerate && trimmed) {
        onImageGenerate(trimmed);
        setText('');
        setImageMode(false);
        if (textareaRef.current) {
          textareaRef.current.style.height = '36px';
        }
        return;
      }
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
        <div className="mb-1.5 p-1.5 px-2.5 bg-[#252527]/90 border border-[#38383b] rounded-lg text-[11px] text-[#8d8d91] flex items-center justify-between">
          <span>{speechError}</span>
          <button onClick={() => setSpeechError(null)} className="p-0.5 text-[#8d8d91] hover:text-white">
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

      {/* Clean pill composer — NOVA style */}
      <div className="relative flex items-center w-full bg-[#202022] border border-[#38383b] focus-within:border-[#454547] rounded-full transition-all px-2 py-1.5 gap-1.5">
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
          className="w-8 h-8 rounded-full bg-[#252527] hover:bg-[#38383b] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          title="Attach image or file"
        >
          <Plus size={18} />
        </button>

        {/* Image Generation Mode Toggle */}
        <button
          type="button"
          onClick={() => setImageMode(!imageMode)}
          className={clsx(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer",
            imageMode
              ? "bg-[#3f86ff] text-white"
              : "bg-[#252527] hover:bg-[#38383b] text-white"
          )}
          title={imageMode ? "Image mode ON — type a prompt to generate an image" : "Toggle image generation mode"}
        >
          <ImageIcon size={16} />
        </button>

        {/* Text Input Field */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={imageMode ? "Describe an image to generate…" : "Message VOID AI"}
          rows={1}
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck={true}
          className={clsx(
            "flex-1 min-h-[32px] max-h-[140px] bg-transparent text-white placeholder:text-[#8d8d91] border-0 focus:ring-0 resize-none py-1.5 px-1 outline-none text-sm leading-snug",
            imageMode && "placeholder:text-[#3f86ff]"
          )}
        />

        {/* Mic Button */}
        <button
          type="button"
          onClick={toggleSpeechRecognition}
          className={clsx(
            "w-8 h-8 rounded-full bg-[#252527] hover:bg-[#38383b] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer",
            isListening && "text-[#3f86ff] bg-[#252527]"
          )}
          title={isListening ? "Stop listening" : "Voice input"}
        >
          {isListening ? <MicOff size={16} className="text-[#3f86ff]" /> : <Mic size={17} />}
        </button>

        {/* Send / Live Voice Audio Button */}
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="w-8 h-8 bg-[#3f86ff] hover:opacity-90 text-white rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer"
            title="Stop generating"
          >
            <Square size={12} fill="currentColor" />
          </button>
        ) : text.trim() || attachment ? (
          <button
            type="button"
            onClick={handleSend}
            className="w-8 h-8 bg-[#3f86ff] hover:opacity-90 text-white rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
            title="Send message"
          >
            <Send size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenLiveVoice}
            className="w-8 h-8 bg-[#252527] hover:bg-[#38383b] text-white rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer"
            title="Live voice mode"
          >
            <AudioLines size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
