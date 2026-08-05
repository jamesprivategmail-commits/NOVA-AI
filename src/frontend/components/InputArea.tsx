import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Send, Square, Paperclip, Mic, MicOff, X, Image as ImageIcon, FileText } from 'lucide-react';
import { clsx } from 'clsx';

interface InputAreaProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  onStop?: () => void;
}

interface Attachment {
  name: string;
  type: string;
  dataUrl?: string;
}

export function InputArea({ onSend, isLoading, onStop }: InputAreaProps) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Smooth auto-resize textarea without layout thrashing
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height temporarily to compute scrollHeight accurately
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 200);
    textarea.style.height = `${newHeight}px`;
  }, [text]);

  // Speech Recognition setup
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
          console.warn('Speech recognition status:', event.error);
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
      setSpeechError('Voice input not supported on this device/browser');
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
        console.warn('Failed to start speech recognition', err);
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
    // Reset file input value so same file can be re-uploaded if needed
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
        textareaRef.current.style.height = '44px';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ignore Enter if composing (e.g. mobile autocomplete or IME)
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 pb-3 sm:pb-4 md:px-6">
      {/* Speech Error Banner */}
      {speechError && (
        <div className="mb-2 p-2 px-3 bg-red-950/80 border border-red-800/80 rounded-xl text-xs text-red-200 animate-fadeIn flex items-center justify-between">
          <span>{speechError}</span>
          <button onClick={() => setSpeechError(null)} className="p-0.5 text-red-300 hover:text-white">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Attachment Preview Card */}
      {attachment && (
        <div className="mb-2 p-2 px-3 bg-[#161B22] border border-[#30363D] rounded-xl flex items-center justify-between gap-3 text-xs text-slate-200 animate-fadeIn">
          <div className="flex items-center gap-2 truncate">
            {attachment.type.startsWith('image/') ? (
              <ImageIcon size={16} className="text-red-400 shrink-0" />
            ) : (
              <FileText size={16} className="text-blue-400 shrink-0" />
            )}
            <span className="truncate font-mono">{attachment.name}</span>
          </div>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="p-1 hover:bg-[#21262D] rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Input Box Container */}
      <div className="relative flex items-end w-full bg-[#161B22]/95 backdrop-blur-md border border-[#30363D] focus-within:border-red-500/80 rounded-2xl shadow-2xl transition-colors">
        {/* File upload hidden input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.txt"
          className="hidden"
        />

        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 sm:p-3 pl-3 sm:pl-4 text-slate-400 hover:text-slate-100 transition-colors shrink-0 mb-0.5"
          title="Attach image or file"
        >
          <Paperclip size={19} />
        </button>

        {/* Speech / Voice button */}
        <button
          type="button"
          onClick={toggleSpeechRecognition}
          className={clsx(
            "p-2.5 sm:p-3 text-slate-400 hover:text-slate-100 transition-colors shrink-0 mb-0.5",
            isListening && "text-red-500 animate-pulse"
          )}
          title={isListening ? "Stop listening" : "Voice input"}
        >
          {isListening ? <MicOff size={19} className="text-red-500" /> : <Mic size={19} />}
        </button>

        {/* Auto-expanding Textarea - Note text-base on mobile prevents iOS safari auto-zoom issue */}
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
          className="flex-1 min-h-[44px] max-h-[200px] bg-transparent text-slate-100 placeholder-slate-500 border-0 focus:ring-0 resize-none py-2.5 px-2 outline-none text-base md:text-sm leading-relaxed"
        />

        {/* Send / Stop button */}
        <div className="p-2 shrink-0">
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className="p-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all shadow-md shadow-red-950/50 flex items-center justify-center group"
              title="Stop generating"
            >
              <Square size={16} fill="currentColor" className="group-hover:scale-95 transition-transform" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim() && !attachment}
              className={clsx(
                "p-2.5 rounded-xl transition-all flex items-center justify-center shadow-md",
                text.trim() || attachment
                  ? "bg-red-600 hover:bg-red-500 text-white shadow-red-950/50 cursor-pointer active:scale-95"
                  : "bg-[#21262D] text-slate-600 cursor-not-allowed"
              )}
              title="Send message"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Footer Disclaimer & Shortcut tip */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 px-1 font-mono">
        <span>VOID AI Engine v2.5</span>
        <span className="hidden sm:inline">Press Shift + Enter for new line</span>
      </div>
    </div>
  );
}

