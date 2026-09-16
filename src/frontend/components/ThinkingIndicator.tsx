import React from 'react';
import { Bot } from 'lucide-react';

export function ThinkingIndicator() {
  return (
    <div className="w-full py-3 px-3 sm:px-4">
      <div className="max-w-3xl mx-auto flex gap-2.5 items-start">
        {/* Avatar */}
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#202022] border border-[#38383b] p-1 flex items-center justify-center shrink-0 mt-0.5">
          <img 
            src="https://i.postimg.cc/8PVBFM75/file-00000000b40c82118dbaef206a9ebedc.png" 
            alt="VOID AI" 
            className="w-full h-full object-contain"
          />
        </div>

        {/* Label + dots */}
        <div className="flex flex-col gap-2 pt-1">
          <span className="text-xs font-semibold text-white">VOID AI</span>
          <div className="flex items-center gap-1.5 py-1">
            <span className="w-2 h-2 rounded-full bg-[#8d8d91] animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
            <span className="w-2 h-2 rounded-full bg-[#8d8d91] animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }} />
            <span className="w-2 h-2 rounded-full bg-[#8d8d91] animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
