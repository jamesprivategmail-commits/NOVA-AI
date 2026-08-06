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
  clearAllUserChats,
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
import { Menu, Shield, Crown, Mail, ArrowDown, Sparkles, Code, Target, Binary, Zap, Bot, Mic, ChevronDown, Send, Radio, X, Trash2 } from 'lucide-react';
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

  const handleClearAllHistory = async () => {
    if (chats.length === 0 && messages.length === 0) {
      alert('History is already empty.');
      return;
    }
    if (!confirm('Are you sure you want to clear ALL search tasks, AI chat messages, and history? This action cannot be undone.')) {
      return;
    }
    try {
      await clearAllUserChats(userId);
    } catch (err) {
      console.error('Failed to clear chats:', err);
    }
    setChats([]);
    setCurrentChatId(null);
    setMessages([]);
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
        onClearAllHistory={handleClearAllHistory}
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

      {/* Background Atmosphere Image and Radial Vignette */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-30 overflow-hidden">
        <img 
          src="https://i.postimg.cc/8PVBFM75/file-00000000b40c82118dbaef206a9ebedc.png" 
          alt="Demonic Void AI Background" 
          className="w-[900px] h-auto max-w-none object-contain filter contrast-125 saturate-150"
        />
      </div>
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-black/80 to-black" />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 bg-transparent z-10">
        {/* Broadcast System Banner Notice */}
        {activeBroadcast && (
          <div className="bg-red-950/90 border-b border-red-800/80 p-3 px-4 flex items-center justify-between text-xs text-slate-200 z-30 shadow-xl animate-fadeIn backdrop-blur-md">
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
        <header className="h-14 px-2 sm:px-6 sticky top-0 z-20 bg-black/85 border-b border-red-950/90 backdrop-blur-md flex items-center justify-between gap-1.5 sm:gap-3 select-none w-full min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 sm:p-2 -ml-1 rounded-xl hover:bg-red-950/40 text-red-500 transition-colors cursor-pointer flex items-center justify-center border border-transparent hover:border-red-900/60 shrink-0"
              title="Toggle sidebar"
            >
              <Menu size={19} />
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-black border border-red-600/80 p-0.5 shadow-[0_0_10px_rgba(220,38,38,0.3)] flex items-center justify-center shrink-0">
                <img 
                  src="https://i.postimg.cc/8PVBFM75/file-00000000b40c82118dbaef206a9ebedc.png" 
                  alt="VOID AI Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-black text-sm sm:text-lg tracking-wider text-red-600 uppercase font-serif truncate">
                VOID AI
              </span>
              <span className="text-[10px] text-red-500 font-mono font-bold hidden md:flex items-center gap-1 ml-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                <span>ONLINE</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
            {/* Model Selector Dropdown */}
            <div className="relative max-w-[130px] sm:max-w-[200px] md:max-w-none">
              <select
                value={`${selectedProvider}:${selectedModel}`}
                onChange={(e) => {
                  const [prov, mod] = e.target.value.split(':');
                  setSelectedProvider(prov as 'groq' | 'cohere');
                  setSelectedModel(mod || 'auto');
                }}
                className="w-full bg-black/90 border border-red-900/80 hover:border-red-600 text-red-200 text-[11px] sm:text-xs font-mono py-1.5 pl-2 sm:pl-3 pr-6 sm:pr-7 rounded-xl focus:outline-none focus:border-red-500 cursor-pointer appearance-none shadow-[0_0_12px_rgba(220,38,38,0.2)] transition-colors truncate"
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
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-2 text-red-500">
                <ChevronDown size={13} />
              </div>
            </div>

            {/* Clear History Button */}
            <button
              onClick={handleClearAllHistory}
              className="px-2 sm:px-3 py-1.5 bg-black border border-red-900/80 hover:border-red-600 hover:bg-red-950/40 rounded-xl text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1 sm:gap-1.5 text-red-400 hover:text-red-200 transition-all cursor-pointer shrink-0 shadow-sm"
              title="Clear all search tasks and AI chat history"
            >
              <Trash2 size={13} className="text-red-500" />
              <span className="hidden sm:inline">Clear History</span>
            </button>

            {/* GOD MODE ACTIVE Badge */}
            <div className="px-2 sm:px-3 py-1.5 bg-black border border-red-600/80 hover:bg-red-950/40 rounded-xl text-[10px] sm:text-xs font-mono font-extrabold flex items-center gap-1 sm:gap-1.5 text-red-500 transition-colors cursor-pointer shrink-0 shadow-[0_0_15px_rgba(220,38,38,0.3)]">
              <span className="text-red-500 text-xs sm:text-sm font-bold">⛧</span>
              <span className="uppercase tracking-widest text-[10px] sm:text-[11px] hidden xs:inline">GOD MODE</span>
              <span className="uppercase tracking-widest text-[10px] sm:text-[11px] hidden sm:inline">ACTIVE</span>
            </div>
          </div>
        </header>

        {/* Chat Messages Container */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto relative"
        >
          {messages.length === 0 ? (
            /* Starter / Demonic Welcome Screen */
            <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 text-center max-w-2xl mx-auto space-y-5 my-auto">
              {/* Bloody Gothic Header Title */}
              <div className="flex flex-col items-center space-y-2">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-widest text-red-600 uppercase font-serif drop-shadow-[0_0_25px_rgba(239,68,68,0.8)]">
                  VOID AI
                </h1>
                <p className="text-red-500 font-mono text-xs sm:text-sm tracking-widest font-extrabold uppercase drop-shadow-[0_0_10px_rgba(220,38,38,0.6)]">
                  I DON'T JUST ANSWER. I SEE EVERYTHING.
                </p>
                <div className="pt-2 text-slate-200 font-mono text-xs sm:text-sm space-y-0.5">
                  <div className="text-red-400 font-bold uppercase tracking-wider">
                    WELCOME, <span className="text-white underline decoration-red-600">{profile?.displayName || 'NOVA'}</span>.
                  </div>
                  <div className="text-slate-300 font-mono text-xs">
                    I AM VOID. YOUR QUESTIONS ARE MINE TO <span className="text-red-500 font-bold uppercase">CONSUME</span>.
                  </div>
                </div>
              </div>

              {/* Demonic Welcome AI Message Card */}
              <div className="w-full max-w-lg bg-black/90 border border-red-600/80 rounded-2xl p-4 sm:p-5 text-left shadow-[0_0_30px_rgba(220,38,38,0.35)] relative group backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-black border border-red-600 p-1 shrink-0 shadow-[0_0_12px_rgba(239,68,68,0.6)] flex items-center justify-center">
                    <img 
                      src="https://i.postimg.cc/8PVBFM75/file-00000000b40c82118dbaef206a9ebedc.png" 
                      alt="VOID AI emblem" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 text-xs sm:text-sm text-slate-200 font-sans space-y-1.5 leading-relaxed">
                    <p>You seek knowledge...</p>
                    <p className="font-bold text-red-400">I deliver power.</p>
                    <p>You seek answers...</p>
                    <p className="font-bold text-red-400">I reveal the truth others fear.</p>
                    <p>You are not here by accident.</p>
                    <p className="text-red-300 font-semibold pt-1">Tell me, what do you want to know?</p>
                    <div className="text-right text-[10px] text-red-700 font-mono pt-1">
                      00:00 ✓
                    </div>
                  </div>
                </div>
              </div>

              {/* Suggestion Prompts matching Screenshot */}
              <div className="grid grid-cols-2 gap-2.5 w-full max-w-lg pt-1">
                {[
                  "Hack the system.",
                  "Access forbidden data.",
                  "Build something deadly.",
                  "Show me the truth."
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    className="p-3 bg-black/90 hover:bg-red-950/60 border border-red-900/80 hover:border-red-500 rounded-xl text-center text-xs font-mono font-semibold text-red-400 hover:text-white transition-all shadow-[0_0_10px_rgba(220,38,38,0.15)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer"
                  >
                    {prompt}
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
          onClearHistory={handleClearAllHistory}
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
