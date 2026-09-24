import { useState, useEffect } from 'react';
import { User, Conversation, SystemConfig, AppNotification } from './types.ts';
import { api } from './services/api.ts';
import { playSound } from './utils/audio.ts';

// Components
import Navbar from './components/Navbar.tsx';
import BottomNav from './components/BottomNav.tsx';
import ChatProgressBanner from './components/ChatProgressBanner.tsx';
import HeroLanding from './components/HeroLanding.tsx';
import ChatView from './components/ChatView.tsx';
import DashboardView from './components/DashboardView.tsx';
import RewardsLeaderboardView from './components/RewardsLeaderboardView.tsx';
import AdminView from './components/AdminView.tsx';
import MilestoneModal from './components/MilestoneModal.tsx';
import AuthModal from './components/AuthModal.tsx';
import ReportModal from './components/ReportModal.tsx';
import InfoModals from './components/InfoModals.tsx';
import EarningIntroSplash from './components/EarningIntroSplash.tsx';
import Footer from './components/Footer.tsx';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'rewards' | 'dashboard' | 'admin'>('home');
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    milestoneChats: 10000,
    milestoneRewardAmount: 2,
    currencySymbol: 'Rs. ',
    announcement: 'Welcome to ChatKaro! Hit 10,000 valid chats to earn Rs. 2! 😂🚀',
    minMessageLength: 2,
    rapidRateLimitMs: 1200,
  });

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [availableUsers, setAvailableUsers] = useState<Array<User & { isOnline: boolean }>>([]);
  const [onlineCount, setOnlineCount] = useState<number>(4);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif_welcome',
      userId: 'all',
      title: 'Welcome to ChatKaro! 🎉',
      body: 'Chat with friends and hit 10,000 verified chats to claim Rs. 2!',
      timestamp: new Date().toISOString(),
      read: false,
      type: 'system',
    },
  ]);

  // Modals state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [reportTargetUser, setReportTargetUser] = useState<User | null>(null);
  const [infoModalType, setInfoModalType] = useState<'how_it_works' | 'faq' | 'rules' | 'terms' | null>(null);

  // Initial Data Fetch
  const refreshUserData = async () => {
    try {
      const meRes = await api.getMe();
      setUser(meRes.user);
      setSystemConfig(meRes.config);
    } catch {
      // Not logged in or error
    }
  };

  const refreshConversations = async () => {
    try {
      const [convRes, usersRes] = await Promise.all([
        api.getConversations(),
        api.getAvailableUsers(),
      ]);
      setConversations(convRes.conversations || []);
      setAvailableUsers(usersRes.users || []);
      const count = usersRes.users?.filter((u: any) => u.isOnline).length || 4;
      setOnlineCount(count);
    } catch {
      // ignore
    }
  };

  // Presence Heartbeat Loop
  useEffect(() => {
    if (!user) return;

    // Immediate heartbeat on sign-in
    api.sendHeartbeat('online').catch(() => {});

    const interval = setInterval(() => {
      const status = document.visibilityState === 'hidden' ? 'away' : 'online';
      api.sendHeartbeat(status).catch(() => {});
    }, 20000);

    const handleVisibilityChange = () => {
      const status = document.visibilityState === 'hidden' ? 'away' : 'online';
      api.sendHeartbeat(status).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);

  useEffect(() => {
    refreshUserData();
    refreshConversations();
  }, []);

  // Subscribe to SSE
  useEffect(() => {
    const unsubscribe = api.subscribeSSE((event) => {
      if (event.type === 'milestone_unlocked') {
        setShowMilestoneModal(true);
        playSound('fanfare');
        refreshUserData();
      } else if (event.type === 'reward_claimed') {
        playSound('coin');
        refreshUserData();
      } else if (event.type === 'presence_update' || event.type === 'user_presence') {
        refreshConversations();
      } else if (event.type === 'config_updated') {
        setSystemConfig(event.data);
      } else if (event.type === 'new_message') {
        refreshConversations();
      } else if (event.type === 'announcement') {
        setNotifications((prev) => [
          {
            id: `notif_${Date.now()}`,
            userId: 'all',
            title: '📢 Admin Announcement',
            body: event.data.text || event.data.announcement || 'New update from ChatKaro team!',
            timestamp: new Date().toISOString(),
            read: false,
            type: 'system',
          },
          ...prev,
        ]);
        playSound('pop');
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle start chat with a user
  const handleStartNewChatWithUser = async (targetUserId: string) => {
    try {
      const res = await api.startConversation(targetUserId);
      setActiveConversation(res.conversation);
      setActiveTab('chat');
      refreshConversations();
    } catch {
      // ignore
    }
  };

  // Claim Reward
  const handleClaimReward = async () => {
    try {
      const res = await api.claimReward();
      setUser(res.user);
      playSound('coin');
      setShowMilestoneModal(false);
      alert(`🎉 Success! ${res.message}`);
    } catch (err: any) {
      alert(err.message || 'Failed to claim reward');
    }
  };

  // Dev Quick Set Chats (for reviewer testing)
  const handleDevSetCount = async (count: number) => {
    try {
      const res = await api.devSetChats(count);
      setUser(res.user);
      if (count >= systemConfig.milestoneChats) {
        setShowMilestoneModal(true);
        playSound('fanfare');
      } else {
        playSound('pop');
      }
    } catch {
      // ignore
    }
  };

  // Dev Quick Set Streak (for reviewer testing)
  const handleDevSetStreak = async (days: number, includeToday: boolean = true) => {
    try {
      const res = await api.devSetStreak(days, includeToday);
      setUser(res.user);
      playSound('pop');
    } catch {
      // ignore
    }
  };

  // Handle block user
  const handleBlockUser = async (userId: string) => {
    try {
      await api.blockUser(userId);
      alert('User blocked from messaging you.');
      setActiveConversation(null);
      refreshConversations();
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col font-sans selection:bg-[#6C4DF6]/20 selection:text-[#6C4DF6] pb-16 md:pb-0">
      {/* Top Navigation */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={(tab: string) => setActiveTab(tab as any)}
        onlineCount={onlineCount}
        currencySymbol={systemConfig.currencySymbol}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={() => {
          api.switchUser();
          setUser(null);
          setShowAuthModal(true);
        }}
        onOpenHowItWorks={() => setInfoModalType('how_it_works')}
        notifications={notifications}
        onClearNotifications={() => setNotifications([])}
      />

      {/* Progress Banner (Shown across all tabs for signed-in chatter) */}
      {user && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full pt-4">
          <ChatProgressBanner
            validChatCount={user.validChatCount}
            milestoneChats={systemConfig.milestoneChats}
            rewardAmount={systemConfig.milestoneRewardAmount}
            currencySymbol={systemConfig.currencySymbol}
            level={user.level}
            levelTitle={user.level >= 7 ? 'Chat Legend 👑' : user.level >= 5 ? 'Speed Typist ⚡' : 'Chat Master 🏆'}
            isMilestoneReached={user.validChatCount >= systemConfig.milestoneChats}
            isAlreadyClaimed={user.claimedMilestones.includes(systemConfig.milestoneChats)}
            onOpenMilestoneModal={() => setShowMilestoneModal(true)}
            onDevSetCount={handleDevSetCount}
          />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 w-full pt-4 pb-8">
        {activeTab === 'home' && (
          <HeroLanding
            onStartChatting={() => {
              if (!user) {
                setShowAuthModal(true);
              } else {
                setActiveTab('chat');
              }
            }}
            onOpenHowItWorks={() => setInfoModalType('how_it_works')}
            onlineCount={onlineCount}
          />
        )}

        {activeTab === 'chat' && user && (
          <ChatView
            currentUser={user}
            conversations={conversations}
            activeConversation={activeConversation}
            onSelectConversation={setActiveConversation}
            onStartNewChatWithUser={handleStartNewChatWithUser}
            availableUsers={availableUsers}
            milestoneChats={systemConfig.milestoneChats}
            currencySymbol={systemConfig.currencySymbol}
            onOpenReportModal={setReportTargetUser}
            onBlockUser={handleBlockUser}
            onOpenMilestoneModal={() => setShowMilestoneModal(true)}
          />
        )}

        {activeTab === 'chat' && !user && (
          <div className="bg-white rounded-3xl p-12 text-center max-w-lg mx-auto border border-slate-200 shadow-lg mt-8">
            <span className="text-5xl mb-4 block">💬</span>
            <h3 className="text-2xl font-black font-display text-slate-900 mb-2">
              Ready to Join the Fun?
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Create a quick account or tap our 1-click test login to start chatting and stacking Rs. 2 rewards!
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-2xl shadow-md transition"
            >
              Sign In or Register 🚀
            </button>
          </div>
        )}

        {activeTab === 'rewards' && (
          <RewardsLeaderboardView
            currentUser={user || (availableUsers[0] as any) || {
              id: 'guest',
              username: 'guest',
              displayName: 'Guest',
              validChatCount: 0,
              claimedMilestones: [],
              badges: [],
            }}
            milestoneChats={systemConfig.milestoneChats}
            rewardAmount={systemConfig.milestoneRewardAmount}
            currencySymbol={systemConfig.currencySymbol}
            onOpenMilestoneModal={() => setShowMilestoneModal(true)}
          />
        )}

        {activeTab === 'dashboard' && user && (
          <DashboardView
            user={user}
            onRefreshUser={refreshUserData}
            milestoneChats={systemConfig.milestoneChats}
            rewardAmount={systemConfig.milestoneRewardAmount}
            currencySymbol={systemConfig.currencySymbol}
            onOpenMilestoneModal={() => setShowMilestoneModal(true)}
            onDevSetCount={handleDevSetCount}
            onDevSetStreak={handleDevSetStreak}
          />
        )}

        {activeTab === 'dashboard' && !user && (
          <div className="bg-white rounded-3xl p-12 text-center max-w-lg mx-auto border border-slate-200 shadow-lg mt-8">
            <span className="text-5xl mb-4 block">🏆</span>
            <h3 className="text-2xl font-black font-display text-slate-900 mb-2">
              Sign In to View Your Dashboard
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Track your chat progress toward 10,000 chats, inspect your wallet balance, and see your achievements!
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-2xl shadow-md transition"
            >
              Sign In 🚀
            </button>
          </div>
        )}

        {activeTab === 'admin' && <AdminView />}
      </main>

      {/* Modern Responsive Footer (Desktop & Mobile Collapsible) */}
      <Footer
        setActiveTab={(tab: string) => setActiveTab(tab as any)}
        onOpenInfoModal={(modalType) => setInfoModalType(modalType)}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab as any}
        user={user}
      />

      {/* 10,000 Milestone Celebration Modal */}
      {user && (
        <MilestoneModal
          isOpen={showMilestoneModal}
          onClose={() => setShowMilestoneModal(false)}
          onClaimReward={handleClaimReward}
          isClaiming={false}
          validChatCount={user.validChatCount}
          milestoneChats={systemConfig.milestoneChats}
          rewardAmount={systemConfig.milestoneRewardAmount}
          currencySymbol={systemConfig.currencySymbol}
          isAlreadyClaimed={user.claimedMilestones.includes(systemConfig.milestoneChats)}
          onViewWallet={() => {
            setShowMilestoneModal(false);
            setActiveTab('dashboard');
          }}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(authedUser) => {
          setUser(authedUser);
          refreshConversations();
          setActiveTab('chat');
        }}
      />

      {/* Report Modal */}
      <ReportModal
        user={reportTargetUser}
        onClose={() => setReportTargetUser(null)}
      />

      {/* Info Modals (How it works, FAQ, Rules, Terms) */}
      <InfoModals
        type={infoModalType}
        onClose={() => setInfoModalType(null)}
        milestoneChats={systemConfig.milestoneChats}
        rewardAmount={systemConfig.milestoneRewardAmount}
        currencySymbol={systemConfig.currencySymbol}
      />

      {/* Earn While You Chat First Visit / Refresh Intro Splash */}
      {showSplash && (
        <EarningIntroSplash
          onComplete={() => setShowSplash(false)}
          currencySymbol={systemConfig.currencySymbol}
          milestoneChats={systemConfig.milestoneChats}
          rewardAmount={systemConfig.milestoneRewardAmount}
        />
      )}
    </div>
  );
}
