import React, { useState, useEffect, Suspense, lazy } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { app } from './config/firebase'; // Ensure initialized
import { AuthScreen } from './frontend/screens/AuthScreen';
import { EmailVerificationNotice } from './frontend/screens/EmailVerificationNotice';
import { TermsModal } from './frontend/components/TermsModal';

// Code-split heavy workspace to make initial page load instant on mobile
const ChatScreen = lazy(() => import('./frontend/screens/ChatScreen').then(m => ({ default: m.ChatScreen })));

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const auth = getAuth(app);
    let resolved = false;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      resolved = true;
      setUser(u);
      if (u) {
        setIsVerified(true);
        const accepted = localStorage.getItem(`void_ai_terms_accepted_${u.uid}`) === 'true';
        setTermsAccepted(accepted);
      } else {
        setIsVerified(false);
        setTermsAccepted(false);
      }
      setLoading(false);
    });

    const timeout = setTimeout(() => {
      if (!resolved) {
        console.warn("[Auth] Auth check timed out, showing screen.");
        setLoading(false);
      }
    }, 2500);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleAcceptTerms = () => {
    if (user) {
      localStorage.setItem(`void_ai_terms_accepted_${user.uid}`, 'true');
      setTermsAccepted(true);
    }
  };

  const handleDeclineTerms = () => {
    const auth = getAuth(app);
    auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06070a] flex flex-col items-center justify-center gap-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-900/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative w-20 h-20 rounded-2xl bg-black border border-red-600/80 p-1.5 shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center justify-center overflow-hidden">
          <img 
            src="/void-logo.jpg" 
            alt="NOVA AI Profile" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative flex items-center gap-2 text-red-500 font-mono text-xs font-bold tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span>INITIALIZING NOVA AI...</span>
        </div>
      </div>
    );
  }

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
    <Suspense fallback={
      <div className="min-h-screen bg-[#06070a] flex flex-col items-center justify-center gap-4 relative overflow-hidden">
        <div className="w-20 h-20 rounded-2xl bg-black border border-red-600/80 p-1.5 shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center justify-center overflow-hidden">
          <img 
            src="/void-logo.jpg" 
            alt="NOVA AI" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex items-center gap-2 text-red-500 font-mono text-xs font-bold tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span>LOADING NOVA AI...</span>
        </div>
      </div>
    }>
      <ChatScreen userId={user.uid} />
    </Suspense>
  );
}
