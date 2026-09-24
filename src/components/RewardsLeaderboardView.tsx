import { useState, useEffect } from 'react';
import { User, LeaderboardUser } from '../types.ts';
import { DEFAULT_ACHIEVEMENTS } from '../data/funData.ts';
import { api } from '../services/api.ts';
import {
  Trophy,
  Award,
  Crown,
  Flame,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';

interface RewardsLeaderboardViewProps {
  currentUser: User;
  milestoneChats: number;
  rewardAmount: number;
  currencySymbol: string;
  onOpenMilestoneModal: () => void;
}

export default function RewardsLeaderboardView({
  currentUser,
  milestoneChats,
  rewardAmount,
  currencySymbol,
  onOpenMilestoneModal,
}: RewardsLeaderboardViewProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [period, setPeriod] = useState<'all_time' | 'weekly' | 'monthly'>('all_time');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .getLeaderboard(period)
      .then((res) => {
        setLeaderboard(res.leaderboard || []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [period]);

  const isEligible = currentUser.validChatCount >= milestoneChats;
  const isClaimed = currentUser.claimedMilestones.includes(milestoneChats);

  return (
    <div id="rewards-leaderboard-page" className="w-full max-w-6xl mx-auto space-y-8 pb-16">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#6C4DF6]/25 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="max-w-xl z-10">
          <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-[#22D3EE] mb-3 border border-white/10">
            <Coins className="w-3.5 h-3.5" />
            Verified Reward Milestones
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight mb-2">
            10,000 Chats = {currencySymbol}{rewardAmount} Cash
          </h2>
          <p className="text-xs sm:text-sm text-white/90 leading-relaxed mb-4">
            Every valid, non-spam conversation pushes you closer to real rewards. Check your rank on the leaderboard, collect achievements, and withdraw directly via UPI!
          </p>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              Your chats: {currentUser.validChatCount.toLocaleString()} / {milestoneChats.toLocaleString()}
            </span>
            {isEligible && !isClaimed && (
              <button
                onClick={onOpenMilestoneModal}
                className="px-4 py-1.5 bg-white text-[#6C4DF6] font-bold text-xs rounded-xl shadow-md animate-pulse"
              >
                Claim {currencySymbol}{rewardAmount} Now 💰
              </button>
            )}
          </div>
        </div>

        <div className="w-36 h-36 rounded-3xl bg-white/15 backdrop-blur-md border border-white/25 flex flex-col items-center justify-center p-4 text-center shadow-lg">
          <span className="text-5xl mb-1">👑</span>
          <span className="text-xs font-black uppercase tracking-wider text-[#22D3EE]">
            Chat Legend
          </span>
          <span className="text-[10px] text-white/90">Goal: 10K Chats</span>
        </div>
      </div>

      {/* Grid: Leaderboard & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEADERBOARD (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-black font-display text-slate-900">
                Top Chatters Leaderboard 🏆
              </h3>
            </div>

            {/* Time Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setPeriod('all_time')}
                className={`px-3 py-1 rounded-lg transition ${
                  period === 'all_time' ? 'bg-[#6C4DF6] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All-Time
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-3 py-1 rounded-lg transition ${
                  period === 'monthly' ? 'bg-[#6C4DF6] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-3 py-1 rounded-lg transition ${
                  period === 'weekly' ? 'bg-[#6C4DF6] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Week
              </button>
            </div>
          </div>

          {/* Table list */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-3 pl-2">Rank</th>
                  <th className="pb-3">Chatter</th>
                  <th className="pb-3">Valid Chats</th>
                  <th className="pb-3">Level & XP</th>
                  <th className="pb-3 pr-2 text-right">Badges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading top chat champions... ⏳
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((chatter) => {
                    const isCurrentUser = chatter.id === currentUser.id;

                    return (
                      <tr
                        key={chatter.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isCurrentUser ? 'bg-purple-50/70 font-bold border-l-4 border-[#6C4DF6]' : ''
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3 pl-2">
                          {chatter.rank === 1 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-black text-xs">
                              🥇
                            </span>
                          ) : chatter.rank === 2 ? (
                            <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 flex items-center justify-center font-black text-xs">
                              🥈
                            </span>
                          ) : chatter.rank === 3 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-black text-xs">
                              🥉
                            </span>
                          ) : (
                            <span className="text-slate-500 font-bold pl-1.5">
                              #{chatter.rank}
                            </span>
                          )}
                        </td>

                        {/* Chatter Profile */}
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={chatter.avatar}
                              alt={chatter.displayName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <p className="font-bold text-slate-900 text-xs truncate max-w-[140px]">
                                {chatter.displayName}
                                {isCurrentUser && (
                                  <span className="ml-1 text-[10px] text-amber-600 font-bold">
                                    (You)
                                  </span>
                                )}
                              </p>
                              <span className="text-[10px] text-slate-400">@{chatter.username}</span>
                            </div>
                          </div>
                        </td>

                        {/* Valid Chats */}
                        <td className="py-3">
                          <span className="font-bold text-slate-900 font-display text-sm">
                            {chatter.validChatCount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 block">valid chats</span>
                        </td>

                        {/* Level */}
                        <td className="py-3">
                          <span className="font-bold text-[#6C4DF6] bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded text-[11px]">
                            Lvl {chatter.level}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1.5">{chatter.xp} XP</span>
                        </td>

                        {/* Badges */}
                        <td className="py-3 pr-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {chatter.badges.map((b, i) => (
                              <span
                                key={i}
                                className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ACHIEVEMENTS (1 Column) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-black font-display text-slate-900">
              Achievement Badges 🎖️
            </h3>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Unlock achievements by chatting genuinely and staying active!
          </p>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[480px] pr-1">
            {DEFAULT_ACHIEVEMENTS.map((ach) => {
              const isUnlocked =
                currentUser.validChatCount >= ach.targetCount ||
                (ach.id === 'reward_unlocked' && currentUser.claimedMilestones.length > 0) ||
                (ach.id === 'streak_3' && currentUser.streakDays >= 3);

              return (
                <div
                  key={ach.id}
                  className={`p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                    isUnlocked
                      ? 'bg-purple-50/40 border-purple-200 shadow-xs'
                      : 'bg-slate-50/60 border-slate-200 opacity-60'
                  }`}
                >
                  <span className="text-2xl shrink-0 p-1 bg-white rounded-xl shadow-xs">
                    {ach.icon}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{ach.title}</h4>
                      {isUnlocked ? (
                        <span className="text-[10px] font-bold text-[#6C4DF6] bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                          Unlocked
                        </span>
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{ach.description}</p>
                    <span className="text-[10px] font-bold text-[#6C4DF6] mt-1 block">
                      +{ach.xpReward} XP Reward
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
