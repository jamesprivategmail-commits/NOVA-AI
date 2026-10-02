import React, { useState, useRef, useLayoutEffect } from 'react';
import { Send, Square, X, Image as ImageIcon, FileText, Plus, AudioLines } from 'lucide-react';
import { clsx } from 'clsx';

export interface ChatAttachment {
  kind: 'image' | 'file';
  data: string;       // dataURL for images, text content for files
  name: string;
  mimeType: string;
}

interface InputAreaProps {
  onSend: (text: string, attachment?: ChatAttachment) => void;
  isLoading: boolean;
  onStop?: () => void;
  onOpenLiveVoice?: () => void;
  onImageGenerate?: (text: string) => void;
}

export function InputArea({ onSend, isLoading, onStop, onOpenLiveVoice, onImageGenerate }: InputAreaProps) {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [imageMode, setImageMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 34), 110);
    textarea.style.height = `${newHeight}px`;
  }, [text]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();

    if (isImage) {
      reader.onload = () => {
        setAttachment({
          kind: 'image',
          data: reader.result as string,
          name: file.name,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    } else {
      // Read text-based files as text content
      reader.onload = () => {
        setAttachment({
          kind: 'file',
          data: (reader.result as string).slice(0, 8000), // Cap at 8k chars
          name: file.name,
          mimeType: file.type || 'text/plain',
        });
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if ((trimmed || attachment) && !isLoading) {
      if (imageMode && onImageGenerate && trimmed) {
        onImageGenerate(trimmed);
        setText('');
        setImageMode(false);
        if (textareaRef.current) textareaRef.current.style.height = '34px';
        return;
      }
      onSend(trimmed, attachment || undefined);
      setText('');
      setAttachment(null);
      if (textareaRef.current) textareaRef.current.style.height = '34px';
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
    <div className="w-full max-w-2xl mx-auto px-2 pb-1">
      {/* Attachment Preview Card */}
      {attachment && (
        <div className="mb-1 p-1 px-2 bg-zinc-900 border border-zinc-700 rounded-lg flex items-center justify-between gap-2 text-xs text-slate-200">
          {attachment.kind === 'image' ? (
            <div className="flex items-center gap-1.5 truncate">
              <img src={attachment.data} alt={attachment.name} className="w-6 h-6 rounded object-cover shrink-0" />
              <span className="truncate text-[11px]">{attachment.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 truncate">
              <FileText size={13} className="text-purple-400 shrink-0" />
              <span className="truncate text-[11px]">{attachment.name}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="p-0.5 hover:bg-zinc-800 rounded text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Mobile-friendly composer with a larger touch target and readable text */}
      <div className="relative flex items-center w-full min-h-[54px] bg-[#202022] border border-[#38383b] focus-within:border-[#454547] rounded-full transition-all px-2.5 py-2 gap-1.5">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*,.txt,.md,.json,.csv,.js,.ts,.tsx,.py,.html,.css,.xml,.yaml,.yml,.log,.pdf"
          className="hidden"
        />

        {/* Plus (+) Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-full bg-[#252527] hover:bg-[#38383b] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          title="Attach image or file"
        >
          <Plus size={21} />
        </button>

        {/* Image Generation Mode Toggle */}
        <button
          type="button"
          onClick={() => setImageMode(!imageMode)}
          className={clsx(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer",
            imageMode ? "bg-[#3f86ff] text-white" : "bg-[#252527] hover:bg-[#38383b] text-white"
          )}
          title={imageMode ? "Image mode ON" : "Toggle image generation"}
        >
          <ImageIcon size={19} />
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
            "flex-1 min-h-[40px] max-h-[110px] bg-transparent text-white placeholder:text-[#8d8d91] border-0 focus:ring-0 resize-none py-2 px-1 outline-none text-base sm:text-sm leading-snug",
            imageMode && "placeholder:text-[#3f86ff]"
          )}
        />

        {/* Send / Stop / Live Voice */}
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="w-10 h-10 bg-[#3f86ff] hover:opacity-90 text-white rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer"
            title="Stop generating"
          >
            <Square size={13} fill="currentColor" />
          </button>
        ) : text.trim() || attachment ? (
          <button
            type="button"
            onClick={handleSend}
            className="w-10 h-10 bg-[#3f86ff] hover:opacity-90 text-white rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
            title="Send message"
          >
            <Send size={16} fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenLiveVoice}
            className="w-10 h-10 bg-[#252527] hover:bg-[#38383b] text-white rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer"
            title="Live voice mode"
          >
            <AudioLines size={17} />
          </button>
        )}
      </div>
    </div>
  );
}
