import React, { useState, useEffect, useRef } from 'react';
import { User, Conversation, Message, ConversationStarter } from '../types.ts';
import { api } from '../services/api.ts';
import { playSound } from '../utils/audio.ts';
import {
  Search,
  Send,
  Smile,
  Sparkles,
  Flame,
  ShieldAlert,
  Trash2,
  Reply,
  MoreVertical,
  Flag,
  UserX,
  X,
  Clock,
  Check,
  CheckCheck,
  Zap,
  ArrowLeft,
} from 'lucide-react';

interface ChatViewProps {
  currentUser: User;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onSelectConversation: (conv: Conversation) => void;
  onStartNewChatWithUser: (userId: string) => void;
  availableUsers: Array<User & { isOnline: boolean }>;
  milestoneChats: number;
  currencySymbol: string;
  onOpenReportModal: (user: User) => void;
  onBlockUser: (userId: string) => void;
  onOpenMilestoneModal: () => void;
}

const EMOJI_LIST = ['😂', '🔥', '❤️', '🍕', '👑', '👏', '👀', '🎉', '☕', '🚀'];

export default function ChatView({
  currentUser,
  conversations,
  activeConversation,
  onSelectConversation,
  onStartNewChatWithUser,
  availableUsers,
  milestoneChats,
  currencySymbol,
  onOpenReportModal,
  onBlockUser,
  onOpenMilestoneModal,
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStartersModal, setShowStartersModal] = useState(false);
  const [startersList, setStartersList] = useState<ConversationStarter[]>([]);
  const [activeStarter, setActiveStarter] = useState<ConversationStarter | null>(null);
  const [isTypingRemote, setIsTypingRemote] = useState<string | null>(null);
  const [antiSpamToast, setAntiSpamToast] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Identify recipient in active conversation
  const recipient = activeConversation?.participants?.find(
    (p) => p.id !== currentUser.id
  ) || availableUsers.find((u) => activeConversation?.participantIds.includes(u.id));

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversation) return;

    setIsLoadingMessages(true);
    api
      .getMessages(activeConversation.id)
      .then((res) => {
        setMessages(res.messages || []);
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingMessages(false);
      });
  }, [activeConversation?.id]);

  // Fetch conversation starters on mount
  useEffect(() => {
    api
      .getRandomStarter()
      .then((res) => {
        setStartersList(res.all || []);
        setActiveStarter(res.starter);
      })
      .catch(() => {});
  }, []);

  // Listen for real-time SSE events
  useEffect(() => {
    const unsubscribe = api.subscribeSSE((event) => {
      if (event.type === 'new_message') {
        const { conversationId, message } = event.data;
        if (activeConversation && conversationId === activeConversation.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
          if (message.senderId !== currentUser.id) {
            playSound('pop');
          }
        }
      } else if (event.type === 'typing') {
        const { conversationId, userId, username, isTyping } = event.data;
        if (activeConversation && conversationId === activeConversation.id) {
          if (userId !== currentUser.id) {
            setIsTypingRemote(isTyping ? username : null);
          }
        }
      } else if (event.type === 'reaction_updated') {
        const { conversationId, messageId, reactions } = event.data;
        if (activeConversation && conversationId === activeConversation.id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
          );
        }
      } else if (event.type === 'message_deleted') {
        const { conversationId, messageId } = event.data;
        if (activeConversation && conversationId === activeConversation.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, isDeleted: true, text: 'This message was deleted 😂' }
                : m
            )
          );
        }
      }
    });

    return () => unsubscribe();
  }, [activeConversation?.id, currentUser.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTypingRemote]);

  // Handle typing input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!activeConversation) return;

    // Send typing event
    api.sendTyping(activeConversation.id, true).catch(() => {});

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      api.sendTyping(activeConversation.id, false).catch(() => {});
    }, 1500);
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent || !activeConversation || isSending) return;

    setIsSending(true);
    playSound('pop');

    try {
      const res = await api.sendMessage(activeConversation.id, messageContent, replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        senderName: replyingTo.senderName,
      } : undefined);

      setInputText('');
      setReplyingTo(null);
      setShowEmojiPicker(false);
      setShowStartersModal(false);

      if (!res.isValidChat && res.spamReason) {
        playSound('alert');
        setAntiSpamToast(res.spamReason);
        setTimeout(() => setAntiSpamToast(null), 6000);
      } else {
        playSound('pop');
        if (res.milestoneUnlocked) {
          onOpenMilestoneModal();
        }
      }
    } catch (err: any) {
      setAntiSpamToast(err.message || 'Failed to send message');
      setTimeout(() => setAntiSpamToast(null), 4000);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // React to a message
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!activeConversation) return;
    playSound('pop');
    try {
      await api.reactToMessage(messageId, activeConversation.id, emoji);
    } catch {
      // ignore
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!activeConversation) return;
    try {
      await api.deleteMessage(messageId, activeConversation.id);
    } catch {
      // ignore
    }
  };

  // Filter available users by search query
  const filteredUsers = availableUsers.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      id="chat-interface-container"
      className="w-full max-w-6xl mx-auto h-[calc(100vh-8.5rem)] min-h-[500px] flex rounded-3xl bg-white border border-slate-200/80 shadow-xl overflow-hidden"
    >
      {/* LEFT SIDEBAR: Conversations & Users */}
      <div
        className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200/80 bg-slate-50/50 ${
          activeConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Search & Header */}
        <div className="p-4 border-b border-slate-200/80 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-black font-display text-slate-900">
              Conversations 💬
            </h3>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
              🔥 {currentUser.validChatCount.toLocaleString()} / {milestoneChats.toLocaleString()}
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search chat partners or bots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs font-medium rounded-xl border border-transparent focus:border-amber-400 focus:outline-none transition"
            />
          </div>
        </div>

        {/* User / Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <p className="font-bold text-slate-600 mb-1">No users found</p>
              <p>Try a different name or search term!</p>
            </div>
          ) : (
            filteredUsers.map((partner) => {
              const conv = conversations.find((c) =>
                c.participantIds.includes(partner.id)
              );
              const isActive = activeConversation?.participantIds.includes(partner.id);

              return (
                <button
                  key={partner.id}
                  onClick={() => {
                    if (conv) {
                      onSelectConversation(conv);
                    } else {
                      onStartNewChatWithUser(partner.id);
                    }
                  }}
                  className={`w-full p-3.5 flex items-center gap-3 text-left transition ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-50 to-indigo-50/60 border-r-4 border-[#6C4DF6]'
                      : 'hover:bg-slate-100/70'
                  }`}
                >
                  {/* Avatar with Online Indicator */}
                  <div className="relative shrink-0">
                    <img
                      src={partner.avatar}
                      alt={partner.displayName}
                      className="w-12 h-12 rounded-2xl object-cover border border-purple-100 shadow-sm"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        partner.onlineStatus === 'away'
                          ? 'bg-amber-400'
                          : partner.onlineStatus === 'offline' || !partner.isOnline
                          ? 'bg-slate-300'
                          : 'bg-emerald-500'
                      }`}
                      title={partner.onlineStatus || (partner.isOnline ? 'Online' : 'Offline')}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                        <span>{partner.countryFlag || '🌍'}</span>
                        <span className="truncate">{partner.displayName}</span>
                      </p>
                      {conv?.updatedAt && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(conv.updatedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {conv?.lastMessage?.text || partner.bio || `${partner.country || 'Global'} • Tap to chat!`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-[#6C4DF6] bg-purple-50 border border-purple-200/60 px-1.5 py-0.2 rounded">
                        Lvl {partner.level}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {partner.validChatCount.toLocaleString()} chats
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT MAIN PANEL: Active Conversation */}
      {activeConversation && recipient ? (
        <div className="flex-1 flex flex-col h-full bg-white relative">
          {/* Active Chat Header */}
          <div className="p-3.5 sm:px-5 border-b border-slate-200/80 bg-white flex items-center justify-between gap-2 z-20">
            <div className="flex items-center gap-3">
              {/* Mobile Back Button */}
              <button
                onClick={() => onSelectConversation(null as any)}
                className="md:hidden p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 flex items-center gap-1 text-xs font-bold transition active:scale-95"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="w-5 h-5 text-[#6C4DF6]" />
                <span className="sr-only sm:not-sr-only">Back</span>
              </button>

              <div className="relative">
                <img
                  src={recipient.avatar}
                  alt={recipient.displayName}
                  className="w-10 h-10 rounded-2xl object-cover border border-slate-200"
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                    recipient.onlineStatus === 'away'
                      ? 'bg-amber-400'
                      : recipient.onlineStatus === 'offline' || !recipient.isOnline
                      ? 'bg-slate-300'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{recipient.countryFlag || '🌍'}</span>
                  <h4 className="text-sm font-bold text-slate-900">{recipient.displayName}</h4>
                  <span className="text-[11px] font-medium text-slate-400">
                    • {recipient.country || 'Global'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {isTypingRemote ? (
                    <span className="text-amber-600 font-bold flex items-center gap-1 animate-pulse">
                      typing something... 👀
                    </span>
                  ) : recipient.onlineStatus === 'away' ? (
                    <span className="text-amber-600 font-medium">🟡 Away</span>
                  ) : recipient.onlineStatus === 'offline' || !recipient.isOnline ? (
                    <span className="text-slate-400">⚫ Offline</span>
                  ) : (
                    <span className="text-emerald-600 font-medium">🟢 Online &amp; active</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right actions: Chat Progress Pill inside chat + Menu */}
            <div className="flex items-center gap-2">
              {/* Small animated chat-progress indicator inside chat screen */}
              <div
                onClick={onOpenMilestoneModal}
                title="Tap to see 10,000 Chats Milestone"
                className="cursor-pointer bg-gradient-to-r from-purple-50 via-cyan-50/50 to-pink-50 hover:from-purple-100 hover:to-cyan-100 border border-purple-200/80 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-[#6C4DF6] flex items-center gap-1.5 shadow-xs transition"
              >
                <Flame className="w-4 h-4 text-[#EC4899] fill-[#EC4899] animate-bounce" />
                <span className="font-display tracking-tight">
                  {currentUser.validChatCount.toLocaleString()} / {milestoneChats.toLocaleString()} chats
                </span>
              </div>

              {/* Options menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenReportModal(recipient);
                      }}
                      className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Flag className="w-3.5 h-3.5 text-rose-500" />
                      Report User / Spam
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onBlockUser(recipient.id);
                      }}
                      className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Block User
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Anti-Spam Warning Toast */}
          {antiSpamToast && (
            <div className="mx-4 mt-2 p-3 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs font-bold flex items-start gap-2.5 shadow-md animate-in slide-in-from-top-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{antiSpamToast}</span>
              </div>
              <button
                onClick={() => setAntiSpamToast(null)}
                className="text-amber-500 hover:text-amber-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30">
            {isLoadingMessages ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6C4DF6] to-[#22D3EE] p-0.5 shadow-lg shadow-[#6C4DF6]/20 animate-bounce mb-3 flex items-center justify-center">
                  <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                    <span className="text-2xl">💬</span>
                  </div>
                </div>
                <p className="text-sm font-bold text-slate-800">
                  Connecting you to the chat...
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Fetching verified messages & anti-spam status
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <span className="text-4xl mb-2 animate-bounce">👀</span>
                <p className="text-sm font-bold text-slate-700">
                  It&apos;s suspiciously quiet here... 👀
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Start a conversation before your keyboard gets lonely 😂
                </p>
                <button
                  onClick={() => setShowStartersModal(true)}
                  className="mt-4 px-4 py-2 bg-gradient-to-r from-[#6C4DF6] to-[#8B5CF6] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md shadow-[#6C4DF6]/20 transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#22D3EE]" />
                  Make Chat Interesting 😂
                </button>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col group animate-in fade-in slide-in-from-bottom-2 duration-200 ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {/* Reply To Reference snippet */}
                    {msg.replyTo && (
                      <div
                        className={`text-[11px] px-3 py-1 rounded-t-xl bg-purple-50/70 text-slate-600 max-w-xs sm:max-w-md truncate border-l-2 border-[#6C4DF6] mb-0.5 ${
                          isMe ? 'mr-1' : 'ml-1'
                        }`}
                      >
                        <span className="font-bold">{msg.replyTo.senderName}:</span> {msg.replyTo.text}
                      </div>
                    )}

                    {/* Main Bubble */}
                    <div className="relative max-w-[85%] sm:max-w-md flex items-end gap-1.5">
                      <div
                        className={`p-3 rounded-2xl text-sm relative break-words leading-relaxed transition-shadow duration-150 ${
                          isMe
                            ? 'bg-gradient-to-r from-[#6C4DF6] to-[#8B5CF6] text-white rounded-br-xs shadow-md shadow-[#6C4DF6]/20'
                            : 'bg-white text-slate-800 border border-purple-100/80 rounded-bl-xs shadow-xs'
                        } ${msg.isDeleted ? 'italic text-slate-400 bg-slate-100' : ''}`}
                      >
                        {/* Sender name for non-me */}
                        {!isMe && (
                          <div className="text-[10px] font-bold text-[#6C4DF6] mb-0.5">
                            {msg.senderName}
                          </div>
                        )}

                        <p className="text-xs sm:text-sm">{msg.text}</p>

                        {/* Valid Chat Badge or Anti-spam Warning */}
                        {msg.spamReason && isMe && (
                          <div className="mt-1.5 text-[10px] font-bold text-purple-100 bg-black/25 px-2 py-0.5 rounded flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-[#22D3EE]" />
                            <span>Not counted towards rewards ({msg.spamReason})</span>
                          </div>
                        )}

                        {/* Timestamp & read status */}
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            isMe ? 'text-purple-100/90' : 'text-slate-400'
                          }`}
                        >
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMe && (
                            <span>
                              {msg.isValidChat ? (
                                <CheckCheck className="w-3 h-3 text-white" />
                              ) : (
                                <Check className="w-3 h-3 text-amber-200" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Action Hover Bar (Reply, React, Delete) */}
                      {!msg.isDeleted && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white border border-slate-200 shadow-sm rounded-lg p-0.5 mb-1">
                          <button
                            onClick={() => setReplyingTo(msg)}
                            title="Reply"
                            className="p-1 text-slate-400 hover:text-slate-700 rounded"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleReaction(msg.id, '😂')}
                            title="React 😂"
                            className="p-1 text-xs hover:scale-125 transition"
                          >
                            😂
                          </button>
                          <button
                            onClick={() => handleToggleReaction(msg.id, '🔥')}
                            title="React 🔥"
                            className="p-1 text-xs hover:scale-125 transition"
                          >
                            🔥
                          </button>
                          {isMe && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              title="Delete"
                              className="p-1 text-slate-400 hover:text-rose-500 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Reactions Display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 px-1">
                        {Object.entries(msg.reactions).map(([emoji, uids]) => {
                          const hasReacted = uids.includes(currentUser.id);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`text-[11px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition ${
                                hasReacted
                                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span>{uids.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Context Banner */}
          {replyingTo && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2 truncate">
                <Reply className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-bold">Replying to {replyingTo.senderName}:</span>
                <span className="truncate text-slate-600">{replyingTo.text}</span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <div className="absolute bottom-20 left-4 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 flex flex-wrap gap-1.5 max-w-xs animate-in fade-in zoom-in-95">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setInputText((prev) => prev + emoji);
                    inputRef.current?.focus();
                  }}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-100 rounded-xl transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Bottom Chat Composer */}
          <div className="p-3 sm:p-4 border-t border-slate-200/80 bg-white">
            <div className="flex items-center gap-2 mb-2">
              {/* "Make Chat Interesting 😂" Button */}
              <button
                id="make-chat-interesting-btn"
                onClick={() => setShowStartersModal(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-[#6C4DF6] to-[#8B5CF6] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-sm shadow-[#6C4DF6]/20 transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>Make Chat Interesting 😂</span>
              </button>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Tap to fire hilarious conversation starters!
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              {/* Emoji toggle */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-[#6C4DF6] hover:bg-purple-50 transition"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Type your message... (10,000 valid chats = Rs. 2 reward!)"
                className="flex-1 py-2.5 px-4 bg-slate-50 focus:bg-white text-xs sm:text-sm font-medium rounded-2xl border border-slate-200 focus:border-[#6C4DF6] focus:ring-2 focus:ring-[#6C4DF6]/20 focus:outline-none transition"
              />

              {/* Send Button */}
              <button
                id="chat-send-btn"
                type="submit"
                disabled={!inputText.trim() || isSending}
                className={`p-2.5 sm:px-4 sm:py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition transform active:scale-95 flex items-center gap-1.5 ${
                  inputText.trim() && !isSending
                    ? 'bg-gradient-to-r from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] text-white shadow-lg shadow-[#6C4DF6]/45 ring-2 ring-[#22D3EE]/30 cursor-pointer animate-pulse-glow'
                    : 'bg-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Empty State when no active chat selected */
        <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center p-8 bg-slate-50/40">
          <div className="w-16 h-16 rounded-3xl bg-purple-100/80 text-[#6C4DF6] flex items-center justify-center text-3xl mb-4 shadow-sm">
            💬
          </div>
          <h3 className="text-xl font-black font-display text-slate-800 mb-1">
            Pick a Conversation & Chat!
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6">
            Choose a friend or active community companion from the list to start stacking valid chats toward your Rs. 2 reward.
          </p>
          <button
            onClick={() => {
              const firstBot = availableUsers.find((u) => u.id.startsWith('bot_'));
              if (firstBot) onStartNewChatWithUser(firstBot.id);
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md shadow-[#6C4DF6]/25 transition"
          >
            Chat with Priya ✨ (Always Online)
          </button>
        </div>
      )}

      {/* CONVERSATION STARTER MODAL */}
      {showStartersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#6C4DF6]" />
                <h3 className="text-lg font-black font-display text-slate-900">
                  Make Chat Interesting 😂
                </h3>
              </div>
              <button
                onClick={() => setShowStartersModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2 mb-4">
              Tap any prompt below to immediately send it to the chat or copy it into your input!
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
              {startersList.map((starter) => (
                <div
                  key={starter.id}
                  className="p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200 hover:border-purple-200 transition flex items-center justify-between gap-3 group"
                >
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-purple-950">
                    “{starter.text}”
                  </p>
                  <button
                    onClick={() => {
                      handleSendMessage(starter.text);
                    }}
                    className="shrink-0 px-3 py-1.5 bg-gradient-to-r from-[#6C4DF6] to-[#8B5CF6] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Send Now 🚀
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                100% verified conversation starters
              </span>
              <button
                onClick={() => setShowStartersModal(false)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
