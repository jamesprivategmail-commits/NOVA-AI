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
        setError('Too many requests. Please wait a minute before requesting another email.');
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
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="w-full max-w-md glass-thick rounded-3xl p-6 sm:p-8 text-center relative z-10 text-[var(--text-primary)] animate-riseIn">
        <div
          className="w-16 h-16 border border-[var(--accent-muted)] rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          <ShieldAlert size={30} />
        </div>

        <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-2 tracking-tight">
          Verify Your Email
        </h2>

        <p className="text-xs text-[var(--text-secondary)] mb-5 leading-relaxed">
          To secure your workspace, please confirm your email address using the link sent to:
        </p>

        <div className="glass-subtle rounded-xl p-3 mb-5 text-xs text-[var(--text-primary)] font-semibold break-all">
          {user.email}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2 text-left">
            <AlertCircle size={16} className="shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {msg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-200 text-xs flex items-center gap-2 text-left">
            <CheckCircle size={16} className="shrink-0 text-emerald-500" />
            <span>{msg}</span>
          </div>
        )}

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleCheckVerification}
            disabled={checking}
            className="btn btn-primary w-full py-3 text-xs"
          >
            {checking ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            <span>I've Verified — Continue</span>
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="btn btn-ghost w-full py-2.5 text-xs"
          >
            {resending ? <RefreshCw size={14} className="animate-spin" /> : <Mail size={14} />}
            <span>Resend Verification Email</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs flex items-center justify-center gap-2 transition-colors pt-1 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out / Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
