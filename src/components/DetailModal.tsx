import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Star, 
  Eye, 
  Calendar, 
  FolderGit2, 
  Globe,
  Gamepad2,
  Heart,
  BarChart3, 
  Sparkles, 
  Copy, 
  Check,
  User as UserIcon
} from 'lucide-react';
import { Post, PostType } from '../types';
import { useAuth } from '../context/AuthContext';
import { DataService } from '../lib/dataService';

interface DetailModalProps {
  post: Post | null;
  isOpen: boolean;
  isFavorite?: boolean;
  onClose: () => void;
  onOpenAnalytics: (post: Post) => void;
  onOpenLink: (post: Post) => void;
  onToggleFavorite?: (post: Post) => void;
  onRequireAuth: () => void;
  onShowToast: (msg: string) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  post,
  isOpen,
  isFavorite = false,
  onClose,
  onOpenAnalytics,
  onOpenLink,
  onToggleFavorite,
  onRequireAuth,
  onShowToast,
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(post?.user_rating || null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

  if (!isOpen || !post) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(post.url);
      setCopied(true);
      onShowToast('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      onShowToast('Failed to copy link');
    }
  };

  const handleRate = async (ratingVal: number) => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setIsRatingSubmitting(true);
    try {
      const result = await DataService.ratePost(post.id, ratingVal, user);
      setUserRating(ratingVal);
      post.avg_rating = result.avg_rating;
      post.ratings_count = result.ratings_count;
      post.user_rating = ratingVal;
      onShowToast(`Rated ${ratingVal} stars`);
    } catch (e) {
      onShowToast('Failed to submit rating');
    } finally {
      setIsRatingSubmitting(false);
    }
  };

  const getTypeBadge = (type: PostType) => {
    if (type === 'game') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300">
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>Playable Game</span>
        </span>
      );
    }
    if (type === 'project') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-300">
          <FolderGit2 className="w-3.5 h-3.5" />
          <span>App / Project</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
        <Globe className="w-3.5 h-3.5" />
        <span>Resource / Link</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#0e1015] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-10 my-8">
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/[0.06] bg-[#12141c]">
          <div className="flex items-center gap-2.5">
            {getTypeBadge(post.type)}
            {post.avg_rating > 4.5 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
                <Sparkles className="w-3 h-3" /> Top Rated
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {post.image_url && (
            <div className="w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-white/[0.08] relative group bg-black/40">
              <img
                src={post.image_url}
                alt={post.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {post.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <div className="flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>{post.user_name || 'Team Member'}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>{new Date(post.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">About this resource</h4>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-900/50 p-4 rounded-xl border border-white/[0.04]">
              {post.description || 'No detailed description provided for this resource.'}
            </p>
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tags</h4>
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-mono px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/[0.06] text-zinc-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-zinc-900/60 rounded-xl border border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 w-full sm:w-auto justify-around">
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-1 text-amber-400 font-bold text-lg">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <span>{post.avg_rating.toFixed(1)}</span>
                </div>
                <p className="text-[11px] text-zinc-400">{post.ratings_count} rating{post.ratings_count === 1 ? '' : 's'}</p>
              </div>

              <div className="h-8 w-px bg-white/[0.08]" />

              <div className="text-center sm:text-left">
                <div className="flex items-center gap-1 text-indigo-400 font-bold text-lg">
                  <Eye className="w-5 h-5" />
                  <span>{post.views_count}</span>
                </div>
                <p className="text-[11px] text-zinc-400">Total views</p>
              </div>
            </div>

            <div className="space-y-1 text-center sm:text-right">
              <span className="text-xs text-zinc-400 block font-medium">
                {user ? 'Your rating:' : 'Sign in to rate:'}
              </span>
              <div className="flex items-center justify-center sm:justify-end gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const current = hoverRating || userRating || 0;
                  const active = star <= current;
                  return (
                    <button
                      key={star}
                      type="button"
                      disabled={isRatingSubmitting}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => handleRate(star)}
                      className="p-1 text-zinc-600 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      <Star className={`w-5 h-5 ${active ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => onOpenLink(post)}
              className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{post.type === 'game' ? 'Launch & Play Game' : 'Visit Live Project'}</span>
              <ExternalLink className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(post)}
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial ${
                    isFavorite
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      : 'bg-zinc-900 border-white/[0.08] text-zinc-300 hover:text-rose-300'
                  }`}
                  title={isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span className="sm:hidden">{isFavorite ? 'Favorited' : 'Favorite'}</span>
                </button>
              )}

              <button
                onClick={handleCopyLink}
                className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial"
                title="Copy URL"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span className="sm:hidden">{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={() => onOpenAnalytics(post)}
                className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial"
                title="View Analytics"
              >
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span className="sm:hidden">Stats</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
