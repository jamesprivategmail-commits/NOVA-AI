import React, { useState, useEffect, Suspense, lazy } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { app } from './config/firebase'; // Ensure initialized
import { AuthScreen } from './frontend/screens/AuthScreen';
import { EmailVerificationNotice } from './frontend/screens/EmailVerificationNotice';
import { TermsModal } from './frontend/components/TermsModal';
import { applyAppearance } from './frontend/components/AppearanceMenu';

// Code-split heavy workspace to make initial page load instant on mobile
const ChatScreen = lazy(() => import('./frontend/screens/ChatScreen').then(m => ({ default: m.ChatScreen })));

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    applyAppearance();
    // Clear any legacy demo or guest flags to ensure strict authentication
    try {
      localStorage.removeItem('void_ai_guest_mode');
    } catch (_) {}

    let resolved = false;
    let unsubscribe = () => {};

    // 400ms maximum loading delay - ensures the app never hangs on initialization
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    }, 400);

    try {
      const auth = getAuth(app);
      unsubscribe = onAuthStateChanged(
        auth,
        (u) => {
          resolved = true;
          clearTimeout(timer);
          setUser(u);
          if (u) {
            setIsVerified(true);
            setTermsAccepted(true);
            try {
              localStorage.setItem(`void_ai_terms_accepted_${u.uid}`, 'true');
            } catch (_) {}
          } else {
            setIsVerified(false);
            setTermsAccepted(false);
          }
          setLoading(false);
        },
        (err) => {
          console.warn("[Auth] onAuthStateChanged warning:", err);
          resolved = true;
          clearTimeout(timer);
          setLoading(false);
        }
      );
    } catch (err) {
      console.warn("[Auth] getAuth initialization error:", err);
      resolved = true;
      clearTimeout(timer);
      setLoading(false);
    }

    return () => {
      clearTimeout(timer);
      try {
        unsubscribe();
      } catch (_) {}
    };
  }, []);

  const handleAcceptTerms = () => {
    if (user) {
      try {
        localStorage.setItem(`void_ai_terms_accepted_${user.uid}`, 'true');
      } catch (_) {}
      setTermsAccepted(true);
    }
  };

  const handleDeclineTerms = () => {
    try {
      const auth = getAuth(app);
      auth.signOut();
    } catch (_) {}
  };

  const LoadingStage = ({ label }: { label: string }) => (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-4 relative overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-60"
        style={{ background: 'var(--accent-soft)' }}
      />
      <div className="relative glass-thick rounded-3xl p-2 shadow-[var(--shadow-lg)] flex items-center justify-center overflow-hidden">
        <div className="w-18 h-18 rounded-2xl overflow-hidden border border-[var(--line-strong)]">
          <img
            src="/void-logo.jpg?v=3"
            alt="NOVA AI"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      <div className="relative flex items-center gap-2 font-mono text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--accent-hover)' }}>
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
        <span>{label}</span>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingStage label="Waking Muse Studio..." />;
  }

  // Strict check: Only real authenticated Firebase users can proceed
  if (!user) {
    return <AuthScreen />;
  }

  if (!isVerified) {
    return (
      <EmailVerificationNotice 
        user={user} 
        onVerified={() => setIsVerified(true)} 
      />
    );
  }

  if (!termsAccepted) {
    return (
      <TermsModal 
        onAccept={handleAcceptTerms} 
        onDecline={handleDeclineTerms} 
      />
    );
  }

  return (
    <Suspense fallback={<LoadingStage label="Loading Muse Workspace..." />}>
      <ChatScreen userId={user.uid} />
    </Suspense>
  );
}
