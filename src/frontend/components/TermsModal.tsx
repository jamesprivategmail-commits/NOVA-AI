import React, { useState } from 'react';
import { ShieldAlert, Check, ExternalLink, ShieldCheck } from 'lucide-react';

interface TermsModalProps {
  onAccept: () => void;
  onDecline?: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ onAccept, onDecline }) => {
  const [hasScrolledBottom, setHasScrolledBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
      setHasScrolledBottom(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95  animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#2b0709] border-2 border-[#3f86ff]/90 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.4)] flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#202022] via-[#2b0709] to-[#202022] border-b border-[#38383b] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2b0709] border border-[#3f86ff] p-1 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <ShieldAlert size={22} className="text-[#3f86ff] animate-pulse" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#3f86ff] font-serif tracking-widest uppercase flex items-center gap-2">
              <span>VOID AI • DISCLAIMER</span>
              <span className="text-xs">⚠️</span>
            </h2>
            <p className="text-[11px] text-[#8d8d91] tracking-wider font-semibold">
              SMARTER. FASTER. POWERED BY THE VOID.
            </p>
          </div>
        </div>

        {/* Scrollable Disclaimer Content */}
        <div 
          onScroll={handleScroll}
          className="p-4 sm:p-6 overflow-y-auto text-xs text-white space-y-4 leading-relaxed custom-scrollbar selection:bg-[#202022] selection:text-white"
        >
          <div className="p-3 bg-[#252527]/40 border border-[#38383b] rounded-xl text-[#8d8d91] font-semibold text-center tracking-tight">
            VOID AI IS AN ADVANCED AI PLATFORM DESIGNED FOR PROGRAMMING, CYBERSECURITY EDUCATION, RESEARCH, AND AUTOMATION.
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="text-[#3f86ff] font-extrabold tracking-widest uppercase border-b border-[#38383b] pb-1 flex items-center gap-1.5 text-xs">
              <span>⚠️ IMPORTANT NOTICE</span>
            </div>
            <p className="text-white text-[11px] pl-1 leading-normal">
              ANY CONTENT RELATED TO PHISHING, SOCIAL ENGINEERING, OR OFFENSIVE SECURITY IS PROVIDED SOLELY FOR EDUCATIONAL, RESEARCH, AND AUTHORIZED TESTING PURPOSES.
            </p>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="text-[#3f86ff] font-extrabold tracking-widest uppercase border-b border-[#38383b] pb-1 flex items-center gap-1.5 text-xs">
              <span>🚫 PROHIBITED USE</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-white text-[11px] pl-1">
              <li>DO NOT USE VOID AI TO TARGET REAL PEOPLE.</li>
              <li>DO NOT USE IT FOR UNAUTHORIZED ACCESS.</li>
              <li>DO NOT USE IT FOR FRAUD, DECEPTION, OR HARM.</li>
            </ul>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="text-[#3f86ff] font-extrabold tracking-widest uppercase border-b border-[#38383b] pb-1 flex items-center gap-1.5 text-xs">
              <span>⚖️ USER RESPONSIBILITY</span>
            </div>
            <p className="text-white text-[11px] pl-1 leading-normal">
              BY USING VOID AI, YOU ACKNOWLEDGE THAT YOU ARE SOLELY RESPONSIBLE FOR HOW YOU USE THE PLATFORM AND THAT ALL ACTIVITIES MUST BE LAWFUL, ETHICAL, AND AUTHORIZED.
            </p>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="text-[#3f86ff] font-extrabold tracking-widest uppercase border-b border-[#38383b] pb-1 flex items-center gap-1.5 text-xs">
              <span>📜 LIMITATION OF LIABILITY</span>
            </div>
            <p className="text-white text-[11px] pl-1 leading-normal">
              NOVA AI IS NOT RESPONSIBLE FOR ANY MISUSE OF VOID AI OR ANY CONSEQUENCES ARISING FROM ILLEGAL OR UNETHICAL USE.
            </p>
          </div>

          <div className="pt-2 border-t border-[#38383b] flex items-center justify-between text-[11px]">
            <span className="text-[#3f86ff] font-bold">🌐 OFFICIAL WEBSITE</span>
            <a 
              href="https://home-of-void.netlify.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#8d8d91] hover:text-white underline font-semibold flex items-center gap-1 transition-colors"
            >
              home-of-void.netlify.app
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Modal Footer & Checkbox */}
        <div className="p-4 bg-[#2b0709] border-t border-[#38383b] space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer group select-none">
            <input 
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="w-4 h-4 accent-[#3f86ff] rounded bg-[#2b0709] border-[#38383b] focus:ring-0 cursor-pointer"
            />
            <span className="text-xs font-bold text-[#8d8d91] group-hover:text-[#8d8d91] transition-colors">
              I HAVE READ, UNDERSTOOD, AND AGREE TO ALL TERMS & CONDITIONS
            </span>
          </label>

          <div className="flex items-center gap-2.5">
            {onDecline && (
              <button
                onClick={onDecline}
                className="w-1/3 py-2.5 px-3 rounded-xl bg-[#252527]/40 hover:bg-[#252527] text-[#8d8d91] hover:text-white border border-[#38383b] text-xs font-bold transition-all cursor-pointer uppercase"
              >
                DECLINE
              </button>
            )}
            <button
              onClick={onAccept}
              disabled={!isChecked}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                isChecked
                  ? "bg-[#3f86ff] hover:opacity-90 text-white cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.6)]"
                  : "bg-[#252527] text-[#8d8d91] border border-[#38383b] cursor-not-allowed"
              }`}
            >
              <ShieldCheck size={16} />
              <span>I ACCEPT & AGREE</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
