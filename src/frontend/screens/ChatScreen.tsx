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
import { 
  getStoredGitHubUser, 
  getStoredActiveRepo, 
  getStoredGitHubCodingMode, 
  setStoredGitHubCodingMode, 
  getStoredGitHubToken,
  fetchRepoTree,
  ActiveRepoState, 
  GitHubUser 
} from '../utils/github';
import { terminalManager } from '../utils/terminalManager';
import { Chat, Message, UserProfile, BroadcastMessage, AIBrainSettings, AgentState } from '../../models/types';
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
  listenToBroadcasts,
  togglePinChat,
  toggleStarMessage
} from '../../database/db';
import { sendMessageToGroq } from '../../api/client';
import { memoryManager } from '../../memory/context';
import { CommandPalette } from '../components/CommandPalette';
import { ModelSelectorDropdown } from '../components/ModelSelectorDropdown';
import { CodeWorkspaceDrawer, WorkspaceTab } from '../components/workspace/CodeWorkspaceDrawer';
import { PromptStudioModal } from '../components/workspace/PromptStudioModal';
import { offlineCache } from '../utils/offlineQueue';
import { Menu, Shield, Crown, Mail, ArrowDown, Sparkles, Code, Code2, Target, Binary, Zap, Bot, Mic, ChevronDown, Send, Radio, X, Trash2, Terminal, Flame, Eye, Lock, ShieldAlert, GitBranch, MessageSquare, FolderCode, Check, Loader2, Command, Sliders, ExternalLink } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { clsx } from 'clsx';


interface ChatScreenProps {
  userId: string;
}

export function ChatScreen({ userId }: ChatScreenProps) {
  const [chats, setChats] = useState<Chat[]>(() => offlineCache.loadChats());
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // 2026 Core State: Command Bar, Workspace, Prompt Studio & Telemetry
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('editor');
  const [workspaceFileContent, setWorkspaceFileContent] = useState<string>('// VOID AI Scratchpad & AST Editor\n\nexport function main() {\n  return { status: "operational", timestamp: Date.now() };\n}\n');
  const [workspaceFilePath, setWorkspaceFilePath] = useState<string>('src/workspace.ts');
  const [showPromptStudio, setShowPromptStudio] = useState(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>(() => {
    return localStorage.getItem('void_ai_system_prompt') || '';
  });
  const [lastTelemetry, setLastTelemetry] = useState<{
    latencyMs?: number;
    ttftMs?: number;
    tokensPerSec?: number;
  }>({});

  // AI Model Selection state (Persisted, managed in Settings & Top Bar)
  const [selectedProvider, setSelectedProvider] = useState<'groq' | 'cohere' | 'bazaarlink' | 'gemini'>(() => {
    return (localStorage.getItem('void_ai_selected_provider') as any) || 'groq';
  });
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('void_ai_selected_model') || 'auto';
  });

  const handleSelectProviderModel = (provider: 'groq' | 'cohere' | 'bazaarlink' | 'gemini', model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
    localStorage.setItem('void_ai_selected_provider', provider);
    localStorage.setItem('void_ai_selected_model', model);
  };

  // Keyboard Shortcuts (⌘K for command palette, ⌘E for editor, ⌘T for terminal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setWorkspaceTab('editor');
        setShowWorkspace(prev => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setWorkspaceTab('terminal');
        setShowWorkspace(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Custom Event Listener to load snippets directly into workspace
  useEffect(() => {
    const handleOpenWorkspaceFile = (e: any) => {
      if (e.detail) {
        if (e.detail.content) setWorkspaceFileContent(e.detail.content);
        if (e.detail.path) setWorkspaceFilePath(e.detail.path);
        if (e.detail.tab) setWorkspaceTab(e.detail.tab);
        setShowWorkspace(true);
      }
    };
    window.addEventListener('void_ai_open_workspace_file', handleOpenWorkspaceFile);
    return () => window.removeEventListener('void_ai_open_workspace_file', handleOpenWorkspaceFile);
  }, []);

  // Modals state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialView, setSettingsInitialView] = useState<'main' | 'integrations-github'>('main');
  const [showSupport, setShowSupport] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showCampaignGenerator, setShowCampaignGenerator] = useState(false);
  const [showLiveVoice, setShowLiveVoice] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [activeRepo, setActiveRepo] = useState<ActiveRepoState | null>(() => getStoredActiveRepo());
  const [gitHubUser, setGitHubUser] = useState<GitHubUser | null>(() => getStoredGitHubUser());
  const [codingMode, setCodingMode] = useState<boolean>(() => getStoredGitHubCodingMode());
  const [repoTreeSnippet, setRepoTreeSnippet] = useState<string>('');

  useEffect(() => {
    const handleSync = () => {
      setActiveRepo(getStoredActiveRepo());
      setGitHubUser(getStoredGitHubUser());
      setCodingMode(getStoredGitHubCodingMode());
    };
    window.addEventListener('void_ai_github_state_change', handleSync);
    return () => window.removeEventListener('void_ai_github_state_change', handleSync);
  }, []);

  useEffect(() => {
    const token = getStoredGitHubToken();
    if (token && activeRepo) {
      fetchRepoTree(token, activeRepo.owner, activeRepo.repo, activeRepo.branch)
        .then(res => {
          const blobs = (res.tree || []).filter(item => item.type === 'blob');
          const paths = blobs.map(b => b.path).slice(0, 45);
          setRepoTreeSnippet(paths.join('\n'));
        })
        .catch(() => {});
    } else {
      setRepoTreeSnippet('');
    }
  }, [activeRepo?.owner, activeRepo?.repo, activeRepo?.branch]);

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

  // Auto-scroll state & refs with 99% smoother scrolling physics
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const userScrolledUpRef = useRef(false);

  useEffect(() => {
    loadProfileAndChats();
    const unsubProfile = listenToUserProfile(userId, (p) => {
      if (p) setProfile(p);
    });
    return () => unsubProfile();
  }, [userId]);

  useEffect(() => {
    if (currentChatId) {
      userScrolledUpRef.current = false;
      loadMessages(currentChatId);
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  // Smooth scroll sync: Only auto-scroll when user hasn't explicitly scrolled up to read history
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    if (!userScrolledUpRef.current) {
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: streamingMessage ? 'auto' : 'smooth'
        });
      });
    }
  }, [messages, streamingMessage]);

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isAtBottom = distanceToBottom <= 80;
    userScrolledUpRef.current = !isAtBottom;
    setShowScrollBottom(!isAtBottom);
  };

  const scrollToBottom = (smooth = true) => {
    const container = chatContainerRef.current;
    if (!container) return;
    userScrolledUpRef.current = false;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
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
    offlineCache.saveChats(userChats);
    if (userChats.length > 0 && !currentChatId) {
      setCurrentChatId(userChats[0].id);
    }
  };

  const loadMessages = async (chatId: string) => {
    const cached = offlineCache.loadMessages(chatId);
    if (cached.length > 0 && messages.length === 0) {
      setMessages(cached);
    }
    const chatMsgs = await getChatMessages(chatId);
    setMessages(chatMsgs);
    offlineCache.saveMessages(chatId, chatMsgs);
  };

  const handleTogglePin = async (chatId: string, isPinned: boolean) => {
    await togglePinChat(chatId, isPinned);
    setChats(prev => {
      const updated = prev.map(c => c.id === chatId ? { ...c, isPinned } : c);
      offlineCache.saveChats(updated);
      return updated;
    });
  };

  const handleToggleStar = async (msgId: string) => {
    if (!currentChatId) return;
    const msg = messages.find(m => m.id === msgId);
    const newStarred = !msg?.isStarred;
    await toggleStarMessage(currentChatId, msgId, newStarred);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStarred: newStarred } : m));
  };

  const handleExportChat = (chatIdToExport?: string) => {
    const targetChatId = chatIdToExport || currentChatId;
    if (!targetChatId) return;
    const chatObj = chats.find(c => c.id === targetChatId);
    const title = chatObj?.title || 'VOID_AI_Transcript';
    let md = `# ${title}\n\n*Exported from VOID AI on ${new Date().toLocaleString()}*\n\n---\n\n`;
    for (const msg of messages) {
      const sender = msg.role === 'user' ? '👤 User' : '🤖 VOID AI';
      md += `### ${sender} (${new Date(msg.createdAt).toLocaleTimeString()})\n\n${msg.text}\n\n---\n\n`;
    }
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNewChat = async () => {
    const chat = await createChat(userId);
    const updatedChats = [chat, ...chats];
    setChats(updatedChats);
    offlineCache.saveChats(updatedChats);
    setCurrentChatId(chat.id);
  };

  const handleDeleteChat = async (id: string) => {
    await deleteChat(id);
    const updatedChats = chats.filter((c) => c.id !== id);
    setChats(updatedChats);
    offlineCache.saveChats(updatedChats);
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

    const freeLimit = brainSettings?.freeLimit ?? 15;
    const proLimit = brainSettings?.proLimit ?? 20;
    const premiumLimit = brainSettings?.premiumLimit ?? 50;

    if (profile.tier === 'free') {
      if (currentCount >= freeLimit) {
        alert(`Free tier limit reached (${freeLimit} free messages). Your limit resets in ${timeStr}. Upgrade your plan for higher limits.`);
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

    // If user asked to execute a command (e.g. "Run nmap", "$ nmap", "nmap ...")
    const cleanCmd = text.trim();
    const runMatch = cleanCmd.match(/^(?:run\s+|\$\s*)([a-zA-Z0-9_\-\.\/]+(?:\s+.*)?)$/i);
    const isDirectCmd = /^(?:nmap|ping|curl|npm|git|node|python|ls|cat|cargo|docker|netstat)\b/i.test(cleanCmd);
    const commandToExecute = runMatch ? runMatch[1].trim() : (isDirectCmd ? cleanCmd : null);

    if (commandToExecute) {
      terminalManager.executeCommand(commandToExecute).catch(() => {});
    }

    abortControllerRef.current = new AbortController();
    let fullResponse = '';

    try {
      const updatedProfile = await incrementMessageCount(userId);
      setProfile(updatedProfile);

      const context = memoryManager.buildContext(currentMessages);
      let lastStreamUpdate = 0;

      const systemPrompt = '';
      const userTier = updatedProfile?.tier || profile?.tier || 'free';

      const githubContext = activeRepo ? {
        owner: activeRepo.owner,
        repo: activeRepo.repo,
        branch: activeRepo.branch,
        user: gitHubUser?.login || undefined,
        activeFile: activeRepo.activeFile || undefined,
        codingMode: codingMode,
        fileTreeSnippet: repoTreeSnippet || undefined,
      } : undefined;

      let pendingUpdate = false;
      const telemetry = await sendMessageToGroq(
        context,
        customSystemPrompt || '',
        (chunk) => {
          fullResponse += chunk;
          if (!pendingUpdate) {
            pendingUpdate = true;
            requestAnimationFrame(() => {
              setStreamingMessage(fullResponse);
              pendingUpdate = false;
            });
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

      if (telemetry) {
        setLastTelemetry(telemetry);
      }

      // Save complete model message with telemetry
      if (fullResponse.trim()) {
        const modelMsg = await saveMessage(activeChatId, 'model', fullResponse, {
          latencyMs: telemetry?.latencyMs,
          ttftMs: telemetry?.ttftMs,
          tokensPerSec: telemetry?.tokensPerSec,
          totalTokens: telemetry?.totalTokens,
          modelUsed: selectedModel,
          providerUsed: selectedProvider,
        } as any);
        const updatedMsgs = [...currentMessages, modelMsg];
        setMessages(updatedMsgs);
        offlineCache.saveMessages(activeChatId, updatedMsgs);
      }
      setStreamingMessage('');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        console.error('Failed to get response', error);
        // Only append error notice if no response has been received yet
        if (!fullResponse.trim()) {
          const rawMsg = error?.message || '';
          let errNotice = rawMsg;
          if (!errNotice || errNotice.includes('[object Object]')) {
            errNotice = `⚡ **VOID AI Connection Notice:** Unable to reach AI server temporarily. Please re-send your message or select another model from Settings.`;
          } else if (!errNotice.startsWith('⚡')) {
            errNotice = `⚡ **VOID AI Notice:** ${errNotice}`;
          }
          const modelMsg = await saveMessage(activeChatId, 'model', errNotice);
          setMessages([...currentMessages, modelMsg]);
        }
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
      {/* Crystal-clear starry void background enhancement — sharp & high-contrast */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-black/25 via-transparent to-black/45" />
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
        onTogglePinChat={handleTogglePin}
        onExportChat={handleExportChat}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        isAdmin={profile?.isAdmin || false}
        isSupportStaff={profile?.isSupportStaff || false}
        walletBalance={profile?.walletBalance || 0}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full min-h-0 relative min-w-0 bg-transparent z-10 overflow-hidden">
        {/* Broadcast System Banner Notice */}
        {activeBroadcast && (
          <div className="bg-[#191b24] border-b border-[#292d3b] p-2 px-3 flex items-center justify-between text-xs text-white z-30">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 bg-blue-600 rounded-lg text-white font-bold shrink-0">
                <Radio size={12} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <span>{activeBroadcast.title}</span>
                  <span className="text-[9px] uppercase font-mono text-slate-400">
                    · Official Broadcast
                  </span>
                </div>
                <p className="text-slate-300 truncate text-[10px]">{activeBroadcast.message}</p>
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

        {/* 2026 Top Bar Contract — Zone 1: Brand | Zone 2: Engine & Preset | Zone 3: Actions */}
        <header className="h-14 px-3 sm:px-4 sticky top-0 z-20 bg-[#0d0e13]/90 backdrop-blur-md border-b border-[#232634] flex items-center justify-between gap-4 select-none w-full min-w-0">
          {/* Zone 1: Sidebar Toggle + Brand wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-9 h-9 rounded-lg bg-[#181a22] hover:bg-[#202330] border border-[#2a2d3d] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Toggle sidebar"
            >
              <Menu size={17} />
            </button>

            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white whitespace-nowrap">
                VOID AI
              </span>
              <span className="hidden sm:inline text-[10px] font-mono text-slate-500">
                · 2026
              </span>
            </div>
          </div>

          {/* Zone 2: Engine Selector & Persona Preset */}
          <div className="flex items-center gap-2 min-w-0">
            <ModelSelectorDropdown
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              onSelect={handleSelectProviderModel}
              lastTelemetry={lastTelemetry}
            />

            <button
              onClick={() => setShowPromptStudio(true)}
              className="h-9 px-2.5 rounded-lg bg-[#14151a] hover:bg-[#1a1c23] border border-[#262833] text-slate-300 hover:text-white text-xs font-medium hidden md:flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Prompt Engineering Studio & Custom System Directives"
            >
              <Sliders size={13} className="text-amber-400" />
              <span>Persona</span>
            </button>
          </div>

          {/* Zone 3: Command Bar, Interactive Workspace, Plus & Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Global Command Bar Button (⌘K) */}
            <button
              onClick={() => setShowCommandPalette(true)}
              className="h-9 px-2.5 sm:px-3 rounded-lg bg-[#14151a] hover:bg-[#1f222e] border border-[#262833] hover:border-[#383d4f] text-slate-300 hover:text-white text-xs font-medium flex items-center gap-2 transition-all cursor-pointer"
              title="Global Command Palette (Press ⌘K or Ctrl+K)"
            >
              <Command size={13} className="text-blue-400" />
              <span className="hidden lg:inline text-xs">Commands</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-[#1e2029] border border-[#2d303e] rounded">
                ⌘K
              </kbd>
            </button>

            {/* Split Code Workspace Drawer Trigger */}
            <button
              onClick={() => setShowWorkspace(!showWorkspace)}
              className={clsx(
                "h-9 px-2.5 sm:px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
                showWorkspace
                  ? "bg-blue-600 border-blue-500 text-white shadow-sm"
                  : "bg-[#14151a] hover:bg-[#1f222e] border-[#262833] text-slate-300 hover:text-white"
              )}
              title="Toggle Interactive Code Workspace & Sandbox Terminal (⌘E)"
            >
              <Code2 size={14} className={showWorkspace ? "text-white" : "text-emerald-400"} />
              <span className="hidden sm:inline">Workspace</span>
            </button>

            <button
              onClick={() => setShowSubscription(true)}
              className="h-9 px-3 rounded-lg bg-[#181a24] hover:bg-[#202330] border border-[#2d3040] text-white text-xs font-medium hidden sm:flex items-center gap-1 whitespace-nowrap transition-all cursor-pointer"
              title="Upgrade Plan"
            >
              <span className="text-blue-400 text-xs">✦</span>
              <span>Plus</span>
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center hover:bg-blue-500 transition-colors cursor-pointer shrink-0 shadow-sm"
              title="Account Settings"
            >
              {profile?.displayName ? profile.displayName.slice(0, 2).toUpperCase() : 'MT'}
            </button>
          </div>
        </header>

        {/* Chat Messages Container with 2026 Smooth Scrolling Physics */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto relative flex flex-col justify-between smooth-scroll-container touch-scroll select-text"
        >
          {messages.length === 0 ? (
            /* Clean 2026 NOVA/VOID Welcome Screen */
            <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-2xl mx-auto w-full">
              <div className="w-24 h-24 rounded-2xl bg-black/80 border border-red-500/30 p-1.5 flex items-center justify-center mb-5 overflow-hidden shadow-[0_0_30px_rgba(220,38,38,0.25)] ring-1 ring-white/10">
                <img 
                  src="/void-logo.jpg"
                  alt="VOID AI" 
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1.5 tracking-tight">How can I help you today?</h1>
              <p className="text-sm text-slate-400 mb-8 font-normal">Next-generation real-time multimodal intelligence</p>

              {/* Quick action prompts with 2026 obsidian styling */}
              <div className="w-full grid grid-cols-2 gap-2.5 max-w-lg">
                <button
                  onClick={() => handleSend("Explain quantum computing algorithms with interactive examples.")}
                  className="p-3.5 sm:p-4 min-h-[56px] rounded-xl bg-black/60 hover:bg-black/85 border border-white/10 hover:border-red-500/40 flex items-center justify-center text-center text-slate-300 hover:text-white text-[13px] sm:text-sm font-medium transition-all duration-200 cursor-pointer leading-snug hover:shadow-[0_0_15px_rgba(220,38,38,0.15)] active:scale-[0.98]"
                >
                  Quantum algorithms & code
                </button>
                <button
                  onClick={() => handleSend("Build a high-performance REST and WebSocket API architecture.")}
                  className="p-3.5 sm:p-4 min-h-[56px] rounded-xl bg-black/60 hover:bg-black/85 border border-white/10 hover:border-blue-500/40 flex items-center justify-center text-center text-slate-300 hover:text-white text-[13px] sm:text-sm font-medium transition-all duration-200 cursor-pointer leading-snug hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] active:scale-[0.98]"
                >
                  Design API architecture
                </button>
                <button
                  onClick={() => handleSend("Audit my code for security vulnerabilities and optimize memory.")}
                  className="p-3.5 sm:p-4 min-h-[56px] rounded-xl bg-black/60 hover:bg-black/85 border border-white/10 hover:border-emerald-500/40 flex items-center justify-center text-center text-slate-300 hover:text-white text-[13px] sm:text-sm font-medium transition-all duration-200 cursor-pointer leading-snug hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] active:scale-[0.98]"
                >
                  Security audit & profiling
                </button>
                <button
                  onClick={() => handleSend("Summarize the latest 2026 tech breakthroughs and research.")}
                  className="p-3.5 sm:p-4 min-h-[56px] rounded-xl bg-black/60 hover:bg-black/85 border border-white/10 hover:border-purple-500/40 flex items-center justify-center text-center text-slate-300 hover:text-white text-[13px] sm:text-sm font-medium transition-all duration-200 cursor-pointer leading-snug hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] active:scale-[0.98]"
                >
                  2026 Research & Insights
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
                  onToggleStar={handleToggleStar}
                  activeRepo={activeRepo}
                  codingModeEnabled={codingMode}
                  onEnableCodingMode={() => {
                    setCodingMode(true);
                    setStoredGitHubCodingMode(true);
                  }}
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
                  activeRepo={activeRepo}
                  codingModeEnabled={codingMode}
                  onEnableCodingMode={() => {
                    setCodingMode(true);
                    setStoredGitHubCodingMode(true);
                  }}
                />
              )}

              {/* Thinking Indicator when waiting for stream start */}
              {isLoading && !streamingMessage && <ThinkingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Floating Scroll to Bottom button — 2026 Glass Floating Dock */}
          {showScrollBottom && (
            <button
              onClick={() => scrollToBottom(true)}
              className="sticky bottom-4 self-end mr-4 px-3.5 py-2 bg-[#0c0d12]/90 hover:bg-[#151722] backdrop-blur-xl border border-red-500/40 hover:border-red-500/70 text-white rounded-full shadow-[0_8px_25px_rgba(220,38,38,0.25)] transition-all z-20 flex items-center gap-2 text-xs font-semibold cursor-pointer animate-fadeIn active:scale-95"
              title="Jump to latest response"
            >
              <ArrowDown size={13} className="text-red-400 animate-bounce" />
              <span className="text-[11px] font-mono tracking-wide">Jump to latest</span>
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
          onClose={() => {
            setShowSettings(false);
            setSettingsInitialView('main');
          }}
          initialView={settingsInitialView}
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
          onOpenGitHubWorkspace={() => setShowGitHubModal(true)}
          walletBalance={profile?.walletBalance || 0}
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          onSelectProviderModel={handleSelectProviderModel}
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

      {/* 2026 Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        chats={chats}
        onSelectChat={(id) => {
          setCurrentChatId(id);
          setShowCommandPalette(false);
        }}
        onNewChat={() => {
          handleNewChat();
          setShowCommandPalette(false);
        }}
        onClearHistory={handleClearAllHistory}
        onOpenSettings={() => {
          setShowSettings(true);
          setShowCommandPalette(false);
        }}
        onOpenWorkspace={(tab) => {
          if (tab) setWorkspaceTab(tab as WorkspaceTab);
          setShowWorkspace(true);
          setShowCommandPalette(false);
        }}
        onSelectModel={(provider, model) => {
          handleSelectProviderModel(provider, model);
        }}
        onOpenPromptStudio={() => {
          setShowPromptStudio(true);
          setShowCommandPalette(false);
        }}
        onOpenLiveVoice={() => {
          setShowLiveVoice(true);
          setShowCommandPalette(false);
        }}
        onExportCurrentChat={handleExportChat}
        onToggleCodingMode={() => {
          const next = !codingMode;
          setCodingMode(next);
          setStoredGitHubCodingMode(next);
        }}
        codingModeEnabled={codingMode}
      />

      {/* In-App Interactive Code Workspace & Sandbox Terminal Drawer */}
      <CodeWorkspaceDrawer
        isOpen={showWorkspace}
        onClose={() => setShowWorkspace(false)}
        activeRepo={activeRepo}
        activeFileContent={workspaceFileContent}
        activeFilePath={workspaceFilePath}
        initialTab={workspaceTab}
        onSaveFile={async (path, content) => {
          setWorkspaceFileContent(content);
          setWorkspaceFilePath(path);
        }}
        onExecutePrompt={(promptText) => {
          handleSend(promptText);
        }}
      />

      {/* Prompt Engineering Studio Modal */}
      <PromptStudioModal
        isOpen={showPromptStudio}
        onClose={() => setShowPromptStudio(false)}
        currentPrompt={customSystemPrompt}
        onSavePrompt={(newPrompt) => {
          setCustomSystemPrompt(newPrompt);
          localStorage.setItem('void_ai_system_prompt', newPrompt);
        }}
      />
    </div>
  );
}
