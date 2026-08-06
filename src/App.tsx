import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { app } from './config/firebase'; // Ensure initialized
import { AuthScreen } from './frontend/screens/AuthScreen';
import { ChatScreen } from './frontend/screens/ChatScreen';
import { EmailVerificationNotice } from './frontend/screens/EmailVerificationNotice';
import { TermsModal } from './frontend/components/TermsModal';
import { Bot } from 'lucide-react';

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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/20 animate-pulse">
          <Bot size={32} className="text-white" />
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



