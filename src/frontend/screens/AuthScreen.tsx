import React, { useState } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Skull, AlertCircle, RefreshCw } from 'lucide-react';

export function AuthScreen() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setError('Sign-in process was closed before completion. Click below to try again.');
      } else if (err?.code === 'auth/popup-blocked') {
        setError('Pop-up was blocked by your browser. Please allow pop-ups for this page and try again.');
      } else {
        setError(err?.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-900/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md flex flex-col items-center z-10">
        {/* Skull Icon Header */}
        <div className="w-20 h-20 bg-red-950/60 border border-red-800/40 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-red-950/50">
          <Skull size={40} className="text-red-500 animate-pulse" />
        </div>

        <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-1">
          VOID AI
        </h1>
        <p className="text-xs font-mono font-bold text-red-500/80 tracking-widest uppercase mb-8">
          SYSTEM ACCESS REQUIRED
        </p>

        <div className="w-full bg-zinc-950 border border-red-900/30 rounded-2xl p-6 shadow-2xl shadow-red-950/20 backdrop-blur-md">
          {error && (
            <div className="mb-5 p-3.5 bg-red-950/40 border border-red-800/50 rounded-xl flex items-start gap-3 text-red-400 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <p className="leading-relaxed font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-zinc-900 hover:bg-zinc-850 active:bg-zinc-800 border border-red-900/40 hover:border-red-600 rounded-xl font-bold text-sm text-zinc-100 transition-all flex items-center justify-center gap-3 shadow-lg shadow-black group disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw size={18} className="animate-spin text-red-500" />
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="tracking-wider text-xs font-mono uppercase group-hover:text-red-400 transition-colors">
                  INITIALIZE UPLINK
                </span>
              </>
            )}
          </button>

          <div className="mt-4 text-center">
            <span className="text-[11px] font-mono text-zinc-500">
              SECURE GOOGLE AUTHENTICATION ONLY
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

