import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full glass-thick border border-amber-500/45 px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-[var(--shadow-md)]"
    >
      <WifiOff size={13} className="text-amber-500 shrink-0" />
      <span>Offline Mode — Cached workspace active</span>
    </div>
  );
};
