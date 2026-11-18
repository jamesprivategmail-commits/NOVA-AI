import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { BrainPanel } from '../components/BrainPanel';
import { EvolutionPanel } from '../components/EvolutionPanel';
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
import { Chat, Message, UserProfile, BroadcastMessage, AIBrainSettings, AgentState, type CouncilData } from '../../models/types';
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
  toggleStarMessage,
  listenToSystemAPIKeys
} from '../../database/db';
import { sendMessageToGroq, sendCouncilMessage, setClientSystemKeys } from '../../api/client';
import { memoryManager } from '../../memory/context';
import { CommandPalette } from '../components/CommandPalette';
import { AppearanceMenu } from '../components/AppearanceMenu';
import { ShortcutsModal } from '../components/ShortcutsModal';
import { ModelSelectorDropdown } from '../components/ModelSelectorDropdown';
import { NovaOrb, type NovaOrbState } from '../components/NovaOrb';
import { MuseCharacterStage, type MusePresenceMode } from '../components/MuseCharacterStage';
import { SquadRosterModal } from '../components/SquadRosterModal';
import { NOVA_PERSONAS, getPersona, getTimeGreeting, PROMPT_LIBRARY } from '../models/personas';
import { CodeWorkspaceDrawer, WorkspaceTab } from '../components/workspace/CodeWorkspaceDrawer';
import { PromptStudioModal } from '../components/workspace/PromptStudioModal';
import { LiveHtmlPreviewModal } from '../components/workspace/LiveHtmlPreviewModal';
import { ZipInspectorModal } from '../components/workspace/ZipInspectorModal';
import { ParsedZipResult } from '../utils/zipParser';
import { offlineCache } from '../utils/offlineQueue';
import { Menu, ArrowDown, Code2, Radio, X, Sliders, Command, Check, Phone, Video, Users, Globe } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { clsx } from 'clsx';


interface ChatScreenProps {
  userId: string;
}

export function ChatScreen({ userId }: ChatScreenProps) {
  const [chats, setChats] = useState<Chat[]>(() => offlineCache.loadChats());
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
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

  // AI Character & Model Selection state (Persisted)
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(() => {
    return localStorage.getItem('void_ai_selected_persona') || 'shii';
  });
  const [selectedProvider, setSelectedProvider] = useState<'groq' | 'cohere' | 'bazaarlink' | 'gemini'>(() => {
    return (localStorage.getItem('void_ai_selected_provider') as any) || 'groq';
  });
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('void_ai_selected_model') || 'qwen/qwen3.8-27b';
  });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [promptLibOpen, setPromptLibOpen] = useState(false);
  const [presenceMode, setPresenceMode] = useState<MusePresenceMode>(() => {
    const saved = localStorage.getItem('void_ai_muse_presence');
    return saved === 'pip' || saved === 'voice' ? saved : 'stage';
  });
  const [isUserComposing, setIsUserComposing] = useState(false);
  const [isSpeakingReply, setIsSpeakingReply] = useState(false);

  // 4-Model Collaborative Squad + Live Web Research Controls
  const [squadMode, setSquadMode] = useState<boolean>(() => {
    return localStorage.getItem('void_ai_squad_mode') === 'true';
  });
  const [squadPersonaIds, setSquadPersonaIds] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('void_ai_squad_ids') || 'null');
      if (Array.isArray(saved) && saved.length === 4) return saved;
    } catch (_) {}
    return ['shii', 'shiia', 'lyra', 'sora'];
  });
  const [showSquadRoster, setShowSquadRoster] = useState(false);
  const [webResearchEnabled, setWebResearchEnabled] = useState<boolean>(() => {
    return localStorage.getItem('void_ai_web_research') === 'true';
  });
  const [streamingCouncil, setStreamingCouncil] = useState<CouncilData | null>(null);

  const squadPersonas = React.useMemo(
    () => squadPersonaIds.map((id) => getPersona(undefined, undefined, id)),
    [squadPersonaIds]
  );

  const handleToggleSquadMode = () => {
    const next = !squadMode;
    setSquadMode(next);
    localStorage.setItem('void_ai_squad_mode', String(next));
  };

  const handleChangeSquadIds = (ids: string[]) => {
    setSquadPersonaIds(ids);
    localStorage.setItem('void_ai_squad_ids', JSON.stringify(ids));
  };

  const handleToggleWebResearch = () => {
    const next = !webResearchEnabled;
    setWebResearchEnabled(next);
    localStorage.setItem('void_ai_web_research', String(next));
  };

  const activePersona = getPersona(selectedProvider, selectedModel, selectedPersonaId);

  const liveAvatarState: NovaOrbState = isLoading
    ? (streamingMessage ? 'speaking' : 'thinking')
    : isSpeakingReply
    ? 'speaking'
    : isUserComposing
    ? 'listening'
    : 'idle';

  const handleChangePresenceMode = (nextMode: MusePresenceMode) => {
    if (nextMode === 'face') {
      setShowLiveVoice(true);
      return;
    }
    setPresenceMode(nextMode);
    localStorage.setItem('void_ai_muse_presence', nextMode);
  };

  const handleSelectProviderModel = (provider: 'groq' | 'cohere' | 'bazaarlink' | 'gemini', model: string, personaId?: string) => {
    const resolved = getPersona(provider, model, personaId);
    setSelectedProvider(provider);
    setSelectedModel(model);
    setSelectedPersonaId(resolved.id);
    localStorage.setItem('void_ai_selected_provider', provider);
    localStorage.setItem('void_ai_selected_model', model);
    localStorage.setItem('void_ai_selected_persona', resolved.id);
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
      } else if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = document.activeElement;
        if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && !(el as HTMLElement).isContentEditable)) {
          e.preventDefault();
          setShowShortcuts(prev => !prev);
        }
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

  // 2026 Interactive HTML Sandbox & ZIP Inspector modals
  const [previewHtmlData, setPreviewHtmlData] = useState<{ html: string; title: string } | null>(null);
  const [inspectZipData, setInspectZipData] = useState<ParsedZipResult | null>(null);

  useEffect(() => {
    const handlePreviewHtml = (e: any) => {
      if (e.detail?.html) {
        setPreviewHtmlData({
          html: e.detail.html,
          title: e.detail.title || 'Live HTML Sandbox'
        });
      }
    };
    const handleInspectZip = (e: any) => {
      if (e.detail?.zipData) {
        setInspectZipData(e.detail.zipData);
      }
    };
    window.addEventListener('void_ai_preview_html', handlePreviewHtml);
    window.addEventListener('void_ai_inspect_zip', handleInspectZip);
    return () => {
      window.removeEventListener('void_ai_preview_html', handlePreviewHtml);
      window.removeEventListener('void_ai_inspect_zip', handleInspectZip);
    };
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
  const [showBrainPanel, setShowBrainPanel] = useState(false);
  const [showEvolutionPanel, setShowEvolutionPanel] = useState(false);
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
    const unsubKeys = listenToSystemAPIKeys((keys) => {
      setClientSystemKeys({
        groqKeys: keys.groqApiKeys,
        cohereKeys: keys.cohereApiKeys,
        bazaarLinkKeys: keys.bazaarLinkApiKeys,
        geminiKeys: keys.geminiApiKeys,
      });
    });
    return () => unsubKeys();
  }, []);

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

  // Ultra-fast auto-scroll: zero layout thrashing
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container || userScrolledUpRef.current) return;
    if (streamingMessage) {
      container.scrollTop = container.scrollHeight;
    } else {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
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
    // Anytime you enter the website, always open a fresh, clean chat to eliminate lag and maximize performance!
    setCurrentChatId(null);
    setMessages([]);
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

  const handleToggleStar = useCallback(async (msgId: string) => {
    if (!currentChatId) return;
    setMessages(prev => {
      const msg = prev.find(m => m.id === msgId);
      const newStarred = !msg?.isStarred;
      toggleStarMessage(currentChatId, msgId, newStarred).catch(console.error);
      return prev.map(m => m.id === msgId ? { ...m, isStarred: newStarred } : m);
    });
  }, [currentChatId]);

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

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setStreamingMessage('');
  };

  const handleDeleteChat = async (id: string) => {
    await deleteChat(id);
    const updatedChats = chats.filter((c) => c.id !== id);
    setChats(updatedChats);
    offlineCache.saveChats(updatedChats);
    if (currentChatId === id) {
      setCurrentChatId(null);
      setMessages([]);
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

    const freeLimit = brainSettings?.freeLimit ?? 30;
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

  const handleDeleteMessage = useCallback(async (msgId: string) => {
    if (!currentChatId) return;
    deleteMessage(currentChatId, msgId).catch(console.error);
    setMessages(prev => prev.filter((m) => m.id !== msgId));
  }, [currentChatId]);

  const handleEditMessage = useCallback(async (msgId: string, newText: string) => {
    if (!currentChatId) return;
    updateMessage(currentChatId, msgId, newText).catch(console.error);
    setMessages(prev => prev.map((m) => (m.id === msgId ? { ...m, text: newText } : m)));
  }, [currentChatId]);

  const handleEnableCodingMode = useCallback(() => {
    setCodingMode(true);
    setStoredGitHubCodingMode(true);
  }, []);

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
      } else if (attachment.kind === 'zip') {
        displayText = `📦 **ZIP Archive: \`${attachment.name}\`** (${attachment.zipStats?.fileCount || 0} files unpacked · ${((attachment.zipStats?.totalSize || 0) / 1024).toFixed(1)} KB)\n\n${text}`.trim();
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

      const builtContext = memoryManager.buildContextWithSummary(currentMessages);
      const userTier = updatedProfile?.tier || profile?.tier || 'free';
      const savedTemp = parseFloat(localStorage.getItem('void_ai_temperature') || '0.65');
      const temperature = Number.isNaN(savedTemp) ? 0.65 : savedTemp;

      const githubContext = activeRepo ? {
        owner: activeRepo.owner,
        repo: activeRepo.repo,
        branch: activeRepo.branch,
        user: gitHubUser?.login || undefined,
        activeFile: activeRepo.activeFile || undefined,
        codingMode: codingMode,
        fileTreeSnippet: repoTreeSnippet || undefined,
      } : undefined;

      const combinedExtraPrompt = [
        customSystemPrompt?.trim(),
        builtContext.activeTaskHint
          ? `[Active Conversation Goal]: ${builtContext.activeTaskHint}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      let pendingUpdate = false;
      const shouldUseSquad = squadMode && attachment?.kind !== 'image';

      if (shouldUseSquad) {
        const effectiveSquad = squadPersonas.length >= 4 ? squadPersonas.slice(0, 4) : NOVA_PERSONAS.slice(0, 4);
        const { telemetry, finalCouncilData } = await sendCouncilMessage({
          messages: builtContext.messages,
          systemPrompt: combinedExtraPrompt,
          agents: effectiveSquad.map((p) => ({
            id: p.id,
            name: p.name,
            role: p.role,
            provider: p.provider,
            modelId: p.modelId,
            systemDirective: p.systemDirective,
          })),
          webResearch: webResearchEnabled ? true : 'auto',
          userId,
          attachment,
          githubContext,
          temperature,
          earlierSummary: builtContext.earlierSummary,
          signal: abortControllerRef.current.signal,
          onCouncilUpdate: (councilState) => {
            setStreamingCouncil(councilState);
          },
          onChunk: (chunk) => {
            fullResponse += chunk;
            if (!pendingUpdate) {
              pendingUpdate = true;
              requestAnimationFrame(() => {
                setStreamingMessage(fullResponse);
                pendingUpdate = false;
              });
            }
          },
        });

        if (telemetry) setLastTelemetry(telemetry);

        if (fullResponse.trim()) {
          const modelMsg = await saveMessage(activeChatId, 'model', fullResponse, {
            councilData: finalCouncilData,
            latencyMs: telemetry?.latencyMs,
            ttftMs: telemetry?.ttftMs,
            tokensPerSec: telemetry?.tokensPerSec,
            totalTokens: telemetry?.totalTokens,
            modelUsed: `4-Model Squad (${effectiveSquad.map((s) => s.name).join(' + ')})`,
            providerUsed: 'multi-model-council',
          } as any);
          const updatedMsgs = [...currentMessages, modelMsg];
          setMessages(updatedMsgs);
          offlineCache.saveMessages(activeChatId, updatedMsgs);
        }
        setStreamingCouncil(null);
        setStreamingMessage('');
      } else {
        const telemetry = await sendMessageToGroq(
          builtContext.messages,
          combinedExtraPrompt,
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
          githubContext,
          undefined,
          {
            temperature,
            personaId: activePersona.id,
            personaName: activePersona.name,
            characterDirective: activePersona.systemDirective,
            earlierSummary: builtContext.earlierSummary,
            webResearch: webResearchEnabled ? true : 'auto',
          }
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
            modelUsed: `${activePersona.name} · ${selectedModel}`,
            providerUsed: selectedProvider,
          } as any);
          const updatedMsgs = [...currentMessages, modelMsg];
          setMessages(updatedMsgs);
          offlineCache.saveMessages(activeChatId, updatedMsgs);
        }
        setStreamingMessage('');
      }
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
        setStreamingCouncil(null);
        setStreamingMessage('');
      }
    } finally {
      setIsLoading(false);
      setStreamingCouncil(null);
      abortControllerRef.current = null;
    }
  };

  const handleSpeakLatestReply = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeakingReply) {
      window.speechSynthesis.cancel();
      setIsSpeakingReply(false);
      return;
    }
    const latestModelMsg = [...messages].reverse().find((m) => m.role !== 'user' && m.text.trim());
    if (!latestModelMsg) return;
    window.speechSynthesis.cancel();
    const cleanSpeech = latestModelMsg.text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/[#*_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanSpeech.slice(0, 1800));
    utterance.onend = () => setIsSpeakingReply(false);
    utterance.onerror = () => setIsSpeakingReply(false);
    setIsSpeakingReply(true);
    window.speechSynthesis.speak(utterance);
  }, [isSpeakingReply, messages]);

  const handleLogout = async () => {
    await signOut(getAuth());
  };

  return (
    <div className="view-enter flex h-screen h-[100dvh] w-full bg-transparent text-[var(--text-primary)] overflow-hidden relative overscroll-none select-none md:p-3 md:gap-3">
      {/* Subtle warm ambient atmosphere that respects light & dark liquid glass */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-65 bg-[radial-gradient(ellipse_at_top,var(--accent-soft)_0%,transparent_60%)]" />
      {/* Mobile Backdrop Overlay when Sidebar is expanded */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* Sidebar Component */}
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={(id) => {
          setCurrentChatId(id);
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
        onOpenPromptStudio={() => setShowPromptStudio(true)}
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
        onClose={() => setIsSidebarOpen(false)}
        isOpen={isSidebarOpen}
        isAdmin={profile?.isAdmin || false}
        isSupportStaff={profile?.isSupportStaff || false}
        walletBalance={profile?.walletBalance || 0}
        userEmail={profile?.email || 'mrnovatech4@gmail.com'}
        userName={profile?.displayName || 'Workspace User'}
      />

      {/* Main Muse Workspace + Living Companion Stage */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 h-full min-h-0 relative min-w-0 z-10 overflow-hidden">
        {/* Muse Conversation Canvas */}
        <div className="flex-1 flex flex-col h-full min-h-0 relative min-w-0 muse-glass-panel md:rounded-[28px] overflow-hidden">
          {/* Broadcast System Banner Notice */}
          {activeBroadcast && (
            <div className="glass-thick border-b border-[var(--line)] p-2 px-3 flex items-center justify-between text-xs text-[var(--text-primary)] z-30 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg text-white font-bold shrink-0" style={{ background: 'var(--accent)' }}>
                  <Radio size={12} />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 text-xs">
                    <span>{activeBroadcast.title}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">· Broadcast</span>
                  </div>
                  <p className="text-[var(--text-secondary)] truncate text-[11px]">{activeBroadcast.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissedBroadcastIds(prev => [...prev, activeBroadcast.id])}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-lg transition-colors shrink-0 cursor-pointer"
                title="Dismiss Notice"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Muse 3-Zone Floating Glass Top Bar */}
          <header className="h-14 px-3 sm:px-4 sticky top-0 z-20 glass-header-2026 flex items-center justify-between gap-2 sm:gap-4 select-none w-full min-w-0 shrink-0">
            {/* Zone 1: Sidebar Toggle + Wordmark + Active Companion */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="btn btn-ghost w-10 h-10 !p-0 rounded-full shrink-0"
                title="Toggle sidebar"
              >
                <Menu size={17} />
              </button>

              <span className="font-display font-semibold text-base tracking-tight text-[var(--text-primary)] whitespace-nowrap hidden sm:inline shrink-0">
                NOVA <span className="text-gradient text-gradient-animated">Muse</span>
              </span>

              <ModelSelectorDropdown
                selectedProvider={selectedProvider}
                selectedModel={selectedModel}
                selectedPersonaId={selectedPersonaId}
                onSelect={handleSelectProviderModel}
                lastTelemetry={lastTelemetry}
              />
            </div>

            {/* Zone 2: Muse Presence Mode Switcher (Stage | PiP | Voice | Face) */}
            <nav
              aria-label="Muse companion mode"
              className="hidden md:flex items-center gap-0.5 p-1 rounded-full glass-subtle shrink-0"
            >
              {([
                { id: 'stage', label: 'Stage' },
                { id: 'pip', label: 'PiP' },
                { id: 'voice', label: 'Voice' },
                { id: 'face', label: 'Face-to-Face' },
              ] as { id: MusePresenceMode; label: string }[]).map((item) => {
                const isActive = presenceMode === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleChangePresenceMode(item.id)}
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                      isActive
                        ? 'glass-thick text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: 4-Model Squad, Workspace Tools, Call Muse Trigger, Appearance & Profile */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* 4-Model Collaboration Squad Toggle */}
              <div className="flex items-center rounded-full glass-subtle p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleSquadMode}
                  className={clsx(
                    'btn h-8 px-2.5 sm:px-3 rounded-full text-xs whitespace-nowrap',
                    squadMode ? 'btn-primary' : 'btn-ghost !border-transparent'
                  )}
                  title="Toggle 4-Model Collaborative Chat (4 AI models discuss & split tasks in parallel)"
                >
                  <Users size={13} />
                  <span className="hidden sm:inline">{squadMode ? '4-Model Squad' : 'Squad'}</span>
                </button>
                {squadMode && (
                  <button
                    type="button"
                    onClick={() => setShowSquadRoster(true)}
                    className="h-8 px-2 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap"
                    title="Customize the 4 Muse models"
                  >
                    Edit
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowPromptStudio(true)}
                className="btn btn-ghost h-9 px-2.5 rounded-full text-xs hidden xl:flex whitespace-nowrap"
                title="Directives & Prompt Engineering Studio"
              >
                <Sliders size={13} style={{ color: 'var(--accent)' }} />
                <span>Directives</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCommandPalette(true)}
                className="btn btn-ghost h-9 px-2.5 rounded-full text-xs whitespace-nowrap"
                title="Command Palette (⌘K)"
              >
                <Command size={13} style={{ color: 'var(--accent)' }} />
                <kbd className="kbd hidden sm:inline-block">⌘K</kbd>
              </button>

              <button
                type="button"
                onClick={() => setShowWorkspace(!showWorkspace)}
                className={clsx(
                  'btn h-9 px-2.5 sm:px-3 rounded-full text-xs whitespace-nowrap',
                  showWorkspace ? 'btn-primary' : 'btn-ghost'
                )}
                title="Toggle Code Workspace & Terminal (⌘E)"
              >
                <Code2 size={14} style={showWorkspace ? undefined : { color: 'var(--accent)' }} />
                <span className="hidden sm:inline">Workspace</span>
              </button>

              <AppearanceMenu />

              {/* Signature Muse Upper-Right Phone / Face-to-Face Trigger */}
              <button
                type="button"
                onClick={() => setShowLiveVoice(true)}
                className="btn btn-primary h-9 px-3 rounded-full text-xs whitespace-nowrap shrink-0"
                title={`Call ${activePersona.name} (Face-to-Face)`}
              >
                {presenceMode === 'voice' ? <Phone size={14} /> : <Video size={14} />}
                <span className="hidden sm:inline">Call</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="w-9 h-9 rounded-full glass border border-[var(--glass-border)] font-bold text-[11px] flex items-center justify-center transition-all cursor-pointer shrink-0 hover:brightness-105 active:scale-95 text-[var(--text-primary)]"
                title="Account Settings & Integrations"
              >
                {profile?.displayName ? profile.displayName.slice(0, 2).toUpperCase() : 'MU'}
              </button>
            </div>
          </header>

          {/* Compact Mobile Companion Bar / Voice-Only Banner */}
          {(presenceMode === 'voice' || (presenceMode === 'stage' && messages.length > 0)) && (
            <MuseCharacterStage
              mode={presenceMode}
              onChangeMode={handleChangePresenceMode}
              persona={activePersona}
              avatarState={liveAvatarState}
              onSelectPersona={(p) => handleSelectProviderModel(p.provider, p.modelId, p.id)}
              onOpenFaceToFace={() => setShowLiveVoice(true)}
              onQuickPrompt={(prompt) => handleSend(prompt)}
              hasActiveMessages={messages.length > 0}
              onSpeakLatest={handleSpeakLatestReply}
              isSpeakingReply={isSpeakingReply}
              squadMode={squadMode}
              squadPersonas={squadPersonas}
              liveCouncilData={streamingCouncil}
              onOpenSquadRoster={() => setShowSquadRoster(true)}
            />
          )}

          {/* Chat Messages Container */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto relative flex flex-col justify-between smooth-scroll-container touch-scroll select-text"
          >
            {messages.length === 0 ? (
              /* Faithful Muse AI Liquid Glass Hero Stage */
              <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-2xl mx-auto w-full">
                {/* Featured Living Companion Portrait */}
                <div className="relative mb-5 animate-riseIn flex flex-col items-center text-center">
                  <div className="muse-glass-panel rounded-[2.2rem] p-3 mb-4 inline-flex flex-col items-center">
                    <NovaOrb
                      size={140}
                      state={liveAvatarState}
                      persona={activePersona}
                      shape="rounded"
                      showAudioBars
                      interactiveTilt
                      label={activePersona.name}
                      className="sm:!w-[164px] sm:!h-[164px]"
                    />
                  </div>

                  <div className="text-xs font-medium text-[var(--text-muted)] mb-1">
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>{activePersona.name} ({activePersona.role})</span>
                  </div>

                  <h1
                    className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] tracking-tight mb-2"
                    style={{ textWrap: 'balance' }}
                  >
                    {getTimeGreeting()}. How can {activePersona.name} help?
                  </h1>

                  <p className="text-sm text-[var(--text-secondary)] max-w-lg leading-relaxed">
                    {activePersona.personality}
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowLiveVoice(true)}
                      className="btn btn-primary h-10 px-4 rounded-full text-xs whitespace-nowrap"
                    >
                      <Phone size={14} />
                      <span>Start Face-to-Face Call</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleSquadMode}
                      className={clsx(
                        'btn h-10 px-4 rounded-full text-xs whitespace-nowrap',
                        squadMode ? 'btn-primary' : 'btn-ghost'
                      )}
                    >
                      <Users size={14} />
                      <span>{squadMode ? '4-Model Squad: ON' : 'Enable 4-Model Squad'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleWebResearch}
                      className={clsx(
                        'btn h-10 px-4 rounded-full text-xs whitespace-nowrap',
                        webResearchEnabled ? 'btn-primary' : 'btn-ghost'
                      )}
                    >
                      <Globe size={14} />
                      <span>{webResearchEnabled ? 'Live Web Crawl: ON' : 'Live Web Access'}</span>
                    </button>
                  </div>
                </div>

                {/* Muse Companion Selector Strip */}
                <div className="w-full mb-5 animate-riseIn" style={{ animationDelay: '120ms' }}>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <span className="section-label">Choose Your Muse</span>
                    <span className="text-[11px] text-[var(--text-muted)]">Tap to switch live</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {NOVA_PERSONAS.map((p) => {
                      const isActive = activePersona.id === p.id;
                      return (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => handleSelectProviderModel(p.provider, p.modelId, p.id)}
                          className={clsx(
                            'p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 hover-lift',
                            isActive
                              ? 'glass-thick text-[var(--text-primary)]'
                              : 'glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          )}
                          style={isActive ? { borderColor: 'var(--accent-muted)', background: 'var(--accent-soft)' } : undefined}
                        >
                          <NovaOrb size={38} persona={p} shape="circle" className="shrink-0" label={p.name} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-[var(--text-primary)] truncate">{p.name}</span>
                              {isActive && <Check size={12} style={{ color: 'var(--accent)' }} className="shrink-0" />}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] truncate">{p.role.split('·')[0].trim()}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

              {/* Curated Prompt Library */}
              <div className="relative w-full max-w-2xl mb-3 animate-riseIn" style={{ animationDelay: '210ms' }}>
                <button
                  type="button"
                  onClick={() => setPromptLibOpen(o => !o)}
                  className="chip !rounded-2xl !px-4 !py-3 w-full justify-between !text-sm"
                  aria-expanded={promptLibOpen}
                >
                  <span className="flex items-center gap-2">
                    <span style={{ color: 'var(--accent)' }}>✦</span>
                    <span className="text-[var(--text-primary)] font-semibold">Prompt Library</span>
                    <span className="text-[var(--text-muted)] text-xs">· {PROMPT_LIBRARY.length} full-execution starters</span>
                  </span>
                  <span className={clsx('text-[var(--text-muted)] transition-transform duration-200', promptLibOpen && 'rotate-180')}>▾</span>
                </button>
                {promptLibOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-2xl glass-thick p-2 max-h-72 overflow-y-auto animate-fadeIn">
                    {PROMPT_LIBRARY.map((p, i) => (
                      <button
                        type="button"
                        key={p.label}
                        onClick={() => { setPromptLibOpen(false); handleSend(p.prompt); }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer nova-menu-item"
                        style={{ animationDelay: `${i * 25}ms` }}
                      >
                        <span className="block text-xs font-semibold text-[var(--text-primary)]">{p.label}</span>
                        <span className="block text-[11px] text-[var(--text-muted)] truncate mt-0.5">{p.prompt}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Starter Action Cards */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl animate-riseIn" style={{ animationDelay: '260ms' }}>
                <button
                  type="button"
                  onClick={() => handleSend("Design and build a complete interactive web dashboard with full component structure.")}
                  className="chip !rounded-2xl !px-4 !py-3.5 justify-start text-left min-h-[58px] text-[13px] leading-snug hover-lift"
                >
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">Build a complete web app</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">End-to-end architecture & UI</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSend("Build a high-performance REST and real-time streaming API service with error handling.")}
                  className="chip !rounded-2xl !px-4 !py-3.5 justify-start text-left min-h-[58px] text-[13px] leading-snug hover-lift"
                >
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">Architect API & Backend</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Routes, schemas & streaming</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSend("Review and harden my code for bugs, race conditions, and security edge cases.")}
                  className="chip !rounded-2xl !px-4 !py-3.5 justify-start text-left min-h-[58px] text-[13px] leading-snug hover-lift"
                >
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">Deep Code & Security Audit</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Bug hunt & performance fixes</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSend("Let's plan a multi-step engineering project together and execute it phase by phase.")}
                  className="chip !rounded-2xl !px-4 !py-3.5 justify-start text-left min-h-[58px] text-[13px] leading-snug hover-lift"
                >
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">Multi-Step Project Execution</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Continuous step-by-step delivery</div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Render Message History */
            <div className="py-3">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onDelete={handleDeleteMessage}
                  onEdit={handleEditMessage}
                  onToggleStar={handleToggleStar}
                  onContinue={msg.role !== 'user' ? () => handleSend('Continue seamlessly from where you stopped and finish all remaining parts of our current task without restarting.') : undefined}
                  activeRepo={activeRepo}
                  codingModeEnabled={codingMode}
                  persona={activePersona}
                  onEnableCodingMode={handleEnableCodingMode}
                />
              ))}

              {/* Real-time Streaming AI Message (or Live 4-Model Council Progress) */}
              {isLoading && (streamingMessage || streamingCouncil) && (
                <MessageBubble
                  message={{
                    id: 'temp',
                    chatId: currentChatId || '',
                    role: 'model',
                    text: streamingMessage,
                    councilData: streamingCouncil || undefined,
                    createdAt: Date.now()
                  }}
                  isStreaming={true}
                  activeRepo={activeRepo}
                  codingModeEnabled={codingMode}
                  persona={activePersona}
                  onEnableCodingMode={() => {
                    setCodingMode(true);
                    setStoredGitHubCodingMode(true);
                  }}
                />
              )}

              {/* Thinking Indicator when waiting for stream start */}
              {isLoading && !streamingMessage && !streamingCouncil && <ThinkingIndicator persona={activePersona} />}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Floating Scroll to Bottom button */}
          {showScrollBottom && (
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              className="sticky bottom-4 self-end mr-4 px-3.5 py-2 glass-thick text-[var(--text-primary)] rounded-full transition-all z-20 flex items-center gap-2 text-xs font-semibold cursor-pointer animate-fadeIn active:scale-95"
              title="Jump to latest response"
            >
              <ArrowDown size={13} style={{ color: 'var(--accent)' }} className="animate-bounce" />
              <span className="text-[11px] font-mono tracking-wide">Latest</span>
            </button>
          )}
        </div>

          {/* Bottom Input Dock */}
          <div className="shrink-0 w-full glass-header-2026 pt-2 pb-2 px-2 z-10 flex flex-col items-center">
            {!isLoading && messages.length > 0 && (
              <div className="w-full max-w-3xl flex items-center gap-1.5 px-1 pb-2 overflow-x-auto no-scrollbar">
                {[
                  { label: "Continue task", prompt: "Continue seamlessly from where you left off and complete the remaining parts without restarting." },
                  { label: "Finish every file", prompt: "Complete all remaining code and details in full with zero placeholders." },
                  { label: "Make it concise", prompt: "Summarize our current solution concisely while preserving key technical details." },
                  { label: "Find edge cases", prompt: "Audit what we just built for edge cases and missing error handling." },
                  { label: "Write tests", prompt: "Write complete unit/integration tests for what we just built." },
                ].map(q => (
                  <button
                    type="button"
                    key={q.label}
                    onClick={() => handleSend(q.prompt)}
                    className="chip shrink-0 !py-1.5 !px-3 !text-[11px]"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
            <InputArea
              onSend={handleSend}
              isLoading={isLoading}
              onStop={handleStopGeneration}
              onOpenLiveVoice={() => setShowLiveVoice(true)}
              onImageGenerate={handleImageGenerate}
              activeCharacterName={activePersona.name}
              onActivityChange={setIsUserComposing}
              webResearchEnabled={webResearchEnabled}
              onToggleWebResearch={handleToggleWebResearch}
              squadMode={squadMode}
            />
            <div className="text-[10px] text-[var(--text-muted)] text-center px-2 pt-1 select-none">
              {squadMode
                ? `4-Model Squad (${squadPersonas.slice(0, 4).map((s) => s.name).join(' · ')}) · Parallel Execution`
                : `${activePersona.name} remembers this entire thread · Live Web Crawl ${webResearchEnabled ? 'ON' : 'Auto'}`}
            </div>
          </div>
        </div>

        {/* Desktop Side-by-Side Stage & PiP Floating Card */}
        {presenceMode !== 'voice' && (
          <MuseCharacterStage
            mode={presenceMode}
            onChangeMode={handleChangePresenceMode}
            persona={activePersona}
            avatarState={liveAvatarState}
            onSelectPersona={(p) => handleSelectProviderModel(p.provider, p.modelId, p.id)}
            onOpenFaceToFace={() => setShowLiveVoice(true)}
            onQuickPrompt={(prompt) => handleSend(prompt)}
            hasActiveMessages={messages.length > 0}
            onSpeakLatest={handleSpeakLatestReply}
            isSpeakingReply={isSpeakingReply}
            squadMode={squadMode}
            squadPersonas={squadPersonas}
            liveCouncilData={streamingCouncil}
            onOpenSquadRoster={() => setShowSquadRoster(true)}
          />
        )}
      </div>

      {/* Keyboard shortcuts guide */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

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
          onOpenBrainPanel={() => setShowBrainPanel(true)}
          onOpenEvolutionPanel={() => setShowEvolutionPanel(true)}
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

      {/* Nova Core Brain Panel */}
      {showBrainPanel && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <BrainPanel />
        </div>
      )}

      {/* Self-Evolution Panel */}
      {showEvolutionPanel && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <EvolutionPanel />
        </div>
      )}

      {/* Telegram AI Bot Modal */}
      {showTelegramModal && (
        <TelegramModal
          onClose={() => setShowTelegramModal(false)}
          isAdmin={profile?.isAdmin || false}
          userEmail={profile?.email || 'mrnovatech4@gmail.com'}
        />
      )}

      {/* Live Voice Chat Modal (Face-to-Face Muse Call) */}
      {showLiveVoice && (
        <LiveVoiceModal
          onClose={() => setShowLiveVoice(false)}
          userId={userId}
          userTier={profile?.tier || 'free'}
          persona={activePersona}
          onSelectPersona={(p) => handleSelectProviderModel(p.provider, p.modelId, p.id)}
        />
      )}

      {/* Developer API Keys & Billing Modal */}
      {showApiKeyModal && (
        <ApiKeyModal
          user={profile}
          isOpen={showApiKeyModal}
          onClose={() => setShowApiKeyModal(false)}
          onOpenSubscription={() => setShowSubscription(true)}
        />
      )}

      {/* GitHub Workspace Modal */}
      {showGitHubModal && (
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
      )}

      {/* 2026 Global Command Palette (⌘K) */}
      {showCommandPalette && (
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
          onSelectModel={(provider, model, personaId) => {
            handleSelectProviderModel(provider, model, personaId);
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
      )}

      {/* In-App Interactive Code Workspace & Sandbox Terminal Drawer */}
      {showWorkspace && (
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
      )}

      {/* Prompt Engineering Studio Modal */}
      {showPromptStudio && (
        <PromptStudioModal
          isOpen={showPromptStudio}
          onClose={() => setShowPromptStudio(false)}
          currentPrompt={customSystemPrompt}
          onSavePrompt={(newPrompt) => {
            setCustomSystemPrompt(newPrompt);
            localStorage.setItem('void_ai_system_prompt', newPrompt);
          }}
        />
      )}

      {/* 2026 Interactive Live HTML Sandbox Modal */}
      {previewHtmlData && (
        <LiveHtmlPreviewModal
          initialHtml={previewHtmlData.html}
          title={previewHtmlData.title}
          onClose={() => setPreviewHtmlData(null)}
        />
      )}

      {/* 2026 Full ZIP Archive Inspector & Code Explorer */}
      {inspectZipData && (
        <ZipInspectorModal
          zipData={inspectZipData}
          onClose={() => setInspectZipData(null)}
          onOpenInHtmlPreview={(html, title) => {
            setInspectZipData(null);
            setPreviewHtmlData({ html, title });
          }}
          onSendToChat={(prompt) => {
            setInspectZipData(null);
            handleSend(prompt);
          }}
          onOpenInWorkspace={(path, content) => {
            setWorkspaceFilePath(path);
            setWorkspaceFileContent(content);
            setShowWorkspace(true);
          }}
        />
      )}

      {/* 4-Model Squad Roster Customization Modal */}
      {showSquadRoster && (
        <SquadRosterModal
          selectedIds={squadPersonaIds}
          onChangeSquad={handleChangeSquadIds}
          onClose={() => setShowSquadRoster(false)}
        />
      )}
    </div>
  );
}
