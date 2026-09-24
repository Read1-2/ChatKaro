import { useState, useEffect } from 'react';
import { Sparkles, Coins, MessageSquare, Flame, ArrowRight, X } from 'lucide-react';

interface EarningIntroSplashProps {
  onComplete: () => void;
  currencySymbol?: string;
  milestoneChats?: number;
  rewardAmount?: number;
}

export default function EarningIntroSplash({
  onComplete,
  currencySymbol = 'Rs. ',
  milestoneChats = 10000,
  rewardAmount = 2,
}: EarningIntroSplashProps) {
  const [stage, setStage] = useState<'enter' | 'show' | 'exit'>('enter');

  useEffect(() => {
    // Sequence stages
    const timer1 = setTimeout(() => setStage('show'), 150);
    const timer2 = setTimeout(() => handleDismiss(), 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleDismiss = () => {
    setStage('exit');
    setTimeout(() => {
      onComplete();
    }, 450);
  };

  return (
    <div
      id="earning-intro-splash"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 select-none transition-all duration-500 ${
        stage === 'exit'
          ? 'opacity-0 pointer-events-none scale-105'
          : 'opacity-100 backdrop-blur-md'
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 40%, #1E1B4B 0%, #0F172A 60%, #030712 100%)',
      }}
    >
      {/* Background Animated Particle Blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#6C4DF6]/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#22D3EE]/25 rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ animationDuration: '4s' }}
      />
      <div className="absolute top-1/2 right-1/3 w-60 h-60 bg-[#EC4899]/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Floating Chat Bubbles & Emojis */}
      <div className="absolute top-12 left-10 hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs font-semibold animate-float-slow">
        <span>💬</span>
        <span>Hey 👋</span>
      </div>

      <div className="absolute top-20 right-12 hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs font-semibold animate-float-reverse">
        <span>😂😂</span>
        <span>What&apos;s up?</span>
      </div>

      <div className="absolute bottom-16 left-12 hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs font-semibold animate-float-reverse">
        <span>🔥</span>
        <span>10K loading...</span>
      </div>

      <div className="absolute bottom-20 right-14 hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs font-semibold animate-float-slow">
        <span>💰</span>
        <span>Rs. 2 unlocked!</span>
      </div>

      {/* Skip Button */}
      <button
        onClick={handleDismiss}
        className="absolute top-6 right-6 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/90 text-xs font-bold transition flex items-center gap-1.5 backdrop-blur-md shadow-lg"
      >
        <span>Skip</span>
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Main Animated Earning Note Card */}
      <div
        className={`relative w-full max-w-md rounded-3xl p-7 sm:p-9 text-center shadow-2xl transition-all duration-700 transform border border-white/20 backdrop-blur-2xl ${
          stage === 'show'
            ? 'scale-100 translate-y-0 opacity-100'
            : 'scale-90 translate-y-6 opacity-0'
        }`}
        style={{
          background:
            'linear-gradient(145deg, rgba(30, 27, 75, 0.85) 0%, rgba(17, 24, 39, 0.95) 100%)',
          boxShadow: '0 25px 60px -15px rgba(108, 77, 246, 0.45)',
        }}
      >
        {/* Glowing Top Ring Accent */}
        <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] p-0.5 shadow-xl shadow-[#6C4DF6]/40 mb-5 relative flex items-center justify-center animate-pulse-glow">
          <div className="w-full h-full bg-[#111827] rounded-[22px] flex items-center justify-center">
            <span className="text-4xl sm:text-5xl animate-bounce" style={{ animationDuration: '2s' }}>
              💰
            </span>
          </div>
          <span className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-[#EC4899] text-white text-[10px] font-black rounded-full shadow-md">
            VERIFIED
          </span>
        </div>

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-[#22D3EE] text-xs font-bold tracking-wider uppercase mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#22D3EE] animate-spin" style={{ animationDuration: '4s' }} />
          <span>Earn While You Chat 💬</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white mb-2">
          CHAT • HAVE FUN • EARN
        </h2>

        {/* Big Earning Equation Box */}
        <div className="my-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/15 relative overflow-hidden">
          <div className="text-xs uppercase font-bold text-slate-300 tracking-wider mb-1">
            Official Earning Formula
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <div>
              <span className="text-3xl sm:text-4xl font-black font-display text-white">
                {milestoneChats.toLocaleString()}
              </span>
              <span className="block text-[11px] font-medium text-slate-400">Valid Chats</span>
            </div>

            <span className="text-2xl font-black text-[#22D3EE] px-1">=</span>

            <div>
              <span className="text-3xl sm:text-4xl font-black font-display text-[#22D3EE]">
                {currencySymbol}{rewardAmount}
              </span>
              <span className="block text-[11px] font-medium text-[#22D3EE]/80">Instant Payout</span>
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
          Talk with real people in real time and watch your verified chat counter climb straight to cash rewards!
        </p>

        {/* CTA Button */}
        <button
          onClick={handleDismiss}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] hover:opacity-95 text-white font-black text-sm sm:text-base shadow-xl shadow-[#6C4DF6]/40 transition transform active:scale-95 flex items-center justify-center gap-2"
        >
          <span>🔥 Start Chatting Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Small Timer Indicator Bar */}
        <div className="w-full h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#6C4DF6] to-[#22D3EE] transition-all duration-[3000ms] ease-linear"
            style={{ width: stage === 'show' ? '100%' : '0%' }}
          />
        </div>
      </div>
    </div>
  );
}
