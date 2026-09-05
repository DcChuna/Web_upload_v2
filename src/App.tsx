import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Gamepad2,
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  FolderGit2, 
  Globe, 
  Code2, 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  Award, 
  Clock, 
  Terminal,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Post, SortOption, FilterType, ViewMode } from './types';
import { DataService } from './lib/dataService';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import { Header } from './components/Header';
import { PostCard } from './components/PostCard';
import { NewSubmissionModal } from './components/NewSubmissionModal';
import { AuthModal } from './components/AuthModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { ShareModal } from './components/ShareModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { DatabaseModal } from './components/DatabaseModal';
import { EditSubmissionModal } from './components/EditSubmissionModal';
import { CodeRunnerModal } from './components/CodeRunnerModal';

function MainApp() {
  const { user } = useAuth();

  // State
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSupabaseLive, setIsSupabaseLive] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Filtering & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<FilterType>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Modals
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  
  // Selected post modals
  const [analyticsPost, setAnalyticsPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Code Runner state
  const [isCodeRunnerOpen, setIsCodeRunnerOpen] = useState(false);
  const [codeRunnerPost, setCodeRunnerPost] = useState<Post | null>(null);

  // Load posts directly from database
  const loadPosts = useCallback(async (showRefreshingSpinner = false) => {
    if (showRefreshingSpinner) setIsRefreshing(true);
    try {
      const livePosts = await DataService.fetchPosts(user?.id || null);
      setPosts(livePosts);
      
      const health = await DataService.checkHealth();
      setIsSupabaseLive(health.healthy);
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  // Initial load & real-time subscription
  useEffect(() => {
    loadPosts();

    // Subscribe to realtime database updates
    const unsubscribe = DataService.subscribeToChanges(() => {
      loadPosts();
    });

    return () => {
      unsubscribe();
    };
  }, [loadPosts]);

  // Handle rating a post
  const handleRate = async (postId: string, ratingValue: number) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const res = await DataService.ratePost(postId, ratingValue, {
        id: user.id,
        email: user.email,
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                avg_rating: res.avg_rating,
                ratings_count: res.ratings_count,
                user_rating: ratingValue,
              }
            : p
        )
      );
    } catch (err) {
      console.error('Error submitting rating:', err);
    }
  };

  // Record a view and open link
  const handleOpenLink = async (post: Post) => {
    DataService.recordView(post.id).catch(() => {});
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, views_count: (p.views_count || 0) + 1 } : p))
    );
    window.open(post.url, '_blank', 'noopener,noreferrer');
  };

  // Open detail / code runner modal
  const handleOpenDetailModal = (post: Post) => {
    DataService.recordView(post.id).catch(() => {});
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, views_count: (p.views_count || 0) + 1 } : p))
    );

    if (post.type === 'code') {
      setCodeRunnerPost(post);
      setIsCodeRunnerOpen(true);
    } else {
      window.open(post.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Open Code Runner for a specific post
  const handleRunCode = (post: Post) => {
    DataService.recordView(post.id).catch(() => {});
    setCodeRunnerPost(post);
    setIsCodeRunnerOpen(true);
  };

  // Open general Code Runner
  const handleOpenGeneralCodeRunner = () => {
    setCodeRunnerPost(null);
    setIsCodeRunnerOpen(true);
  };

  // Toggle favorite
  const handleToggleFavorite = (postId: string) => {
    setFavorites((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  // Delete post
  const handleDeletePost = async (post: Post) => {
    try {
      await DataService.deletePost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  // Post creation callback
  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev.filter((p) => p.id !== newPost.id)]);
  };

  // Post update callback
  const handlePostUpdated = (updatedPost: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
  };

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => tagSet.add(t.trim()));
      }
    });
    return Array.from(tagSet).filter(Boolean);
  }, [posts]);

  // Filtered and sorted posts
  const filteredPosts = useMemo(() => {
    return posts
      .filter((post) => {
        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = post.title?.toLowerCase().includes(q);
          const matchDesc = post.description?.toLowerCase().includes(q);
          const matchAuthor = post.user_name?.toLowerCase().includes(q);
          const matchTags = post.tags?.some((t) => t.toLowerCase().includes(q));
          const matchCode = post.code_snippet?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchAuthor && !matchTags && !matchCode) {
            return false;
          }
        }

        // Category / Type filter
        if (selectedType !== 'all') {
          if (post.type !== selectedType) return false;
        }

        // Tag filter
        if (selectedTag !== 'all') {
          if (!post.tags?.includes(selectedTag)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'latest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'top_rated') {
          return (b.avg_rating || 0) - (a.avg_rating || 0);
        }
        if (sortBy === 'most_viewed') {
          return (b.views_count || 0) - (a.views_count || 0);
        }
        return 0;
      });
  }, [posts, searchQuery, selectedType, selectedTag, sortBy]);

  // Statistics
  const counts = useMemo(() => {
    return {
      all: posts.length,
      game: posts.filter((p) => p.type === 'game').length,
      project: posts.filter((p) => p.type === 'project').length,
      code: posts.filter((p) => p.type === 'code').length,
      link: posts.filter((p) => p.type === 'link').length,
    };
  }, [posts]);

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* App Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewPostModal={() => {
          if (!user) setIsAuthModalOpen(true);
          else setIsNewPostOpen(true);
        }}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenLeaderboardModal={() => setIsLeaderboardOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
        onOpenCodeRunner={handleOpenGeneralCodeRunner}
        isSupabaseLive={isSupabaseLive}
        totalPosts={posts.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Bar: Type Filters & View/Sort Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 border border-white/[0.08] rounded-xl overflow-x-auto">
            <button
              onClick={() => setSelectedType('all')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedType === 'all'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <span>All Types</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-zinc-400">
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setSelectedType('game')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedType === 'game'
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Games</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-zinc-400">
                {counts.game}
              </span>
            </button>

            <button
              onClick={() => setSelectedType('project')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedType === 'project'
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Projects</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-zinc-400">
                {counts.project}
              </span>
            </button>

            <button
              onClick={() => setSelectedType('code')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedType === 'code'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Code</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-zinc-400">
                {counts.code}
              </span>
            </button>

            <button
              onClick={() => setSelectedType('link')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedType === 'link'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Resources</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-zinc-400">
                {counts.link}
              </span>
            </button>
          </div>

          {/* Action Bar (Tags, Sort, Layout & Refresh) */}
          <div className="flex items-center gap-2.5 self-end md:self-auto">
            {/* Tag Filter Dropdown */}
            {allTags.length > 0 && (
              <div className="relative">
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="appearance-none bg-zinc-900 border border-white/[0.08] text-xs text-zinc-300 pl-2.5 pr-7 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                >
                  <option value="all">All Tags</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      #{tag}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Sort Options */}
            <div className="flex items-center bg-zinc-900 border border-white/[0.08] p-0.5 rounded-lg text-xs text-zinc-400">
              <button
                onClick={() => setSortBy('latest')}
                title="Sort by latest"
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  sortBy === 'latest' ? 'bg-zinc-800 text-white font-medium' : 'hover:text-zinc-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span className="hidden sm:inline">Latest</span>
              </button>

              <button
                onClick={() => setSortBy('top_rated')}
                title="Sort by highest rated"
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  sortBy === 'top_rated' ? 'bg-zinc-800 text-white font-medium' : 'hover:text-zinc-200'
                }`}
              >
                <Award className="w-3 h-3" />
                <span className="hidden sm:inline">Top Rated</span>
              </button>

              <button
                onClick={() => setSortBy('most_viewed')}
                title="Sort by most viewed"
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  sortBy === 'most_viewed' ? 'bg-zinc-800 text-white font-medium' : 'hover:text-zinc-200'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span className="hidden sm:inline">Popular</span>
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-900 border border-white/[0.08] p-0.5 rounded-lg text-zinc-400">
              <button
                onClick={() => setViewMode('grid')}
                title="Grid view"
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'hover:text-zinc-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                title="Compact view"
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'compact' ? 'bg-zinc-800 text-white' : 'hover:text-zinc-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Manual Refresh */}
            <button
              onClick={() => loadPosts(true)}
              disabled={isRefreshing}
              title="Refresh resources from Supabase"
              className="p-1.5 rounded-lg bg-zinc-900 border border-white/[0.08] text-zinc-400 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Post Grid / List */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mb-3" />
            <p className="text-sm font-mono text-zinc-400">Connecting to database...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-zinc-500" />
            </div>
            <h3 className="text-base font-bold text-zinc-200">No resources found</h3>
            <p className="text-xs text-zinc-500 mt-1 mb-4">
              {searchQuery
                ? `No submissions matched "${searchQuery}". Try different keywords or reset filters.`
                : 'No submissions yet in this category. Be the first to share something!'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                  setSelectedTag('all');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 bg-zinc-900 border border-white/[0.08] hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Clear all filters
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!user) setIsAuthModalOpen(true);
                  else setIsNewPostOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit first resource</span>
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                viewMode="grid"
                onOpenModal={handleOpenDetailModal}
                onOpenAnalytics={(p) => setAnalyticsPost(p)}
                onOpenLink={handleOpenLink}
                onRate={handleRate}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={favorites.includes(post.id)}
                onRequireAuth={() => setIsAuthModalOpen(true)}
                onDeletePost={handleDeletePost}
                onEditPost={(p) => setEditingPost(p)}
                onRunCode={handleRunCode}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                viewMode="compact"
                onOpenModal={handleOpenDetailModal}
                onOpenAnalytics={(p) => setAnalyticsPost(p)}
                onOpenLink={handleOpenLink}
                onRate={handleRate}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={favorites.includes(post.id)}
                onRequireAuth={() => setIsAuthModalOpen(true)}
                onDeletePost={handleDeletePost}
                onEditPost={(p) => setEditingPost(p)}
                onRunCode={handleRunCode}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.06] py-6 bg-[#08090d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-400">TeamHub</span>
            <span>—</span>
            <span>Developer Hub & Live Compiler</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseLive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {isSupabaseLive ? 'Supabase Synchronized' : 'Offline Cache Active'}
            </span>
            <button
              onClick={() => setIsDatabaseModalOpen(true)}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer underline"
            >
              Schema / SQL
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <NewSubmissionModal
        isOpen={isNewPostOpen}
        onClose={() => setIsNewPostOpen(false)}
        onPostCreated={handlePostCreated}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <AnalyticsModal
        post={analyticsPost}
        isOpen={Boolean(analyticsPost)}
        onClose={() => setAnalyticsPost(null)}
        onOpenLink={handleOpenLink}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        totalPosts={posts.length}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        posts={posts}
        onOpenLink={handleOpenLink}
        onOpenAnalytics={(p) => setAnalyticsPost(p)}
      />

      {editingPost && (
        <EditSubmissionModal
          isOpen={Boolean(editingPost)}
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onPostUpdated={handlePostUpdated}
        />
      )}

      <DatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        isLive={isSupabaseLive}
        onRefresh={loadPosts}
      />

      <CodeRunnerModal
        isOpen={isCodeRunnerOpen}
        onClose={() => {
          setIsCodeRunnerOpen(false);
          setCodeRunnerPost(null);
        }}
        initialPost={codeRunnerPost}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
