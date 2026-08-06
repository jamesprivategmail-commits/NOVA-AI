import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '../components/Sidebar';
import { MessageBubble } from '../components/MessageBubble';
import { InputArea } from '../components/InputArea';
import { ThinkingIndicator } from '../components/ThinkingIndicator';
import { AdminDashboard } from './AdminDashboard';
import { SubscriptionModal } from './SubscriptionModal';
import { SettingsModal } from './SettingsModal';
import { SupportChatScreen } from './SupportChatScreen';
import { FullPageSupportDesk } from './FullPageSupportDesk';
import { EmailCampaignGenerator } from '../components/EmailCampaignGenerator';
import { LiveVoiceModal } from '../components/LiveVoiceModal';
import { Chat, Message, UserProfile, BroadcastMessage } from '../../models/types';
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
  getAIBrainSettings,
  listenToBroadcasts
} from '../../database/db';
import { sendMessageToGroq } from '../../api/client';
import { memoryManager } from '../../memory/context';
import { Menu, Shield, Crown, Mail, ArrowDown, Sparkles, Code, Target, Binary, Zap, Bot, Mic, ChevronDown, Send, Radio, X } from 'lucide-react';
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

  // AI Model Selection state
  const [selectedProvider, setSelectedProvider] = useState<'groq' | 'cohere'>('groq');
  const [selectedModel, setSelectedModel] = useState<string>('auto');

  // Modals state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showCampaignGenerator, setShowCampaignGenerator] = useState(false);
  const [showLiveVoice, setShowLiveVoice] = useState(false);

  // Broadcasts state
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [dismissedBroadcastIds, setDismissedBroadcastIds] = useState<string[]>([]);

  useEffect(() => {
    const unsubBroadcasts = listenToBroadcasts((bList) => {
      setBroadcasts(bList);
    });
    return () => unsubBroadcasts();
  }, []);

  const userTier = profile?.tier || 'free';
  const activeBroadcast = broadcasts.find(b => {
    if (dismissedBroadcastIds.includes(b.id)) return false;
    if (!b.targetTier || b.targetTier === 'all') return true;
    return b.targetTier === userTier;
  });

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
      scrollToBottom(!!streamingMessage);
    }
  }, [messages, streamingMessage]);

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
    setShowScrollBottom(!isAtBottom);
  };

  const scrollToBottom = (instant = true) => {
    const container = chatContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
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
    if (!profile) return false;
    if (profile.isBanned) {
      alert('Your account has been restricted. Please contact support.');
      return false;
    }
    // Only VIP tier bypasses daily message limits
    if (profile.tier === 'vip') return true;

    const today = new Date().toISOString().split('T')[0];
    const isToday = profile.lastMessageDate === today;
    const currentCount = isToday ? (profile.messageCount || 0) : 0;

    if (profile.tier === 'free') {
      if (currentCount >= 5) {
        alert('Free tier limit reached (5 messages per day). Please upgrade your plan.');
        setShowSubscription(true);
        return false;
      }
    } else if (profile.tier === 'pro') {
      if (currentCount >= 50) {
        alert('Pro tier limit reached (50 messages per day). Please upgrade your plan.');
        setShowSubscription(true);
        return false;
      }
    } else if (profile.tier === 'premium') {
      if (currentCount >= 250) {
        alert('Premium tier limit reached (250 messages per day). Please upgrade your plan.');
        setShowSubscription(true);
        return false;
      }
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

    // Optimistic user message for 0ms input lag
    const tempUserMsgId = 'user-' + Date.now();
    const optimisticUserMsg: Message = {
      id: tempUserMsgId,
      chatId: activeChatId,
      role: 'user',
      text,
      createdAt: Date.now()
    };

    const currentMessages = [...messages, optimisticUserMsg];
    setMessages(currentMessages);

    // Persist user message to db asynchronously
    saveMessage(activeChatId, 'user', text).catch((err) => console.error('Failed async message save:', err));

    setIsLoading(true);
    setStreamingMessage('');

    abortControllerRef.current = new AbortController();

    try {
      const updatedProfile = await incrementMessageCount(userId);
      setProfile(updatedProfile);

      const context = memoryManager.buildContext(currentMessages);
      let fullResponse = '';
      let lastStreamUpdate = 0;

      const systemPrompt = '';
      const userTier = updatedProfile?.tier || profile?.tier || 'free';

      await sendMessageToGroq(
        context,
        systemPrompt,
        (chunk) => {
          fullResponse += chunk;
          const now = Date.now();
          if (now - lastStreamUpdate > 35) { // Throttle stream updates to ~28 FPS max for smooth mobile frame rates
            lastStreamUpdate = now;
            setStreamingMessage(fullResponse);
          }
        },
        abortControllerRef.current.signal,
        userId,
        userTier,
        selectedProvider,
        selectedModel
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
        const errNotice = `⚡ **VOID AI Connection Notice:** Unable to reach AI server temporarily. Please re-send your message or select another model from the header bar.`;
        const modelMsg = await saveMessage(activeChatId, 'model', errNotice);
        setMessages([...currentMessages, modelMsg]);
        setStreamingMessage('');
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
    <div className="flex h-screen bg-transparent text-[#F8FAFC] overflow-hidden font-sans relative">
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
        onOpenLiveVoice={() => setShowLiveVoice(true)}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        isAdmin={profile?.isAdmin || false}
        isSupportStaff={profile?.isSupportStaff || false}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 bg-[#0D1117]/60 backdrop-blur-sm">
        {/* Broadcast System Banner Notice */}
        {activeBroadcast && (
          <div className="bg-gradient-to-r from-red-950 via-zinc-900 to-red-950 border-b border-red-800/80 p-3 px-4 flex items-center justify-between text-xs text-slate-200 z-30 shadow-xl animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-red-600 rounded-xl text-white font-bold shrink-0 shadow">
                <Radio size={14} className="animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white flex items-center gap-2">
                  <span>{activeBroadcast.title}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-red-900/80 border border-red-700/80 text-red-300 font-bold">
                    Official Broadcast
                  </span>
                </div>
                <p className="text-slate-300 truncate font-sans text-[11px]">{activeBroadcast.message}</p>
              </div>
            </div>
            <button
              onClick={() => setDismissedBroadcastIds(prev => [...prev, activeBroadcast.id])}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
              title="Dismiss Notice"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Header Bar */}
        <header className="h-14 px-3 sm:px-6 sticky top-0 z-10 bg-[#0B0C0E] border-b border-[#1E222D] flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-1 rounded-xl hover:bg-[#161B22] text-slate-400 hover:text-slate-100 transition-colors cursor-pointer flex items-center justify-center"
              title="Toggle sidebar"
            >
              <Menu size={19} />
            </button>
            <div className="flex items-center gap-2.5">
              <img 
                src="https://i.postimg.cc/8PVBFM75/file-00000000b40c82118dbaef206a9ebedc.png" 
                alt="VOID AI Logo" 
                className="w-7 h-7 rounded-lg object-contain bg-[#0D1018] border border-[#272C3A] p-0.5"
              />
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                VOID AI
              </span>
              <span className="px-2 py-0.5 rounded bg-[#1A1D27] border border-[#2B3142] text-[10px] text-slate-300 font-mono font-bold uppercase tracking-wider hidden sm:inline-block">
                SYSTEM PRO
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Model Selector Dropdown */}
            <div className="relative">
              <select
                value={`${selectedProvider}:${selectedModel}`}
                onChange={(e) => {
                  const [prov, mod] = e.target.value.split(':');
                  setSelectedProvider(prov as 'groq' | 'cohere');
                  setSelectedModel(mod || 'auto');
                }}
                className="bg-[#141720] border border-[#272C3A] hover:border-slate-500 text-slate-200 text-xs font-mono py-1.5 pl-3 pr-7 rounded-xl focus:outline-none focus:border-red-500/80 cursor-pointer appearance-none shadow-sm transition-colors"
                title="Select AI Engine"
              >
                <option value="groq:auto">Groq Llama 3.3 70B</option>
                <option value="cohere:auto">Cohere Command R+</option>
                <optgroup label="Groq Models">
                  <option value="groq:llama-3.3-70b-versatile">Groq: Llama 3.3 70B</option>
                  <option value="groq:llama-3.1-8b-instant">Groq: Llama 3.1 8B</option>
                  <option value="groq:mixtral-8x7b-32768">Groq: Mixtral 8x7B</option>
                  <option value="groq:deepseek-r1-distill-llama-70b">Groq: DeepSeek R1 70B</option>
                </optgroup>
                <optgroup label="Cohere Models">
                  <option value="cohere:command-r-plus-08-2024">Cohere: Command R+</option>
                  <option value="cohere:command-r-08-2024">Cohere: Command R</option>
                </optgroup>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <ChevronDown size={13} />
              </div>
            </div>

            {profile && (
              <button
                onClick={() => setShowSubscription(true)}
                className="px-3 py-1.5 bg-[#141720] border border-[#272C3A] hover:border-amber-500/50 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-slate-200 transition-colors cursor-pointer shrink-0"
              >
                <Crown size={14} className="text-amber-400" />
                <span className="capitalize text-amber-400 font-bold hidden sm:inline">{profile.tier}</span>
              </button>
            )}
          </div>
        </header>

        {/* Chat Messages Container */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto relative"
        >
          {messages.length === 0 ? (
            /* Starter / Welcome Screen */
            <div className="h-full flex flex-col items-center justify-center p-6 md:p-10 text-center max-w-2xl mx-auto space-y-6">
              <div className="flex flex-col items-center">
                <div className="relative mb-5 group">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-[#0B0E17] border-2 border-[#323B52] p-2.5 flex items-center justify-center shadow-xl">
                    <img 
                      src="https://i.postimg.cc/8PVBFM75/file-00000000b40c82118dbaef206a9ebedc.png" 
                      alt="VOID AI Logo" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">
                  How can <span className="bg-gradient-to-r from-red-400 via-red-500 to-amber-400 bg-clip-text text-transparent">VOID AI</span> help you today?
                </h1>
                <p className="text-slate-300 text-xs md:text-sm max-w-md mt-2 leading-relaxed font-sans">
                  Select a starter prompt below or type any query to start typing directly onto the live canvas.
                </p>
              </div>

              {/* Suggestion Chips */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xl">
                {[
                  {
                    icon: <Code size={15} className="text-red-400" />,
                    title: "Write an Express API with rate limiting"
                  },
                  {
                    icon: <Mail size={15} className="text-amber-400" />,
                    title: "Draft a 5-part flash sale email sequence"
                  },
                  {
                    icon: <Target size={15} className="text-blue-400" />,
                    title: "Outline a customer retention strategy"
                  }
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip.title)}
                    className="w-full sm:w-1/3 p-3.5 bg-[#121622]/80 hover:bg-[#181E2E]/90 border border-[#272F42] hover:border-red-500/80 rounded-2xl text-left transition-all shadow-xl backdrop-blur-md group cursor-pointer flex items-center gap-3"
                  >
                    <div className="p-2 rounded-xl bg-[#1A2030] text-slate-200 group-hover:scale-105 transition-transform shrink-0">
                      {chip.icon}
                    </div>
                    <span className="text-xs text-slate-200 group-hover:text-white font-medium line-clamp-2 leading-snug">
                      {chip.title}
                    </span>
                  </button>
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
            onClick={() => scrollToBottom(false)}
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

      {/* Full Page Support Chat Desk */}
      {showSupport && profile && (
        <FullPageSupportDesk
          userId={userId}
          userName={profile.displayName || profile.email || 'User'}
          isAdminView={profile.isAdmin || false}
          isSupportStaff={profile.isSupportStaff || false}
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
