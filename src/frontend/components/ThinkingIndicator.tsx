import React from 'react';

export function ThinkingIndicator() {
  return (
    <div className="w-full py-3 px-3 sm:px-4 animate-messageIn">
      <div className="max-w-3xl mx-auto flex gap-2.5 items-start">
        {/* Avatar */}
        <div
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full p-[1.5px] flex items-center justify-center shrink-0 mt-0.5 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--nova-accent), var(--nova-accent-2))' }}
        >
          <div className="w-full h-full rounded-full bg-black/85 p-0.5 flex items-center justify-center overflow-hidden">
            <img
              src="/void-logo.jpg"
              alt="NOVA"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        </div>

        {/* Label + dots */}
        <div className="flex flex-col gap-2 pt-1">
          <span className="text-xs font-semibold nova-gradient-text tracking-tight">NOVA</span>
          <div className="flex items-center gap-1.5 py-1" role="status" aria-label="NOVA is thinking">
            <span className="nova-dot w-2 h-2 rounded-full bg-[var(--nova-accent)]" />
            <span className="nova-dot w-2 h-2 rounded-full bg-[var(--nova-accent)]" />
            <span className="nova-dot w-2 h-2 rounded-full bg-[var(--nova-accent)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
