import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '../components/Sidebar';
import { MessageBubble } from '../components/MessageBubble';
import { InputArea } from '../components/InputArea';
import { ThinkingIndicator } from '../components/ThinkingIndicator';
import { AdminDashboard } from './AdminDashboard';
import { SubscriptionModal } from './SubscriptionModal';
import { SettingsModal } from './SettingsModal';
import { SupportChatScreen } from './SupportChatScreen';
import { EmailCampaignGenerator } from '../components/EmailCampaignGenerator';
import { LiveVoiceModal } from '../components/LiveVoiceModal';
import { Chat, Message, UserProfile } from '../../models/types';
import {
  createChat,
  getUserChats,
  deleteChat,
  updateChatTitle,
  saveMessage,
  getChatMessages,
  getUserProfile,
  incrementMessageCount,
  deleteMessage,
  updateMessage,
  sendSupportMessage,
  getAIBrainSettings
} from '../../database/db';
import { sendMessageToGroq } from '../../api/client';
import { memoryManager } from '../../memory/context';
import { Menu, Shield, Crown, Mail, ArrowDown, Sparkles, Code, Target, Binary, Zap, Bot, Mic } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { clsx } from 'clsx';
import { motion } from 'motion/react';

interface ChatScreenProps {
  userId: string;
}

export function ChatScreen({ userId }: ChatScreenProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Modals state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showCampaignGenerator, setShowCampaignGenerator] = useState(false);
  const [showLiveVoice, setShowLiveVoice] = useState(false);

  // Auto-scroll state & refs
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Scroll to bottom when messages or streaming updates
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
    if (isAtBottom || streamingMessage) {
      scrollToBottom();
    }
  }, [messages, streamingMessage]);

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
    setShowScrollBottom(!isAtBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
    const updatedChats = chats.filter((c) => c.id !== id);
    setChats(updatedChats);
    if (currentChatId === id) {
      setCurrentChatId(updatedChats.length > 0 ? updatedChats[0].id : null);
    }
  };

  const handleRenameChat = async (id: string, title: string) => {
    await updateChatTitle(id, title);
    setChats(chats.map((c) => (c.id === id ? { ...c, title } : c)));
  };

  const checkLimitations = (): boolean => {
    if (profile?.isBanned) {
      alert('Your account has been restricted. Please contact support.');
      return false;
    }
    return true;
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!currentChatId) return;
    await deleteMessage(currentChatId, msgId);
    setMessages(messages.filter((m) => m.id !== msgId));
  };

  const handleEditMessage = async (msgId: string, newText: string) => {
    if (!currentChatId) return;
    await updateMessage(currentChatId, msgId, newText);
    setMessages(messages.map((m) => (m.id === msgId ? { ...m, text: newText } : m)));
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleSend = async (text: string) => {
    if (!checkLimitations()) return;

    let activeChatId = currentChatId;

    // Create new chat if none selected
    if (!activeChatId) {
      const chat = await createChat(userId, text.slice(0, 32) + (text.length > 32 ? '...' : ''));
      setChats([chat, ...chats]);
      activeChatId = chat.id;
      setCurrentChatId(activeChatId);
    } else if (messages.length === 0) {
      const chat = chats.find((c) => c.id === activeChatId);
      if (chat && chat.title === 'New Chat') {
        const newTitle = text.slice(0, 32) + (text.length > 32 ? '...' : '');
        await handleRenameChat(activeChatId, newTitle);
      }
    }

    // Add user message
    const userMsg = await saveMessage(activeChatId, 'user', text);
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);

    setIsLoading(true);
    setStreamingMessage('');

    abortControllerRef.current = new AbortController();

    try {
      const updatedProfile = await incrementMessageCount(userId);
      setProfile(updatedProfile);

      const context = memoryManager.buildContext(currentMessages);
      let fullResponse = '';

      const systemPrompt = '';
      const userTier = updatedProfile?.tier || profile?.tier || 'free';

      await sendMessageToGroq(
        context,
        systemPrompt,
        (chunk) => {
          fullResponse += chunk;
          setStreamingMessage(fullResponse);
        },
        abortControllerRef.current.signal,
        userId,
        userTier
      );

      // Save complete model message
      if (fullResponse.trim()) {
        const modelMsg = await saveMessage(activeChatId, 'model', fullResponse);
        setMessages([...currentMessages, modelMsg]);
      }
      setStreamingMessage('');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        console.error('Failed to get response', error);
        alert('Error communicating with VOID AI server.');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleLogout = async () => {
    await signOut(getAuth());
  };

  return (
    <div className="flex h-screen bg-[#0D1117] text-[#F8FAFC] overflow-hidden font-sans relative">
      {/* Mobile Backdrop Overlay when Sidebar is expanded */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* Sidebar Component */}
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={(id) => {
          setCurrentChatId(id);
          // Auto close drawer on mobile screen selection
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        onNewChat={() => {
          handleNewChat();
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onOpenSettings={() => setShowSettings(true)}
        onOpenSupport={() => setShowSupport(true)}
        onOpenSubscription={() => setShowSubscription(true)}
        onOpenAdmin={() => setShowAdminPanel(true)}
        onOpenCampaignGenerator={() => setShowCampaignGenerator(true)}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        isAdmin={profile?.isAdmin || false}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 bg-[#0D1117]">
        {/* Header Bar */}
        <header className="h-14 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10 bg-[#0D1117]/80 border-b border-[#30363D] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 rounded-xl hover:bg-[#161B22] text-slate-400 hover:text-slate-100 transition-colors"
              title="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-red-500 via-slate-100 to-blue-500 bg-clip-text text-transparent">
                VOID AI
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-950/70 border border-red-800/40 text-[10px] text-red-400 font-mono font-bold uppercase tracking-wider hidden sm:inline-block">
                PREMIUM INTELLIGENCE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setShowLiveVoice(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl transition-all text-xs font-bold shadow-md shadow-blue-950/40"
              title="Launch Live Voice Call with AI"
            >
              <Mic size={14} className="animate-pulse text-blue-200" />
              <span className="hidden sm:inline">Live Voice</span>
            </button>

            <button
              onClick={() => setShowCampaignGenerator(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl transition-all text-xs font-bold shadow-md shadow-red-950/40"
            >
              <Mail size={14} />
              <span className="hidden sm:inline">Campaign Studio</span>
            </button>

            {profile && profile.isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 text-red-400 rounded-xl hover:bg-red-900/40 transition-colors text-xs font-bold border border-red-800/40"
              >
                <Shield size={14} />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {profile && (
              <button
                onClick={() => setShowSubscription(true)}
                className="px-3 py-1.5 bg-[#161B22] border border-[#30363D] hover:border-amber-500/50 rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-200 transition-all cursor-pointer"
              >
                <Crown size={14} className="text-amber-400" />
                <span className="capitalize text-amber-400 font-bold">{profile.tier}</span>
                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                <span className="text-slate-400 font-mono text-[11px]">{profile.messageCount} msgs</span>
              </button>
            )}
          </div>
        </header>

        {/* Chat Messages Container */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto relative scroll-smooth"
        >
          {messages.length === 0 ? (
            /* Starter / Welcome Screen */
            <div className="h-full flex flex-col items-center justify-center p-6 md:p-10 text-center max-w-4xl mx-auto space-y-8">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-blue-600 p-[1px] shadow-2xl shadow-red-950/60 mb-5">
                  <div className="w-full h-full bg-[#0D1117] rounded-[15px] flex items-center justify-center">
                    <Bot size={34} className="text-red-400" />
                  </div>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">
                  Welcome to <span className="text-red-500">VOID AI</span> Engine
                </h1>
                <p className="text-slate-400 text-sm md:text-base max-w-lg mt-2 leading-relaxed">
                  High-performance artificial intelligence designed for marketing strategy, software architecture, mathematics, and complex reasoning.
                </p>
              </motion.div>

              {/* Categorized Prompt Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-3xl text-left">
                {[
                  {
                    icon: <Mail size={18} className="text-red-400 shrink-0" />,
                    category: "Email Marketing",
                    title: "Draft a 5-part flash sale email launch sequence for a digital SaaS product."
                  },
                  {
                    icon: <Code size={18} className="text-blue-400 shrink-0" />,
                    category: "Software Development",
                    title: "Write a high-performance Express & React TypeScript API wrapper with rate limiting."
                  },
                  {
                    icon: <Target size={18} className="text-emerald-400 shrink-0" />,
                    category: "Growth Strategy",
                    title: "Outline a complete customer retention roadmap for subscription mobile apps."
                  },
                  {
                    icon: <Binary size={18} className="text-purple-400 shrink-0" />,
                    category: "Advanced Math & Code",
                    title: "Derive the mathematical proof for gradient descent optimization algorithms."
                  }
                ].map((item, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.08 }}
                    onClick={() => handleSend(item.title)}
                    className="p-4 bg-[#161B22] hover:bg-[#1C2128] border border-[#30363D] hover:border-red-500/50 rounded-2xl text-left transition-all shadow-md group cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {item.icon}
                      <span className="text-[11px] font-bold font-mono tracking-wider uppercase text-slate-400 group-hover:text-slate-200">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 group-hover:text-white leading-relaxed font-medium">
                      "{item.title}"
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            /* Render Message History */
            <div className="pb-44">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onDelete={handleDeleteMessage}
                  onEdit={handleEditMessage}
                />
              ))}

              {/* Real-time Streaming AI Message */}
              {isLoading && streamingMessage && (
                <MessageBubble
                  message={{
                    id: 'temp',
                    chatId: currentChatId || '',
                    role: 'model',
                    text: streamingMessage,
                    createdAt: Date.now()
                  }}
                  isStreaming={true}
                />
              )}

              {/* Thinking Indicator when waiting for stream start */}
              {isLoading && !streamingMessage && <ThinkingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Floating Scroll to Bottom button */}
        {showScrollBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-28 right-6 p-2.5 bg-[#161B22] border border-[#30363D] hover:border-red-500 text-slate-200 rounded-full shadow-2xl transition-all z-20 flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowDown size={15} />
            <span className="hidden sm:inline">Jump to latest</span>
          </button>
        )}

        {/* Fixed Bottom Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0D1117] via-[#0D1117]/95 to-transparent pt-8 pb-1 z-10">
          <InputArea
            onSend={handleSend}
            isLoading={isLoading}
            onStop={handleStopGeneration}
          />
        </div>
      </div>

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <AdminDashboard onClose={() => setShowAdminPanel(false)} />
      )}

      {/* Email Campaign Studio Modal */}
      {showCampaignGenerator && (
        <EmailCampaignGenerator
          onClose={() => setShowCampaignGenerator(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          isAdmin={profile?.isAdmin || false}
        />
      )}

      {/* Subscription Modal */}
      {showSubscription && profile && (
        <SubscriptionModal
          onClose={() => setShowSubscription(false)}
          currentTier={profile.tier}
          onRequestUpgrade={async (tier) => {
            setShowSubscription(false);
            setShowSupport(true);
            await sendSupportMessage(
              profile.uid,
              profile.displayName || profile.email || 'User',
              `I would like to request an upgrade to the ${tier.toUpperCase()} tier.`,
              false
            );
          }}
        />
      )}

      {/* Support Chat Screen */}
      {showSupport && profile && (
        <SupportChatScreen
          userId={userId}
          userName={profile.displayName || profile.email || 'User'}
          onClose={() => setShowSupport(false)}
        />
      )}

      {/* Live Voice Chat Modal */}
      {showLiveVoice && (
        <LiveVoiceModal
          onClose={() => setShowLiveVoice(false)}
          userId={userId}
          userTier={profile?.tier || 'free'}
        />
      )}
    </div>
  );
}
