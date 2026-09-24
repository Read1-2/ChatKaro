import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Trophy,
  Flame,
  Users,
  Coins,
  CheckCircle2,
  Smile,
  Zap,
} from 'lucide-react';

interface HeroLandingProps {
  onStartChatting: () => void;
  onOpenHowItWorks: () => void;
  onlineCount: number;
  totalChatsEstimated?: number;
  rewardsCountEstimated?: number;
}

export default function HeroLanding({
  onStartChatting,
  onOpenHowItWorks,
  onlineCount,
  totalChatsEstimated = 485290,
  rewardsCountEstimated = 3840,
}: HeroLandingProps) {
  // Animated counters simulation
  const [totalChats, setTotalChats] = useState(totalChatsEstimated);

  useEffect(() => {
    const timer = setInterval(() => {
      setTotalChats((prev) => prev + Math.floor(Math.random() * 3) + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div id="landing-page" className="w-full flex flex-col gap-12 sm:gap-16 pb-16">
      {/* Top Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-12 sm:py-16 text-center">
        {/* Background Ambient Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-gradient-to-tr from-[#6C4DF6]/20 via-[#22D3EE]/15 to-[#EC4899]/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Floating Chat Bubbles in background */}
        <div className="hidden md:flex absolute top-12 left-6 items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/80 backdrop-blur-md border border-purple-100/80 shadow-md text-xs font-bold text-slate-800 animate-float-slow -z-10">
          <span className="text-base">👋</span>
          <span>Hey, how are you?</span>
        </div>

        <div className="hidden md:flex absolute top-28 right-8 items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/80 backdrop-blur-md border border-cyan-100/80 shadow-md text-xs font-bold text-slate-800 animate-float-reverse -z-10">
          <span className="text-base">😂😂</span>
          <span>That meme was legendary!</span>
        </div>

        <div className="hidden lg:flex absolute bottom-12 left-14 items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/80 backdrop-blur-md border border-pink-100/80 shadow-md text-xs font-bold text-slate-800 animate-float-reverse -z-10">
          <span className="text-base">🔥</span>
          <span>10K chats loading...</span>
        </div>

        <div className="hidden lg:flex absolute bottom-16 right-16 items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/80 backdrop-blur-md border border-purple-100/80 shadow-md text-xs font-bold text-[#6C4DF6] animate-float-slow -z-10">
          <span className="text-base">💰</span>
          <span>Rs. 2 claimed in wallet!</span>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-50 via-cyan-50 to-pink-50 border border-purple-200/80 px-4 py-1.5 rounded-full text-xs sm:text-sm font-black shadow-xs mb-6 animate-in fade-in slide-in-from-top-4 duration-500 text-[#6C4DF6]">
            <Sparkles className="w-4 h-4 text-[#6C4DF6] animate-spin" style={{ animationDuration: '6s' }} />
            <span>Real Time • Real People • Real Rewards</span>
            <span className="bg-gradient-to-r from-[#6C4DF6] to-[#EC4899] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
              10K = Rs. 2
            </span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-[#111827] tracking-tight font-display mb-6 max-w-3xl leading-[1.08]">
            Chat. Connect. <br />
            <span className="bg-gradient-to-r from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] bg-clip-text text-transparent">
              Have Fun. Earn. 🚀
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-slate-600 font-medium max-w-2xl mb-8 leading-relaxed">
            Talk with real people in real time and turn your conversations into progress. Reach 10,000 verified chats to instantly unlock Rs. 2 straight into your wallet!
          </p>

          {/* Call-to-Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <button
              id="hero-start-chatting-btn"
              onClick={onStartChatting}
              className="w-full sm:w-auto py-4 px-8 rounded-2xl bg-gradient-to-r from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] hover:opacity-95 text-white font-black text-base shadow-xl shadow-[#6C4DF6]/30 hover:shadow-[#6C4DF6]/50 transition transform active:scale-95 flex items-center justify-center gap-2 group"
            >
              <span>Start Chatting</span>
              <span className="group-hover:translate-x-1 transition-transform">🚀</span>
            </button>

            <button
              id="hero-how-it-works-btn"
              onClick={onOpenHowItWorks}
              className="w-full sm:w-auto py-4 px-6 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-base shadow-sm hover:shadow transition flex items-center justify-center gap-2"
            >
              <span>How It Works</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Anti-spam assurance badge */}
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Anti-Spam Engine • Cryptographically Verified • Zero Bot Abuse</span>
          </div>
        </div>
      </section>

      {/* Animated Live Platform Stats Counter */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Online Users */}
          <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition flex flex-col items-center text-center group">
            <div className="w-12 h-12 rounded-2xl bg-[#22D3EE]/10 text-cyan-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
              {onlineCount}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              👥 Online Users
            </div>
            <span className="text-[11px] text-cyan-700 font-semibold mt-1">Live right now</span>
          </div>

          {/* Total Chats */}
          <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition flex flex-col items-center text-center group">
            <div className="w-12 h-12 rounded-2xl bg-[#6C4DF6]/10 text-[#6C4DF6] flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
              {totalChats.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              💬 Total Chats
            </div>
            <span className="text-[11px] text-[#6C4DF6] font-semibold mt-1">Verified on server</span>
          </div>

          {/* Rewards Unlocked */}
          <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition flex flex-col items-center text-center group">
            <div className="w-12 h-12 rounded-2xl bg-[#EC4899]/10 text-[#EC4899] flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
              Rs. {rewardsCountEstimated.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              🏆 Rewards Claimed
            </div>
            <span className="text-[11px] text-[#EC4899] font-semibold mt-1">10K milestones paid</span>
          </div>

          {/* Active Streaks */}
          <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition flex flex-col items-center text-center group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <Flame className="w-6 h-6" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
              850+
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              🔥 Active Streaks
            </div>
            <span className="text-[11px] text-amber-600 font-semibold mt-1">Daily chatter habits</span>
          </div>
        </div>
      </section>

      {/* Feature Highlights Bento Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 font-display tracking-tight mb-3">
            Why Chatting Here Hits Different 😂
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            ChatKaro turns everyday chit-chat into a fun quest packed with memes, real-time friends, and guaranteed wallet rewards!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: 10,000 Chats Milestone */}
          <div className="bg-gradient-to-br from-[#6C4DF6] via-[#8B5CF6] to-[#3B82F6] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-4 text-[#22D3EE]">
                <Coins className="w-3.5 h-3.5" />
                <span>Verified Milestone</span>
              </div>
              <h3 className="text-2xl font-black font-display mb-2">
                10,000 Chats = Rs. 2 Cash
              </h3>
              <p className="text-white/90 text-sm leading-relaxed mb-6">
                Keep the conversations rolling! Complete 10,000 verified chats with real people or friends and claim Rs. 2 directly to your wallet with zero hassle.
              </p>
            </div>
            <div className="bg-black/25 backdrop-blur-sm rounded-2xl p-4 border border-white/15 flex items-center justify-between">
              <div>
                <span className="text-xs text-[#22D3EE] font-bold block">Target Goal</span>
                <span className="text-xl font-black">10,000 Valid Chats</span>
              </div>
              <span className="text-3xl animate-bounce" style={{ animationDuration: '2.5s' }}>👑</span>
            </div>
          </div>

          {/* Card 2: Make Chat Interesting */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-purple-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#6C4DF6]/10 text-[#6C4DF6] flex items-center justify-center mb-4">
                <Smile className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 font-display mb-2">
                “Make Chat Interesting 😂”
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Never get stuck with boring “hey” or “sup”. Tap one button to fire hilarious conversation starters like “Is cereal soup?” or “Would you survive 7 days without phone?”
              </p>
            </div>
            <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-100 text-xs font-bold text-[#6C4DF6] italic">
              “What is your most useless, bizarre superpower?” 🍕
            </div>
          </div>

          {/* Card 3: Anti-Spam Machine */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-purple-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#22D3EE]/10 text-cyan-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 font-display mb-2">
                Fair & Anti-Spam Shield
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Our backend stops bots, repetitive copy-pastes, and rapid spam bursts. Genuine human chatter is tracked accurately to guarantee fair rewards for real chat champions!
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-2.5 rounded-2xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Server-side verified interaction counting</span>
            </div>
          </div>
        </div>
      </section>

      {/* Community Testimonials */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div
          className="rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl"
          style={{
            background: 'linear-gradient(145deg, #111827 0%, #1E1B4B 100%)',
          }}
        >
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#22D3EE] mb-2 block">
              Community Voices 💬
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-display mb-6">
              “I came for the Rs. 2 reward, stayed for the non-stop laughs! 😂”
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs text-slate-300">
              <div>
                <p className="font-bold text-white mb-0.5">Rahul_MemeKing</p>
                <p className="text-slate-400">“Reached 9,940 chats. My keyboard has biceps now!”</p>
              </div>
              <div>
                <p className="font-bold text-white mb-0.5">Priya_Sparkles</p>
                <p className="text-slate-400">“The conversation starters saved my awkward dates!”</p>
              </div>
              <div>
                <p className="font-bold text-white mb-0.5">Amit_ChaiLover</p>
                <p className="text-slate-400">“Withdrew my Rs. 2 to UPI in 1 second. 10/10 platform!”</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

