import { useState } from 'react';
import { User } from '../types.ts';
import { api } from '../services/api.ts';
import { X, Flag, CheckCircle2 } from 'lucide-react';

interface ReportModalProps {
  user: User | null;
  onClose: () => void;
}

export default function ReportModal({ user, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<string>('spam');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.reportUser(user.id, reason, details);
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black font-display text-slate-900">
              Report Chatter
            </h3>
            <p className="text-xs text-slate-500">
              Reporting: <span className="font-bold text-slate-700">{user.displayName}</span> (@{user.username})
            </p>
          </div>
        </div>

        {isSubmitted ? (
          <div className="p-6 text-center text-xs text-emerald-800 font-bold bg-emerald-50 rounded-2xl border border-emerald-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            Report submitted to admin moderators! Thank you for keeping ChatKaro safe.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Reason for Reporting
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="spam">Rapid Message Spam / Bot farming</option>
                <option value="harassment">Harassment or abusive language</option>
                <option value="fake_account">Suspicious fake / bot account</option>
                <option value="inappropriate">Inappropriate or offensive content</option>
                <option value="scam">Scam / phishing attempt</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe what happened..."
                rows={3}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition"
            >
              {isSubmitting ? 'Submitting Report...' : 'Submit Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
