import { X, CheckCircle2, ShieldAlert, Sparkles, HelpCircle, FileText } from 'lucide-react';

interface InfoModalProps {
  type: 'how_it_works' | 'faq' | 'rules' | 'terms' | null;
  onClose: () => void;
  milestoneChats: number;
  rewardAmount: number;
  currencySymbol: string;
}

export default function InfoModals({
  type,
  onClose,
  milestoneChats,
  rewardAmount,
  currencySymbol,
}: InfoModalProps) {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl max-h-[85vh] bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400"
        >
          <X className="w-5 h-5" />
        </button>

        {type === 'how_it_works' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-xl font-black font-display text-slate-900">
                How ChatKaro Works 🚀
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              ChatKaro is designed to make chatting entertaining, social, and genuinely rewarding!
            </p>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <h4 className="font-bold text-amber-900 text-sm mb-1">
                  1. Find Someone & Chat 💬
                </h4>
                <p>
                  Start private conversations with other online users or funny companions. Send messages, react with emojis, and use the “Make Chat Interesting 😂” button for wild conversation starters.
                </p>
              </div>

              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200">
                <h4 className="font-bold text-orange-900 text-sm mb-1">
                  2. Valid Messages Count Toward Milestone 🔥
                </h4>
                <p>
                  Every legitimate message you send automatically increments your valid chat counter on the server. Anti-spam checks verify messages in real-time so spammers and bots can't game the system.
                </p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <h4 className="font-bold text-emerald-900 text-sm mb-1">
                  3. Reach {milestoneChats.toLocaleString()} Chats = Get {currencySymbol}{rewardAmount} 💰
                </h4>
                <p>
                  When your verified counter reaches {milestoneChats.toLocaleString()} valid chats, you unlock your reward! Claim it instantly to your in-app wallet and withdraw to your UPI ID (Paytm, GPay, PhonePe).
                </p>
              </div>
            </div>
          </div>
        )}

        {type === 'faq' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-5 h-5 text-indigo-500" />
              <h3 className="text-xl font-black font-display text-slate-900">
                Frequently Asked Questions ❓
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Got questions? Here are the most common answers!
            </p>

            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="font-bold text-slate-900 mb-0.5">
                  Q: Is the {currencySymbol}{rewardAmount} reward real?
                </p>
                <p className="text-slate-600">
                  Yes! Once you reach {milestoneChats.toLocaleString()} valid chats, your reward is verified on our backend and credited to your wallet balance.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="font-bold text-slate-900 mb-0.5">
                  Q: Why did my message not increase my chat count?
                </p>
                <p className="text-slate-600">
                  ChatKaro has strict anti-spam filters. Rapid burst messages (&lt;1.2s), duplicate identical texts, and gibberish are flagged with a funny warning and excluded from the reward count.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="font-bold text-slate-900 mb-0.5">
                  Q: How do I withdraw my reward?
                </p>
                <p className="text-slate-600">
                  Go to your Dashboard, enter your UPI ID (e.g. yourname@paytm), and click Withdraw!
                </p>
              </div>
            </div>
          </div>
        )}

        {type === 'rules' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <h3 className="text-xl font-black font-display text-slate-900">
                Community Rules & Anti-Fraud Policy 🛡️
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              We take honesty, fairness, and safety very seriously.
            </p>

            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>No automated scripts, macro tools, or bot clickers.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>No repetitive single-word spam (e.g. "hi hi hi hi").</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>No harassment, abusive slurs, or scam attempts.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Be friendly, funny, and keep the good vibes rolling!</span>
              </li>
            </ul>
          </div>
        )}

        {type === 'terms' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-slate-600" />
              <h3 className="text-xl font-black font-display text-slate-900">
                Terms of Service & Privacy 📜
              </h3>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <p>
                By using ChatKaro, you agree to respect our community guidelines. Private chats are secure and never sold to third parties or indexed by search engines.
              </p>
              <p>
                Rewards are calculated exclusively on the server and are subject to anti-fraud validation. Users engaging in malicious exploitation will be suspended without reward eligibility.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
