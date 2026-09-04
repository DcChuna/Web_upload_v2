import React from 'react';
import { 
  Plus, 
  Search, 
  Trophy, 
  LogIn, 
  LogOut, 
  Sparkles, 
  Share2,
  Database,
  CheckCircle2,
  AlertCircle,
  Terminal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenNewPostModal: () => void;
  onOpenAuthModal: () => void;
  onOpenLeaderboardModal: () => void;
  onOpenShareModal: () => void;
  onOpenDatabaseModal: () => void;
  onOpenCodeRunner: () => void;
  isSupabaseLive: boolean;
  totalPosts: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenNewPostModal,
  onOpenAuthModal,
  onOpenLeaderboardModal,
  onOpenShareModal,
  onOpenDatabaseModal,
  onOpenCodeRunner,
  isSupabaseLive,
  totalPosts,
}) => {
  const { user, logout } = useAuth();

  return (
    <header id="app-header" className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#090a0d]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-3">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/[0.12] flex items-center justify-center shadow-inner">
            <span className="font-mono font-bold text-xs text-indigo-400">TH</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold tracking-tight text-white">TeamHub</span>
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline-block">
              {totalPosts} {totalPosts === 1 ? 'post' : 'posts'}
            </span>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md mx-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search posts, tools, libraries, tags..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-zinc-900/90 border border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Code Runner / Compiler */}
          <button
            id="btn-open-code-runner"
            onClick={onOpenCodeRunner}
            title="Open Interactive Code Runner & Compiler"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 transition-all cursor-pointer shadow-sm"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline font-mono">Run Code</span>
          </button>

          {/* Database Modal Trigger */}
          <button
            id="btn-open-database-modal"
            onClick={onOpenDatabaseModal}
            title={isSupabaseLive ? 'Connected to Supabase' : 'Offline / Local Database'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.08] transition-all cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline">DB</span>
            {isSupabaseLive ? (
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
            ) : (
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 ring-2 ring-amber-400/20" />
            )}
          </button>

          {/* Leaderboard Trigger */}
          <button
            id="btn-open-leaderboard"
            onClick={onOpenLeaderboardModal}
            title="View Leaderboard"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.08] transition-all cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
          </button>

          {/* Share Trigger */}
          <button
            id="btn-open-share"
            onClick={onOpenShareModal}
            title="Share TeamHub"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.08] transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Submit New Post */}
          <button
            id="btn-new-post"
            onClick={onOpenNewPostModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Post</span>
          </button>

          {/* User Profile / Auth */}
          {user ? (
            <div className="flex items-center gap-2 pl-1">
              <div 
                className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-mono text-xs font-semibold"
                title={`Signed in as ${user.email}`}
              >
                {user.email.charAt(0).toUpperCase()}
              </div>
              <button
                id="btn-signout"
                onClick={logout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="btn-signin"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 border border-white/[0.08] transition-all cursor-pointer"
            >
              <LogIn className="w-3 h-3" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
