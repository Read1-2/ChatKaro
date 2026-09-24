import React, { useState, useMemo } from 'react';
import { api } from '../services/api.ts';
import { User } from '../types.ts';
import { COUNTRIES, CountryItem, normalizePhoneNumber } from '../data/countries.ts';
import { playSound } from '../utils/audio.ts';
import {
  X,
  Sparkles,
  Search,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
  initialStep?: 'welcome' | 'profile';
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  initialStep = 'welcome',
}: AuthModalProps) {
  const [step, setStep] = useState<'welcome' | 'profile' | 'celebrate'>(initialStep);
  const [fullName, setFullName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(
    COUNTRIES.find((c) => c.code === 'PK') || COUNTRIES[0]
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);

  // Filtered countries for search
  const filteredCountries = useMemo(() => {
    const q = countrySearch.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  if (!isOpen) return null;

  // Instant pre-fill for fast testing between Real User A & Real User B
  const handleQuickFill = (name: string, countryCode: string, phone: string) => {
    setFullName(name);
    const c = COUNTRIES.find((item) => item.code === countryCode) || COUNTRIES[0];
    setSelectedCountry(c);
    setPhoneNumber(phone);
    setStep('profile');
    setError(null);
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      return;
    }

    const { normalized, isValid, error: normError } = normalizePhoneNumber(phoneNumber, selectedCountry);
    if (!isValid) {
      setError(normError || 'Please enter a valid mobile number');
      return;
    }

    setLoading(true);

    try {
      const res = await api.enterProfile({
        name: trimmedName,
        country: selectedCountry.name,
        countryCode: selectedCountry.code,
        dialCode: selectedCountry.dialCode,
        phone: normalized,
      });

      setRegisteredUser(res.user);
      setStep('celebrate');
      playSound('fanfare');

      // Auto-enter application after brief celebration
      setTimeout(() => {
        onAuthSuccess(res.user);
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'Failed to enter chat. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: WELCOME SCREEN */}
        {step === 'welcome' && (
          <div className="flex flex-col items-center text-center pt-2 pb-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-100 to-orange-100 text-amber-600 flex items-center justify-center mb-5 text-3xl shadow-sm border border-amber-200/50">
              👋
            </div>

            <h3 className="text-2xl sm:text-3xl font-black font-display text-slate-900 tracking-tight mb-2">
              Welcome to ChatKaro
            </h3>

            <p className="text-sm text-slate-600 font-medium max-w-xs leading-relaxed mb-6">
              Meet real people, chat in real time, complete challenges, and unlock verified rewards!
            </p>

            {/* Quick Testing Badges for User A & User B */}
            <div className="w-full p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl mb-6 text-left">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block mb-2 text-center">
                ⚡ Quick Test Switcher (Real Live Accounts)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('Muhammad', 'PK', '3012345678')}
                  className="p-2.5 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-200 text-left transition flex items-center gap-2 shadow-2xs"
                >
                  <span className="text-lg">🇵🇰</span>
                  <div className="truncate">
                    <span className="block text-xs font-bold text-slate-800 truncate">Muhammad</span>
                    <span className="text-[10px] text-amber-700 font-semibold block">7.4K chats</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('Ahmed', 'AE', '501234567')}
                  className="p-2.5 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-200 text-left transition flex items-center gap-2 shadow-2xs"
                >
                  <span className="text-lg">🇦🇪</span>
                  <div className="truncate">
                    <span className="block text-xs font-bold text-slate-800 truncate">Ahmed</span>
                    <span className="text-[10px] text-orange-700 font-semibold block">3.1K chats</span>
                  </div>
                </button>
              </div>
            </div>

            <button
              id="start-chatting-modal-btn"
              onClick={() => setStep('profile')}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-base shadow-lg shadow-orange-500/25 transition active:scale-98 flex items-center justify-center gap-2 group"
            >
              <span>Start Chatting</span>
              <span className="group-hover:translate-x-1 transition-transform">🚀</span>
            </button>

            <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>No password needed • 100% Real Time</span>
            </div>
          </div>
        )}

        {/* STEP 2: PROFILE ENTRY SCREEN */}
        {step === 'profile' && (
          <div className="animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2 text-2xl shadow-xs">
                ✨
              </div>
              <h3 className="text-2xl font-black font-display text-slate-900">
                Create Your Profile
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter your name and WhatsApp number to chat with real people.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 mb-4 animate-shake">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitProfile} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name (e.g. Muhammad)"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium text-slate-800 placeholder-slate-400 shadow-2xs"
                />
              </div>

              {/* Country Selector */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Country <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium text-slate-800 flex items-center justify-between shadow-2xs transition"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="font-semibold text-slate-900">{selectedCountry.name}</span>
                    <span className="text-slate-400 font-mono text-xs font-normal">({selectedCountry.dialCode})</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Searchable Country Dropdown */}
                {showCountryDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-60 overflow-hidden flex flex-col animate-in fade-in duration-150">
                    <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          autoFocus
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          placeholder="Search country, ISO code, or dialing code..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800"
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                      {filteredCountries.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(c);
                            setShowCountryDropdown(false);
                            setCountrySearch('');
                          }}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-amber-50/60 transition ${
                            selectedCountry.code === c.code ? 'bg-amber-50 font-bold text-amber-900' : 'text-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span>{c.flag}</span>
                            <span className="truncate">{c.name}</span>
                          </span>
                          <span className="text-slate-400 font-mono text-[11px] shrink-0 ml-2">{c.dialCode}</span>
                        </button>
                      ))}
                      {filteredCountries.length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400">No country found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  WhatsApp Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden shadow-2xs focus-within:ring-2 focus-within:ring-amber-500">
                  <div className="bg-slate-50 border-r border-slate-200 px-3 py-3 text-slate-600 font-mono text-sm font-bold flex items-center gap-1.5 shrink-0">
                    <span>{selectedCountry.flag}</span>
                    <span>{selectedCountry.dialCode}</span>
                  </div>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 3012345678"
                    className="w-full px-3 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  🔒 Your number is never shown publicly. Other users only see your flag &amp; name.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-base shadow-lg shadow-orange-500/25 transition active:scale-98 flex items-center justify-center gap-2 mt-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <span>Entering ChatKaro...</span>
                ) : (
                  <>
                    <span>Enter Chat</span>
                    <span>🚀</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setStep('welcome')}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  ← Back to overview
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: CELEBRATION & WELCOME */}
        {step === 'celebrate' && registeredUser && (
          <div className="py-6 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-4xl shadow-md border-2 border-emerald-200 animate-bounce">
              🎉
            </div>
            <h3 className="text-2xl sm:text-3xl font-black font-display text-slate-900 mb-1">
              Welcome, {registeredUser.displayName}! 😂
            </h3>
            <p className="text-sm font-medium text-slate-600 mb-4">
              {registeredUser.countryFlag} {registeredUser.country} • Ready to chat in real time!
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Session verified &amp; connected. Entering live rooms...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
