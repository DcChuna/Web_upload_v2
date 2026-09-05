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
  Gamepad2,
  BarChart2,
  Sparkles
} from 'lucide-react';
import { Post, ViewMode, PostType } from '../types';
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
  onRequireAuth,
  onDeletePost,
  onEditPost,
  onRunCode,
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isRatingLoading, setIsRatingLoading] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);

  // Admin access configuration: nazicplay@gmail.com and any admin email/role have full rights
  const userEmail = (user?.email || '').toLowerCase().trim();
  const isAdmin = Boolean(
    userEmail === 'nazicplay@gmail.com' ||
    userEmail.includes('admin') ||
    (user as any)?.user_metadata?.role === 'admin' ||
    (user as any)?.app_metadata?.role === 'admin'
  );

  const isOwner = Boolean(
    user?.id && post.user_id && user.id === post.user_id
  ) || Boolean(
    userEmail && post.user_email && userEmail === post.user_email.toLowerCase().trim()
  );

  // Can modify if either owner or admin
  const canModify = Boolean(isOwner || isAdmin);

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'web resource';
    }
  };

  const domain = getDomain(post.url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  const getThumbnailSrc = () => {
    if (imgLoadError) return null;
    if (post.image_url && post.image_url.trim()) return post.image_url.trim();
    if (post.type === 'link' || post.type === 'project' || post.type === 'game') {
      try {
        const u = new URL(post.url);
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          return `https://api.microlink.io?url=${encodeURIComponent(post.url)}&screenshot=true&meta=false&embed=screenshot.url`;
        }
      } catch {}
    }
    return null;
  };

  const thumbnailSrc = getThumbnailSrc();

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
  const isGame = post.type === 'game';
  const displayRating = hoverRating !== null ? hoverRating : (post.avg_rating || 0);

  const getTypeMeta = (type: PostType) => {
    switch (type) {
      case 'game':
        return {
          label: 'Game',
          icon: Gamepad2,
          color: 'text-purple-400',
          bg: 'bg-purple-950/70',
          border: 'border-purple-500/30',
          badge: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
          actionLabel: 'Play Game',
          gradient: 'from-purple-900/50 via-indigo-950/40 to-[#0c0d14]',
        };
      case 'code':
        return {
          label: 'Code',
          icon: Code2,
          color: 'text-emerald-400',
          bg: 'bg-emerald-950/70',
          border: 'border-emerald-500/30',
          badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
          actionLabel: 'Run Code',
          gradient: 'from-emerald-950/50 via-slate-900/60 to-[#0c0d14]',
        };
      case 'project':
        return {
          label: 'Project',
          icon: FolderGit2,
          color: 'text-indigo-400',
          bg: 'bg-indigo-950/70',
          border: 'border-indigo-500/30',
          badge: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
          actionLabel: 'Launch App',
          gradient: 'from-indigo-950/60 via-blue-950/40 to-[#0c0d14]',
        };
      case 'link':
      default:
        return {
          label: 'Resource',
          icon: Globe,
          color: 'text-cyan-400',
          bg: 'bg-cyan-950/70',
          border: 'border-cyan-500/30',
          badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
          actionLabel: 'Visit Site',
          gradient: 'from-cyan-950/50 via-slate-900/50 to-[#0c0d14]',
        };
    }
  };

  const meta = getTypeMeta(post.type);
  const IconComponent = meta.icon;

  // ----------------------------------------------------
  // COMPACT ROW VIEW
  // ----------------------------------------------------
  if (viewMode === 'compact') {
    return (
      <div
        id={`post-row-${post.id}`}
        onClick={() => onOpenModal(post)}
        className="group relative flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/70 hover:bg-[#12141c] border border-white/[0.06] hover:border-white/[0.16] transition-all cursor-pointer shadow-sm"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/[0.08] bg-zinc-800 flex items-center justify-center">
            {thumbnailSrc ? (
              <img
                src={thumbnailSrc}
                alt={post.title}
                onError={() => setImgLoadError(true)}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${meta.bg} ${meta.color}`}>
                <IconComponent className="w-5 h-5" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors truncate">
                {post.title}
              </h3>
              <span className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border ${meta.badge}`}>
                {meta.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
              <span className="font-medium text-zinc-300 truncate max-w-[120px]">
                {post.user_name || 'Anonymous'}
              </span>
              <span className="text-zinc-600">•</span>
              <div className="flex items-center gap-1 text-[11px] text-zinc-500 truncate font-mono">
                <img
                  src={faviconUrl}
                  alt=""
                  className="w-3 h-3 rounded-sm shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                />
                <span>{domain}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side stats & actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-xs font-mono text-zinc-500">
            <Eye className="w-3 h-3" />
            <span>{post.views_count || 0}</span>
          </div>

          <div className="flex items-center gap-1 bg-zinc-800/80 px-2 py-0.5 rounded text-xs font-mono text-amber-300 border border-white/[0.06]">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{post.avg_rating > 0 ? post.avg_rating.toFixed(1) : '—'}</span>
          </div>

          {/* Edit button (compact) */}
          {canModify && onEditPost && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditPost(post);
              }}
              title="Edit resource"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-300 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete button (compact) */}
          {canModify && onDeletePost && (
            <button
              onClick={handleDelete}
              title={isConfirmingDelete ? "Click again to confirm delete" : "Delete resource"}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isConfirmingDelete ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'text-zinc-500 hover:text-rose-400 hover:bg-zinc-800'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {isCode && onRunCode ? (
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
          ) : (
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
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // GRID / RICH CARD VIEW
  // ----------------------------------------------------
  return (
    <div
      id={`post-card-${post.id}`}
      onClick={() => onOpenModal(post)}
      className="group relative flex flex-col justify-between bg-[#0e1017] hover:bg-[#12141e] border border-white/[0.08] hover:border-white/[0.2] rounded-2xl transition-all duration-200 cursor-pointer shadow-sm hover:shadow-2xl hover:shadow-black/60 overflow-hidden"
    >
      {/* Visual Image / Hero Preview Header */}
      <div className="relative w-full aspect-[16/9] bg-zinc-950 overflow-hidden border-b border-white/[0.06]">
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={post.title}
            onError={() => setImgLoadError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} p-4 flex flex-col justify-between relative overflow-hidden`}>
            <div 
              className="absolute inset-0 opacity-[0.07]" 
              style={{ 
                backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', 
                backgroundSize: '16px 16px' 
              }} 
            />

            <div className="relative z-10 flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                TeamHub Asset
              </span>
              <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center my-auto">
              <div className={`w-14 h-14 rounded-2xl ${meta.bg} ${meta.border} border flex items-center justify-center shadow-xl shadow-black/40 group-hover:scale-110 transition-transform duration-300`}>
                <IconComponent className={`w-7 h-7 ${meta.color}`} />
              </div>
              <span className="text-xs font-semibold text-zinc-300 mt-2 font-mono tracking-wide">
                {meta.label} Preview
              </span>
            </div>

            <div className="relative z-10 text-[10px] font-mono text-zinc-500 truncate text-center">
              {domain}
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1017] via-transparent to-black/40 pointer-events-none" />

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10 pointer-events-none">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/[0.12] text-[11px] font-mono text-zinc-300 shadow-md">
            <img
              src={faviconUrl}
              alt=""
              className="w-3.5 h-3.5 rounded-sm shrink-0"
              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
            />
            <span className="truncate max-w-[130px] font-medium">{domain}</span>
          </div>

          <span className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md border backdrop-blur-md shadow-md ${meta.badge}`}>
            <IconComponent className="w-3 h-3" />
            <span>{meta.label}</span>
          </span>
        </div>

        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isCode && onRunCode) onRunCode(post);
              else onOpenLink(post);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer"
          >
            {isGame ? (
              <>
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Play Now</span>
              </>
            ) : isCode ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Code</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-zinc-800 border border-white/[0.1] flex items-center justify-center text-[10px] font-bold text-zinc-300">
                {(post.user_name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-zinc-300 truncate max-w-[130px]">
                {post.user_name || 'Team Member'}
              </span>
            </div>

            <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-500">
              <Eye className="w-3 h-3 text-zinc-500" />
              <span>{post.views_count || 0}</span>
            </div>
          </div>

          <div className="mb-3">
            <h3 className="text-base font-bold text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-1 leading-snug">
              {post.title}
            </h3>
            <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed min-h-[32px]">
              {post.description || 'No description provided.'}
            </p>
          </div>

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
            </div>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-850 text-zinc-400 border border-white/[0.05]"
                >
                  #{tag}
                </span>
              ))}
              {post.tags.length > 3 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-800/50 text-zinc-500">
                  +{post.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom Bar: Interactive Stars & Actions */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 mt-auto">
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

            {/* Primary Action Button */}
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
            ) : isGame ? (
              <button
                id={`btn-open-game-${post.id}`}
                onClick={() => onOpenLink(post)}
                title="Play Game"
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-purple-200 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 shadow-sm transition-all cursor-pointer ml-0.5"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Play</span>
              </button>
            ) : (
              <button
                id={`btn-open-link-${post.id}`}
                onClick={() => onOpenLink(post)}
                title="Open resource in new tab"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-zinc-800 hover:bg-zinc-700 border border-white/[0.08] transition-all cursor-pointer ml-0.5"
              >
                <span>Visit</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
