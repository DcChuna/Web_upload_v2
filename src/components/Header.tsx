import React from 'react';
import { 
  Plus, 
  Search, 
  Sparkles, 
  FolderGit2, 
  Globe, 
  Gamepad2,
  Heart,
  LayoutGrid, 
  List, 
  SlidersHorizontal,
  LogOut,
  User as UserIcon,
  Layers
} from 'lucide-react';
import { PostType, ViewMode, FilterType, SortOption } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterType: FilterType;
  setFilterType: (type: FilterType) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  allTags: string[];
  sortOption: SortOption;
  setSortOption: (sort: SortOption) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onOpenNewSubmission: () => void;
  onOpenAuth: () => void;
  counts: {
    all: number;
    project: number;
    game: number;
    link: number;
    favorites: number;
  };
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  selectedTag,
  setSelectedTag,
  allTags,
  sortOption,
  setSortOption,
  viewMode,
  setViewMode,
  onOpenNewSubmission,
  onOpenAuth,
  counts,
}) => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-[#0c0d12]/95 backdrop-blur-md border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#0c0d12] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                TeamHub
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-normal">
                  PRO
                </span>
              </h1>
              <p className="text-[11px] text-zinc-400 hidden sm:block">Projects, Games, Links & Favorites</p>
            </div>
          </div>

          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games, projects, links, tags..."
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-zinc-900/90 border border-white/[0.08] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenNewSubmission}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Resource</span>
              <span className="sm:hidden">Add</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                  {user.name ? user.name.charAt(0) : 'U'}
                </div>
                <div className="hidden lg:block text-left">
                  <span className="text-xs font-semibold text-zinc-200 block truncate max-w-[100px]">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 text-zinc-400 hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-zinc-200 text-xs font-semibold"
              >
                <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        <div className="py-2.5 border-t border-white/[0.04] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-zinc-900/80 rounded-xl border border-white/[0.05] overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'all', label: 'All', icon: Layers, count: counts.all, color: 'text-indigo-400' },
                { id: 'game', label: 'Games', icon: Gamepad2, count: counts.game, color: 'text-purple-400' },
                { id: 'project', label: 'Projects', icon: FolderGit2, count: counts.project, color: 'text-blue-400' },
                { id: 'link', label: 'Links', icon: Globe, count: counts.link, color: 'text-emerald-400' },
                { id: 'favorites', label: 'Favorites', icon: Heart, count: counts.favorites, color: 'text-rose-400' },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = filterType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id as FilterType)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    active
                      ? tab.id === 'favorites'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold'
                        : tab.id === 'game'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold'
                        : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                  <span>{tab.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/[0.05] text-zinc-400">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-900/80 px-2.5 py-1.5 rounded-xl border border-white/[0.05]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-zinc-900">✨ Newest First</option>
                <option value="rating" className="bg-zinc-900">⭐ Top Rated</option>
                <option value="views" className="bg-zinc-900">🔥 Most Viewed</option>
                <option value="alphabetical" className="bg-zinc-900">🔤 Alphabetical (A-Z)</option>
              </select>
            </div>

            <div className="flex items-center p-1 bg-zinc-900/80 rounded-xl border border-white/[0.05]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500'}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};
