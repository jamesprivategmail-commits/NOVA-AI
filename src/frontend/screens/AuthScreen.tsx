import React, { useState } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
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
  const [resetSent, setResetSent] = useState(false);

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
      {/* Ambient background glow */}
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

        <div className="w-full bg-[#202022] border border-red-900/30 rounded-2xl p-6 shadow-2xl shadow-red-950/20">
          {error && (
            <div className="mb-5 p-3.5 bg-[#252527]/40 border border-[#38383b]/50 rounded-xl flex items-start gap-3 text-red-400 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <p className="leading-relaxed font-medium">{error}</p>
            </div>
          )}

          {infoMsg && (
            <div className="mb-5 p-3.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-start gap-3 text-emerald-400 text-xs">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <p className="leading-relaxed font-medium">{infoMsg}</p>
            </div>
          )}

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
                className="text-[11px] text-[#3f86ff] hover:underline cursor-pointer font-medium"
              >
                {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register'}
              </button>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#8d8d91] block mb-1">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-[#8d8d91]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full bg-[#252527] border border-[#38383b] focus:border-[#3f86ff] text-white rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#8d8d91] block mb-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-[#8d8d91]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegistering ? "Password (8+ chars, letters & numbers)" : "Your password"}
                  className="w-full bg-[#252527] border border-[#38383b] focus:border-[#3f86ff] text-white rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none transition-colors"
                />
              </div>
            </div>

            {!isRegistering && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] text-[#8d8d91] hover:text-white underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#3f86ff] hover:bg-[#3f86ff]/90 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
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
  );
}
