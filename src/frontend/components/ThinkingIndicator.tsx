import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Bot } from 'lucide-react';

export function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.2 }}
      className="w-full py-5 px-4 md:px-6 lg:px-8"
    >
      <div className="max-w-4xl mx-auto flex gap-4 md:gap-5 items-start">
        {/* Animated Avatar Orb */}
        <div className="relative flex items-center justify-center shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-blue-600 p-[1px] shadow-lg shadow-red-950/40">
            <div className="w-full h-full bg-[#0D1117] rounded-[11px] flex items-center justify-center">
              <Bot size={16} className="text-red-400 animate-pulse" />
            </div>
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </div>

        {/* Shimmering Wave & Label */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono tracking-wider uppercase text-red-400 flex items-center gap-1.5">
              <Sparkles size={13} className="animate-spin text-red-400" />
              VOID AI THINKING
            </span>
          </div>

          <div className="flex items-center gap-1.5 py-1">
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
              className="w-2.5 h-2.5 rounded-full bg-red-500"
            />
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
              className="w-2.5 h-2.5 rounded-full bg-red-400"
            />
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
              className="w-2.5 h-2.5 rounded-full bg-blue-500"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
