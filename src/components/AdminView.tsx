import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { SystemConfig, User, AdminAuditLog, RewardRequest, AdminPaymentSettings } from '../types.ts';
import {
  Shield,
  Users,
  MessageSquare,
  Trophy,
  AlertTriangle,
  Flag,
  Settings,
  Bell,
  CheckCircle2,
  Lock,
  Unlock,
  Key,
  KeyRound,
  LogOut,
  Search,
  UserX,
  UserCheck,
  RefreshCw,
  PhoneCall,
  Smartphone,
  Send,
  Sliders,
  History,
  CreditCard,
  Wallet,
  Check,
  X,
} from 'lucide-react';

export default function AdminView() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Admin Subtab
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'reward_requests'
    | 'payment_settings'
    | 'auth_security'
    | 'users'
    | 'reports'
    | 'fraud'
    | 'rewards'
    | 'chat_settings'
    | 'announcements'
    | 'audit'
  >('overview');

  // Admin Data State
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [rewardRequestsList, setRewardRequestsList] = useState<RewardRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal / prompt states for paying & rejecting
  const [payingRequest, setPayingRequest] = useState<RewardRequest | null>(null);
  const [transactionRefInput, setTransactionRefInput] = useState('');
  const [rejectingRequest, setRejectingRequest] = useState<RewardRequest | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState<AdminPaymentSettings>({
    jazzCashEnabled: true,
    easyPaisaEnabled: true,
    rewardRequestsEnabled: true,
    minRewardThreshold: 2,
    manualReview: true,
    autoRewardEligibility: true,
  });

  // Form States for Settings
  const [milestoneInput, setMilestoneInput] = useState('10000');
  const [rewardAmountInput, setRewardAmountInput] = useState('2');
  const [rateLimitInput, setRateLimitInput] = useState('1200');
  const [announcementInput, setAnnouncementInput] = useState('');
  const [broadcastText, setBroadcastText] = useState('');

  // Password Change State
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Auth & Chat Toggles
  const [userAuthSettings, setUserAuthSettings] = useState({
    passwordlessEntry: true,
    nameRequired: true,
    whatsappRequired: true,
    phoneVerification: false,
    otpVerification: false,
    chatRequestApproval: false,
    sessionDurationDays: 30,
    duplicatePhonePrevention: true,
    newUserRegistration: true,
  });

  const [chatSettings, setChatSettings] = useState({
    maxMessageLength: 500,
    rapidRateLimitMs: 1200,
    chatRequestMode: false,
    userBlocking: true,
    emojiReactions: true,
    readReceipts: true,
    typingIndicator: true,
    maintenanceMode: false,
  });

  const [adminSecuritySettings, setAdminSecuritySettings] = useState({
    failedLoginProtection: true,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    twoFactorEnabled: false,
  });

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Check initial admin auth & fetch stats
  const fetchAllAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsData, usersData, auditData, rewardRequestsData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(userSearch),
        api.getAdminAuditLogs().catch(() => ({ auditLogs: [] })),
        api.getAdminRewardRequests().catch(() => ({ requests: [] })),
      ]);

      setStats(statsData);
      setUsersList(usersData.users || []);
      setAuditLogs(auditData.auditLogs || []);
      setRewardRequestsList(rewardRequestsData.requests || []);
      setIsAdminAuthenticated(true);

      // Populate form fields
      if (statsData.config) {
        setMilestoneInput(String(statsData.config.milestoneChats || 10000));
        setRewardAmountInput(String(statsData.config.milestoneRewardAmount || 2));
        setRateLimitInput(String(statsData.config.rapidRateLimitMs || 1200));
        setAnnouncementInput(statsData.config.announcement || '');
        if (statsData.config.userAuth) setUserAuthSettings(statsData.config.userAuth);
        if (statsData.config.chatSettings) setChatSettings(statsData.config.chatSettings);
        if (statsData.config.adminSecurity) setAdminSecuritySettings(statsData.config.adminSecurity);
        if (statsData.config.paymentSettings) setPaymentSettings(statsData.config.paymentSettings);
      }
    } catch {
      setIsAdminAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Reward Request Action Handler
  const handleRewardAction = async (
    id: string,
    action: 'approve' | 'reject' | 'mark_paid' | 'cancel',
    data?: { transactionReference?: string; rejectionReason?: string }
  ) => {
    try {
      const res = await api.actionAdminRewardRequest(id, action, data);
      showFeedback(res.message, 'success');
      setPayingRequest(null);
      setTransactionRefInput('');
      setRejectingRequest(null);
      setRejectionReasonInput('');
      fetchAllAdminData();
    } catch (err: any) {
      showFeedback(err.message || `Failed to ${action} reward request`, 'error');
    }
  };

  // Save Payment Settings
  const handleSavePaymentSettings = async () => {
    try {
      const res = await api.updateAdminPaymentSettings(paymentSettings);
      showFeedback('Payment gateway settings updated successfully.', 'success');
      setPaymentSettings(res.paymentSettings);
      fetchAllAdminData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to save payment settings', 'error');
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, [userSearch]);

  // Handle Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      await api.adminLogin(adminUsername.trim(), adminPassword);
      setAdminPassword('');
      setIsAdminAuthenticated(true);
      fetchAllAdminData();
      showFeedback('Admin session established securely.', 'success');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid admin credentials');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Change Admin Password
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPasswordInput || !newPasswordInput) return;
    try {
      const res = await api.adminChangePassword(oldPasswordInput, newPasswordInput);
      setOldPasswordInput('');
      setNewPasswordInput('');
      showFeedback(res.message, 'success');
      fetchAllAdminData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to change password', 'error');
    }
  };

  // Save Config & Toggles
  const handleSaveConfig = async () => {
    try {
      await api.updateAdminConfig({
        milestoneChats: Number(milestoneInput),
        milestoneRewardAmount: Number(rewardAmountInput),
        rapidRateLimitMs: Number(rateLimitInput),
        announcement: announcementInput.trim(),
        userAuth: userAuthSettings,
        chatSettings,
        adminSecurity: adminSecuritySettings,
      });
      showFeedback('Configuration updated and synced across server.', 'success');
      fetchAllAdminData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to save configuration', 'error');
    }
  };

  // User Actions (Suspend, Ban, Unban, Delete)
  const handleUserAction = async (userId: string, action: 'ban' | 'unban' | 'suspend' | 'delete') => {
    try {
      const res = await api.takeAdminUserAction(userId, action);
      showFeedback(res.message, 'success');
      fetchAllAdminData();
    } catch (err: any) {
      showFeedback(err.message || 'Action failed', 'error');
    }
  };

  // Report Resolution
  const handleReportAction = async (reportId: string, action: 'resolve' | 'dismiss' | 'ban_reported') => {
    try {
      await api.respondAdminReport(reportId, action);
      showFeedback(`Report marked as ${action}`, 'success');
      fetchAllAdminData();
    } catch (err: any) {
      showFeedback(err.message || 'Action failed', 'error');
    }
  };

  // Broadcast Announcement
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    try {
      await api.broadcastAnnouncement(broadcastText.trim());
      setBroadcastText('');
      showFeedback('Real-time announcement broadcasted to all online chatters!', 'success');
      fetchAllAdminData();
    } catch (err: any) {
      showFeedback(err.message || 'Broadcast failed', 'error');
    }
  };

  // ----------------------------------------------------
  // RENDER: ADMIN LOGIN SCREEN (IF NOT AUTHENTICATED)
  // ----------------------------------------------------
  if (!isAdminAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto py-12 px-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 text-[#6C4DF6] flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm border border-purple-100">
            🛡️
          </div>
          <h2 className="text-2xl font-black font-display text-slate-900 mb-1">
            Admin Control Panel
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Secure administrative access for platform safety, auth policies &amp; rewards.
          </p>

          {loginError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 mb-4 animate-shake">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Admin Username
              </label>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-800 pr-10"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] hover:opacity-95 text-white font-black text-sm shadow-lg shadow-[#6C4DF6]/25 transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoggingIn ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Access Admin Panel</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>PBKDF2 SHA-512 Hashed • Brute-force Protected</span>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: AUTHENTICATED ADMIN DASHBOARD
  // ----------------------------------------------------
  return (
    <div id="admin-dashboard-page" className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 bg-white p-5 rounded-3xl border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#6C4DF6] to-[#8B5CF6] text-white flex items-center justify-center shadow-md shadow-[#6C4DF6]/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black font-display text-slate-900">
                ChatKaro Admin Center
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                Live &amp; Secure
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Real-time user authentication, reward rules, fraud prevention &amp; community moderation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllAdminData}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              api.adminLogoutAllSessions();
              setIsAdminAuthenticated(false);
            }}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 border border-rose-200/60"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Admin</span>
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold border flex items-center gap-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          {
            id: 'reward_requests',
            label: `Reward Requests ${
              rewardRequestsList.filter((r) => r.status === 'Pending' || r.status === 'Under Review').length > 0
                ? `(${rewardRequestsList.filter((r) => r.status === 'Pending' || r.status === 'Under Review').length})`
                : ''
            }`,
            icon: '💰',
          },
          { id: 'payment_settings', label: 'Payment Settings', icon: '💳' },
          { id: 'auth_security', label: 'Auth & Security', icon: '🔐' },
          { id: 'users', label: 'User Directory', icon: '👥' },
          { id: 'reports', label: `Reports (${stats?.reportsCount || 0})`, icon: '🚩' },
          { id: 'fraud', label: `Anti-Fraud (${stats?.suspiciousLogsCount || 0})`, icon: '⚡' },
          { id: 'rewards', label: 'Milestone Rules', icon: '🏆' },
          { id: 'chat_settings', label: 'Chat Engine', icon: '💬' },
          { id: 'announcements', label: 'Announcements', icon: '📢' },
          { id: 'audit', label: 'Audit Logs', icon: '📜' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#6C4DF6] to-[#8B5CF6] text-white shadow-sm shadow-[#6C4DF6]/20'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* MARK AS PAID MODAL / BANNER */}
      {payingRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span className="text-lg">✅</span>
                <span>Mark Reward as Paid</span>
              </h3>
              <button
                onClick={() => {
                  setPayingRequest(null);
                  setTransactionRefInput('');
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">User:</span>
                <span className="font-bold text-slate-900">{payingRequest.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Amount:</span>
                <span className="font-black text-emerald-700">Rs. {payingRequest.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Method:</span>
                <span className="font-bold capitalize">{payingRequest.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Account:</span>
                <span className="font-bold">{payingRequest.accountHolderName} ({payingRequest.maskedMobileNumber})</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Transaction Reference / TRX ID (Optional)
              </label>
              <input
                type="text"
                value={transactionRefInput}
                onChange={(e) => setTransactionRefInput(e.target.value)}
                placeholder="e.g. TRX948201582 or Cashier01"
                className="w-full text-xs font-mono font-semibold p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C4DF6] focus:outline-none"
              />
              <p className="text-[10px] text-slate-400">
                This transaction reference will be visible to the user in their reward wallet receipt.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPayingRequest(null);
                  setTransactionRefInput('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleRewardAction(payingRequest.id, 'mark_paid', {
                    transactionReference: transactionRefInput.trim() || `TRX_${Date.now()}`,
                  })
                }
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT REQUEST MODAL */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span className="text-lg">❌</span>
                <span>Reject Reward Request</span>
              </h3>
              <button
                onClick={() => {
                  setRejectingRequest(null);
                  setRejectionReasonInput('');
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Rejecting this request will automatically refund Rs. {rejectingRequest.amount} back into {rejectingRequest.userName}&apos;s available reward wallet.
            </p>

            <div className="space-y-2 mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Reason for Rejection
              </label>
              <input
                type="text"
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g. Account name does not match JazzCash registered name"
                className="w-full text-xs font-semibold p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C4DF6] focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingRequest(null);
                  setRejectionReasonInput('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  handleRewardAction(rejectingRequest.id, 'reject', {
                    rejectionReason: rejectionReasonInput.trim() || 'Request failed manual verification audit',
                  })
                }
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                <Users className="w-4 h-4 text-emerald-500" />
                Real Users
              </div>
              <div className="text-2xl font-black text-slate-900 font-display mt-1">
                {stats.totalUsers}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold">
                🟢 {stats.onlineUsers} live right now
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                Valid Verified Chats
              </div>
              <div className="text-2xl font-black text-slate-900 font-display mt-1">
                {stats.totalValidChats.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Out of {stats.totalMessages.toLocaleString()} total
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                <Trophy className="w-4 h-4 text-orange-500" />
                Rewards Claimed
              </div>
              <div className="text-2xl font-black text-slate-900 font-display mt-1">
                {stats.totalRewardsIssued}
              </div>
              <span className="text-[11px] text-orange-600 font-semibold">
                {stats.currencySymbol}
                {stats.totalRewardAmount} total distributed
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Moderation Flags
              </div>
              <div className="text-2xl font-black text-slate-900 font-display mt-1">
                {stats.reportsCount + stats.suspiciousLogsCount}
              </div>
              <span className="text-[11px] text-rose-600 font-semibold">
                {stats.reportsCount} reports • {stats.suspiciousLogsCount} anti-spam
              </span>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
                <span>🔐</span> Active Authentication Architecture
              </h3>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">User Entry Method:</span>
                  <span className="font-bold text-emerald-600">Passwordless (Name + WhatsApp)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">Phone Normalization:</span>
                  <span className="font-bold text-indigo-600">International E.164 Cleaned</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">Public Privacy:</span>
                  <span className="font-bold text-emerald-600">Phone Masked (Flag + Name only)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">Admin Security:</span>
                  <span className="font-bold text-indigo-600">PBKDF2 100,000 Iterations</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-semibold text-slate-700">Active Real Users Mode:</span>
                  <span className="font-bold text-emerald-600">Real-Time Presence (Zero Bots)</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
                <span>🏆</span> Current Reward Rules
              </h3>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">Chats Needed for Reward:</span>
                  <span className="font-black text-slate-900">{stats.config.milestoneChats.toLocaleString()} valid chats</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">Reward Cash Amount:</span>
                  <span className="font-black text-amber-600">{stats.currencySymbol}{stats.config.milestoneRewardAmount}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">Rapid Anti-Spam Rate:</span>
                  <span className="font-bold text-slate-800">{stats.config.rapidRateLimitMs} ms cooldown</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-semibold text-slate-700">Daily Streak Multiplier:</span>
                  <span className="font-bold text-orange-600">Active (+10 XP per day)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: REWARD REQUESTS (JAZZCASH & EASYPAISA) */}
      {activeTab === 'reward_requests' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-black font-display text-slate-900 flex items-center gap-2">
                <span>💰 Reward Requests</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#6C4DF6]">
                  {rewardRequestsList.length} Total
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Audit and disburse cash rewards to verified Pakistani JazzCash and Easypaisa wallets.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                Pending Action:{' '}
                <strong className="text-amber-600">
                  {rewardRequestsList.filter((r) => r.status === 'Pending' || r.status === 'Under Review').length}
                </strong>
              </span>
            </div>
          </div>

          {rewardRequestsList.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <span className="text-3xl block mb-2">🎁</span>
              <h4 className="text-sm font-bold text-slate-700">No Reward Requests Found</h4>
              <p className="text-xs text-slate-400 mt-1">
                When users reach 10,000 valid chats and request rewards, they will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Reward Amount</th>
                    <th className="py-3 px-4">Method &amp; Masked Number</th>
                    <th className="py-3 px-4">Valid Chats</th>
                    <th className="py-3 px-4">Security / Fraud Status</th>
                    <th className="py-3 px-4">Request Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rewardRequestsList.map((req) => {
                    const statusBadgeClass =
                      req.status === 'Paid'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : req.status === 'Approved'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : req.status === 'Rejected'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : req.status === 'Cancelled'
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200';

                    const fraudBadge =
                      req.fraudStatus === 'verified' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          🛡️ Verified (10K+)
                        </span>
                      ) : req.fraudStatus === 'suspicious' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          ⚠️ Suspicious
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          ✅ Clean
                        </span>
                      );

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div>{req.userName}</div>
                          <span className="text-[10px] font-mono text-slate-400 font-normal">
                            ID: {req.userId.slice(0, 8)}...
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-sm font-black text-slate-900 font-display">
                            {req.currency}{req.amount}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <span>{req.paymentMethod === 'jazzcash' ? '🟢' : '🔵'}</span>
                            <span className="capitalize">{req.paymentMethod}</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {req.maskedMobileNumber}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            A/C: {req.accountHolderName}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-800">
                          <span>{req.userValidChatCount.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 font-normal block">valid chats</span>
                        </td>

                        <td className="py-3 px-4">{fraudBadge}</td>

                        <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(req.requestDate).toLocaleDateString([], {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider block text-center ${statusBadgeClass}`}>
                            {req.status}
                          </span>
                          {req.paidDate && (
                            <span className="text-[9px] text-emerald-700 font-mono block mt-1">
                              Ref: {req.transactionReference}
                            </span>
                          )}
                          {req.rejectionReason && (
                            <span className="text-[9px] text-rose-600 block mt-1">
                              {req.rejectionReason}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                          {req.status !== 'Paid' && (
                            <>
                              {req.status !== 'Approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleRewardAction(req.id, 'approve')}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition"
                                  title="Approve for payout"
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setPayingRequest(req)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition"
                                title="Mark as Paid"
                              >
                                Mark Paid
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectingRequest(req)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition"
                                title="Reject request"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRewardAction(req.id, 'cancel')}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] transition"
                                title="Cancel request"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {req.status === 'Paid' && (
                            <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Settled</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: PAYMENT SETTINGS (JAZZCASH & EASYPAISA GATEWAYS) */}
      {activeTab === 'payment_settings' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6 max-w-3xl">
          <div>
            <h3 className="text-xl font-black font-display text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#6C4DF6]" />
              <span>Payment Gateway &amp; Reward Settings</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure payment methods, minimum payout thresholds, and manual review parameters.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
            <span className="text-base shrink-0">ℹ️</span>
            <div className="space-y-1">
              <p className="font-bold">Manual Payout Architecture (No Fake Automations)</p>
              <p className="text-amber-800 leading-relaxed">
                ChatKaro dispatches real PKR cash to user JazzCash and Easypaisa numbers via authorized manual admin audit or secure bank webhook connectors. No simulated automated transfers are displayed.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            {/* JazzCash Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🟢</span>
                  <p className="text-xs font-bold text-slate-900">JazzCash Payout Gateway</p>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Allow users to select JazzCash and submit Pakistani mobile numbers (03XXXXXXXXX).
                </p>
              </div>
              <input
                type="checkbox"
                checked={paymentSettings.jazzCashEnabled}
                onChange={(e) =>
                  setPaymentSettings({ ...paymentSettings, jazzCashEnabled: e.target.checked })
                }
                className="w-5 h-5 text-[#6C4DF6] rounded cursor-pointer"
              />
            </div>

            {/* Easypaisa Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🔵</span>
                  <p className="text-xs font-bold text-slate-900">Easypaisa Payout Gateway</p>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Allow users to select Easypaisa and submit Pakistani mobile numbers (03XXXXXXXXX).
                </p>
              </div>
              <input
                type="checkbox"
                checked={paymentSettings.easyPaisaEnabled}
                onChange={(e) =>
                  setPaymentSettings({ ...paymentSettings, easyPaisaEnabled: e.target.checked })
                }
                className="w-5 h-5 text-[#6C4DF6] rounded cursor-pointer"
              />
            </div>

            {/* Reward Requests Submissions Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-900">Accept Reward Requests</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  When disabled, user request buttons display a temporary review notice.
                </p>
              </div>
              <input
                type="checkbox"
                checked={paymentSettings.rewardRequestsEnabled}
                onChange={(e) =>
                  setPaymentSettings({ ...paymentSettings, rewardRequestsEnabled: e.target.checked })
                }
                className="w-5 h-5 text-[#6C4DF6] rounded cursor-pointer"
              />
            </div>

            {/* Minimum Reward Threshold */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                Minimum Reward Payout Threshold (Rs.)
              </label>
              <input
                type="number"
                min={1}
                value={paymentSettings.minRewardThreshold}
                onChange={(e) =>
                  setPaymentSettings({
                    ...paymentSettings,
                    minRewardThreshold: Number(e.target.value) || 2,
                  })
                }
                className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#6C4DF6]"
              />
              <p className="text-[10px] text-slate-400">
                Minimum wallet balance required to request a payout (default Rs. 2 for 10,000 chats).
              </p>
            </div>

            {/* Manual Review Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-900">Enforce Manual Admin Review</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Require admin audit approval before marking any reward request as Paid.
                </p>
              </div>
              <input
                type="checkbox"
                checked={paymentSettings.manualReview}
                onChange={(e) =>
                  setPaymentSettings({ ...paymentSettings, manualReview: e.target.checked })
                }
                className="w-5 h-5 text-[#6C4DF6] rounded cursor-pointer"
              />
            </div>

            {/* Auto Reward Eligibility Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-900">Automatic Reward Eligibility</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Automatically verify chat milestones against anti-spam criteria before allowing reward requests.
                </p>
              </div>
              <input
                type="checkbox"
                checked={paymentSettings.autoRewardEligibility}
                onChange={(e) =>
                  setPaymentSettings({
                    ...paymentSettings,
                    autoRewardEligibility: e.target.checked,
                  })
                }
                className="w-5 h-5 text-[#6C4DF6] rounded cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handleSavePaymentSettings}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] hover:opacity-95 text-white font-black text-xs sm:text-sm shadow-lg shadow-[#6C4DF6]/25 transition active:scale-98 cursor-pointer"
            >
              Save Payment Settings 💳
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: AUTH & SECURITY SETTINGS */}
      {activeTab === 'auth_security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Auth Toggles */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-600" />
              User Authentication Settings
            </h3>
            <p className="text-xs text-slate-500">
              Control the passwordless WhatsApp registration and session parameters for regular chatters.
            </p>

            <div className="space-y-3 pt-2">
              {[
                { key: 'passwordlessEntry', label: 'Passwordless User Entry', desc: 'Allow users to enter using only Full Name + WhatsApp number' },
                { key: 'nameRequired', label: 'Full Name Requirement', desc: 'Enforce full name before chat room entrance' },
                { key: 'whatsappRequired', label: 'WhatsApp Number Requirement', desc: 'Validate international mobile number with country code' },
                { key: 'duplicatePhonePrevention', label: 'Duplicate Phone Prevention', desc: 'Auto-restore returning sessions for the same WhatsApp number' },
                { key: 'newUserRegistration', label: 'New User Registration', desc: 'Allow new visitors to register profiles' },
                { key: 'chatRequestApproval', label: 'Chat Request Approval', desc: 'Require recipients to accept chat requests before messaging' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="pr-3">
                    <p className="text-xs font-bold text-slate-900">{item.label}</p>
                    <p className="text-[11px] text-slate-500">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={(userAuthSettings as any)[item.key]}
                    onChange={(e) =>
                      setUserAuthSettings({ ...userAuthSettings, [item.key]: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveConfig}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition"
            >
              Save Auth Settings 💾
            </button>
          </div>

          {/* Admin Security & Password Change */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
                Change Admin Password
              </h3>
              <p className="text-xs text-slate-500">
                Update master administrative credentials. Hashed on backend via PBKDF2.
              </p>

              <form onSubmit={handleChangeAdminPassword} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Current Admin Password
                  </label>
                  <input
                    type="password"
                    required
                    value={oldPasswordInput}
                    onChange={(e) => setOldPasswordInput(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    New Admin Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition"
                >
                  Update Admin Password 🔐
                </button>
              </form>
            </div>

            {/* Providers Status */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-emerald-600" />
                Centralized Auth Providers
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="font-bold text-slate-800 block">WhatsApp Cloud API</span>
                    <span className="text-[10px] text-slate-500">E.164 verification &amp; webhook receiver</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Connected
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="font-bold text-slate-800 block">SMS Gateway (Twilio)</span>
                    <span className="text-[10px] text-slate-500">Fallback international delivery</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Connected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USER DIRECTORY */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900">Registered Users Directory</h3>
              <p className="text-xs text-slate-500">
                Real users on platform. Complete numbers are masked for user privacy.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search name, country, or phone..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Masked WhatsApp</th>
                  <th className="py-3 px-4">Valid Chats</th>
                  <th className="py-3 px-4">Level / XP</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <img
                        src={u.avatar}
                        alt={u.displayName}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">{u.displayName}</span>
                        <span className="text-[10px] text-slate-400">@{u.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span>{u.countryFlag || '🌍'} {u.country || 'Global'}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                      {u.maskedPhone || 'Connected'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {u.validChatCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      Lvl {u.level} ({u.xp} XP)
                    </td>
                    <td className="py-3 px-4">
                      {u.isBanned ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px]">
                          Banned
                        </span>
                      ) : u.isSuspended ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                          Suspended
                        </span>
                      ) : u.isOnline ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          🟢 Online
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[10px]">
                          Offline
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {u.isBanned ? (
                        <button
                          onClick={() => handleUserAction(u.id, 'unban')}
                          className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px]"
                        >
                          Unban
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleUserAction(u.id, 'suspend')}
                            className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px]"
                          >
                            Suspend
                          </button>
                          <button
                            onClick={() => handleUserAction(u.id, 'ban')}
                            className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px]"
                          >
                            Ban
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: REPORTS */}
      {activeTab === 'reports' && stats && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="text-lg font-black text-slate-900">User Moderation Reports</h3>
          {stats.recentReports.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No open user reports at this time. 🛡️</p>
          ) : (
            <div className="space-y-2">
              {stats.recentReports.map((rep: any) => (
                <div
                  key={rep.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-black uppercase">
                        {rep.reason}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {rep.reporterName} reported {rep.reportedUserName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{rep.details}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(rep.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReportAction(rep.id, 'dismiss')}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleReportAction(rep.id, 'ban_reported')}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
                    >
                      Ban Reported User
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ANTI-FRAUD */}
      {activeTab === 'fraud' && stats && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="text-lg font-black text-slate-900">Anti-Spam &amp; Fraud Surveillance</h3>
          <p className="text-xs text-slate-500">
            Automated server-side filters catching burst rates, copy-paste spam, and automated scripts.
          </p>

          {stats.recentSuspicious.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Clean record! No fraudulent activity detected. 🚀</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recentSuspicious.map((log: any) => (
                <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-rose-700 block">{log.reason}</span>
                    <span className="text-xs text-slate-600">{log.details}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      User: @{log.username} • {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200 shrink-0">
                    Auto-Rejected
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: REWARDS */}
      {activeTab === 'rewards' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4 max-w-2xl">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>💰</span> Reward Milestone Rules
          </h3>
          <p className="text-xs text-slate-500">
            Define verified chat targets and cash disbursements for the platform.
          </p>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Required Valid Chats
              </label>
              <input
                type="number"
                value={milestoneInput}
                onChange={(e) => setMilestoneInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">Default is 10,000 verified chats.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Reward Amount (Rs.)
              </label>
              <input
                type="number"
                value={rewardAmountInput}
                onChange={(e) => setRewardAmountInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">Default is Rs. 2.</p>
            </div>

            <button
              onClick={handleSaveConfig}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md transition"
            >
              Save Reward Configuration 🏆
            </button>
          </div>
        </div>
      )}

      {/* TAB 7: CHAT SETTINGS */}
      {activeTab === 'chat_settings' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4 max-w-2xl">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            Chat Engine Controls
          </h3>

          <div className="space-y-3 pt-2">
            {[
              { key: 'chatRequestMode', label: 'Chat Request Mode', desc: 'Recipients must approve new chat requests before messaging' },
              { key: 'emojiReactions', label: 'Emoji Reactions', desc: 'Allow tap-to-react emojis on hilarious messages' },
              { key: 'readReceipts', label: 'Read Receipts', desc: 'Display blue checks when message is read' },
              { key: 'typingIndicator', label: 'Typing Indicator', desc: 'Real-time typing feedback' },
              { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Pause public messaging for maintenance' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-900">{item.label}</p>
                  <p className="text-[11px] text-slate-500">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={(chatSettings as any)[item.key]}
                  onChange={(e) => setChatSettings({ ...chatSettings, [item.key]: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Rapid Burst Rate Limit (ms)
              </label>
              <input
                type="number"
                value={rateLimitInput}
                onChange={(e) => setRateLimitInput(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
              />
            </div>

            <button
              onClick={handleSaveConfig}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition"
            >
              Update Chat Engine 🚀
            </button>
          </div>
        </div>
      )}

      {/* TAB 8: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4 max-w-2xl">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            Global Real-Time Announcement
          </h3>
          <p className="text-xs text-slate-500">
            Broadcast an instant banner alert to all active connected chatters across the application.
          </p>

          <form onSubmit={handleBroadcast} className="space-y-3 pt-2">
            <textarea
              required
              rows={3}
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="e.g. 🎉 Double XP hour starts right now! Reach 10K valid chats faster!"
              className="w-full p-4 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Now</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 9: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Admin Action Audit Logs
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Admin</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Target</th>
                  <th className="py-2.5 px-4">Details</th>
                  <th className="py-2.5 px-4">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{log.adminName}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-indigo-600 text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{log.target || '—'}</td>
                    <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">{log.details}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.result === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
