import { useState, useRef, useEffect } from 'react';
import { User, AppNotification } from '../types.ts';
import {
  MessageSquare,
  Flame,
  Bell,
  Coins,
  Shield,
  User as UserIcon,
  ChevronDown,
  Sparkles,
  Users,
  Target,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onlineCount: number;
  currencySymbol: string;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenHowItWorks: () => void;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  connectionStatus?: 'connected' | 'reconnecting' | 'offline';
  milestoneChats?: number;
}

export default function Navbar({
  user,
  activeTab,
  setActiveTab,
  onlineCount,
  currencySymbol,
  onOpenAuth,
  onLogout,
  onOpenHowItWorks,
  notifications,
  onClearNotifications,
  connectionStatus = 'connected',
  milestoneChats = 10000,
}: NavbarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  return (
    <header
      id="main-app-header"
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-xl border-b border-slate-200/90 shadow-md shadow-purple-950/5 py-1.5'
          : 'bg-white/85 backdrop-blur-lg border-b border-slate-200/70 py-2'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Main Nav */}
        <div className="flex items-center gap-3 md:gap-7">
          <button
            id="brand-logo-btn"
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] p-0.5 shadow-md shadow-[#6C4DF6]/25 group-hover:scale-105 transition transform">
              <div className="w-full h-full bg-[#111827] rounded-[14px] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[#22D3EE]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black font-display tracking-tight bg-gradient-to-r from-[#111827] via-[#6C4DF6] to-[#8B5CF6] bg-clip-text text-transparent">
                  ChatKaro
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#6C4DF6] to-[#EC4899] text-white px-1.5 py-0.5 rounded-md shadow-2xs">
                  Rs. 2
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                Chat • Have Fun • Earn
              </p>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'home'
                  ? 'bg-[#6C4DF6]/10 text-[#6C4DF6]'
                  : 'text-slate-600 hover:text-[#6C4DF6] hover:bg-slate-100/70'
              }`}
            >
              <span>🏠</span>
              <span>Home</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-[#6C4DF6] to-[#8B5CF6] text-white shadow-sm shadow-[#6C4DF6]/30'
                  : 'text-slate-600 hover:text-[#6C4DF6] hover:bg-slate-100/70'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chats</span>
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'rewards'
                  ? 'bg-[#6C4DF6]/10 text-[#6C4DF6]'
                  : 'text-slate-600 hover:text-[#6C4DF6] hover:bg-slate-100/70'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-[#6C4DF6]" />
              <span>Rewards & 10K</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-[#6C4DF6]/10 text-[#6C4DF6]'
                  : 'text-slate-600 hover:text-[#6C4DF6] hover:bg-slate-100/70'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-cyan-600" />
              <span>Challenges & Wallet</span>
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 text-purple-700 hover:bg-purple-100 ${
                  activeTab === 'admin' ? 'bg-purple-100' : ''
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right Info Badges & User Status */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Real-time Connection Indicator */}
          <div
            title={
              connectionStatus === 'connected'
                ? 'Real-time WebSocket/SSE connected'
                : connectionStatus === 'reconnecting'
                ? 'Reconnecting to real-time server...'
                : 'Offline'
            }
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition bg-slate-50"
          >
            {connectionStatus === 'connected' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-700">Connected</span>
              </>
            ) : connectionStatus === 'reconnecting' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-700">Reconnecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-500" />
                <span className="text-rose-700">Offline</span>
              </>
            )}
          </div>

          {/* Live Online Users Badge */}
          <div
            title={`${onlineCount} users chatting right now`}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#22D3EE]/10 border border-[#22D3EE]/30 text-cyan-800 text-xs font-bold"
          >
            <Users className="w-3 h-3 text-cyan-600" />
            <span>{onlineCount} Online</span>
          </div>

          {/* User Progress Badges if Logged In */}
          {user && (
            <>
              {/* Level Badge */}
              <div
                onClick={() => setActiveTab('dashboard')}
                title={`Level ${user.level} Chatter • ${user.xp} XP`}
                className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#6C4DF6]/15 to-[#8B5CF6]/15 border border-[#6C4DF6]/30 text-[#6C4DF6] text-xs font-bold cursor-pointer hover:scale-105 transition"
              >
                <span>🔥</span>
                <span>Lvl {user.level}</span>
              </div>

              {/* Chat progress pill */}
              <div
                onClick={() => setActiveTab('rewards')}
                title={`Your verified progress: ${user.validChatCount.toLocaleString()} of ${milestoneChats.toLocaleString()} chats`}
                className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-50 via-cyan-50 to-pink-50 border border-purple-200 text-xs font-bold text-slate-800 cursor-pointer hover:border-purple-300 transition"
              >
                <Coins className="w-3.5 h-3.5 text-[#6C4DF6]" />
                <span className="font-display font-black text-[#6C4DF6]">
                  {user.validChatCount.toLocaleString()}
                </span>
                <span className="text-slate-400">/ 10K</span>
              </div>

              {/* Wallet Quick Pill */}
              <div
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-800 text-xs font-black cursor-pointer transition shadow-2xs"
                title="Wallet Balance"
              >
                <span>💰</span>
                <span>{currencySymbol}{user.wallet.availableBalance}</span>
              </div>
            </>
          )}

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              id="notifications-bell-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl text-slate-600 hover:text-[#6C4DF6] hover:bg-purple-50 transition relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#EC4899] rounded-full border-2 border-white ring-1 ring-pink-300 animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <div
                id="notifications-popup"
                className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#6C4DF6]" />
                    Notifications 🔔
                  </span>
                  {notifications.length > 0 && (
                    <button
                      onClick={onClearNotifications}
                      className="text-[11px] font-semibold text-[#6C4DF6] hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      <p className="font-bold text-slate-700 mb-1">
                        Nothing here yet. Your phone can relax 😴
                      </p>
                      <p className="text-[11px]">Chat with people to unlock hilarious alerts!</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 hover:bg-purple-50/50 transition text-left flex items-start gap-2.5"
                      >
                        <span className="text-lg leading-none">{n.icon || '💬'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900">{n.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5 break-words">{n.body}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile or Start Chatting Button */}
          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                id="user-profile-menu-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-1.5 sm:gap-2 p-1 pl-1.5 sm:pl-2.5 pr-1.5 rounded-full hover:bg-slate-100 transition border border-slate-200/90 shadow-2xs"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight flex items-center justify-end gap-1">
                    <span>{user.countryFlag || '🌍'}</span>
                    <span className="max-w-[100px] truncate">{user.displayName}</span>
                  </div>
                  <div className="text-[10px] font-semibold text-[#6C4DF6] flex items-center justify-end gap-1">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        user.onlineStatus === 'away'
                          ? 'bg-amber-400'
                          : user.onlineStatus === 'offline'
                          ? 'bg-slate-400'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <span>Lvl {user.level}</span>
                  </div>
                </div>
                <div className="relative">
                  <img
                    src={user.avatar}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-full object-cover border-2 border-[#6C4DF6]"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                      user.onlineStatus === 'away'
                        ? 'bg-amber-400'
                        : user.onlineStatus === 'offline'
                        ? 'bg-slate-400'
                        : 'bg-emerald-500'
                    }`}
                  />
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div
                  id="user-profile-popup"
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{user.countryFlag || '🌍'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-900 truncate">{user.displayName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.country || 'Global'} • {user.maskedPhone}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-1.5">
                      <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200/60">
                        💰 Wallet: {currencySymbol}{user.wallet.availableBalance}
                      </div>
                      <div className="inline-flex items-center gap-1 bg-purple-50 text-[#6C4DF6] text-[10px] font-bold px-2 py-0.5 rounded-md border border-purple-200/60">
                        <Flame className="w-3 h-3 text-[#6C4DF6]" />
                        {user.streakDays}d streak
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setActiveTab('dashboard');
                    }}
                    className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 text-left flex items-center gap-2.5"
                  >
                    <UserIcon className="w-4 h-4 text-[#6C4DF6]" />
                    <span>My Profile & Challenges</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setActiveTab('rewards');
                    }}
                    className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 text-left flex items-center gap-2.5"
                  >
                    <Coins className="w-4 h-4 text-cyan-600" />
                    <span>Reward Milestones & Rank</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenHowItWorks();
                    }}
                    className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 text-left flex items-center gap-2.5"
                  >
                    <Sparkles className="w-4 h-4 text-pink-500" />
                    <span>How It Works & Rules</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setActiveTab('admin');
                    }}
                    className="w-full px-4 py-2.5 text-xs font-bold text-purple-700 hover:bg-purple-50 text-left flex items-center gap-2.5"
                  >
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span>Admin Panel 🛡️</span>
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 text-left flex items-center gap-2.5"
                  >
                    <span>🔄</span>
                    <span>Switch User / Relog</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              id="login-register-nav-btn"
              onClick={onOpenAuth}
              className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] hover:opacity-95 text-white font-black text-xs shadow-md shadow-[#6C4DF6]/25 transition flex items-center gap-1.5"
            >
              <span>Start Chatting</span>
              <span>🚀</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

