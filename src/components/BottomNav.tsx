import { Home, MessageSquare, Trophy, User as UserIcon, Shield, Target } from 'lucide-react';
import { User } from '../types.ts';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  unreadCount?: number;
}

export default function BottomNav({
  activeTab,
  setActiveTab,
  user,
  unreadCount = 0,
}: BottomNavProps) {
  return (
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-purple-100 rounded-t-3xl shadow-[0_-8px_30px_rgba(108,77,246,0.12)] px-3 pt-2 pb-safe"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Home */}
        <button
          id="mobile-tab-home"
          onClick={() => setActiveTab('home')}
          className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 transform active:scale-95 ${
            activeTab === 'home'
              ? 'text-[#6C4DF6] font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          {activeTab === 'home' && (
            <span className="absolute -top-1.5 w-6 h-1 rounded-full bg-gradient-to-r from-[#6C4DF6] to-[#22D3EE]" />
          )}
          <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5] text-[#6C4DF6]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] mt-0.5 font-bold">Home</span>
        </button>

        {/* Chats */}
        <button
          id="mobile-tab-chat"
          onClick={() => setActiveTab('chat')}
          className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 transform active:scale-95 ${
            activeTab === 'chat'
              ? 'text-[#6C4DF6] font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          {activeTab === 'chat' && (
            <span className="absolute -top-1.5 w-6 h-1 rounded-full bg-gradient-to-r from-[#6C4DF6] to-[#22D3EE]" />
          )}
          <div className="relative">
            <MessageSquare className={`w-5 h-5 ${activeTab === 'chat' ? 'stroke-[2.5] text-[#6C4DF6]' : 'stroke-[1.8]'}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#EC4899] rounded-full border border-white animate-pulse" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-bold">Chats</span>
        </button>

        {/* Rewards */}
        <button
          id="mobile-tab-rewards"
          onClick={() => setActiveTab('rewards')}
          className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 transform active:scale-95 ${
            activeTab === 'rewards'
              ? 'text-[#6C4DF6] font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          {activeTab === 'rewards' && (
            <span className="absolute -top-1.5 w-6 h-1 rounded-full bg-gradient-to-r from-[#6C4DF6] to-[#22D3EE]" />
          )}
          <Trophy className={`w-5 h-5 ${activeTab === 'rewards' ? 'stroke-[2.5] text-[#6C4DF6]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] mt-0.5 font-bold">Rewards</span>
        </button>

        {/* Challenges & Dashboard */}
        <button
          id="mobile-tab-dashboard"
          onClick={() => setActiveTab('dashboard')}
          className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 transform active:scale-95 ${
            activeTab === 'dashboard'
              ? 'text-[#6C4DF6] font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          {activeTab === 'dashboard' && (
            <span className="absolute -top-1.5 w-6 h-1 rounded-full bg-gradient-to-r from-[#6C4DF6] to-[#22D3EE]" />
          )}
          <Target className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.5] text-[#6C4DF6]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] mt-0.5 font-bold">Wallet</span>
        </button>

        {/* Admin (if admin) */}
        {user?.role === 'admin' && (
          <button
            id="mobile-tab-admin"
            onClick={() => setActiveTab('admin')}
            className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 transform active:scale-95 ${
              activeTab === 'admin'
                ? 'text-purple-700 font-bold'
                : 'text-slate-400 hover:text-purple-700'
            }`}
          >
            {activeTab === 'admin' && (
              <span className="absolute -top-1.5 w-6 h-1 rounded-full bg-purple-600" />
            )}
            <Shield className={`w-5 h-5 ${activeTab === 'admin' ? 'stroke-[2.5] text-purple-600' : 'stroke-[1.8]'}`} />
            <span className="text-[10px] mt-0.5 font-bold">Admin</span>
          </button>
        )}
      </div>
    </nav>
  );
}

