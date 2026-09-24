import { useState } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, Shield, Sparkles, Heart } from 'lucide-react';

interface FooterProps {
  setActiveTab: (tab: string) => void;
  onOpenInfoModal: (type: 'how_it_works' | 'faq' | 'rules' | 'terms') => void;
}

export default function Footer({ setActiveTab, onOpenInfoModal }: FooterProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <footer className="w-full bg-[#111827] text-slate-300 pt-12 pb-24 md:pb-12 border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Desktop & Tablet Layout */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          {/* Brand & Tagline */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6C4DF6] via-[#8B5CF6] to-[#22D3EE] p-0.5 shadow-md shadow-[#6C4DF6]/30">
                <div className="w-full h-full bg-[#111827] rounded-[14px] flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-[#22D3EE]" />
                </div>
              </div>
              <span className="text-2xl font-black font-display tracking-tight text-white">
                ChatKaro
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#6C4DF6] to-[#EC4899] text-white px-2 py-0.5 rounded-full">
                Rs. 2
              </span>
            </div>
            <p className="text-sm text-slate-400 font-medium max-w-sm leading-relaxed">
              “Chat. Connect. Have Fun. Earn.”
            </p>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 max-w-sm">
              <p className="text-xs font-bold text-white tracking-wide">
                Develop by <span className="text-[#22D3EE] font-black">M.Usman</span>
              </p>
              <p className="text-xs text-slate-300 font-mono mt-0.5 flex items-center gap-1.5">
                <span>Contact:</span>
                <a
                  href="tel:+923015792132"
                  className="text-white hover:text-[#22D3EE] font-bold transition underline underline-offset-2"
                >
                  +92 3015792132
                </a>
              </p>
            </div>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              The real-time social chatting platform where verified conversations turn into genuine cash rewards and endless laughter.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-[#22D3EE]">
              <Shield className="w-3.5 h-3.5" />
              <span>Anti-Spam &amp; Server-Verified Counting</span>
            </div>
          </div>

          {/* Desktop Column 1: Platform */}
          <div className="hidden md:block">
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6C4DF6]"></span>
              Platform
            </h4>
            <ul className="space-y-2.5 text-xs font-medium text-slate-400">
              <li>
                <button
                  onClick={() => setActiveTab('home')}
                  className="hover:text-white transition flex items-center gap-1"
                >
                  🏠 Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="hover:text-white transition flex items-center gap-1"
                >
                  💬 Chats
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('rewards')}
                  className="hover:text-white transition flex items-center gap-1"
                >
                  🏆 Rewards &amp; 10K
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="hover:text-white transition flex items-center gap-1"
                >
                  🎯 Challenges &amp; Wallet
                </button>
              </li>
            </ul>
          </div>

          {/* Desktop Column 2: Community & Safety */}
          <div className="hidden md:block">
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]"></span>
              Community
            </h4>
            <ul className="space-y-2.5 text-xs font-medium text-slate-400">
              <li>
                <button
                  onClick={() => onOpenInfoModal('rules')}
                  className="hover:text-white transition text-left"
                >
                  Guidelines &amp; Anti-Spam
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenInfoModal('rules')}
                  className="hover:text-white transition text-left"
                >
                  Safety Standards
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenInfoModal('terms')}
                  className="hover:text-white transition text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="hover:text-white transition text-left"
                >
                  Report User
                </button>
              </li>
            </ul>
          </div>

          {/* Desktop Column 3: Support & Legal */}
          <div className="hidden md:block">
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EC4899]"></span>
              Support &amp; Legal
            </h4>
            <ul className="space-y-2.5 text-xs font-medium text-slate-400">
              <li>
                <button
                  onClick={() => onOpenInfoModal('faq')}
                  className="hover:text-white transition text-left"
                >
                  FAQ &amp; Help Center
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenInfoModal('how_it_works')}
                  className="hover:text-white transition text-left"
                >
                  How It Works &amp; Formulas
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenInfoModal('terms')}
                  className="hover:text-white transition text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenInfoModal('terms')}
                  className="hover:text-white transition text-left"
                >
                  Reward Disclaimer
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Mobile Collapsible Sections (clean, non-cluttered) */}
        <div className="md:hidden space-y-3 mb-8">
          {/* Mobile Platform */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
            <button
              onClick={() => toggleSection('platform')}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-white text-left"
            >
              <span>Platform Links</span>
              {expandedSection === 'platform' ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expandedSection === 'platform' && (
              <div className="px-4 pb-3 pt-1 space-y-2 text-xs border-t border-slate-800 text-slate-400">
                <button
                  onClick={() => setActiveTab('home')}
                  className="block w-full text-left py-1 hover:text-white"
                >
                  🏠 Home
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="block w-full text-left py-1 hover:text-white"
                >
                  💬 Live Chats
                </button>
                <button
                  onClick={() => setActiveTab('rewards')}
                  className="block w-full text-left py-1 hover:text-white"
                >
                  🏆 Rewards &amp; 10K
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="block w-full text-left py-1 hover:text-white"
                >
                  🎯 Challenges &amp; Wallet
                </button>
              </div>
            )}
          </div>

          {/* Mobile Community & Safety */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
            <button
              onClick={() => toggleSection('community')}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-white text-left"
            >
              <span>Community &amp; Safety</span>
              {expandedSection === 'community' ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expandedSection === 'community' && (
              <div className="px-4 pb-3 pt-1 space-y-2 text-xs border-t border-slate-800 text-slate-400">
                <button
                  onClick={() => onOpenInfoModal('rules')}
                  className="block w-full text-left py-1 hover:text-white"
                >
                  Guidelines &amp; Anti-Spam
                </button>
                <button
                  onClick={() => onOpenInfoModal('rules')}
                  className="block w-full text-left py-1 hover:text-white"
                >
                  Safety Standards
                </button>
                <button
                  onClick={() => onOpenInfoModal('terms')}
                  className="block w-full text-left py-1 hover:text-white"
                >
                  Privacy Policy
                </button>
              </div>
            )}
          </div>

          {/* Mobile Support & Legal */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
            <button
              onClick={() => toggleSection('legal')}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-white text-left"
            >
              <span>Support &amp; Legal</span>
              {expandedSection === 'legal' ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expandedSection === 'legal' && (
              <div className="px-4 pb-3 pt-1 space-y-2 text-xs border-t border-slate-800 text-slate-400">
                <button
                  onClick={() => onOpenInfoModal('faq')}
                  className="block w-full text-left py-1 hover:text-white"
                >
                  FAQ &amp; Help Center
                </button>
                <button
                  onClick={() => onOpenInfoModal('how_it_works')}
                  className="block w-full text-left py-1 hover:text-white"
                >
                  How It Works
                </button>
                <button
                  onClick={() => onOpenInfoModal('terms')}
                  className="block w-full text-left py-1 hover:text-white"
                >
                  Terms of Service &amp; Disclaimer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Copyright & Guarantee */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <span>© 2026 ChatKaro. All rights reserved.</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-slate-400">10,000 Chats = Rs. 2 Cash Guarantee</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center gap-1.5 font-medium">
              <span>Develop by <strong className="text-white font-bold">M.Usman</strong></span>
              <span>•</span>
              <a href="tel:+923015792132" className="text-[#22D3EE] font-bold hover:underline font-mono">
                +92 3015792132
              </a>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>Crafted with</span>
              <Heart className="w-3.5 h-3.5 text-[#EC4899] fill-[#EC4899]" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
