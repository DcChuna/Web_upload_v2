import React, { useState } from 'react';
import { 
  X, 
  Trophy, 
  Star, 
  Eye, 
  Flame, 
  Award, 
  Zap, 
  Link as LinkIcon, 
  ExternalLink,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { Post } from '../types';

interface LeaderboardModalProps {
  posts: Post[];
  isOpen: boolean;
  onClose: () => void;
  onOpenLink: (post: Post) => void;
  onOpenAnalytics: (post: Post) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  posts,
  isOpen,
  onClose,
  onOpenLink,
  onOpenAnalytics,
}) => {
  const [metricTab, setMetricTab] = useState<'rated' | 'viewed' | 'projects'>('rated');

  if (!isOpen) return null;

  let rankedPosts = [...posts];

  if (metricTab === 'rated') {
    rankedPosts.sort((a, b) => {
      if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
      return b.ratings_count - a.ratings_count;
    });
  } else if (metricTab === 'viewed') {
    rankedPosts.sort((a, b) => b.views_count - a.views_count);
  } else {
    // Only projects sorted by rating + views combined score
    rankedPosts = rankedPosts.filter(p => p.type === 'project').sort((a, b) => (b.avg_rating * 10 + b.views_count) - (a.avg_rating * 10 + a.views_count));
  }

  const topTen = rankedPosts.slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        id="leaderboard-modal"
        className="relative w-full max-w-2xl bg-[#0e1015] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Team Hub Leaderboard</h2>
              <p className="text-xs text-zinc-400">Hall of fame for highest rated & most visited work</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 pt-4 pb-2 shrink-0 border-b border-white/[0.04]">
          <div className="grid grid-cols-3 p-1 bg-zinc-950 border border-white/[0.08] rounded-xl">
            <button
              onClick={() => setMetricTab('rated')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                metricTab === 'rated'
                  ? 'bg-zinc-800 text-amber-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Highest Rated</span>
            </button>

            <button
              onClick={() => setMetricTab('viewed')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                metricTab === 'viewed'
                  ? 'bg-zinc-800 text-rose-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Most Viewed</span>
            </button>

            <button
              onClick={() => setMetricTab('projects')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                metricTab === 'projects'
                  ? 'bg-zinc-800 text-indigo-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Top Projects</span>
            </button>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="p-6 space-y-2.5 overflow-y-auto flex-1">
          {topTen.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              No submissions found in this category.
            </div>
          ) : (
            topTen.map((item, idx) => {
              const rank = idx + 1;
              const isProject = item.type === 'project';

              let rankBadgeColor = 'bg-zinc-800 text-zinc-400 border-white/[0.08]';
              if (rank === 1) rankBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10 shadow-md';
              if (rank === 2) rankBadgeColor = 'bg-slate-300/20 text-slate-200 border-slate-300/40';
              if (rank === 3) rankBadgeColor = 'bg-amber-700/20 text-amber-500 border-amber-700/40';

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-950/80 border border-white/[0.06] hover:border-white/[0.15] hover:bg-zinc-900/60 transition-all group"
                >
                  {/* Rank & Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Rank Badge */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold border shrink-0 ${rankBadgeColor}`}
                    >
                      {rank}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                            isProject
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isProject ? 'Project' : 'Link'}
                        </span>
                        <h4 className="text-xs font-medium text-zinc-200 truncate group-hover:text-indigo-300 transition-colors">
                          {item.title}
                        </h4>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        by {item.user_name}
                      </div>
                    </div>
                  </div>

                  {/* Metrics Badge */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{item.avg_rating > 0 ? item.avg_rating.toFixed(1) : '0.0'}</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-white/[0.06]">
                      <Eye className="w-3 h-3 text-zinc-400" />
                      <span>{item.views_count}</span>
                    </div>

                    {/* Action buttons */}
                    <button
                      onClick={() => onOpenLink(item)}
                      title="Visit link"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-950 border-t border-white/[0.06] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-500">
            Updated in real-time based on team engagement
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
