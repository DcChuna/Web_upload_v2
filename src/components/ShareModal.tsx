import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  QrCode, 
  MessageSquare, 
  Send, 
  Sparkles, 
  Globe, 
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPosts: number;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  totalPosts,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : 'https://teamhub.internal';
  
  const inviteMessage = `🚀 Check out TeamHub — our shared feed for team projects, developer tools, and curated links (${totalPosts} resources available):\n${currentUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(inviteMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2200);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TeamHub — Projects & Useful Links',
          text: `Check out our team feed with ${totalPosts} curated projects and knowledge links!`,
          url: currentUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  // QR Code URL using standard high-res QR service
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(currentUrl)}&bgcolor=09-0a-0d&color=f4-f4-f5&margin=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-lg rounded-2xl bg-[#0d0e13] border border-white/[0.1] shadow-2xl shadow-black/90 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Share with Friends & Team</h2>
              <p className="text-xs text-zinc-400">Invite colleagues and friends to discover and post links</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4">
          {/* Quick Copy Link Box */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Direct App Link
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950/80 border border-white/[0.08] text-xs text-zinc-300 font-mono overflow-hidden">
                <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate select-all">{currentUrl}</span>
              </div>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all shrink-0 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Formatted Invite Message */}
          <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ready-to-send Message</span>
              </div>
              <button
                onClick={handleCopyMessage}
                className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                {copiedMessage ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedMessage ? 'Copied Message!' : 'Copy Text'}</span>
              </button>
            </div>
            <p className="text-xs text-zinc-400 bg-zinc-950/60 p-2.5 rounded-lg border border-white/[0.04] font-mono leading-relaxed select-all">
              {inviteMessage}
            </p>
          </div>

          {/* Action Row: Native Share & Mobile QR Code */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {/* Native Share button */}
            <button
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-medium text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] hover:border-white/[0.15] transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span>Send via App / SMS</span>
            </button>

            {/* QR Code toggle */}
            <button
              onClick={() => setShowQr(!showQr)}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                showQr
                  ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40'
                  : 'bg-zinc-900 text-zinc-200 border-white/[0.08] hover:border-white/[0.15] hover:bg-zinc-800'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showQr ? 'Hide Mobile QR' : 'Scan on Mobile'}</span>
            </button>
          </div>

          {/* QR Code View */}
          {showQr && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.08] flex flex-col items-center justify-center text-center animate-in fade-in duration-150">
              <div className="p-3 bg-white rounded-xl shadow-lg mb-2">
                <img
                  src={qrCodeUrl}
                  alt="Scan to open on phone"
                  className="w-40 h-40 object-contain"
                  loading="lazy"
                />
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-1">
                <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
                <span>Scan with phone camera to test or share immediately</span>
              </p>
            </div>
          )}

          {/* Friend Onboarding Tips */}
          <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/[0.04] space-y-1.5 text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5 font-medium text-zinc-300">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Zero-friction experience for your friends:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-zinc-400 pl-4 list-disc">
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                <span>Instant browsing (no sign up)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-indigo-400" />
                <span>1-Click demo test login</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-sky-400" />
                <span>Live search &amp; tag filters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-purple-400" />
                <span>Star rating &amp; view analytics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-zinc-950/40 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
