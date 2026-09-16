import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { app } from './config/firebase'; // Ensure initialized
import { AuthScreen } from './frontend/screens/AuthScreen';
import { ChatScreen } from './frontend/screens/ChatScreen';
import { EmailVerificationNotice } from './frontend/screens/EmailVerificationNotice';
import { TermsModal } from './frontend/components/TermsModal';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Google auth automatically verifies email, or if user is admin or verified email
        const isGoogle = u.providerData?.some(p => p.providerId === 'google.com');
        const isAdmin = u.email === 'mrnovatech4@gmail.com';
        setIsVerified(u.emailVerified || isGoogle || isAdmin);

        // Check terms acceptance
        const accepted = localStorage.getItem(`void_ai_terms_accepted_${u.uid}`) === 'true';
        setTermsAccepted(accepted);
      } else {
        setIsVerified(false);
        setTermsAccepted(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-900/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative w-16 h-16 rounded-2xl bg-black border border-red-600/80 p-2 shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center justify-center">
          <img 
            src="https://i.postimg.cc/8PVBFM75/file-00000000b40c82118dbaef206a9ebedc.png" 
            alt="VOID AI Profile" 
            className="w-full h-full object-contain"
          />
        </div>
        <div className="relative flex items-center gap-2 text-red-500 font-mono text-xs font-bold tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span>INITIALIZING VOID AI...</span>
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

  return <ChatScreen userId={user.uid} />;
}



