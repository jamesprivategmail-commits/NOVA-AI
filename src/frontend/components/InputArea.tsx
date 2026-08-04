import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip } from 'lucide-react';

interface InputAreaProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  onStop?: () => void;
}

export function InputArea({ onSend, isLoading, onStop }: InputAreaProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if (text.trim() && !isLoading) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:px-6">
      <div className="relative flex items-end w-full bg-[#2f2f2f] rounded-[24px] focus-within:bg-[#2f2f2f] shadow-sm transition-colors border border-transparent focus-within:border-zinc-700">
        <button className="p-3.5 pl-4 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0">
          <Paperclip size={20} />
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message NOVA AI..."
          className="flex-1 max-h-[200px] bg-transparent text-zinc-100 placeholder-zinc-400 border-0 focus:ring-0 resize-none py-3.5 px-2 outline-none text-[15px]"
          rows={1}
        />
        <div className="p-2 shrink-0">
          {isLoading ? (
            <button 
              onClick={onStop}
              className="p-2 bg-zinc-700 text-zinc-300 rounded-full hover:bg-zinc-600 transition-colors mr-1 mb-0.5"
            >
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="p-2 bg-white text-black rounded-full hover:bg-zinc-200 disabled:opacity-30 disabled:bg-white disabled:text-black transition-colors mr-1 mb-0.5"
            >
              <Send size={16} className="ml-0.5" />
            </button>
          )}
        </div>
      </div>
      <div className="text-center text-xs text-zinc-500 mt-3 pb-2 font-medium">
        NOVA AI can make mistakes. Consider verifying important information.
      </div>
    </div>
  );
}
