import React, { useState } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { AlertCircle, RefreshCw, Mail, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { validateEmail, validatePassword } from '../../utils/security';

export function AuthScreen() {
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

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
      setInfoMsg(`Password reset link sent to ${email.trim()}. Check your inbox.`);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err?.message || 'Failed to send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
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
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err?.message || 'Google sign-in failed. Please use email/password.');
      }
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
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4 py-8 relative overflow-y-auto">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-900/25 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md flex flex-col items-center z-10 my-auto">
        {/* Logo Header */}
        <div className="relative mb-5">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#3f86ff] via-amber-500 to-[#3f86ff] opacity-60 blur-md" />
          <div className="relative w-20 h-20 rounded-2xl bg-[#0D1019]/90 border border-[#2A3145] p-1.5 flex items-center justify-center shadow-2xl overflow-hidden">
            <img 
              src="/void-logo.jpg" 
              alt="NOVA AI Logo" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-widest uppercase mb-1">
          NOVA AI
        </h1>
        <p className="text-xs font-bold text-[#8d8d91] tracking-widest uppercase mb-5">
          SECURE SYSTEM ACCESS
        </p>

        {/* Security Shield Notice */}
        <div className="w-full mb-4 px-4 py-2 bg-[#202022]/80 border border-[#38383b] rounded-xl flex items-center justify-center gap-2 text-[11px] text-[#8d8d91]">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span>Real Authentication & Anti-Abuse Protection Active</span>
        </div>

        <div className="w-full bg-[#202022] border border-red-900/30 rounded-2xl p-6 shadow-2xl shadow-red-950/20">
          {error && (
            <div className="mb-4 p-3.5 bg-red-950/40 border border-red-800/50 rounded-xl flex items-start gap-3 text-red-400 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <p className="leading-relaxed font-medium">{error}</p>
            </div>
          )}

          {infoMsg && (
            <div className="mb-4 p-3.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-start gap-3 text-emerald-400 text-xs">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <p className="leading-relaxed font-medium">{infoMsg}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Real Google One-Tap Auth */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full py-3 bg-[#181920] hover:bg-[#22232c] border border-[#333644] text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2.5 active:scale-[0.98] pointer-events-auto"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>CONTINUE WITH GOOGLE</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#38383b]"></div>
              <span className="flex-shrink mx-3 text-[10px] text-[#8d8d91] uppercase tracking-widest font-semibold">OR WITH EMAIL</span>
              <div className="flex-grow border-t border-[#38383b]"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-[#38383b]">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {isRegistering ? 'Create Account' : 'Sign In'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError('');
                    setInfoMsg('');
                  }}
                  className="text-[11px] text-[#3f86ff] hover:underline cursor-pointer font-medium pointer-events-auto"
                >
                  {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register'}
                </button>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#8d8d91] block mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-[#8d8d91] pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@gmail.com"
                    className="w-full bg-[#252527] border border-[#38383b] focus:border-[#3f86ff] text-white rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none transition-colors select-text pointer-events-auto"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#8d8d91] block mb-1">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-[#8d8d91] pointer-events-none" />
                  <input
                    type="password"
                    required
                    autoComplete={isRegistering ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isRegistering ? "Password (8+ chars, letters & numbers)" : "Your password"}
                    className="w-full bg-[#252527] border border-[#38383b] focus:border-[#3f86ff] text-white rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none transition-colors select-text pointer-events-auto"
                  />
                </div>
              </div>

              {!isRegistering && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] text-[#8d8d91] hover:text-white underline cursor-pointer pointer-events-auto"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#3f86ff] hover:bg-[#3f86ff]/90 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] pointer-events-auto"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>{isRegistering ? 'CREATING ACCOUNT...' : 'AUTHENTICATING...'}</span>
                  </>
                ) : (
                  <span>{isRegistering ? 'REGISTER WITH EMAIL' : 'SIGN IN'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
