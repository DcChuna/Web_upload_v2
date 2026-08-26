import React from 'react';
import { FilterType, SortOption, ViewMode } from '../types';
import { Layers, Zap, Link as LinkIcon, Flame, Clock, Star, Tag, X, LayoutGrid, List } from 'lucide-react';

interface FeedControlsProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  availableTags: string[];
  counts: {
    all: number;
    project: number;
    link: number;
  };
}

export const FeedControls: React.FC<FeedControlsProps> = ({
  currentFilter,
  onFilterChange,
  currentSort,
  onSortChange,
  viewMode,
  onViewModeChange,
  selectedTag,
  onSelectTag,
  availableTags,
  counts,
}) => {
  return (
    <div id="feed-controls-section" className="space-y-3 mb-6">
      {/* Top row: Filter tabs, Sort select & View switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="inline-flex p-0.5 bg-zinc-900/90 border border-white/[0.08] rounded-xl self-start sm:self-auto">
          <button
            id="tab-filter-all"
            onClick={() => onFilterChange('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              currentFilter === 'all'
                ? 'bg-zinc-800 text-white shadow-sm border border-white/[0.1]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All</span>
            <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.08]">
              {counts.all}
            </span>
          </button>

          <button
            id="tab-filter-projects"
            onClick={() => onFilterChange('project')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              currentFilter === 'project'
                ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Projects</span>
            <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-300">
              {counts.project}
            </span>
          </button>

          <button
            id="tab-filter-links"
            onClick={() => onFilterChange('link')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              currentFilter === 'link'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Links</span>
            <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-300">
              {counts.link}
            </span>
          </button>
        </div>

        {/* Right side: Sort Selector & Grid/List view toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Sort Select */}
          <div className="inline-flex p-0.5 bg-zinc-900 border border-white/[0.08] rounded-lg">
            <button
              id="sort-latest"
              onClick={() => onSortChange('latest')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                currentSort === 'latest'
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
              title="Sort by latest created"
            >
              <Clock className="w-3 h-3" />
              <span>Latest</span>
            </button>
            <button
              id="sort-top-rated"
              onClick={() => onSortChange('top_rated')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                currentSort === 'top_rated'
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
              title="Sort by star rating"
            >
              <Star className="w-3 h-3 text-amber-400" />
              <span>Top Rated</span>
            </button>
            <button
              id="sort-most-viewed"
              onClick={() => onSortChange('most_viewed')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                currentSort === 'most_viewed'
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
              title="Sort by views count"
            >
              <Flame className="w-3 h-3 text-rose-400" />
              <span>Views</span>
            </button>
          </div>

          {/* View Mode Toggle: Grid vs Compact List */}
          <div className="inline-flex p-0.5 bg-zinc-900 border border-white/[0.08] rounded-lg">
            <button
              id="view-grid-btn"
              onClick={() => onViewModeChange('grid')}
              title="Grid View (Visual Cards)"
              className={`p-1 rounded transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              id="view-compact-btn"
              onClick={() => onViewModeChange('compact')}
              title="Compact List View"
              className={`p-1 rounded transition-all cursor-pointer ${
                viewMode === 'compact'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row: Dynamic Tag filter chips */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none no-scrollbar">
          <div className="flex items-center gap-1 text-[11px] text-zinc-400 shrink-0 mr-1">
            <Tag className="w-3 h-3 text-zinc-400" />
            <span>Tags:</span>
          </div>

          {selectedTag && (
            <button
              onClick={() => onSelectTag(null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-all shrink-0 cursor-pointer"
            >
              <span>#{selectedTag}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {availableTags.slice(0, 14).map((tag) => {
            const isSelected = selectedTag === tag;
            if (isSelected) return null;
            return (
              <button
                key={tag}
                onClick={() => onSelectTag(tag)}
                className="px-2 py-0.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800 border border-white/[0.05] hover:border-white/[0.12] transition-all shrink-0 cursor-pointer"
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
