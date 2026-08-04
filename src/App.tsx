import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { app } from './config/firebase'; // Ensure initialized
import { AuthScreen } from './frontend/screens/AuthScreen';
import { ChatScreen } from './frontend/screens/ChatScreen';
import { Bot } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20 animate-pulse">
          <Bot size={32} className="text-white" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <ChatScreen userId={user.uid} />;
}

