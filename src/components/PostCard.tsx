import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { 
  ExternalLink, 
  Eye, 
  Star, 
  BarChart2, 
  Zap, 
  Link as LinkIcon, 
  Share2, 
  Check, 
  Globe,
  Trash2,
  Pencil,
  Terminal,
  Play,
  FileCode
} from 'lucide-react';
import { Post, ViewMode } from '../types';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

interface PostCardProps {
  post: Post;
  viewMode?: ViewMode;
  isHighlighted?: boolean;
  onRate: (postId: string, rating: number) => Promise<void>;
  onOpenLink: (post: Post) => void;
  onOpenAnalytics: (post: Post) => void;
  onRequireAuth: () => void;
  onShowToast?: (msg: string) => void;
  onDeletePost?: (post: Post) => void;
  onEditPost?: (post: Post) => void;
  onRunCode?: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  viewMode = 'grid',
  isHighlighted = false,
  onRate,
  onOpenLink,
  onOpenAnalytics,
  onRequireAuth,
  onShowToast,
  onDeletePost,
  onEditPost,
  onRunCode,
}) => {
  const { user } = useAuth();
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isRatingLoading, setIsRatingLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Extract hostname for clean domain badge
  let domain = '';
  try {
    const parsedUrl = new URL(post.url);
    domain = parsedUrl.hostname.replace(/^www\./, '');
  } catch {
    domain = post.url;
  }

  // Format relative date
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHrs < 1) return 'just now';
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays === 1) return '1d ago';
      if (diffDays < 30) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
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
      
      // Mini confetti celebration
      try {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        confetti({
          particleCount: 16,
          spread: 40,
          startVelocity: 14,
          origin: { x, y },
          colors: ['#fbbf24', '#f59e0b', '#818cf8', '#38bdf8'],
          disableForReducedMotion: true,
        });
      } catch {
        // Safe fail
      }
    } finally {
      setIsRatingLoading(false);
    }
  };

  const handleSharePost = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareableUrl = `${window.location.origin}${window.location.pathname}?post=${post.id}`;
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    if (onShowToast) {
      onShowToast(`Link to "${post.title.slice(0, 24)}..." copied!`);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      setTimeout(() => setIsConfirmingDelete(false), 4000);
      return;
    }
    if (onDeletePost) {
      onDeletePost(post);
    }
  };

  const isCode = post.type === 'code' || !!post.code_snippet;
  const isProject = post.type === 'project' && !isCode;

  // ----------------------------------------------------
  // COMPACT LIST VIEW
  // ----------------------------------------------------
  if (viewMode === 'compact') {
    return (
      <div
        id={`post-card-${post.id}`}
        className={`group flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#0d0e13] border transition-all duration-150 ${
          isHighlighted 
            ? 'border-indigo-500/80 bg-indigo-950/20 shadow-lg shadow-indigo-500/10' 
            : 'border-white/[0.06] hover:border-white/[0.15] hover:bg-[#111218]'
        }`}
      >
        {/* Left: Type Icon + Title + Domain */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`p-1.5 rounded-lg shrink-0 ${
            isCode
              ? 'bg-amber-950/70 text-amber-400 border border-amber-500/30'
              : isProject 
              ? 'bg-indigo-950/70 text-indigo-400 border border-indigo-500/30' 
              : 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30'
          }`}>
            {isCode ? <Terminal className="w-3.5 h-3.5" /> : isProject ? <Zap className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => isCode && onRunCode ? onRunCode(post) : onOpenLink(post)}
                className="font-medium text-xs sm:text-sm text-zinc-100 hover:text-indigo-400 transition-colors truncate text-left cursor-pointer"
              >
                {post.title}
              </button>

              {isCode ? (
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/30">
                  {post.code_language || 'python'}
                </span>
              ) : (
                <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[120px] hidden md:inline">
                  {domain}
                </span>
              )}

              {post.tags && post.tags.length > 0 && (
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.2 rounded border border-white/[0.04] hidden sm:inline">
                  #{post.tags[0]}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
              <span>{post.user_name}</span>
              <span>•</span>
              <span>{formatTime(post.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Right: Star Rating + Views + Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Star Rating */}
          <div className="flex items-center gap-1">
            <button
              disabled={isRatingLoading}
              onClick={(e) => handleStarClick(e, post.user_rating ? (post.user_rating === 5 ? 4 : post.user_rating + 1) : 5)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono bg-zinc-900/80 border border-white/[0.06] text-zinc-300 hover:text-amber-400 hover:border-amber-400/30 transition-all cursor-pointer"
              title={user ? "Rate this resource" : "Sign in to rate"}
            >
              <Star className={`w-3 h-3 ${post.avg_rating > 0 ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`} />
              <span className="font-semibold">{post.avg_rating > 0 ? post.avg_rating.toFixed(1) : '—'}</span>
            </button>
          </div>

          {/* View Count */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono bg-zinc-900/80 border border-white/[0.06] text-zinc-400">
            <Eye className="w-3 h-3 text-zinc-400" />
            <span>{post.views_count}</span>
          </div>

          {/* Share */}
          <button
            onClick={handleSharePost}
            title="Copy share link"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>

          {/* Edit Button */}
          {onEditPost && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditPost(post);
              }}
              title="Edit project"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete Button */}
          {onDeletePost && (
            <button
              onClick={handleDelete}
              title={isConfirmingDelete ? "Click again to confirm delete" : "Delete resource"}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isConfirmingDelete ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Run Online Button (for code posts) */}
          {isCode && onRunCode ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRunCode(post);
              }}
              title="Run code online"
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/40 transition-all cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current text-emerald-400" />
              <span>Run</span>
            </button>
          ) : (
            /* Visit */
            <button
              onClick={() => onOpenLink(post)}
              title="Open resource"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 border border-white/[0.08] transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // GRID CARD VIEW
  // ----------------------------------------------------
  return (
    <div
      id={`post-card-${post.id}`}
      className={`group relative flex flex-col justify-between rounded-2xl bg-[#0d0e13] border transition-all duration-200 hover:shadow-xl hover:shadow-black/70 overflow-hidden ${
        isHighlighted 
          ? 'border-indigo-500/80 ring-2 ring-indigo-500/30' 
          : 'border-white/[0.07] hover:border-white/[0.18]'
      }`}
    >
      {/* Top Banner Image (if available) */}
      {post.image_url && !imgError && (
        <div className="relative h-40 w-full bg-zinc-950 overflow-hidden border-b border-white/[0.06]">
          <img
            src={post.image_url}
            alt={post.title}
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300 opacity-90 group-hover:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e13] via-transparent to-transparent opacity-85" />
          
          {/* Badge over image */}
          <div className="absolute top-2.5 left-2.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-md border shadow-sm ${
                isCode
                  ? 'bg-amber-950/90 text-amber-300 border-amber-500/40'
                  : isProject
                  ? 'bg-indigo-950/90 text-indigo-300 border-indigo-500/40'
                  : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {isCode ? <Terminal className="w-3 h-3 text-amber-400" /> : isProject ? <Zap className="w-3 h-3 text-indigo-400" /> : <LinkIcon className="w-3 h-3 text-emerald-400" />}
              <span>{isCode ? (post.code_language ? post.code_language.toUpperCase() : 'Code') : isProject ? 'Project' : 'Link'}</span>
            </span>
          </div>

          {/* Submitter pill */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/[0.1] text-[10px] text-zinc-300">
            <span className="truncate max-w-[90px]">{post.user_name}</span>
          </div>
        </div>
      )}

      {/* Card Body */}
      <div className="p-4.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header if no top banner image */}
          {(!post.image_url || imgError) && (
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                  isCode
                    ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                    : isProject
                    ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/30'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {isCode ? <Terminal className="w-3 h-3 text-amber-400" /> : isProject ? <Zap className="w-3 h-3 text-indigo-400" /> : <LinkIcon className="w-3 h-3 text-emerald-400" />}
                <span>{isCode ? (post.code_language ? post.code_language.toUpperCase() : 'Code') : isProject ? 'Project' : 'Link'}</span>
              </span>

              <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                <span className="truncate max-w-[100px]">{post.user_name}</span>
                <span>•</span>
                <span>{formatTime(post.created_at)}</span>
              </div>
            </div>
          )}

          {/* Title and Domain */}
          <div className="mb-2">
            <button
              onClick={() => isCode && onRunCode ? onRunCode(post) : onOpenLink(post)}
              className="text-left font-semibold text-zinc-100 text-sm sm:text-base leading-snug hover:text-indigo-400 transition-colors flex items-start gap-1.5 group/title cursor-pointer"
            >
              <span>{post.title}</span>
              <ExternalLink className="w-3 h-3 text-zinc-500 group-hover/title:text-indigo-400 shrink-0 mt-1 transition-colors" />
            </button>

            {/* Clean Hostname or filename */}
            <div className="flex items-center gap-1 mt-1 text-[11px] text-zinc-400 font-mono">
              {isCode ? (
                <>
                  <FileCode className="w-3 h-3 text-amber-400" />
                  <span className="truncate text-zinc-300">{post.file_name || 'script.py'}</span>
                </>
              ) : (
                <>
                  <Globe className="w-3 h-3 text-zinc-400" />
                  <span className="truncate">{domain}</span>
                </>
              )}
            </div>
          </div>

          {/* Code Snippet Preview (if code post) */}
          {isCode && post.code_snippet && (
            <div className="my-2.5 rounded-lg bg-zinc-950/90 border border-white/[0.08] overflow-hidden text-xs font-mono">
              <div className="flex items-center justify-between px-2.5 py-1 bg-zinc-900/90 border-b border-white/[0.06] text-[10px] text-zinc-400">
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <Terminal className="w-3 h-3" />
                  <span>{post.code_language || 'python'}</span>
                </span>
                <span className="text-zinc-500 text-[9px]">{post.code_snippet.split('\n').length} lines</span>
              </div>
              <pre className="p-2.5 text-zinc-300 overflow-x-auto max-h-24 text-[11px] leading-5 scrollbar-none font-mono">
                {post.code_snippet.slice(0, 240)}
                {post.code_snippet.length > 240 && '...'}
              </pre>
            </div>
          )}

          {/* Markdown Description */}
          {post.description && (
            <div className="text-xs text-zinc-400 line-clamp-2.5 mb-3 leading-relaxed font-sans prose prose-invert prose-xs max-w-none">
              <Markdown>{post.description}</Markdown>
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {post.tags.slice(0, 4).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-900/90 text-zinc-400 border border-white/[0.04]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card Footer: Rating, Views, Actions */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 mt-auto">
          {/* Interactive 1-5 Star Rating */}
          <div className="flex items-center gap-1" title={user ? "Click a star to rate" : "Sign in to rate"}>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => {
                const isHovered = hoverRating !== null && star <= hoverRating;
                const isRated = hoverRating === null && post.user_rating && star <= post.user_rating;
                const isAvgFilled = hoverRating === null && !post.user_rating && star <= Math.round(post.avg_rating);

                return (
                  <button
                    key={star}
                    disabled={isRatingLoading}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={(e) => handleStarClick(e, star)}
                    className="p-0.5 text-zinc-600 hover:text-amber-400 focus:outline-none transition-colors cursor-pointer"
                  >
                    <Star
                      className={`w-3 h-3 ${
                        isHovered || isRated || isAvgFilled
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Score */}
            <span className="font-semibold text-zinc-200 text-xs font-mono ml-0.5">
              {post.avg_rating > 0 ? post.avg_rating.toFixed(1) : '—'}
            </span>
          </div>

          {/* Right Metrics & Quick Actions */}
          <div className="flex items-center gap-1">
            {/* View Counter Badge */}
            <div 
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 text-[11px] font-mono border border-white/[0.05]"
              title={`${post.views_count} total views`}
            >
              <Eye className="w-3 h-3 text-zinc-400" />
              <span>{post.views_count}</span>
            </div>

            {/* Analytics button */}
            <button
              id={`btn-analytics-${post.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenAnalytics(post);
              }}
              title="View stats"
              className="p-1.5 rounded text-zinc-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors cursor-pointer"
            >
              <BarChart2 className="w-3 h-3" />
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
            {onEditPost && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditPost(post);
                }}
                title="Edit resource details"
                className="p-1.5 rounded text-zinc-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete button */}
            {onDeletePost && (
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
                <span>Run Online</span>
              </button>
            ) : (
              /* Visit link button */
              <button
                id={`btn-open-link-${post.id}`}
                onClick={() => onOpenLink(post)}
                title="Open resource in new tab"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white bg-zinc-800 hover:bg-zinc-700 border border-white/[0.08] transition-all cursor-pointer ml-0.5"
              >
                <span>Visit</span>
                <ExternalLink className="w-2.5 h-2.5 text-zinc-400" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
