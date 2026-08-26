import React, { useEffect, useState } from 'react';
import { 
  X, 
  BarChart3, 
  Star, 
  Eye, 
  ExternalLink, 
  Zap, 
  Link as LinkIcon, 
  Calendar, 
  User, 
  TrendingUp, 
  Award,
  Globe,
  Loader2
} from 'lucide-react';
import { Post, PostAnalytics } from '../types';
import { DataService } from '../lib/dataService';

interface AnalyticsModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenLink: (post: Post) => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  post,
  isOpen,
  onClose,
  onOpenLink,
}) => {
  const [analytics, setAnalytics] = useState<PostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (post && isOpen) {
      setLoading(true);
      DataService.getPostAnalytics(post).then((data) => {
        setAnalytics(data);
        setLoading(false);
      });
    }
  }, [post, isOpen]);

  if (!isOpen || !post) return null;

  const isProject = post.type === 'project';

  // Calculate percentage for star meter
  const getStarPercent = (star: 1 | 2 | 3 | 4 | 5) => {
    if (!analytics || analytics.ratingBreakdown.total === 0) return 0;
    const count = analytics.ratingBreakdown[star] || 0;
    return Math.round((count / analytics.ratingBreakdown.total) * 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        id="analytics-modal"
        className="relative w-full max-w-xl bg-[#0e1015] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Resource Analytics</h2>
              <p className="text-xs text-zinc-400">Performance, reach & rating metrics</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Post Header Card */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                  isProject
                    ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {isProject ? <Zap className="w-3 h-3 text-indigo-400" /> : <LinkIcon className="w-3 h-3 text-emerald-400" />}
                <span>{isProject ? 'Team Project' : 'Useful Link'}</span>
              </span>

              <button
                onClick={() => onOpenLink(post)}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 hover:underline font-mono"
              >
                <span>Open URL</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <h3 className="text-base font-semibold text-white leading-snug">{post.title}</h3>
            
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 pt-1 border-t border-white/[0.04]">
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-zinc-500" />
                <span>Submitted by <strong>{post.user_name}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Computing analytics telemetry...</span>
            </div>
          ) : (
            <>
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Total Views */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.08] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-white tracking-tight">
                      {post.views_count}
                    </div>
                    <div className="text-xs text-zinc-400">Total Unique Views</div>
                  </div>
                </div>

                {/* Rating Score */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.08] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-white tracking-tight flex items-baseline gap-1">
                      <span>{post.avg_rating > 0 ? post.avg_rating.toFixed(1) : '0.0'}</span>
                      <span className="text-xs text-zinc-500 font-normal">/ 5.0</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      {post.ratings_count} {post.ratings_count === 1 ? 'Rating' : 'Ratings'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Star Rating Breakdown Meter */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200">Rating Distribution</span>
                  <span className="text-xs text-zinc-500 font-mono">
                    {post.ratings_count} total votes
                  </span>
                </div>

                <div className="space-y-2">
                  {([5, 4, 3, 2, 1] as const).map((star) => {
                    const percent = getStarPercent(star);
                    const count = analytics?.ratingBreakdown[star] || 0;

                    return (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1 w-10 shrink-0 font-mono text-zinc-400">
                          <span>{star}</span>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </div>

                        {/* Progress Bar Track */}
                        <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/[0.05]">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <div className="w-12 text-right text-zinc-400 font-mono text-[11px] shrink-0">
                          {percent}% ({count})
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Engagement 7-day Activity Sparkbars */}
              {analytics?.recentViews && (
                <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.08] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Weekly Engagement Trend</span>
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">Recent 7 Days</span>
                  </div>

                  <div className="flex items-end justify-between gap-2 h-16 pt-3">
                    {analytics.recentViews.map((item, i) => {
                      const maxVal = Math.max(...analytics.recentViews.map(v => v.count), 1);
                      const heightPercent = Math.max(15, Math.round((item.count / maxVal) * 100));

                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                          <div className="w-full bg-zinc-900 rounded-t overflow-hidden flex flex-col justify-end h-10">
                            <div
                              className="w-full bg-indigo-500 group-hover:bg-indigo-400 transition-all rounded-t"
                              style={{ height: `${heightPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">{item.date}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-900/60 border-t border-white/[0.08] flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">
            ID: {post.id.substring(0, 8)}...
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
