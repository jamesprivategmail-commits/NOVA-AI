import React, { useState } from 'react';
import { getAuth, sendEmailVerification, signOut, User } from 'firebase/auth';
import { Mail, CheckCircle, RefreshCw, LogOut, ShieldAlert, AlertCircle } from 'lucide-react';

interface EmailVerificationNoticeProps {
  user: User;
  onVerified: () => void;
}

export function EmailVerificationNotice({ user, onVerified }: EmailVerificationNoticeProps) {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleCheckVerification = async () => {
    setChecking(true);
    setMsg('');
    setError('');

    try {
      const auth = getAuth();
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          onVerified();
        } else {
          setError('Email is not verified yet. Please check your inbox and click the verification link.');
        }
      }
    } catch (err: any) {
      console.error('Error reloading user:', err);
      setError('Could not verify status. Try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setMsg('');
    setError('');

    try {
      const auth = getAuth();
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setMsg(`Verification email resent to ${user.email}. Check your spam folder if not visible.`);
      }
    } catch (err: any) {
      console.error('Resend error:', err);
      if (err?.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a minute before requesting another verification email.');
      } else {
        setError(err?.message || 'Could not resend email.');
      }
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="w-full max-w-md bg-zinc-950 border border-red-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-950/30 text-center relative z-10">
        <div className="w-16 h-16 bg-red-950/80 border border-red-800/60 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-500 shadow-lg">
          <ShieldAlert size={32} />
        </div>

        <h2 className="text-xl font-extrabold text-white mb-2 tracking-tight">
          Email Verification Required
        </h2>

        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          To prevent fake accounts and secure system resources, VOID AI requires email verification. We sent a link to:
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-6 font-mono text-xs text-red-400 font-bold break-all">
          {user.email}
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-400 text-xs flex items-center gap-2 text-left">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {msg && (
          <div className="mb-5 p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-emerald-400 text-xs flex items-center gap-2 text-left">
            <CheckCircle size={16} className="shrink-0 text-emerald-400" />
            <span>{msg}</span>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleCheckVerification}
            disabled={checking}
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-red-950/50 flex items-center justify-center gap-2"
          >
            {checking ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            <span>I'VE VERIFIED MY EMAIL — ACCESS SYSTEM</span>
          </button>

          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {resending ? <RefreshCw size={14} className="animate-spin text-red-400" /> : <Mail size={14} />}
            <span>Resend Verification Email</span>
          </button>

          <button
            onClick={handleSignOut}
            className="w-full py-2.5 text-zinc-500 hover:text-zinc-300 font-mono text-xs flex items-center justify-center gap-2 transition-colors pt-2"
          >
            <LogOut size={14} />
            <span>Sign Out / Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
