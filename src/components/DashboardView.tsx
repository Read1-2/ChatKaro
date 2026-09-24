import { useState, useEffect } from 'react';
import { User, DailyChallenge, RewardRequest, PaymentMethod } from '../types.ts';
import { getLevelForXp } from '../data/funData.ts';
import { api } from '../services/api.ts';
import { playSound } from '../utils/audio.ts';
import {
  Flame,
  Award,
  Coins,
  ShieldCheck,
  Trophy,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Check,
  AlertCircle,
  Calendar,
  CalendarDays,
  CreditCard,
  Smartphone,
  HelpCircle,
  Send,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface DashboardViewProps {
  user: User;
  onRefreshUser: () => void;
  milestoneChats: number;
  rewardAmount: number;
  currencySymbol: string;
  onOpenMilestoneModal: () => void;
  onDevSetCount?: (count: number) => void;
  onDevSetStreak?: (days: number, includeToday?: boolean) => void;
}

export default function DashboardView({
  user,
  onRefreshUser,
  milestoneChats,
  rewardAmount,
  currencySymbol,
  onOpenMilestoneModal,
}: DashboardViewProps) {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState(user.displayName);
  const [bioInput, setBioInput] = useState(user.bio || '');

  // Payment Details & Reward Request State
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    user.payoutDetails?.preferredMethod || (user.payoutDetails?.easypaisa ? 'easypaisa' : 'jazzcash')
  );
  const [accountHolderName, setAccountHolderName] = useState(
    user.payoutDetails?.[user.payoutDetails?.preferredMethod || 'jazzcash']?.accountHolderName || ''
  );
  const [mobileNumber, setMobileNumber] = useState('');
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [payoutSaveSuccess, setPayoutSaveSuccess] = useState<string | null>(null);
  const [payoutSaveError, setPayoutSaveError] = useState<string | null>(null);

  // Reward Requests State
  const [rewardRequests, setRewardRequests] = useState<RewardRequest[]>(user.rewardRequests || []);
  const [isRequestingReward, setIsRequestingReward] = useState(false);
  const [rewardRequestSuccess, setRewardRequestSuccess] = useState<string | null>(null);
  const [rewardRequestError, setRewardRequestError] = useState<string | null>(null);

  // Load challenges and user reward requests
  useEffect(() => {
    api
      .getChallenges()
      .then((res) => setChallenges(res.challenges || []))
      .catch(() => {});

    api
      .getRewardRequests()
      .then((res) => {
        if (res.requests) {
          setRewardRequests(res.requests);
        }
      })
      .catch(() => {});
  }, []);

  // Update input defaults when switching method
  useEffect(() => {
    const saved = user.payoutDetails?.[selectedMethod];
    if (saved) {
      setAccountHolderName(saved.accountHolderName);
    } else {
      setAccountHolderName(user.name || user.displayName);
      setMobileNumber('');
    }
    setPayoutSaveSuccess(null);
    setPayoutSaveError(null);
  }, [selectedMethod, user.payoutDetails]);

  const levelInfo = getLevelForXp(user.xp);
  const percentage = Math.min(100, Math.max(0, (user.validChatCount / milestoneChats) * 100));
  const remaining = Math.max(0, milestoneChats - user.validChatCount);
  const isEligible = user.validChatCount >= milestoneChats;
  const isClaimed = user.claimedMilestones.includes(milestoneChats);

  // Handle Save Payment Details
  const handleSavePayoutDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutSaveError(null);
    setPayoutSaveSuccess(null);

    const cleaned = mobileNumber.trim().replace(/[\s\-\(\)]/g, '');
    let digits = cleaned;
    if (digits.startsWith('+92')) digits = '0' + digits.slice(3);
    else if (digits.startsWith('92') && digits.length === 12) digits = '0' + digits.slice(2);

    if (!/^03\d{9}$/.test(digits)) {
      setPayoutSaveError('Please enter a valid 11-digit Pakistani mobile number starting with 03 (e.g. 03015792132)');
      return;
    }

    if (!accountHolderName.trim() || accountHolderName.trim().length < 2) {
      setPayoutSaveError('Please enter account holder name (at least 2 characters)');
      return;
    }

    setIsSavingPayout(true);
    try {
      const res = await api.savePayoutDetails({
        method: selectedMethod,
        accountHolderName: accountHolderName.trim(),
        mobileNumber: digits,
      });
      playSound('coin');
      setPayoutSaveSuccess(`${selectedMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} details saved successfully`);
      setMobileNumber('');
      onRefreshUser();
    } catch (err: any) {
      setPayoutSaveError(err.message || 'Failed to save payout details');
    } finally {
      setIsSavingPayout(false);
    }
  };

  // Handle Request Reward
  const handleRequestReward = async () => {
    setRewardRequestError(null);
    setRewardRequestSuccess(null);

    const savedDetails = user.payoutDetails?.[selectedMethod] || user.payoutDetails?.jazzcash || user.payoutDetails?.easypaisa;
    if (!savedDetails) {
      setRewardRequestError('Add your JazzCash or Easypaisa details before requesting your reward.');
      return;
    }

    setIsRequestingReward(true);
    try {
      const res = await api.requestReward(selectedMethod);
      playSound('fanfare');
      setRewardRequestSuccess(res.message);
      if (res.request) {
        setRewardRequests((prev) => [res.request, ...prev.filter((r) => r.id !== res.request.id)]);
      }
      onRefreshUser();
    } catch (err: any) {
      setRewardRequestError(err.message || 'Failed to submit reward request');
    } finally {
      setIsRequestingReward(false);
    }
  };

  // Handle profile update
  const handleSaveProfile = async () => {
    try {
      await api.updateProfile({
        displayName: displayNameInput.trim(),
        bio: bioInput.trim(),
      });
      setIsEditingProfile(false);
      onRefreshUser();
    } catch {
      // ignore
    }
  };

  return (
    <div id="user-dashboard-view" className="w-full max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Banner Grid: Profile & Chat Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. PROFILE CARD */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="w-20 h-20 rounded-3xl object-cover border-2 border-[#6C4DF6] shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 bg-[#6C4DF6] text-white p-1 rounded-full border-2 border-white shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              </div>

              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                {isEditingProfile ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            {isEditingProfile ? (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Display Name</label>
                  <input
                    type="text"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Bio</label>
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    rows={2}
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{user.countryFlag || '🌍'}</span>
                  <h3 className="text-xl font-black font-display text-slate-900 leading-tight">
                    {user.displayName}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      user.onlineStatus === 'away'
                        ? 'bg-amber-100 text-amber-800'
                        : user.onlineStatus === 'offline'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        user.onlineStatus === 'away'
                          ? 'bg-amber-500'
                          : user.onlineStatus === 'offline'
                          ? 'bg-slate-400'
                          : 'bg-emerald-500'
                      }`}
                    />
                    {user.onlineStatus === 'away' ? 'Away' : user.onlineStatus === 'offline' ? 'Offline' : 'Online'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
                  <span>{user.country || 'Global'}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-700 font-semibold">{user.maskedPhone || 'WhatsApp Connected'}</span>
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {user.bio || 'ChatKaro chatter on a quest to unlock Rs. 2 reward! 🚀'}
                </p>
              </div>
            )}
          </div>

          {/* Quick Badges & Streak */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#EC4899] bg-pink-50 px-3 py-1.5 rounded-xl border border-pink-200/80">
                <Flame className="w-4 h-4 text-[#EC4899] fill-[#EC4899] animate-pulse" />
                <span>{user.streakDays} Day Streak 🔥</span>
              </div>

              <div className="flex items-center gap-1.5 font-bold text-[#6C4DF6] bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200/80">
                <Award className="w-4 h-4 text-[#6C4DF6]" />
                <span>Lvl {user.level} {levelInfo.title}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 px-1">
              <span>
                {user.chattedToday ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active today
                  </span>
                ) : (
                  <span className="text-amber-700 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" /> Chat today to keep
                  </span>
                )}
              </span>
              <span className="text-slate-500">Best: {user.longestStreak || user.streakDays}d 🏆</span>
            </div>
          </div>
        </div>

        {/* 2. CHAT PROGRESS CARD (Detailed) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#6C4DF6]/25 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-wider bg-black/25 backdrop-blur-md px-3.5 py-1 rounded-full text-[#22D3EE] border border-white/10">
                10,000 Chats Reward Tracker
              </span>

              {isClaimed ? (
                <span className="text-xs font-bold bg-white text-[#6C4DF6] px-3 py-1 rounded-full shadow-sm">
                  ✅ Reward Credited
                </span>
              ) : isEligible ? (
                <button
                  onClick={onOpenMilestoneModal}
                  className="text-xs font-black bg-white hover:bg-purple-50 text-[#6C4DF6] px-3.5 py-1 rounded-full shadow-md animate-pulse flex items-center gap-1"
                >
                  <Trophy className="w-3.5 h-3.5 text-[#EC4899]" />
                  Claim {currencySymbol}{rewardAmount} Now!
                </button>
              ) : (
                <span className="text-xs font-semibold text-purple-100">
                  Reward: {currencySymbol}{rewardAmount} at {milestoneChats.toLocaleString()} chats
                </span>
              )}
            </div>

            <div className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white mb-1">
              {user.validChatCount.toLocaleString()} <span className="text-xl sm:text-2xl font-bold text-white/80">/ {milestoneChats.toLocaleString()}</span>
            </div>
            <p className="text-xs sm:text-sm text-white/90 mb-6 font-medium">
              {remaining > 0
                ? `${remaining.toLocaleString()} valid chats remaining until ${currencySymbol}${rewardAmount} cash milestone!`
                : '10,000 valid chats verified on server! 🎉'}
            </p>

            {/* Progress Bar */}
            <div className="space-y-1.5 mb-4">
              <div className="h-5 bg-black/25 rounded-full p-1 border border-white/20 backdrop-blur-sm overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#22D3EE] to-white rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-white/90">
                <span>0 chats</span>
                <span>{percentage.toFixed(1)}% Completed</span>
                <span>{milestoneChats.toLocaleString()} chats</span>
              </div>
            </div>
          </div>

          {/* Security & Authenticity Notice */}
          <div className="pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-white/80 font-medium">
              Anti-Spam Engine active: Only genuine, verified conversations count toward rewards!
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-white font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>Real-Time Audit Protection</span>
            </span>
          </div>
        </div>
      </div>

      {/* DEDICATED DAILY STREAK TRACKING SECTION (SERVER-VERIFIED) */}
      <div
        id="user-daily-streak-card"
        className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100/80 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0 shadow-inner">
              <Flame className="w-6 h-6 fill-orange-500 text-orange-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black font-display text-slate-900">
                  Daily Chat Streak
                </h3>
                <span className="text-[11px] font-black uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-md">
                  Server Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculated on the server from verified, non-spam daily messages. Keep chatting to protect the flame! 🔥
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {user.chattedToday ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Streak Kept Alive Today!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold animate-pulse">
                <Clock className="w-4 h-4 text-amber-600" />
                Chat Needed Today
              </span>
            )}
          </div>
        </div>

        {/* Streak Main Stats & 7-Day Consistency Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-6 border-b border-slate-100">
          {/* Left: Big Streak Counter */}
          <div className="lg:col-span-4 flex flex-col justify-center bg-gradient-to-br from-orange-50/70 to-amber-50/50 p-5 rounded-2xl border border-orange-100">
            <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">
              Current Consistency
            </span>
            <div className="flex items-baseline gap-2 mt-1 mb-2">
              <span className="text-4xl sm:text-5xl font-black font-display text-orange-600">
                {user.streakDays}
              </span>
              <span className="text-lg sm:text-xl font-bold text-orange-950">
                {user.streakDays === 1 ? 'Day in a row' : 'Days in a row'} 🔥
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">
              {user.chattedToday
                ? `You sent verified messages today! Your ${user.streakDays}-day streak is secured until tomorrow.`
                : user.streakDays > 0
                ? `Send at least 1 valid message before midnight to advance your streak to Day ${user.streakDays + 1}!`
                : `Send a valid message today to start your day 1 chat streak!`}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-orange-200/60">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Longest Streak
                </span>
                <span className="font-bold text-slate-800">
                  {user.longestStreak || user.streakDays} Days 🏆
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Active Days
                </span>
                <span className="font-bold text-slate-800">
                  {user.validMessageDates?.length || (user.streakDays > 0 ? user.streakDays : 0)} Days 📅
                </span>
              </div>
            </div>
          </div>

          {/* Right: 7-Day Activity History Bar */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-slate-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Last 7 Days Consistency
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">
                  Resets if a consecutive day is missed
                </span>
              </div>

              {/* 7 Days Bubbles */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (6 - i));
                  const dateStr = d.toISOString().split('T')[0];
                  const isToday = i === 6;
                  const hasChatted = (user.validMessageDates || []).includes(dateStr);
                  const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
                  const dayNum = d.getDate();

                  return (
                    <div
                      key={dateStr}
                      className={`flex flex-col items-center justify-between p-2 sm:p-2.5 rounded-2xl border text-center transition ${
                        hasChatted
                          ? 'bg-orange-50 border-orange-300 text-orange-950 shadow-sm'
                          : isToday
                          ? 'bg-amber-50/70 border-amber-300 border-dashed text-amber-900 animate-pulse'
                          : 'bg-slate-50/80 border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {isToday ? 'Today' : dayName}
                      </span>
                      <span className="text-sm sm:text-base font-black font-display my-1">
                        {dayNum}
                      </span>

                      <div className="w-6 h-6 rounded-full flex items-center justify-center">
                        {hasChatted ? (
                          <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                        ) : isToday ? (
                          <Clock className="w-4 h-4 text-amber-600" />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300">•</span>
                        )}
                      </div>

                      <span
                        className={`text-[9px] font-bold mt-1 ${
                          hasChatted
                            ? 'text-orange-700'
                            : isToday
                            ? 'text-amber-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {hasChatted ? 'Active' : isToday ? 'Pending' : 'Missed'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Streak Milestones */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 block">
                Streak Milestones & XP Bonuses 🎯
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { target: 3, label: '3-Day Starter', icon: '🥉', bonus: '+50 XP' },
                  { target: 7, label: '7-Day Warrior', icon: '🥈', bonus: '+150 XP' },
                  { target: 14, label: '14-Day Titan', icon: '🥇', bonus: '+300 XP' },
                  { target: 30, label: '30-Day Legend', icon: '👑', bonus: '+1,000 XP' },
                ].map((m) => {
                  const isReached = user.streakDays >= m.target;
                  return (
                    <div
                      key={m.target}
                      className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                        isReached
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base">{m.icon}</span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            isReached
                              ? 'bg-emerald-200/80 text-emerald-900'
                              : 'bg-slate-200/60 text-slate-500'
                          }`}
                        >
                          {m.bonus}
                        </span>
                      </div>
                      <span className="font-bold text-[11px] leading-tight text-slate-900">
                        {m.label}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        {isReached ? 'Unlocked 🎉' : `${Math.min(user.streakDays, m.target)}/${m.target} days`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Notice */}
        <div className="pt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Server-authoritative streak calculation active. Rapid spam and duplicate messages are rejected.
            </span>
          </div>
        </div>
      </div>

      {/* Second Row: Wallet & Daily Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* WALLET & JAZZCASH / EASYPAISA CARD (7 Columns) */}
        <div
          id="user-wallet-card"
          className="lg:col-span-7 relative overflow-hidden bg-gradient-to-br from-white via-purple-50/20 to-cyan-50/20 rounded-3xl p-6 sm:p-7 border border-purple-200/70 shadow-lg shadow-purple-950/5 flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-[#6C4DF6]/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] p-0.5 shadow-md shadow-[#6C4DF6]/20 flex items-center justify-center">
                  <div className="w-full h-full bg-[#111827] rounded-[14px] flex items-center justify-center">
                    <span className="text-xl animate-bounce" style={{ animationDuration: '2.5s' }}>💰</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black font-display text-slate-900 flex items-center gap-1.5">
                    <span>💰 Reward Wallet</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    10,000 Valid Chats = Rs. 2 Cash Guarantee
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80 shadow-2xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Payouts</span>
              </span>
            </div>

            {/* Wallet Balances */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/90 to-white border border-purple-200 shadow-xs">
                <span className="text-xs font-bold text-[#6C4DF6] uppercase tracking-wider">
                  Available Balance
                </span>
                <div className="text-3xl font-black text-slate-900 font-display mt-0.5">
                  {currencySymbol}{user.wallet.availableBalance}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Ready for payout</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50/90 to-white border border-cyan-200 shadow-xs">
                <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">
                  Total Earned
                </span>
                <div className="text-3xl font-black text-slate-900 font-display mt-0.5">
                  {currencySymbol}{user.wallet.totalEarned}
                </div>
                <span className="text-[10px] text-cyan-700/80 font-medium">Lifetime verified chats</span>
              </div>
            </div>

            {/* PAYMENT DETAILS SECTION */}
            <div className="border-t border-slate-200/70 pt-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black font-display text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#6C4DF6]" />
                  <span>💳 Payment Details</span>
                </h4>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>Private &amp; Masked</span>
                </span>
              </div>

              <p className="text-xs text-slate-500 mb-3">
                Select your preferred Pakistani mobile wallet to receive instant cash rewards.
              </p>

              {/* Method Selection Radio Cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* JazzCash Card */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('jazzcash')}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 ${
                    selectedMethod === 'jazzcash'
                      ? 'bg-emerald-50/70 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 border-emerald-600">
                    {selectedMethod === 'jazzcash' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                      <span>🟢</span>
                      <span>JazzCash</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      {user.payoutDetails?.jazzcash ? user.payoutDetails.jazzcash.maskedNumber : 'Not configured'}
                    </span>
                  </div>
                </button>

                {/* Easypaisa Card */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('easypaisa')}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 ${
                    selectedMethod === 'easypaisa'
                      ? 'bg-cyan-50/70 border-cyan-500 shadow-sm ring-2 ring-cyan-500/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 border-cyan-600">
                    {selectedMethod === 'easypaisa' && (
                      <span className="w-2 h-2 rounded-full bg-cyan-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                      <span>🔵</span>
                      <span>Easypaisa</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      {user.payoutDetails?.easypaisa ? user.payoutDetails.easypaisa.maskedNumber : 'Not configured'}
                    </span>
                  </div>
                </button>
              </div>

              {/* Form for selected method */}
              <form onSubmit={handleSavePayoutDetails} className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {selectedMethod === 'jazzcash' ? 'JazzCash Details' : 'Easypaisa Details'}
                  </span>
                  {user.payoutDetails?.[selectedMethod] && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      Saved: {user.payoutDetails[selectedMethod]?.maskedNumber}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="Enter account holder name"
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C4DF6] focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {selectedMethod === 'jazzcash' ? 'JazzCash Mobile Number' : 'Easypaisa Mobile Number'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="03XXXXXXXXX"
                      maxLength={14}
                      className="w-full text-xs font-mono font-semibold p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C4DF6] focus:outline-none transition"
                    />
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Must be 11 digits starting with 03 (e.g. 03015792132)
                  </span>
                </div>

                {payoutSaveSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{payoutSaveSuccess}</span>
                  </div>
                )}

                {payoutSaveError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{payoutSaveError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingPayout}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition transform active:scale-98 disabled:opacity-50"
                >
                  {isSavingPayout ? 'Saving...' : `Save ${selectedMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} Details`}
                </button>
              </form>
            </div>

            {/* REQUEST REWARD ACTION */}
            <div className="border-t border-slate-200/70 pt-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div>
                  <h4 className="text-sm font-black font-display text-slate-900 flex items-center gap-1.5">
                    <span>🚀 Request Reward Payout</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Submit verified chats for direct transfer to your {selectedMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} account.
                  </p>
                </div>

                <button
                  id="wallet-request-reward-btn"
                  onClick={handleRequestReward}
                  disabled={isRequestingReward}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] hover:opacity-95 text-white font-black text-xs sm:text-sm shadow-lg shadow-[#6C4DF6]/30 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isRequestingReward ? 'Processing Request...' : 'Request Reward'}</span>
                </button>
              </div>

              {rewardRequestSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 mb-3 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{rewardRequestSuccess}</span>
                </div>
              )}

              {rewardRequestError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center gap-2 mb-3 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{rewardRequestError}</span>
                </div>
              )}
            </div>

            {/* REWARD REQUESTS STATUS LIST */}
            {rewardRequests.length > 0 && (
              <div className="mt-5 border-t border-slate-200/70 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#6C4DF6]" />
                  <span>Reward Request Status</span>
                </h4>

                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {rewardRequests.map((req) => {
                    const statusColor =
                      req.status === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : req.status === 'Approved'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : req.status === 'Rejected'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : req.status === 'Cancelled'
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200';

                    const statusIcon =
                      req.status === 'Paid'
                        ? '✅'
                        : req.status === 'Approved'
                        ? '🟢'
                        : req.status === 'Rejected'
                        ? '🔴'
                        : req.status === 'Cancelled'
                        ? '⚪'
                        : '🟠';

                    return (
                      <div
                        key={req.id}
                        className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 font-display">
                              Amount: {req.currency}{req.amount}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="font-semibold text-slate-700">
                              Method: {req.paymentMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Account: {req.accountHolderName} ({req.maskedMobileNumber}) • Date:{' '}
                            {new Date(req.requestDate).toLocaleDateString([], {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          {req.paidDate && (
                            <span className="text-[10px] text-emerald-700 font-mono block">
                              Paid on {new Date(req.paidDate).toLocaleDateString()} • Ref: {req.transactionReference}
                            </span>
                          )}
                          {req.rejectionReason && (
                            <span className="text-[10px] text-rose-600 block">
                              Reason: {req.rejectionReason}
                            </span>
                          )}
                        </div>

                        <span className={`px-2.5 py-1 rounded-full font-black text-[11px] border self-start sm:self-auto flex items-center gap-1 ${statusColor}`}>
                          <span>{statusIcon}</span>
                          <span>{req.status}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DAILY CHALLENGES CARD (5 Columns) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black font-display text-slate-900">
                    Today&apos;s Challenges 🎯
                  </h3>
                  <p className="text-[11px] text-slate-400">Complete for bonus XP &amp; streaks</p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                Resets Daily
              </span>
            </div>

            {/* Challenges List */}
            <div className="space-y-3 mb-4">
              {challenges.map((c) => {
                const isDone = c.completed || c.current >= c.target;
                const pct = Math.min(100, Math.round((c.current / c.target) * 100));

                return (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      isDone
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{c.icon}</span>
                        <p className="text-xs font-bold text-slate-900">{c.title}</p>
                      </div>
                      <span className="text-[11px] font-black text-amber-600 bg-amber-100/60 px-2 py-0.5 rounded-md">
                        +{c.xpReward} XP
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mb-2">{c.description}</p>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#6C4DF6] to-[#22D3EE] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 shrink-0">
                        {c.current} / {c.target}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Level Progression Bar */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className="text-slate-800">
                Level {levelInfo.level}: {levelInfo.title}
              </span>
              <span className="text-[#6C4DF6] font-extrabold">{user.xp} XP</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] rounded-full transition-all"
                style={{ width: `${levelInfo.progressToNext}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {levelInfo.progressToNext}% to next rank • +10 XP earned on every verified message
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
