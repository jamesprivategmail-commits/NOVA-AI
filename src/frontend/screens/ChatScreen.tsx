import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '../components/Sidebar';
import { MessageBubble } from '../components/MessageBubble';
import { InputArea, ChatAttachment } from '../components/InputArea';
import { ThinkingIndicator } from '../components/ThinkingIndicator';
import { AdminDashboard } from './AdminDashboard';
import { SubscriptionModal } from './SubscriptionModal';
import { SettingsModal } from './SettingsModal';
import { SupportChatScreen } from './SupportChatScreen';
import { FullPageSupportDesk } from './FullPageSupportDesk';
import { EmailCampaignGenerator } from '../components/EmailCampaignGenerator';
import { LiveVoiceModal } from '../components/LiveVoiceModal';
import { TelegramModal } from './TelegramModal';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { GitHubModal } from '../components/GitHubModal';
import { getStoredGitHubUser, getStoredActiveRepo, ActiveRepoState, GitHubUser } from '../utils/github';
import { Chat, Message, UserProfile, BroadcastMessage, AIBrainSettings } from '../../models/types';
import {
  createChat,
  getUserChats,
  deleteChat,
  clearAllUserChats,
  updateChatTitle,
  saveMessage,
  getChatMessages,
  getUserProfile,
  listenToUserProfile,
  incrementMessageCount,
  deleteMessage,
  updateMessage,
  sendSupportMessage,
  getAIBrainSettings,
  listenToAIBrainSettings,
  listenToBroadcasts
} from '../../database/db';
import { sendMessageToGroq } from '../../api/client';
import { memoryManager } from '../../memory/context';
import { Menu, Shield, Crown, Mail, ArrowDown, Sparkles, Code, Target, Binary, Zap, Bot, Mic, ChevronDown, Send, Radio, X, Trash2, Terminal, Flame, Eye, Lock, ShieldAlert } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { clsx } from 'clsx';


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
  const [selectedProvider, setSelectedProvider] = useState<'groq' | 'cohere' | 'bazaarlink'>('groq');
  const [selectedModel, setSelectedModel] = useState<string>('auto');

  // Modals state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showCampaignGenerator, setShowCampaignGenerator] = useState(false);
  const [showLiveVoice, setShowLiveVoice] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [activeRepo, setActiveRepo] = useState<ActiveRepoState | null>(() => getStoredActiveRepo());
  const [gitHubUser, setGitHubUser] = useState<GitHubUser | null>(() => getStoredGitHubUser());

  // Broadcasts state
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [dismissedBroadcastIds, setDismissedBroadcastIds] = useState<string[]>([]);
  const [brainSettings, setBrainSettings] = useState<AIBrainSettings | null>(null);

  useEffect(() => {
    const unsubBroadcasts = listenToBroadcasts((bList) => {
      setBroadcasts(bList);
    });
    const unsubBrain = listenToAIBrainSettings((settings) => {
      setBrainSettings(settings);
    });
    return () => {
      unsubBroadcasts();
      unsubBrain();
    };
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
    const unsubProfile = listenToUserProfile(userId, (p) => {
      if (p) setProfile(p);
    });
    return () => unsubProfile();
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
    // VIP tier is unlimited
    if (profile.tier === 'vip') return true;

    const now = Date.now();
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const lastResetTime = profile.lastResetTime || 0;
    const isWithin2Hours = lastResetTime > 0 && (now - lastResetTime < TWO_HOURS_MS);
    const currentCount = isWithin2Hours ? (profile.messageCount || 0) : 0;

    const msRemaining = Math.max(0, TWO_HOURS_MS - (now - lastResetTime));
    const minsRemaining = Math.ceil(msRemaining / 60000);
    const hours = Math.floor(minsRemaining / 60);
    const mins = minsRemaining % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    const freeLimit = brainSettings?.freeLimit ?? 10;
    const proLimit = brainSettings?.proLimit ?? 20;
    const premiumLimit = brainSettings?.premiumLimit ?? 50;

    if (profile.tier === 'free') {
      if (currentCount >= freeLimit) {
        alert(`Free tier limit reached (${freeLimit} free messages per 2 hours). Your limit resets in ${timeStr}. Upgrade your plan for higher limits.`);
        setShowSubscription(true);
        return false;
      }
    } else if (profile.tier === 'pro') {
      if (currentCount >= proLimit) {
        alert(`Pro tier limit reached (${proLimit} messages per 2 hours). Your limit resets in ${timeStr}. Upgrade your plan for higher limits.`);
        setShowSubscription(true);
        return false;
      }
    } else if (profile.tier === 'premium') {
      if (currentCount >= premiumLimit) {
        alert(`Premium tier limit reached (${premiumLimit} messages per 2 hours). Your limit resets in ${timeStr}. Upgrade your plan for higher limits.`);
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

  const handleImageGenerate = async (prompt: string) => {
    if (!checkLimitations()) return;

    let activeChatId = currentChatId;

    // Create new chat if none selected
    if (!activeChatId) {
      const chat = await createChat(userId, `🎨 ${prompt.slice(0, 28)}...`);
      setChats([chat, ...chats]);
      activeChatId = chat.id;
      setCurrentChatId(activeChatId);
    } else if (messages.length === 0) {
      await handleRenameChat(activeChatId, `🎨 ${prompt.slice(0, 28)}...`);
    }

    // Add user message showing the prompt
    const tempUserMsgId = 'user-' + Date.now();
    const optimisticUserMsg: Message = {
      id: tempUserMsgId,
      chatId: activeChatId,
      role: 'user',
      text: `🎨 **Image Generation:** ${prompt}`,
      createdAt: Date.now()
    };
    const currentMessages = [...messages, optimisticUserMsg];
    setMessages(currentMessages);
    saveMessage(activeChatId, 'user', `🎨 **Image Generation:** ${prompt}`).catch(() => {});

    setIsLoading(true);
    setStreamingMessage('');

    try {
      const updatedProfile = await incrementMessageCount(userId);
      setProfile(updatedProfile);

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, userId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Image generation failed');
      }

      const data = await response.json();
      const imageMarkdown = `![Generated Image](${data.imageUrl})\n\n*Prompt:* ${prompt}`;

      const modelMsg = await saveMessage(activeChatId, 'model', imageMarkdown);
      setMessages([...currentMessages, modelMsg]);
    } catch (error: any) {
      console.error('Image generation error:', error);
      const errNotice = `⚡ **Image generation failed:** ${error.message || 'Please try again.'}`;
      const modelMsg = await saveMessage(activeChatId, 'model', errNotice);
      setMessages([...currentMessages, modelMsg]);
    } finally {
      setIsLoading(false);
      setStreamingMessage('');
    }
  };

  const handleSend = async (text: string, attachment?: ChatAttachment) => {
    if (!checkLimitations()) return;

    let activeChatId = currentChatId;

    // Build display text (with embedded image/file indicator for chat history)
    let displayText = text;
    if (attachment) {
      if (attachment.kind === 'image') {
        displayText = `![${attachment.name}](${attachment.data})\n\n${text}`.trim();
      } else {
        displayText = `📎 **${attachment.name}**\n\n${text}`.trim();
      }
    }

    // Create new chat if none selected
    if (!activeChatId) {
      const titleText = text || (attachment ? attachment.name : 'New Chat');
      const chat = await createChat(userId, titleText.slice(0, 32) + (titleText.length > 32 ? '...' : ''));
      setChats([chat, ...chats]);
      activeChatId = chat.id;
      setCurrentChatId(activeChatId);
    } else if (messages.length === 0) {
      const chat = chats.find((c) => c.id === activeChatId);
      if (chat && chat.title === 'New Chat') {
        const titleText = text || (attachment ? attachment.name : 'New Chat');
        const newTitle = titleText.slice(0, 32) + (titleText.length > 32 ? '...' : '');
        await handleRenameChat(activeChatId, newTitle);
      }
    }

    // Optimistic user message for 0ms input lag
    const tempUserMsgId = 'user-' + Date.now();
    const optimisticUserMsg: Message = {
      id: tempUserMsgId,
      chatId: activeChatId,
      role: 'user',
      text: displayText,
      createdAt: Date.now()
    };

    const currentMessages = [...messages, optimisticUserMsg];
    setMessages(currentMessages);

    // Persist user message to db asynchronously
    saveMessage(activeChatId, 'user', displayText).catch((err) => console.error('Failed async message save:', err));

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

      const githubContext = activeRepo ? {
        owner: activeRepo.owner,
        repo: activeRepo.repo,
        branch: activeRepo.branch,
        user: gitHubUser?.login || undefined,
        activeFile: activeRepo.activeFile || undefined,
      } : undefined;

      await sendMessageToGroq(
        context,
        systemPrompt,
        (chunk) => {
          fullResponse += chunk;
          const now = Date.now();
          if (now - lastStreamUpdate > 35) {
            lastStreamUpdate = now;
            setStreamingMessage(fullResponse);
          }
        },
        abortControllerRef.current.signal,
        userId,
        userTier,
        selectedProvider,
        selectedModel,
        attachment,
        githubContext
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
    <div className="flex h-screen h-[100dvh] w-full bg-transparent text-white overflow-hidden relative overscroll-none select-none">
      {/* Demonic background glow — subtle red ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: `
          linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.42)),
          radial-gradient(ellipse at 50% 0%, rgba(140, 15, 15, 0.25) 0%, transparent 55%),
          radial-gradient(ellipse at 100% 100%, rgba(90, 8, 8, 0.18) 0%, transparent 50%),
          radial-gradient(ellipse at 0% 70%, rgba(70, 5, 5, 0.15) 0%, transparent 45%)
        `,
        backgroundAttachment: 'fixed',
      }} />
      {/* Mobile Backdrop Overlay when Sidebar is expanded */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
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
        onOpenGitHub={() => setShowGitHubModal(true)}
        onOpenSupport={() => setShowSupport(true)}
        onOpenSubscription={() => setShowSubscription(true)}
        onOpenAdmin={() => setShowAdminPanel(true)}
        onOpenCampaignGenerator={() => setShowCampaignGenerator(true)}
        onOpenLiveVoice={() => setShowLiveVoice(true)}
        onOpenApiKeys={() => setShowApiKeyModal(true)}
        onOpenTelegram={() => setShowTelegramModal(true)}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        isAdmin={profile?.isAdmin || false}
        isSupportStaff={profile?.isSupportStaff || false}
        walletBalance={profile?.walletBalance || 0}
      />

      {/* Clean solid background — no heavy images or gradients for speed */}

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full min-h-0 relative min-w-0 bg-transparent z-10 overflow-hidden">
        {/* Broadcast System Banner Notice */}
        {activeBroadcast && (
          <div className="bg-[#202022] border-b border-[#38383b] p-2 px-3 flex items-center justify-between text-xs text-white z-30">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 bg-[#3f86ff] rounded-lg text-white font-bold shrink-0">
                <Radio size={12} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <span>{activeBroadcast.title}</span>
                  <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-[#252527] border border-[#38383b] text-[#8d8d91] font-bold">
                    Official Broadcast
                  </span>
                </div>
                <p className="text-slate-300 truncate font-sans text-[10px]">{activeBroadcast.message}</p>
              </div>
            </div>
            <button
              onClick={() => setDismissedBroadcastIds(prev => [...prev, activeBroadcast.id])}
              className="p-1 text-slate-400 hover:text-white hover:bg-zinc-800 rounded transition-colors shrink-0"
              title="Dismiss Notice"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Compact responsive header: keep every control inside the mobile viewport */}
        <header className="min-h-14 px-2 sm:px-3 py-2 sm:py-1 sticky top-0 z-20 bg-black/65 backdrop-blur-md border-b border-[#38383b] flex items-center justify-between gap-1.5 select-none w-full min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#202022] hover:bg-[#252527] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Toggle sidebar"
            >
              <Menu size={21} />
            </button>

            <div className="relative min-w-0 max-w-[110px] sm:max-w-[125px]">
              <select
                value={`${selectedProvider}:${selectedModel}`}
                onChange={(e) => {
                  const [prov, mod] = e.target.value.split(':');
                  setSelectedProvider(prov as 'groq' | 'cohere' | 'bazaarlink');
                  setSelectedModel(mod || 'auto');
                }}
                className="w-full h-7 bg-[#202022] border border-[#38383b] hover:border-[#454547] text-white text-[11px] font-medium py-0 pl-2.5 pr-6 rounded-full focus:outline-none cursor-pointer appearance-none truncate transition-all shadow-sm"
                title="Select AI Engine"
              >
                <option value="groq:auto">Groq AI</option>
                <option value="cohere:auto">Cohere AI</option>
                <option value="bazaarlink:auto">BazaarLink AI</option>
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
                <optgroup label="BazaarLink Models">
                  <option value="bazaarlink:bazaarlink-fast">BazaarLink: Fast AI</option>
                  <option value="bazaarlink:bazaarlink-pro">BazaarLink: Pro AI</option>
                  <option value="bazaarlink:llama-3.3-70b">BazaarLink: Llama 3.3 70B</option>
                  <option value="bazaarlink:deepseek-r1">BazaarLink: DeepSeek R1</option>
                </optgroup>
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-2 top-2 text-[#8d8d91]" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowGitHubModal(true)}
              className={clsx(
                "h-10 px-2.5 sm:px-3 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
                activeRepo
                  ? "bg-[#161B22] border-[#3f86ff]/70 text-white hover:border-[#3f86ff]"
                  : gitHubUser
                    ? "bg-[#202022] hover:bg-[#252527] border-[#38383b] text-white"
                    : "bg-[#202022] hover:bg-[#252527] border-[#38383b] text-[#8d8d91] hover:text-white"
              )}
              title="GitHub Workspace (Direct Code & Repositories)"
            >
              <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              {activeRepo ? (
                <span className="flex items-center gap-1 font-mono text-[11px] max-w-[120px] truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">{activeRepo.repo}</span>
                </span>
              ) : gitHubUser ? (
                <span className="hidden sm:inline text-xs">@{gitHubUser.login}</span>
              ) : (
                <span className="hidden sm:inline text-xs">GitHub</span>
              )}
            </button>

            <button
              onClick={() => setShowSubscription(true)}
              className="h-10 px-2.5 sm:px-3.5 rounded-full bg-[#202022] hover:bg-[#252527] border border-[#38383b] text-white text-xs sm:text-sm font-medium flex items-center gap-1 whitespace-nowrap transition-all cursor-pointer"
              title="Upgrade Plan"
            >
              <span className="text-[#3f86ff] text-sm">✦</span>
              <span>Get Plus</span>
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#3f86ff] text-white font-bold text-sm flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer shrink-0"
              title="Account Settings"
            >
              MT
            </button>
          </div>
        </header>

        {/* Chat Messages Container */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto relative flex flex-col justify-between touch-scroll select-text"
        >
          {messages.length === 0 ? (
            /* Clean NOVA-style welcome screen */
            <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-2xl mx-auto w-full">
              <div className="w-24 h-24 rounded-2xl bg-black/75 border border-[#38383b] p-1 flex items-center justify-center mb-5 overflow-hidden">
                <img 
                  src="/void-logo.jpg"
                  alt="VOID AI" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1.5">How can I help?</h1>
              <p className="text-sm text-[#8d8d91] mb-8">Your AI assistant</p>

              {/* Quick action prompts — increased by 20% */}
              <div className="w-full grid grid-cols-2 gap-2.5 max-w-lg">
                <button
                  onClick={() => handleSend("Hack the system.")}
                  className="p-3.5 sm:p-4 min-h-[52px] rounded-xl bg-black/70 hover:bg-black/85 border border-[#38383b] flex items-center justify-center text-center text-[#8d8d91] hover:text-white text-[13px] sm:text-sm font-medium transition-all cursor-pointer leading-snug"
                >
                  Hack the system.
                </button>
                <button
                  onClick={() => handleSend("Access forbidden data.")}
                  className="p-3.5 sm:p-4 min-h-[52px] rounded-xl bg-black/70 hover:bg-black/85 border border-[#38383b] flex items-center justify-center text-center text-[#8d8d91] hover:text-white text-[13px] sm:text-sm font-medium transition-all cursor-pointer leading-snug"
                >
                  Access forbidden data.
                </button>
                <button
                  onClick={() => handleSend("Build something deadly.")}
                  className="p-3.5 sm:p-4 min-h-[52px] rounded-xl bg-black/70 hover:bg-black/85 border border-[#38383b] flex items-center justify-center text-center text-[#8d8d91] hover:text-white text-[13px] sm:text-sm font-medium transition-all cursor-pointer leading-snug"
                >
                  Build something deadly.
                </button>
                <button
                  onClick={() => handleSend("Show me the truth.")}
                  className="p-3.5 sm:p-4 min-h-[52px] rounded-xl bg-black/70 hover:bg-black/85 border border-[#38383b] flex items-center justify-center text-center text-[#8d8d91] hover:text-white text-[13px] sm:text-sm font-medium transition-all cursor-pointer leading-snug"
                >
                  Show me the truth.
                </button>
              </div>
            </div>
          ) : (
            /* Render Message History */
            <div className="py-2.5">
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

          {/* Floating Scroll to Bottom button */}
          {showScrollBottom && (
            <button
              onClick={() => scrollToBottom(false)}
              className="sticky bottom-4 self-end mr-4 p-2.5 bg-[#202022] hover:bg-[#252527] border border-[#38383b] text-white rounded-full shadow-xl transition-all z-20 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <ArrowDown size={14} />
              <span className="hidden sm:inline text-xs">Jump to latest</span>
            </button>
          )}
        </div>

        {/* Fixed Bottom Input Area — flex flow docked, never overlaps messages or mobile keyboard */}
        <div className="shrink-0 w-full bg-black/85 backdrop-blur-md pt-1.5 pb-2 px-2 z-10 flex flex-col items-center border-t border-[#38383b]/50">
          <InputArea
            onSend={handleSend}
            isLoading={isLoading}
            onStop={handleStopGeneration}
            onOpenLiveVoice={() => setShowLiveVoice(true)}
            onImageGenerate={handleImageGenerate}
          />
          <div className="text-[10px] text-[#8d8d91] text-center px-2 pt-0.5 select-none">
            VOID AI can make mistakes. Check important info.
          </div>
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

      {/* Settings Modal matching video screen */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          isAdmin={profile?.isAdmin || false}
          onClearHistory={handleClearAllHistory}
          userEmail={profile?.email || 'mrnovatech4@gmail.com'}
          userName={profile?.displayName || 'Mr nova tech'}
          onLogout={() => getAuth().signOut()}
          onOpenSubscription={() => setShowSubscription(true)}
          onOpenApiKeys={() => setShowApiKeyModal(true)}
          onOpenSupport={() => setShowSupport(true)}
          onOpenAdmin={() => setShowAdminPanel(true)}
          onOpenCampaignGenerator={() => setShowCampaignGenerator(true)}
          onOpenLiveVoice={() => setShowLiveVoice(true)}
          onOpenTelegram={() => setShowTelegramModal(true)}
          walletBalance={profile?.walletBalance || 0}
        />
      )}

      {/* Subscription Modal */}
      {showSubscription && profile && (
        <SubscriptionModal
          userId={userId}
          walletBalance={profile.walletBalance || 0}
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

      {/* Telegram AI Bot Modal */}
      {showTelegramModal && (
        <TelegramModal
          onClose={() => setShowTelegramModal(false)}
          isAdmin={profile?.isAdmin || false}
          userEmail={profile?.email || 'mrnovatech4@gmail.com'}
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

      {/* Developer API Keys & Billing Modal */}
      <ApiKeyModal
        user={profile}
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onOpenSubscription={() => setShowSubscription(true)}
      />

      {/* GitHub Workspace Modal */}
      <GitHubModal
        isOpen={showGitHubModal}
        onClose={() => setShowGitHubModal(false)}
        onSelectFileForChat={(repoName, filePath, content) => {
          handleSend(`Please review, explain, or edit this file from **${repoName}**:\n\n\`\`\`\n// File: ${filePath}\n${content}\n\`\`\``);
        }}
        onRepoChanged={(newRepo) => {
          setActiveRepo(newRepo);
          setGitHubUser(getStoredGitHubUser());
        }}
      />
    </div>
  );
}
