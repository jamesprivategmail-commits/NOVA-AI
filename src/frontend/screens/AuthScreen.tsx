import React, { useState, useEffect } from 'react';
import {
  getAuth,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { AlertCircle, RefreshCw, Mail, Lock, CheckCircle2 } from 'lucide-react';
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

  // Handle redirect result when returning from Google / Apple OAuth
  useEffect(() => {
    getRedirectResult(getAuth())
      .catch((err) => {
        console.error("OAuth redirect error:", err);
        if (err?.code === 'auth/unauthorized-domain') {
          setError('This domain needs to be added in Firebase Console → Authentication → Settings → Authorized domains. Or use Email Sign In below.');
        } else if (err?.code === 'auth/configuration-not-found') {
          setError('This sign-in provider is not enabled in Firebase Console. Or use Email Sign In below.');
        } else if (err?.message) {
          setError(err.message);
        }
        setShowEmailAuth(true);
      });
  }, []);

  const handleGoogleLogin = async () => {
    setError('');
    setInfoMsg('');
    setIsLoading(true);

    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err?.code === 'auth/unauthorized-domain') {
        setError('This domain needs to be added in Firebase Console → Authentication → Settings → Authorized domains. Or use Email Sign In below.');
      } else {
        setError('Google sign-in could not start. Please use Email Sign In below.');
      }
      setShowEmailAuth(true);
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setError('');
    setInfoMsg('');
    setIsLoading(true);

    try {
      const auth = getAuth();
      const provider = new OAuthProvider('apple.com');
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error("Apple Auth error:", err);
      if (err?.code === 'auth/configuration-not-found' || err?.code === 'auth/unauthorized-domain') {
        setError('Apple/iCloud sign-in is not configured yet. Please use Email Sign In below.');
      } else {
        setError('iCloud sign-in could not start. Please use Email Sign In below.');
      }
      setShowEmailAuth(true);
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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-7 relative overflow-hidden">
      <div className="w-full max-w-[390px] flex flex-col items-center">
        {/* Logo */}
        <div className="w-14 h-14 rounded-[14px] bg-[#111] overflow-hidden mb-9">
          <img
            src="https://i.postimg.cc/1XPrhZ00/images-(1).jpg"
            alt="Void AI"
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-white text-xl font-bold mb-6 text-center">Sign in to Void AI</h1>

        {/* Error / Info messages */}
        {error && (
          <div className="w-full mb-4 p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-start gap-3 text-white/70 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
            <p className="leading-relaxed font-medium">{error}</p>
          </div>
        )}

        {infoMsg && (
          <div className="w-full mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3 text-emerald-400 text-xs">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
            <p className="leading-relaxed font-medium">{infoMsg}</p>
          </div>
        )}

        {/* Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 text-black rounded-xl py-3.5 px-4 font-medium text-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <RefreshCw size={18} className="animate-spin" />
          ) : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.23a4.47 4.47 0 0 1-1.94 2.93v2.44h3.14c1.84-1.69 2.92-4.18 2.92-7.24z" />
              <path fill="#34A853" d="M12 21.96c2.63 0 4.84-.87 6.45-2.35l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.74 9.74 0 0 0 12 21.96z" />
              <path fill="#FBBC05" d="M6.54 14.06A5.86 5.86 0 0 1 6.23 12c0-.72.12-1.42.31-2.06V7.42H3.3A9.95 9.95 0 0 0 2.25 12c0 1.61.39 3.14 1.05 4.58l3.24-2.52z" />
              <path fill="#EA4335" d="M12 5.91c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 2.99 14.63 2.04 12 2.04a9.74 9.74 0 0 0-8.7 5.38l3.24 2.52c.77-2.31 2.92-4.03 5.46-4.03z" />
            </svg>
          )}
          <span>Continue with Google</span>
        </button>

        {/* iCloud / Apple */}
        <button
          onClick={handleAppleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 text-black rounded-xl py-3.5 px-4 font-medium text-sm transition-all disabled:opacity-50 cursor-pointer mt-3"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.3.74 3.1.81 1.2-.24 2.35-.93 3.63-.84 1.53.12 2.68.73 3.44 1.82-3.17 1.9-2.42 6.1.49 7.26-.58 1.53-1.33 3.05-2.66 3.92zM12.03 7.25c-.15-2.27 1.69-4.15 3.81-4.25.29 2.63-2.39 4.56-3.81 4.25z" />
          </svg>
          <span>Continue with iCloud</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5 w-full">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/40">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email / Password auth */}
        {!showEmailAuth ? (
          <button
            onClick={() => setShowEmailAuth(true)}
            className="w-full text-center text-sm text-white/50 hover:text-white/80 underline transition-colors cursor-pointer"
          >
            Or sign in with Email / Password
          </button>
        ) : (
          <form onSubmit={handleEmailAuth} className="w-full space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">
                {isRegistering ? 'Create Verified Account' : 'Verified Email Login'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                  setInfoMsg('');
                }}
                className="text-[11px] text-white/50 hover:text-white/80 underline cursor-pointer"
              >
                {isRegistering ? 'Switch to Login' : 'Create New Account'}
              </button>
            </div>

            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-white/40" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@gmail.com"
                className="w-full bg-white/5 border border-white/10 focus:border-white/30 text-white rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none transition-colors placeholder:text-white/30"
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-white/40" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegistering ? "Password (8+ chars, letters & numbers)" : "Password"}
                className="w-full bg-white/5 border border-white/10 focus:border-white/30 text-white rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none transition-colors placeholder:text-white/30"
              />
            </div>

            {!isRegistering && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] text-white/50 hover:text-white/80 underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-white hover:bg-white/90 text-black font-bold text-sm rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'VERIFYING...' : (isRegistering ? 'REGISTER WITH VERIFIED EMAIL' : 'AUTHENTICATE USER')}
            </button>
          </form>
        )}

        {/* Terms note */}
        <p className="text-xs text-white/40 text-center mt-6 leading-relaxed">
          By continuing, you agree to Void AI's{' '}
          <a href="#" className="text-white/60 hover:text-white/90 underline">Terms</a>
          {' '}and{' '}
          <a href="#" className="text-white/60 hover:text-white/90 underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
