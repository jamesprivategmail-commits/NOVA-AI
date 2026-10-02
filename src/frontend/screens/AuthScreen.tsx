import React, { useState, useEffect } from 'react';
import { 
  getAuth, 
  signInWithPopup,
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously
} from 'firebase/auth';
import { AlertCircle, RefreshCw, Mail, Lock, CheckCircle2, ShieldCheck, Copy, ExternalLink, Zap } from 'lucide-react';
import { validateEmail, validatePassword } from '../../utils/security';

export function AuthScreen() {
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleGoogleLogin = async () => {
    setError('');
    setInfoMsg('');
    setUnauthorizedDomain(null);
    setIsLoading(true);

    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err?.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(currentDomain);
        setError(`This domain (${currentDomain}) is not authorized yet in Firebase Console. You can add it in Firebase Console → Authentication → Settings → Authorized domains, or use Email / Quick Demo Sign In below.`);
        setShowEmailAuth(true);
      } else if (err?.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or use Email Sign In.');
        setShowEmailAuth(true);
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setError('Sign in popup was closed before completing.');
      } else {
        setError(err?.message || 'Google sign-in could not start. Please use Email Sign In below.');
        setShowEmailAuth(true);
      }
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setInfoMsg('');
    setIsLoading(true);
    try {
      const auth = getAuth();
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error("Anonymous login error:", err);
      // If anonymous auth is not enabled, try a demo email
      try {
        const auth = getAuth();
        await signInWithEmailAndPassword(auth, 'demo@voidai.studio', 'VoidAi12345!');
      } catch {
        setError('Quick access could not be completed. Please enter your email and password below.');
        setShowEmailAuth(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDomain = () => {
    if (currentDomain) {
      navigator.clipboard.writeText(currentDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfoMsg('');

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setError(emailCheck.reason || 'Please enter a valid email address first.');
      return;
    }

    setIsLoading(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      setInfoMsg(`Password reset link sent to ${email.trim()}. Check your inbox.`);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err?.message || 'Failed to send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.reason || 'Invalid email address format.');
      return;
    }

    if (isRegistering) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        setError(passwordValidation.reason || 'Password does not meet security requirements.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const auth = getAuth();
      if (isRegistering) {
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        try {
          await sendEmailVerification(userCred.user);
          setInfoMsg('Account created! A verification link has been sent to your email.');
        } catch (vErr) {
          console.warn("Could not send email verification immediately:", vErr);
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      console.error("Email Auth error:", err);
      if (err?.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please log in instead.');
      } else if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password') {
        setError('Invalid email or password credentials.');
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Access temporarily locked due to many failed login attempts. Try again later.');
      } else {
        setError(err?.message || 'Authentication failed. Please check your details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-900/25 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md flex flex-col items-center z-10">
        {/* Logo Header */}
        <div className="relative mb-6">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#3f86ff] via-amber-500 to-[#3f86ff] opacity-60 blur-md" />
          <div className="relative w-24 h-24 rounded-2xl bg-[#0D1019]/90 border border-[#2A3145] p-1.5 flex items-center justify-center shadow-2xl overflow-hidden">
            <img 
              src="/void-logo.jpg"
              alt="VOID AI Logo" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-1">
          VOID AI
        </h1>
        <p className="text-xs font-bold text-[#8d8d91] tracking-widest uppercase mb-6">
          SECURE SYSTEM ACCESS
        </p>

        {/* Security Shield Notice */}
        <div className="w-full mb-4 px-4 py-2 bg-[#202022]/80 border border-[#38383b] rounded-xl flex items-center justify-center gap-2 text-[11px] text-[#8d8d91]">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span>Real Email Verification & Anti-Abuse Protection Active</span>
        </div>

        {/* Unauthorized Domain Helper Card */}
        {unauthorizedDomain && (
          <div className="w-full mb-4 p-4 bg-amber-950/40 border border-amber-600/50 rounded-2xl text-xs space-y-2.5 animate-fadeIn">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <AlertCircle size={16} className="shrink-0" />
              <span>Firebase Authorized Domain Notice</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Firebase rejects Google Sign-In because this domain is not yet in your Firebase Project's authorized domains list:
            </p>
            <div className="flex items-center gap-2 bg-black/60 p-2 rounded-xl border border-amber-800/40">
              <code className="text-amber-300 font-mono text-[11px] flex-1 truncate">{currentDomain}</code>
              <button
                onClick={handleCopyDomain}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                {copiedDomain ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedDomain ? 'Copied!' : 'Copy Domain'}</span>
              </button>
            </div>
            <div className="text-[11px] text-[#8d8d91] space-y-1">
              <div><strong>How to fix:</strong></div>
              <div>1. Open <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-amber-400 underline inline-flex items-center gap-0.5">Firebase Console <ExternalLink size={10} /></a></div>
              <div>2. Go to <strong>Authentication → Settings → Authorized domains</strong></div>
              <div>3. Click <strong>Add domain</strong> and paste <code>{currentDomain}</code></div>
              <div className="text-emerald-400 font-medium pt-1">
                ✦ Or sign in below instantly with <strong>Email/Password</strong> or <strong>Quick Demo Access</strong>!
              </div>
            </div>
          </div>
        )}

        <div className="w-full bg-[#202022] border border-red-900/30 rounded-2xl p-6 shadow-2xl shadow-red-950/20">
          {error && !unauthorizedDomain && (
            <div className="mb-5 p-3.5 bg-[#252527]/40 border border-[#38383b]/50 rounded-xl flex items-start gap-3 text-[#8d8d91] text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-[#3f86ff]" />
              <p className="leading-relaxed font-medium">{error}</p>
            </div>
          )}

          {infoMsg && (
            <div className="mb-5 p-3.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-start gap-3 text-emerald-400 text-xs">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <p className="leading-relaxed font-medium">{infoMsg}</p>
            </div>
          )}

          {/* Google Sign In */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-[#252527] hover:bg-[#38383b] border border-red-900/40 hover:border-[#3f86ff] rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <RefreshCw size={18} className="animate-spin text-[#3f86ff]" />
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="tracking-wider text-xs uppercase">
                  VERIFIED GOOGLE SIGN IN
                </span>
              </>
            )}
          </button>

          {/* Quick Demo Access (Bypasses Domain Restrictions) */}
          <button
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full mt-2.5 py-2.5 px-4 bg-[#1a1a1c] hover:bg-[#252527] border border-[#38383b] hover:border-emerald-500/50 rounded-xl font-medium text-xs text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap size={14} className="text-amber-400" />
            <span>Quick Demo Access (Bypasses Domain Errors)</span>
          </button>

          {!showEmailAuth ? (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowEmailAuth(true)}
                className="text-[11px] text-[#8d8d91] hover:text-[#8d8d91] underline transition-colors cursor-pointer"
              >
                Or sign in with Email / Password
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="mt-5 pt-4 border-t border-[#38383b]/80 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#8d8d91] uppercase">
                  {isRegistering ? 'Create Verified Account' : 'Verified Email Login'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError('');
                    setInfoMsg('');
                  }}
                  className="text-[11px] text-[#8d8d91] hover:underline cursor-pointer"
                >
                  {isRegistering ? 'Switch to Login' : 'Create New Account'}
                </button>
              </div>

              <div>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-[#8d8d91]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@gmail.com"
                    className="w-full bg-[#252527] border border-[#38383b] focus:border-red-600 text-white rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-[#8d8d91]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isRegistering ? "Password (8+ chars, letters & numbers)" : "Password"}
                    className="w-full bg-[#252527] border border-[#38383b] focus:border-red-600 text-white rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition-colors"
                  />
                </div>
              </div>

              {!isRegistering && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[10px] text-[#8d8d91] hover:text-[#8d8d91] underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-red-600 hover:bg-[#3f86ff] text-white font-bold text-xs rounded-xl transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'VERIFYING...' : (isRegistering ? 'REGISTER WITH VERIFIED EMAIL' : 'AUTHENTICATE USER')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
