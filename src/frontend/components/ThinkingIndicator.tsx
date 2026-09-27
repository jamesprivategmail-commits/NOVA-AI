import React from 'react';
import { Bot } from 'lucide-react';

export function ThinkingIndicator() {
  return (
    <div className="w-full py-3 px-3 sm:px-4">
      <div className="max-w-3xl mx-auto flex gap-2.5 items-start">
        {/* Avatar */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/80 border border-[#38383b] p-0.5 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
          <img 
            src="/void-logo.jpg"
            alt="VOID AI" 
            className="w-full h-full object-cover"
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
