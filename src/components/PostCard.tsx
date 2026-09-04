import React, { useState } from 'react';
import { 
  FolderGit2, 
  ExternalLink, 
  Star, 
  Eye, 
  Share2, 
  Check, 
  Globe, 
  Code2, 
  Trash2, 
  Edit3, 
  Terminal,
  Play,
  Copy,
  BarChart2,
  Calendar,
  Layers
} from 'lucide-react';
import { Post, ViewMode } from '../types';
import { useAuth } from '../context/AuthContext';

interface PostCardProps {
  post: Post;
  viewMode: ViewMode;
  onOpenModal: (post: Post) => void;
  onOpenAnalytics: (post: Post) => void;
  onOpenLink: (post: Post) => void;
  onRate: (postId: string, rating: number) => Promise<void>;
  onToggleFavorite: (postId: string) => void;
  isFavorite: boolean;
  onRequireAuth: () => void;
  onDeletePost?: (post: Post) => void;
  onEditPost?: (post: Post) => void;
  onRunCode?: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  viewMode,
  onOpenModal,
  onOpenAnalytics,
  onOpenLink,
  onRate,
  onToggleFavorite,
  isFavorite,
  onRequireAuth,
  onDeletePost,
  onEditPost,
  onRunCode,
}) => {
  const { user, isAdmin } = useAuth();
  const [copied, setCopied] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isRatingLoading, setIsRatingLoading] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const isOwner = user?.id === post.user_id || (user?.email && post.user_email && user.email.toLowerCase() === post.user_email.toLowerCase());
  const canModify = Boolean(isOwner || isAdmin);

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'external resource';
    }
  };

  const handleSharePost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(post.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleStarClick = async (e: React.MouseEvent, starVal: number) => {
    e.stopPropagation();
    if (!user) {
      onRequireAuth();
      return;
    }

    try {
      setIsRatingLoading(true);
      await onRate(post.id, starVal);
    } finally {
      setIsRatingLoading(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDeletePost) return;

    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      setTimeout(() => setIsConfirmingDelete(false), 3000);
      return;
    }

    onDeletePost(post);
  };

  const isCode = post.type === 'code';
  const displayRating = hoverRating !== null ? hoverRating : (post.avg_rating || 0);

  // Compact View
  if (viewMode === 'compact') {
    return (
      <div
        id={`post-row-${post.id}`}
        onClick={() => onOpenModal(post)}
        className="group relative flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/[0.06] hover:border-white/[0.14] transition-all cursor-pointer shadow-sm"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/[0.08] flex items-center justify-center shrink-0 text-zinc-400 group-hover:text-indigo-400 transition-colors">
            {post.type === 'project' && <FolderGit2 className="w-4 h-4" />}
            {post.type === 'link' && <Globe className="w-4 h-4" />}
            {post.type === 'code' && <Code2 className="w-4 h-4 text-emerald-400" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors truncate">
                {post.title}
              </h3>
              {post.file_name && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 shrink-0 border border-white/[0.04]">
                  {post.file_name}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 truncate max-w-sm">
              {post.description || getDomain(post.url)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Views count */}
          <div className="flex items-center gap-1 text-xs font-mono text-zinc-500">
            <Eye className="w-3 h-3" />
            <span>{post.views_count || 0}</span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 bg-zinc-800/80 px-1.5 py-0.5 rounded text-xs font-mono text-amber-300 border border-white/[0.04]">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{post.avg_rating > 0 ? post.avg_rating.toFixed(1) : '-'}</span>
          </div>

          {/* Code runner action if code type */}
          {isCode && onRunCode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRunCode(post);
              }}
              title="Run code online"
              className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          {/* Open link */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenLink(post);
            }}
            title="Open external resource"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Grid / Standard Card View
  return (
    <div
      id={`post-card-${post.id}`}
      onClick={() => onOpenModal(post)}
      className="group relative flex flex-col justify-between bg-zinc-900/80 hover:bg-[#121319] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-black/40 overflow-hidden"
    >
      {/* Top row: Type indicator, author, action menu */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
            post.type === 'code' 
              ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400' 
              : post.type === 'project'
              ? 'bg-indigo-950/60 border-indigo-500/30 text-indigo-400'
              : 'bg-zinc-800/80 border-white/[0.08] text-zinc-300'
          }`}>
            {post.type === 'project' && <FolderGit2 className="w-4 h-4" />}
            {post.type === 'link' && <Globe className="w-4 h-4" />}
            {post.type === 'code' && <Code2 className="w-4 h-4" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="font-medium text-zinc-300 truncate max-w-[120px]">
                {post.user_name || 'Team Member'}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-[11px] text-zinc-500 truncate font-mono">
                {getDomain(post.url)}
              </span>
            </div>
          </div>
        </div>

        {/* Top Right: Type Badge */}
        <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${
          post.type === 'code'
            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
            : post.type === 'project'
            ? 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30'
            : 'bg-zinc-800 text-zinc-400 border-white/[0.06]'
        }`}>
          {post.type}
        </span>
      </div>

      {/* Title & Description */}
      <div className="mb-3">
        <h3 className="text-base font-bold text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-1 leading-snug">
          {post.title}
        </h3>
        <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
          {post.description || 'No description provided.'}
        </p>
      </div>

      {/* Code Snippet Preview (if type === 'code') */}
      {isCode && post.code_snippet && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (onRunCode) onRunCode(post);
            else onOpenModal(post);
          }}
          className="mb-3 p-2.5 rounded-xl bg-black/60 border border-white/[0.06] hover:border-emerald-500/40 transition-colors font-mono text-[11px] text-emerald-300/90 relative group/code overflow-hidden"
        >
          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1 border-b border-white/[0.04] pb-1">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <Terminal className="w-3 h-3" />
              {post.file_name || `${post.code_language || 'script'}.py`}
            </span>
            <span className="text-zinc-500 uppercase">{post.code_language || 'code'}</span>
          </div>
          <pre className="line-clamp-3 overflow-x-hidden text-zinc-300 whitespace-pre-wrap font-mono">
            {post.code_snippet}
          </pre>
          <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover/code:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950 text-emerald-200 border border-emerald-500/40 text-xs font-semibold shadow-lg">
              <Play className="w-3 h-3 fill-current" /> Run Code Online
            </span>
          </div>
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 border border-white/[0.04]"
            >
              #{tag}
            </span>
          ))}
          {post.tags.length > 3 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-800/40 text-zinc-500">
              +{post.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Bottom Bar: Interactive Stars & Actions */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 mt-auto">
        {/* Left: Star Rating Engine */}
        <div 
          className="flex items-center gap-1"
          onMouseLeave={() => setHoverRating(null)}
        >
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= Math.round(displayRating);
              return (
                <button
                  key={star}
                  disabled={isRatingLoading}
                  onClick={(e) => handleStarClick(e, star)}
                  onMouseEnter={() => setHoverRating(star)}
                  title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  className="p-0.5 text-zinc-600 hover:text-amber-400 transition-transform active:scale-125 cursor-pointer disabled:opacity-50"
                >
                  <Star 
                    className={`w-3.5 h-3.5 transition-colors ${
                      active ? 'fill-amber-400 text-amber-400' : 'text-zinc-600 hover:text-amber-400'
                    }`} 
                  />
                </button>
              );
            })}
          </div>
          <span className="text-xs font-mono font-medium text-zinc-300 ml-1">
            {post.avg_rating > 0 ? post.avg_rating.toFixed(1) : '0.0'}
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            ({post.ratings_count || 0})
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Analytics button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenAnalytics(post);
            }}
            title="View stats"
            className="p-1.5 rounded text-zinc-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors cursor-pointer"
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </button>

          {/* Share / Copy link */}
          <button
            onClick={handleSharePost}
            title="Copy link to this post"
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>

          {/* Edit button */}
          {canModify && onEditPost && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditPost(post);
              }}
              title="Edit resource details"
              className="p-1.5 rounded text-zinc-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete button */}
          {canModify && onDeletePost && (
            <button
              onClick={handleDelete}
              title={isConfirmingDelete ? "Click again to confirm delete" : "Delete resource"}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                isConfirmingDelete ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Run Online button (for code posts) */}
          {isCode && onRunCode ? (
            <button
              id={`btn-run-code-${post.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onRunCode(post);
              }}
              title="Run & compile code online"
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-emerald-200 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 shadow-sm transition-all cursor-pointer ml-0.5"
            >
              <Play className="w-3 h-3 fill-current text-emerald-400" />
              <span>Run</span>
            </button>
          ) : (
            /* Visit link button */
            <button
              id={`btn-open-link-${post.id}`}
              onClick={() => onOpenLink(post)}
              title="Open resource in new tab"
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-white bg-zinc-800 hover:bg-zinc-700 border border-white/[0.08] transition-all cursor-pointer ml-0.5"
            >
              <span>Visit</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
