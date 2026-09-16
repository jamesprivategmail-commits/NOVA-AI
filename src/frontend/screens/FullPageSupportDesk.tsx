import React, { useState, useEffect, useRef } from 'react';
import { SupportChat, SupportMessage, UserProfile } from '../../models/types';
import { listenToAllSupportChats, listenToSupportMessages, sendSupportMessage, markSupportChatRead, listenToAllUsers } from '../../database/db';
import { ArrowLeft, Send, Shield, User, Search, CheckCircle, Clock, Sparkles, MessageSquare, Zap, BadgeCheck, AlertCircle, RefreshCw, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface FullPageSupportDeskProps {
  userId: string;
  userName: string;
  onClose: () => void;
  isAdminView?: boolean;
  isSupportStaff?: boolean;
  initialTargetUserId?: string;
  initialTargetUserName?: string;
}

export function FullPageSupportDesk({
  userId,
  userName,
  onClose,
  isAdminView = false,
  isSupportStaff = false,
  initialTargetUserId,
  initialTargetUserName
}: FullPageSupportDeskProps) {
  const isStaffOrAdmin = isAdminView || isSupportStaff;

  // State for Staff/Admin view
  const [supportChats, setSupportChats] = useState<SupportChat[]>([]);
  const [allUsersMap, setAllUsersMap] = useState<Record<string, UserProfile>>({});
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(
    initialTargetUserId || null
  );
  const [selectedChatUserName, setSelectedChatUserName] = useState<string | null>(
    initialTargetUserName || null
  );
  const [viewTab, setViewTab] = useState<'tickets' | 'allUsers'>('tickets');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'vip'>('all');

  // Messages state for active chat
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync selected user if initialTargetUserId provided
  useEffect(() => {
    if (initialTargetUserId) {
      setSelectedChatUserId(initialTargetUserId);
      if (initialTargetUserName) {
        setSelectedChatUserName(initialTargetUserName);
      } else if (allUsersMap[initialTargetUserId]) {
        const u = allUsersMap[initialTargetUserId];
        setSelectedChatUserName(u.displayName || u.email || 'User');
      }
    }
  }, [initialTargetUserId, initialTargetUserName, allUsersMap]);

  // Load all support chats if staff/admin
  useEffect(() => {
    if (!isStaffOrAdmin) return;

    const unsubChats = listenToAllSupportChats((chats) => {
      setSupportChats(chats);
      if (!selectedChatUserId && chats.length > 0) {
        setSelectedChatUserId(chats[0].userId);
        setSelectedChatUserName(chats[0].userName);
      }
    });

    const unsubUsers = listenToAllUsers((usersList) => {
      const map: Record<string, UserProfile> = {};
      usersList.forEach(u => { map[u.uid] = u; });
      setAllUsersMap(map);
    });

    return () => {
      unsubChats();
      unsubUsers();
    };
  }, [isStaffOrAdmin]);

  // Determine actual target chat user ID & Name
  const currentChatUserId = isStaffOrAdmin ? selectedChatUserId : userId;
  const currentChatUserName = isStaffOrAdmin ? (selectedChatUserName || 'User') : userName;

  // Listen to messages for active chat
  useEffect(() => {
    if (!currentChatUserId) return;

    markSupportChatRead(currentChatUserId, isStaffOrAdmin);

    const unsubscribe = listenToSupportMessages(currentChatUserId, (msgs) => {
      setMessages(msgs);
      markSupportChatRead(currentChatUserId, isStaffOrAdmin);
    });

    return () => unsubscribe();
  }, [currentChatUserId, isStaffOrAdmin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !currentChatUserId) return;

    if (!textToSend) setInputText('');

    await sendSupportMessage(currentChatUserId, currentChatUserName, text, isStaffOrAdmin);
  };

  const cannedResponses = [
    "👋 Hello! How can the VOID AI support team assist you today?",
    "✅ Your request/tier upgrade has been processed successfully.",
    "⚡ Our engineering team is currently investigating this issue.",
    "👑 Thank you for being a valued VIP member of VOID AI!"
  ];

  const filteredSupportChats = supportChats.filter(chat => {
    const userProfile = allUsersMap[chat.userId];
    const matchesSearch = chat.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          chat.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (userProfile?.email && userProfile.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (filterMode === 'unread') return chat.unreadAdmin > 0;
    if (filterMode === 'vip') return userProfile?.tier === 'vip' || userProfile?.tier === 'premium';
    return true;
  });

  const activeUserProfile = currentChatUserId ? allUsersMap[currentChatUserId] : null;

  return (
    <div className="fixed inset-0 z-50 bg-[#090A0F] text-white flex flex-col font-sans overflow-hidden">
      {/* Top Main Navigation Header */}
      <header className="h-16 px-4 md:px-6 bg-[#0D1117] border-b border-[#30363D] flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] rounded-xl text-xs font-bold text-white transition-all shadow-sm"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          <div className="h-5 w-[1px] bg-[#30363D] hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className={clsx(
              "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-md",
              isStaffOrAdmin ? "bg-gradient-to-br from-emerald-600 to-teal-800" : "bg-gradient-to-br from-[#3f86ff] to-[#3f86ff]"
            )}>
              <Shield size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-wide">
                  {isStaffOrAdmin ? 'Support Desk Management Workspace' : 'VOID AI Live Support Desk'}
                </h1>
                {isAdminView && (
                  <span className="px-2 py-0.5 rounded-full bg-[#252527] border border-[#38383b] text-[#8d8d91] text-[10px] font-bold">
                    ADMIN MODE
                  </span>
                )}
                {isSupportStaff && !isAdminView && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800/80 text-emerald-400 text-[10px] font-bold">
                    SUPPORT TEAM ROLE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8d8d91] ">
                {isStaffOrAdmin ? 'Real-time multi-user ticket response console' : 'Direct 1-on-1 line to official support team'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStaffOrAdmin && (
            <div className="hidden md:flex items-center gap-2 bg-[#161B22] border border-[#30363D] px-3 py-1.5 rounded-xl text-xs text-white ">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active Tickets: <strong>{supportChats.length}</strong></span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (Staff/Admin view) */}
        {isStaffOrAdmin && (
          <div className={clsx(
            "w-full md:w-80 lg:w-96 bg-[#0D1117]/95 border-r border-[#30363D] flex flex-col shrink-0 h-full",
            selectedChatUserId ? "hidden md:flex" : "flex"
          )}>
            {/* Main Mode Toggle: Tickets vs All Users */}
            <div className="p-3 pb-2 border-b border-[#30363D] space-y-2.5">
              <div className="flex items-center gap-1.5 bg-[#161B22] p-1 rounded-xl border border-[#30363D]">
                <button
                  onClick={() => setViewTab('tickets')}
                  className={clsx(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer",
                    viewTab === 'tickets' ? "bg-[#3f86ff] text-white shadow-md" : "text-[#8d8d91] hover:text-white"
                  )}
                >
                  <MessageSquare size={13} />
                  <span>Tickets ({supportChats.length})</span>
                </button>
                <button
                  onClick={() => setViewTab('allUsers')}
                  className={clsx(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer",
                    viewTab === 'allUsers' ? "bg-[#3f86ff] text-white shadow-md" : "text-[#8d8d91] hover:text-white"
                  )}
                >
                  <User size={13} />
                  <span>All Users ({Object.keys(allUsersMap).length})</span>
                </button>
              </div>

              {/* Search & Filter Header */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-[#8d8d91]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={viewTab === 'tickets' ? "Search ticket user name or email..." : "Search registered user..."}
                  className="w-full bg-[#161B22] border border-[#30363D] text-white text-xs rounded-xl pl-8 pr-16 py-2 outline-none focus:border-[#3f86ff] transition-colors placeholder-slate-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1.5 top-1 px-2 py-0.5 rounded-lg bg-[#3f86ff]/90 hover:opacity-90 text-white text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow"
                    title="Clear search query"
                  >
                    <X size={11} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Sub Filter Tabs for Tickets */}
              {viewTab === 'tickets' && (
                <div className="flex items-center gap-1.5 bg-[#161B22]/70 p-1 rounded-lg border border-[#30363D]/60">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={clsx("flex-1 py-1 rounded-md text-[10px] font-bold transition-all text-center", filterMode === 'all' ? "bg-[#38383b] text-white shadow" : "text-[#8d8d91] hover:text-white")}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterMode('unread')}
                    className={clsx("flex-1 py-1 rounded-md text-[10px] font-bold transition-all text-center flex items-center justify-center gap-1", filterMode === 'unread' ? "bg-[#38383b] text-white shadow" : "text-[#8d8d91] hover:text-white")}
                  >
                    <span>Unread</span>
                    {supportChats.filter(c => c.unreadAdmin > 0).length > 0 && (
                      <span className="bg-[#3f86ff] text-white text-[9px] px-1.5 rounded-full font-bold">
                        {supportChats.filter(c => c.unreadAdmin > 0).length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setFilterMode('vip')}
                    className={clsx("flex-1 py-1 rounded-md text-[10px] font-bold transition-all text-center", filterMode === 'vip' ? "bg-[#38383b] text-white shadow" : "text-[#8d8d91] hover:text-white")}
                  >
                    VIP
                  </button>
                </div>
              )}
            </div>

            {/* Chat or Users List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#21262D]/60 p-1.5 space-y-1">
              {viewTab === 'tickets' ? (
                filteredSupportChats.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#8d8d91] ">
                    No support tickets found
                  </div>
                ) : (
                  filteredSupportChats.map((chat, idx) => {
                    const uProfile = allUsersMap[chat.userId];
                    const isSelected = selectedChatUserId === chat.userId;
                    const hasUnread = chat.unreadAdmin > 0;
                    const timeFormatted = chat.lastMessageTime 
                      ? new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <div
                        key={chat.userId ? chat.userId : chat.id ? chat.id : `chat-desk-${idx}`}
                        onClick={() => {
                          setSelectedChatUserId(chat.userId);
                          setSelectedChatUserName(chat.userName);
                        }}
                        className={clsx(
                          "p-3 rounded-xl cursor-pointer transition-all flex items-start gap-3 relative border",
                          isSelected 
                            ? "bg-[#161B22] border-[#3f86ff]/50 shadow-md" 
                            : "hover:bg-[#161B22]/50 border-transparent text-white"
                        )}
                      >
                        <div className="w-9 h-9 rounded-full bg-[#38383b] border border-[#38383b] flex items-center justify-center font-bold text-xs shrink-0 text-white">
                          {chat.userName.substring(0, 2).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h3 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              <span>{chat.userName}</span>
                              {uProfile?.tier && (
                                <span className={clsx(
                                  "text-[9px] uppercase px-1.5 py-0.2 rounded font-bold border",
                                  uProfile.tier === 'vip' ? "bg-purple-950 text-purple-300 border-purple-800" :
                                  uProfile.tier === 'premium' ? "bg-amber-950 text-amber-300 border-amber-800" :
                                  uProfile.tier === 'pro' ? "bg-blue-950 text-blue-300 border-blue-800" :
                                  "bg-[#38383b] text-[#8d8d91] border-[#38383b]"
                                )}>
                                  {uProfile.tier}
                                </span>
                              )}
                            </h3>
                            {timeFormatted && (
                              <span className="text-[10px] text-[#8d8d91] shrink-0">
                                {timeFormatted}
                              </span>
                            )}
                          </div>

                          <p className={clsx("text-xs truncate ", hasUnread ? "text-white font-bold" : "text-[#8d8d91]")}>
                            {chat.lastMessage || 'No messages yet'}
                          </p>
                        </div>

                        {hasUnread && (
                          <div className="w-5 h-5 rounded-full bg-[#3f86ff] text-white text-[10px] font-bold flex items-center justify-center shrink-0 self-center shadow">
                            {chat.unreadAdmin}
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              ) : (
                /* All Registered Users List Mode */
                Object.values(allUsersMap)
                  .filter(u => {
                    const q = searchQuery.toLowerCase();
                    return (u.displayName && u.displayName.toLowerCase().includes(q)) ||
                           (u.email && u.email.toLowerCase().includes(q)) ||
                           (u.uid && u.uid.toLowerCase().includes(q));
                  })
                  .map(u => {
                    const isSelected = selectedChatUserId === u.uid;
                    const uName = u.displayName || u.email || 'User';
                    return (
                      <div
                        key={u.uid}
                        onClick={() => {
                          setSelectedChatUserId(u.uid);
                          setSelectedChatUserName(uName);
                        }}
                        className={clsx(
                          "p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 border",
                          isSelected 
                            ? "bg-[#161B22] border-[#3f86ff]/50 shadow-md" 
                            : "hover:bg-[#161B22]/50 border-transparent text-white"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#38383b] border border-[#38383b] flex items-center justify-center font-bold text-xs shrink-0 text-white">
                            {uName.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-white truncate">
                              {uName}
                            </h3>
                            <p className="text-[10px] text-[#8d8d91] truncate ">
                              {u.email || u.uid}
                            </p>
                          </div>
                        </div>

                        <span className="px-2 py-1 bg-[#3f86ff]/80 hover:opacity-90 text-white text-[10px] font-bold rounded-lg shrink-0">
                          Chat
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* Right Active Chat Canvas (Full Height) */}
        <div className={clsx(
          "flex-1 flex flex-col bg-[#090A0F] relative overflow-hidden h-full w-full min-w-0",
          isStaffOrAdmin && !selectedChatUserId ? "hidden md:flex" : "flex"
        )}>
          {currentChatUserId ? (
            <>
              {/* Active Ticket Header */}
              <div className="p-3.5 bg-[#0D1117] border-b border-[#30363D] flex items-center justify-between flex-wrap gap-2 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  {isStaffOrAdmin && (
                    <button
                      onClick={() => setSelectedChatUserId(null)}
                      className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] rounded-xl text-xs font-bold text-white transition-all shrink-0"
                      title="Back to Ticket List"
                    >
                      <ArrowLeft size={15} />
                      <span>Tickets</span>
                    </button>
                  )}
                  <div className="w-9 h-9 rounded-full bg-[#252527] border border-[#38383b] flex items-center justify-center font-bold text-xs text-[#8d8d91] shrink-0">
                    <User size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold text-white truncate">
                        {currentChatUserName}
                      </h2>
                      {activeUserProfile?.tier && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#252527] border border-[#38383b] text-[#8d8d91] shrink-0">
                          {activeUserProfile.tier} TIER
                        </span>
                      )}
                      {activeUserProfile?.isVerified && (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 shrink-0">
                          <BadgeCheck size={12} /> Verified
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8d8d91] truncate">
                      User ID: {currentChatUserId} {activeUserProfile?.email ? `• ${activeUserProfile.email}` : ''}
                    </p>
                  </div>
                </div>

                {isStaffOrAdmin && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8d8d91] bg-[#161B22] border border-[#30363D] px-2.5 py-1 rounded-lg">
                      Messages: {messages.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Message List Stream */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#090A0F]">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-6">
                    <div className="w-16 h-16 bg-[#252527]/40 border border-[#38383b]/40 rounded-2xl flex items-center justify-center mb-4 text-[#8d8d91]">
                      <Shield size={32} />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">
                      {isStaffOrAdmin ? 'No Message History' : 'How can we help you today?'}
                    </h3>
                    <p className="text-[#8d8d91] text-xs leading-relaxed font-sans">
                      {isStaffOrAdmin
                        ? 'Type a message below to send a response to this user.'
                        : 'Have questions regarding subscription tiers, payment custom requests, or feature inquiries? Send a message and our support staff will reply right away.'}
                    </p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = (isStaffOrAdmin && msg.isAdmin) || (!isStaffOrAdmin && !msg.isAdmin);
                    const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                    return (
                      <div key={msg.id} className={twMerge(clsx("flex w-full gap-3", isMe ? "justify-end" : "justify-start"))}>
                        {!isMe && (
                          <div className={clsx(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border shadow-sm",
                            msg.isAdmin
                              ? "bg-[#252527] border-[#38383b] text-[#8d8d91]"
                              : "bg-[#38383b] border-[#38383b] text-white"
                          )}>
                            {msg.isAdmin ? <Shield size={16} /> : <User size={16} />}
                          </div>
                        )}

                        <div className="max-w-[85%] sm:max-w-[75%] space-y-1">
                          <div className={clsx(
                            "rounded-2xl px-4 py-3 text-xs md:text-sm leading-relaxed shadow-md",
                            isMe
                              ? "bg-gradient-to-r from-[#3f86ff] to-[#3f86ff] text-white rounded-tr-xs font-normal"
                              : msg.isAdmin
                                ? "bg-[#161B22] border border-[#38383b]/50 text-white rounded-tl-xs"
                                : "bg-[#161B22] border border-[#30363D] text-white rounded-tl-xs"
                          )}>
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          </div>
                          <div className={clsx("text-[10px] text-[#8d8d91] px-1 flex items-center gap-1", isMe ? "justify-end" : "justify-start")}>
                            <span>{time}</span>
                            {msg.isAdmin && !isMe && <span className="text-[#8d8d91] font-bold">• Support Team</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Canned Responses Bar for Staff/Admin */}
              {isStaffOrAdmin && (
                <div className="px-4 py-2 bg-[#0D1117] border-t border-[#30363D] flex items-center gap-2 overflow-x-auto">
                  <span className="text-[10px] text-[#8d8d91] uppercase font-bold shrink-0">Quick Replies:</span>
                  {cannedResponses.map((cr, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(cr)}
                      className="shrink-0 px-2.5 py-1 bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] text-[#38bdf8] hover:text-white rounded-lg text-[11px] font-sans transition-all truncate max-w-[220px]"
                      title={cr}
                    >
                      {cr}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="p-3.5 bg-[#0D1117] border-t border-[#30363D]">
                <div className="relative flex items-center bg-[#161B22] rounded-xl border border-[#30363D] focus-within:border-[#3f86ff]/80 overflow-hidden transition-all shadow-inner">
                  <textarea
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={isStaffOrAdmin ? `Write a reply to ${currentChatUserName}...` : "Type support message..."}
                    className="flex-1 bg-transparent py-3 pl-4 pr-12 outline-none text-xs md:text-sm text-white placeholder:text-[#8d8d91] resize-none max-h-32"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputText.trim()}
                    className="absolute right-2 p-2.5 bg-gradient-to-r from-[#3f86ff] to-[#3f86ff] hover:from-[#3f86ff] hover:to-[#3f86ff] text-white rounded-lg disabled:opacity-40 disabled:from-[#38383b] disabled:to-[#38383b] transition-all shadow-md"
                    title="Send Message"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-[#8d8d91] ">
              <MessageSquare size={36} className="mb-2 opacity-50" />
              <span>Select a support chat from the left panel to begin</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
