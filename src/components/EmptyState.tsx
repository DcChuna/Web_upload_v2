import React from 'react';
import { Layers, Heart, Search, Plus } from 'lucide-react';

interface EmptyStateProps {
  activeTab: string;
  searchQuery: string;
  hasFilters: boolean;
  onClearFilters?: () => void;
  onNewSubmission?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  activeTab,
  searchQuery,
  hasFilters,
  onClearFilters,
  onNewSubmission,
}) => {
  const isFavorites = activeTab === 'favorites';

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mb-4 text-zinc-400">
        {isFavorites ? (
          <Heart className="w-8 h-8 text-rose-500/80" />
        ) : searchQuery ? (
          <Search className="w-8 h-8 text-indigo-400" />
        ) : (
          <Layers className="w-8 h-8 text-zinc-400" />
        )}
      </div>

      <h3 className="text-lg font-bold text-white mb-2">
        {isFavorites
          ? 'No favorites yet'
          : searchQuery
          ? 'No matching results'
          : 'No posts found'}
      </h3>

      <p className="text-sm text-zinc-400 max-w-md mb-6">
        {isFavorites
          ? 'Click the heart icon on any resource or project to save it here for quick access.'
          : searchQuery
          ? `No entries match "${searchQuery}". Try searching with different keywords.`
          : 'Be the first to share a link, project, or game with the team!'}
      </p>

      <div className="flex items-center gap-3">
        {hasFilters && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        )}
        {onNewSubmission && (
          <button
            onClick={onNewSubmission}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Submission</span>
          </button>
        )}
      </div>
    </div>
  );
};
