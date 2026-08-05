import React, { useState } from 'react';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { Skull, AlertCircle, RefreshCw, Mail, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';
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

  const handleGoogleLogin = async () => {
    setError('');
    setInfoMsg('');
    setIsLoading(true);

    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setError('Sign-in process was closed before completion. Click below or use Email Sign In.');
      } else if (err?.code === 'auth/popup-blocked') {
        setError('Pop-up was blocked by your browser. Please allow pop-ups or use Email Sign In.');
      } else {
        setError('Google Auth popup unreachable in preview container. Use Email Sign In below.');
      }
      setShowEmailAuth(true);
    } finally {
      setIsLoading(false);
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

    // 1. Strict Email Validation (Blocks fake/disposable email domains like mailinator, 10minutemail, etc.)
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.reason || 'Invalid email address format.');
      return;
    }

    // 2. Strict Password Validation on Registration
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
        
        // Trigger Firebase Email Verification
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
        <p className="text-xs font-mono font-bold text-red-500/80 tracking-widest uppercase mb-6">
          SECURE SYSTEM ACCESS
        </p>

        {/* Security Shield Notice */}
        <div className="w-full mb-4 px-4 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-center justify-center gap-2 text-[11px] text-zinc-400 font-mono">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span>Real Email Verification & Anti-Abuse Protection Active</span>
        </div>

        <div className="w-full bg-zinc-950 border border-red-900/30 rounded-2xl p-6 shadow-2xl shadow-red-950/20 backdrop-blur-md">
          {error && (
            <div className="mb-5 p-3.5 bg-red-950/40 border border-red-800/50 rounded-xl flex items-start gap-3 text-red-400 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <p className="leading-relaxed font-medium">{error}</p>
            </div>
          )}

          {infoMsg && (
            <div className="mb-5 p-3.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-start gap-3 text-emerald-400 text-xs">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <p className="leading-relaxed font-medium">{infoMsg}</p>
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
                  VERIFIED GOOGLE SIGN IN
                </span>
              </>
            )}
          </button>

          {!showEmailAuth ? (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowEmailAuth(true)}
                className="text-[11px] font-mono text-zinc-500 hover:text-red-400 underline transition-colors"
              >
                Or sign in with Email / Password
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="mt-5 pt-4 border-t border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold text-zinc-400 uppercase">
                  {isRegistering ? 'Create Verified Account' : 'Verified Email Login'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError('');
                    setInfoMsg('');
                  }}
                  className="text-[11px] text-red-400 hover:underline font-mono"
                >
                  {isRegistering ? 'Switch to Login' : 'Create New Account'}
                </button>
              </div>

              <div>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@gmail.com"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 text-zinc-100 rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isRegistering ? "Password (8+ chars, letters & numbers)" : "Password"}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 text-zinc-100 rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              {!isRegistering && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[10px] text-zinc-500 hover:text-red-400 font-mono underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-mono rounded-xl transition-colors shadow-md disabled:opacity-50"
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


