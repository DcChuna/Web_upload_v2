import React, { useState } from 'react';
import { 
  FolderGit2, 
  ExternalLink, 
  Star, 
  Eye, 
  Share2, 
  Check, 
  Globe,
  Trash2,
  Pencil
} from 'lucide-react';
import { Post, ViewMode } from '../types';
import { useAuth } from '../context/AuthContext';
import { DataService } from '../lib/dataService';

interface PostCardProps {
  post: Post;
  viewMode: ViewMode;
  onOpenModal: (post: Post) => void;
  onOpenAnalytics: (post: Post) => void;
  onOpenLink: (post: Post) => void;
  onRequireAuth: () => void;
  onShowToast?: (msg: string) => void;
  onDeletePost?: (post: Post) => void;
  onEditPost?: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  viewMode,
  onOpenModal,
  onOpenAnalytics,
  onOpenLink,
  onRequireAuth,
  onShowToast,
  onDeletePost,
  onEditPost,
}) => {
  const { user, isAdmin } = useAuth();
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [currentRating, setCurrentRating] = useState(post.avg_rating);
  const [ratingsCount, setRatingsCount] = useState(post.ratings_count);
  const [userRating, setUserRating] = useState<number | null>(post.user_rating || null);

  // Check if current user is the creator or the moderator
  const canModify = Boolean(
    user && (
      isAdmin || 
      (post.user_email && user.email && post.user_email.toLowerCase() === user.email.toLowerCase()) ||
      (post.user_id && user.id && post.user_id === user.id)
    )
  );

  const handleRate = async (e: React.MouseEvent, rating: number) => {
    e.stopPropagation();
    if (!user) {
      onRequireAuth();
      return;
    }

    setIsRating(true);
    try {
      const result = await DataService.ratePost(post.id, rating, user);
      setCurrentRating(result.avg_rating);
      setRatingsCount(result.ratings_count);
      setUserRating(rating);
      onShowToast?.(`⭐ Rated "${post.title.slice(0, 18)}" ${rating}/5`);
    } catch (err) {
      console.error('Rating failed:', err);
    } finally {
      setIsRating(false);
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(post.url);
    setCopied(true);
    onShowToast?.('📋 Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const getDomain = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  const getPrimaryTag = () => {
    if (Array.isArray(post.tags) && post.tags.length > 0) {
      return post.tags[0];
    }
    return post.type === 'project' ? 'Project' : 'Resource';
  };

  // Grid View
  if (viewMode === 'grid') {
    return (
      <div
        onClick={() => onOpenModal(post)}
        className="group relative flex flex-col justify-between bg-[#12141c]/90 hover:bg-[#151824] border border-white/[0.06] hover:border-indigo-500/30 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5 cursor-pointer overflow-hidden backdrop-blur-sm"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                {post.type === 'project' ? <FolderGit2 className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-white/[0.04] text-zinc-400 border border-white/[0.04] truncate max-w-[130px]">
                  #{getPrimaryTag()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-zinc-400">
                {getDomain(post.url)}
              </span>
            </div>
          </div>

          {post.image_url && (
            <div className="mb-3 rounded-xl overflow-hidden border border-white/[0.06] bg-black/40 h-32 w-full relative">
              <img
                src={post.image_url}
                alt={post.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}

          <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-1 mb-1.5">
            {post.title}
          </h3>

          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
            {post.description || 'No description provided.'}
          </p>

          {post.tags && post.tags.length > 1 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {post.tags.slice(1, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.02] border border-white/[0.04] text-zinc-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between gap-2 mt-auto">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white text-[10px] font-bold flex items-center justify-center uppercase shrink-0">
              {post.user_name ? post.user_name.charAt(0) : 'U'}
            </div>
            <span className="text-[11px] text-zinc-400 truncate max-w-[90px]">
              {post.user_name || 'Team Member'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenAnalytics(post);
              }}
              title="View analytics"
              className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-indigo-300 transition-colors px-1.5 py-0.5 rounded hover:bg-white/[0.04]"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{post.views_count || 0}</span>
            </button>

            <div className="flex items-center gap-0.5 bg-white/[0.03] px-2 py-1 rounded-lg border border-white/[0.04]">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating ?? userRating ?? currentRating) >= star;
                return (
                  <button
                    key={star}
                    disabled={isRating}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={(e) => handleRate(e, star)}
                    className="p-0.5 hover:scale-125 transition-transform"
                  >
                    <Star
                      className={`w-3 h-3 ${
                        isFilled
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-zinc-600'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="text-[10px] font-mono text-zinc-400 ml-1">
                {currentRating > 0 ? currentRating.toFixed(1) : '0'}
              </span>
            </div>

            <button
              onClick={handleCopy}
              title="Copy URL"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>

            {canModify && onEditPost && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditPost(post);
                }}
                title="Edit project"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {canModify && onDeletePost && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${post.title}"?`)) {
                    onDeletePost(post);
                  }
                }}
                title="Delete post"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLink(post);
              }}
              title="Open link"
              className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-500 transition-all shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div
      onClick={() => onOpenModal(post)}
      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#12141c]/80 hover:bg-[#151824] border border-white/[0.06] hover:border-indigo-500/30 rounded-xl p-4 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
          {post.type === 'project' ? <FolderGit2 className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors truncate">
              {post.title}
            </h4>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400 shrink-0">
              #{getPrimaryTag()}
            </span>
          </div>
          <p className="text-xs text-zinc-400 truncate max-w-md mt-0.5">
            {post.description || getDomain(post.url)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.04]">
        <span className="text-[11px] text-zinc-400">
          by {post.user_name || 'Team Member'}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenAnalytics(post);
            }}
            className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-white/[0.04]"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{post.views_count || 0}</span>
          </button>

          <div className="flex items-center gap-1 bg-white/[0.03] px-2 py-1 rounded-lg border border-white/[0.04]">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs font-mono text-zinc-200">
              {currentRating > 0 ? currentRating.toFixed(1) : '0'}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
          </button>

          {canModify && onEditPost && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditPost(post);
              }}
              title="Edit resource details"
              className="p-1.5 rounded text-zinc-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {canModify && onDeletePost && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${post.title}"?`)) {
                  onDeletePost(post);
                }
              }}
              title="Delete post"
              className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenLink(post);
            }}
            className="p-1.5 rounded bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
