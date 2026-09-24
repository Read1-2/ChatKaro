import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { playSound } from '../utils/audio.ts';
import { X, Sparkles, Award, ArrowRight } from 'lucide-react';

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  validChatCount: number;
  milestoneChats: number;
  rewardAmount: number;
  currencySymbol: string;
  onClaimReward: () => void;
  isClaiming: boolean;
  isAlreadyClaimed: boolean;
  onViewWallet: () => void;
}

export default function MilestoneModal({
  isOpen,
  onClose,
  validChatCount,
  milestoneChats,
  rewardAmount,
  currencySymbol,
  onClaimReward,
  isClaiming,
  isAlreadyClaimed,
  onViewWallet,
}: MilestoneModalProps) {
  useEffect(() => {
    if (isOpen) {
      playSound('fanfare');
      // Launch celebratory confetti burst
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899'],
        });
        setTimeout(() => {
          confetti({
            particleCount: 60,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
          });
          confetti({
            particleCount: 60,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
          });
        }, 300);
      } catch {
        // confetti fallback
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="milestone-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="milestone-modal-card"
        className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl border-4 border-amber-400 overflow-hidden"
      >
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-300/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-300/30 rounded-full blur-3xl pointer-events-none" />

        <button
          id="close-milestone-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Trophy icon */}
        <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-200 shadow-lg shadow-amber-300/50">
          <span className="text-5xl animate-bounce">🎉</span>
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            Verified
          </div>
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-display mb-2">
          BROOOO! 👑
        </h2>

        <p className="text-lg font-bold text-amber-600 mb-1">
          You reached {milestoneChats.toLocaleString()} valid chats!
        </p>
        <p className="text-sm text-slate-600 mb-6">
          “You actually did it 😂 Your thumbs deserve a medal and your keyboard deserves a bath!”
        </p>

        {/* Reward Showcase Box */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-200 mb-6">
          <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Milestone Reward Unlocked
          </div>
          <div className="text-4xl sm:text-5xl font-black text-amber-700 font-display">
            {currencySymbol}{rewardAmount} <span className="text-3xl">💰</span>
          </div>
          <p className="text-xs text-amber-700/80 mt-1 font-medium">
            Calculated and cryptographically verified on server
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {!isAlreadyClaimed ? (
            <button
              id="claim-milestone-reward-btn"
              onClick={onClaimReward}
              disabled={isClaiming}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-base shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isClaiming ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin" />
                  Crediting to Wallet...
                </>
              ) : (
                <>
                  <Award className="w-5 h-5" />
                  Claim {currencySymbol}{rewardAmount} to Wallet 💰
                </>
              )}
            </button>
          ) : (
            <div className="py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center justify-center gap-2">
              <span>✅</span> Already Claimed in Wallet!
            </div>
          )}

          <button
            id="view-wallet-btn"
            onClick={() => {
              onClose();
              onViewWallet();
            }}
            className="w-full py-3 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition flex items-center justify-center gap-2"
          >
            View Wallet & Withdraw
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          ChatKaro Anti-Fraud verified interaction • 100% genuine chat milestone
        </p>
      </div>
    </div>
  );
}
