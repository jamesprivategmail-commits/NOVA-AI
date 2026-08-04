import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '../components/Sidebar';
import { MessageBubble } from '../components/MessageBubble';
import { InputArea } from '../components/InputArea';
import { AdminDashboard } from './AdminDashboard';
import { SubscriptionModal } from './SubscriptionModal';
import { SettingsModal } from './SettingsModal';
import { SupportChatScreen } from './SupportChatScreen';
import { Chat, Message, UserProfile } from '../../models/types';
import { createChat, getUserChats, deleteChat, updateChatTitle, saveMessage, getChatMessages, getUserProfile, incrementMessageCount, deleteMessage, updateMessage, sendSupportMessage } from '../../database/db';
import { sendMessageToGemini } from '../../api/client';
import { memoryManager } from '../../memory/context';
import { Menu, Bot, Shield, BadgeCheck } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';

interface ChatScreenProps {
  userId: string;
}

export function ChatScreen({ userId }: ChatScreenProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProfileAndChats();
  }, [userId]);

  useEffect(() => {
    if (currentChatId) {
      loadMessages(currentChatId);
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const loadProfileAndChats = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const p = await getUserProfile(userId, user.email, user.displayName);
      setProfile(p);
    }
    
    const userChats = await getUserChats(userId);
    setChats(userChats);
    if (userChats.length > 0 && !currentChatId) {
      setCurrentChatId(userChats[0].id);
    }
  };

  const loadMessages = async (chatId: string) => {
    const chatMsgs = await getChatMessages(chatId);
    setMessages(chatMsgs);
  };

  const handleNewChat = async () => {
    const chat = await createChat(userId);
    setChats([chat, ...chats]);
    setCurrentChatId(chat.id);
  };

  const handleDeleteChat = async (id: string) => {
    await deleteChat(id);
    const updatedChats = chats.filter(c => c.id !== id);
    setChats(updatedChats);
    if (currentChatId === id) {
      setCurrentChatId(updatedChats.length > 0 ? updatedChats[0].id : null);
    }
  };

  const handleRenameChat = async (id: string, title: string) => {
    await updateChatTitle(id, title);
    setChats(chats.map(c => c.id === id ? { ...c, title } : c));
  };

  const checkLimitations = (): boolean => {
    if (!profile) return false;
    if (profile.isBanned) {
      alert("Your account has been banned. Please contact support.");
      return false;
    }
    if (profile.isAdmin || profile.tier === 'premium') return true;
    
    const today = new Date().toISOString().split('T')[0];
    const isToday = profile.lastMessageDate === today;
    
    if (profile.tier === 'free') {
      if (isToday && profile.messageCount >= 5) {
        alert("Free tier limit reached (5 messages per day). Please upgrade to Pro or Premium.");
        return false;
      }
    } else if (profile.tier === 'pro') {
      if (isToday && profile.messageCount >= 50) {
        alert("Pro tier limit reached (50 messages per day). Please upgrade to Premium.");
        return false;
      }
    }
    
    return true;
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!currentChatId) return;
    await deleteMessage(currentChatId, msgId);
    setMessages(messages.filter(m => m.id !== msgId));
  };

  const handleEditMessage = async (msgId: string, newText: string) => {
    if (!currentChatId) return;
    await updateMessage(currentChatId, msgId, newText);
    setMessages(messages.map(m => m.id === msgId ? { ...m, text: newText } : m));
  };

  const handleSend = async (text: string) => {
    if (!checkLimitations()) return;
    
    let activeChatId = currentChatId;
    
    // Create new chat if none selected
    if (!activeChatId) {
      const chat = await createChat(userId, text.slice(0, 30) + (text.length > 30 ? "..." : ""));
      setChats([chat, ...chats]);
      activeChatId = chat.id;
      setCurrentChatId(activeChatId);
    } else if (messages.length === 0) {
      // Rename generic "New Chat" with first message content
      const chat = chats.find(c => c.id === activeChatId);
      if (chat && chat.title === "New Chat") {
        const newTitle = text.slice(0, 30) + (text.length > 30 ? "..." : "");
        await handleRenameChat(activeChatId, newTitle);
      }
    }

    // Add user message to DB and UI
    const userMsg = await saveMessage(activeChatId, 'user', text);
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    
    setIsLoading(true);
    setStreamingMessage('');

    try {
      const updatedProfile = await incrementMessageCount(userId);
      setProfile(updatedProfile);
      
      const context = memoryManager.buildContext(currentMessages);
      let fullResponse = '';
      
      const provider = localStorage.getItem('NOVA_PROVIDER') || 'gemini';
      const customKey = localStorage.getItem('NOVA_CUSTOM_KEY') || localStorage.getItem('NOVA_OPENAI_KEY') || '';
      
      await sendMessageToGemini(context, provider, customKey, (chunk) => {
        fullResponse += chunk;
        setStreamingMessage(fullResponse);
      });

      // Save complete model message
      const modelMsg = await saveMessage(activeChatId, 'model', fullResponse);
      setMessages([...currentMessages, modelMsg]);
      setStreamingMessage('');
    } catch (error) {
      console.error("Failed to get response", error);
      alert("Error communicating with NOVA AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(getAuth());
  };

  return (
    <div className="flex h-screen bg-[#212121] text-zinc-100 overflow-hidden font-sans">
      <Sidebar 
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={setCurrentChatId}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onOpenSettings={() => setShowSettings(true)}
        onOpenSupport={() => setShowSupport(true)}
        onOpenSubscription={() => setShowSubscription(true)}
        onOpenAdmin={() => setShowAdminPanel(true)}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        isAdmin={profile?.isAdmin || false}
      />
      
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        <header className="h-14 flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 mr-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="font-semibold text-lg flex items-center gap-2 text-zinc-200">
              NOVA AI <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] uppercase font-bold tracking-wider">v1</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {profile && profile.isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium border border-red-500/20"
              >
                <Shield size={16} />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
            {profile && (
              <div className="px-3 py-1.5 bg-zinc-800 rounded-lg text-sm font-medium border border-zinc-700/50 flex items-center gap-2 text-zinc-300">
                <span className="capitalize text-zinc-100">{profile.tier}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                <span>{profile.messageCount} msgs today</span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-3xl mx-auto">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Bot size={32} className="text-black" />
              </div>
              <h1 className="text-[28px] font-semibold mb-8 tracking-tight text-zinc-100">How can I help you today?</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {["Write an email to my boss", "Explain quantum computing", "Help me debug this React code", "Plan a weekend itinerary"].map((suggestion, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSend(suggestion)}
                    className="p-4 bg-transparent hover:bg-[#2f2f2f] border border-zinc-700/50 rounded-xl text-left transition-colors text-zinc-300 hover:text-zinc-100 text-[14px]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="pb-40">
              {messages.map(msg => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  onDelete={handleDeleteMessage}
                  onEdit={handleEditMessage}
                />
              ))}
              {isLoading && streamingMessage && (
                <MessageBubble 
                  message={{ 
                    id: 'temp', 
                    chatId: currentChatId || '', 
                    role: 'model', 
                    text: streamingMessage, 
                    createdAt: Date.now() 
                  }} 
                />
              )}
              {isLoading && !streamingMessage && (
                <div className="flex w-full py-6 px-4 md:px-6 lg:px-8 bg-transparent">
                  <div className="max-w-4xl mx-auto flex w-full gap-4 md:gap-6">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={18} className="text-white" />
                    </div>
                    <div className="flex items-center">
                      <div className="flex space-x-1.5">
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-10">
          <InputArea 
            onSend={handleSend} 
            isLoading={isLoading} 
          />
        </div>
      </div>
      
      {showAdminPanel && (
        <AdminDashboard onClose={() => setShowAdminPanel(false)} />
      )}
      
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
      
      {showSubscription && profile && (
        <SubscriptionModal 
          onClose={() => setShowSubscription(false)} 
          currentTier={profile.tier}
          onRequestUpgrade={async (tier) => {
            setShowSubscription(false);
            setShowSupport(true);
            await sendSupportMessage(profile.uid, profile.displayName || profile.email || 'User', `I would like to upgrade my account to the ${tier.toUpperCase()} tier.`, false);
          }}
        />
      )}
      
      {showSupport && profile && (
        <SupportChatScreen 
          userId={userId} 
          userName={profile.displayName || profile.email || 'User'} 
          onClose={() => setShowSupport(false)} 
        />
      )}
    </div>
  );
}
