import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Gamepad2,
  Plus, 
  Search, 
  Filter, 
  FolderGit2, 
  Globe, 
  Code2, 
  LayoutGrid, 
  List, 
  Clock, 
  Award, 
  TrendingUp, 
  RefreshCw, 
  ChevronDown,
  Sparkles,
  ExternalLink,
  Star,
  Eye,
  Database,
  Terminal,
  Trophy,
  Share2,
  Zap,
  HelpCircle,
  FolderOpen
} from 'lucide-react';
import { Post, FilterType, SortOption, ViewMode, PostType } from './types';
import { DataService } from './lib/dataService';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import { Header } from './components/Header';
import { PostCard } from './components/PostCard';
import { NewSubmissionModal as NewPostModal } from './components/NewSubmissionModal';
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
  const [analyticsPost, setAnalyticsPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [detailPost, setDetailPost] = useState<Post | null>(null);

  // Interactive Code Runner Modal
  const [isCodeRunnerOpen, setIsCodeRunnerOpen] = useState(false);
  const [codeRunnerInitialPost, setCodeRunnerInitialPost] = useState<Post | null>(null);

  // Fetch posts from database
  const loadPosts = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const live = await DataService.checkSupabaseConnection();
      setIsSupabaseLive(live);

      const data = await DataService.getPosts(user?.id);
      setPosts(data);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setIsLoading(false);
      if (isManualRefresh) setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Load favorites from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('teamhub_favorites');
      if (stored) setFavorites(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const handleToggleFavorite = (postId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId];
      try {
        localStorage.setItem('teamhub_favorites', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Star Rating Handler
  const handleRate = async (postId: string, rating: number) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const currentTotal = p.ratings_count || 0;
        const currentAvg = p.avg_rating || 0;
        const hadRated = p.user_rating != null;

        let newCount = currentTotal;
        let newAvg = rating;

        if (hadRated && currentTotal > 0) {
          const sumWithoutOld = currentAvg * currentTotal - (p.user_rating || 0);
          newAvg = (sumWithoutOld + rating) / currentTotal;
        } else {
          newCount = currentTotal + 1;
          newAvg = (currentAvg * currentTotal + rating) / newCount;
        }

        return {
          ...p,
          ratings_count: newCount,
          avg_rating: Number(newAvg.toFixed(2)),
          user_rating: rating,
        };
      })
    );

    try {
      await DataService.ratePost(postId, user.id, rating);
    } catch (err) {
      console.error('Rating failed:', err);
      loadPosts();
    }
  };

  // Open resource URL & record view increment
  const handleOpenLink = async (post: Post) => {
    DataService.recordView(post.id, user?.id);

    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, views_count: (p.views_count || 0) + 1 } : p))
    );

    if (post.url) {
      window.open(post.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Run code online
  const handleRunCode = (post: Post) => {
    setCodeRunnerInitialPost(post);
    setIsCodeRunnerOpen(true);
  };

  // Delete post
  const handleDeletePost = async (post: Post) => {
    const success = await DataService.deletePost(post.id);
    if (success) {
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      if (detailPost?.id === post.id) setDetailPost(null);
      if (editingPost?.id === post.id) setEditingPost(null);
      if (analyticsPost?.id === post.id) setAnalyticsPost(null);
    }
  };

  // Detail Modal Trigger
  const handleOpenDetailModal = (post: Post) => {
    setDetailPost(post);
    DataService.recordView(post.id, user?.id);
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, views_count: (p.views_count || 0) + 1 } : p))
    );
  };

  // Compute all available tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((p) => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach((t) => tagSet.add(t));
      }
    });
    return Array.from(tagSet).sort();
  }, [posts]);

  // Counts per category
  const counts = useMemo(() => {
    return {
      all: posts.length,
      game: posts.filter((p) => p.type === 'game').length,
      project: posts.filter((p) => p.type === 'project').length,
      code: posts.filter((p) => p.type === 'code').length,
      link: posts.filter((p) => p.type === 'link').length,
    };
  }, [posts]);

  // Filtered & Sorted Posts
  const filteredPosts = useMemo(() => {
    let list = [...posts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => {
        return (
          p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.url?.toLowerCase().includes(q) ||
          p.user_name?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)) ||
          p.file_name?.toLowerCase().includes(q) ||
          p.code_language?.toLowerCase().includes(q)
        );
      });
    }

    if (selectedType !== 'all') {
      list = list.filter((p) => p.type === selectedType);
    }

    if (selectedTag !== 'all') {
      list = list.filter((p) => p.tags && p.tags.includes(selectedTag));
    }

    list.sort((a, b) => {
      if (sortBy === 'top_rated') {
        const ratingDiff = (b.avg_rating || 0) - (a.avg_rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (b.ratings_count || 0) - (a.ratings_count || 0);
      }
      if (sortBy === 'most_viewed') {
        return (b.views_count || 0) - (a.views_count || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return list;
  }, [posts, searchQuery, selectedType, selectedTag, sortBy]);

  return (
    <div className="min-h-screen bg-[#07080b] text-zinc-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
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
        onOpenCodeRunner={() => {
          setCodeRunnerInitialPost(null);
          setIsCodeRunnerOpen(true);
        }}
        isSupabaseLive={isSupabaseLive}
        totalPosts={posts.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        {/* Controls Bar: Type Filters, Tag Selectors, Sorting */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          {/* Left Type Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/90 border border-white/[0.08] overflow-x-auto">
            <button
              onClick={() => setSelectedType('all')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedType === 'all'
                  ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <span>All Types</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-zinc-400">
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setSelectedType('game')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedType === 'game'
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Games</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-zinc-400">
                {counts.game}
              </span>
            </button>

            <button
              onClick={() => setSelectedType('project')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedType === 'project'
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Projects</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-zinc-400">
                {counts.project}
              </span>
            </button>

            <button
              onClick={() => setSelectedType('code')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedType === 'code'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Code</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-zinc-400">
                {counts.code}
              </span>
            </button>

            <button
              onClick={() => setSelectedType('link')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedType === 'link'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Resources</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-zinc-400">
                {counts.link}
              </span>
            </button>
          </div>

          {/* Right Controls: Sort & Layout */}
          <div className="flex items-center gap-2.5 self-end md:self-auto">
            {allTags.length > 0 && (
              <div className="relative">
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="appearance-none bg-zinc-900 border border-white/[0.08] text-xs text-zinc-300 pl-2.5 pr-7 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500/50 cursor-pointer font-sans"
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

            <div className="flex items-center gap-1 bg-zinc-900 border border-white/[0.08] p-0.5 rounded-lg text-xs text-zinc-400">
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
                title="Compact list view"
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'compact' ? 'bg-zinc-800 text-white' : 'hover:text-zinc-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => loadPosts(true)}
              disabled={isRefreshing}
              title="Refresh resources"
              className="p-1.5 rounded-lg bg-zinc-900 border border-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Post Grid / List */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mb-3" />
            <p className="text-sm font-mono text-zinc-400">Syncing resources from database...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-zinc-500" />
            </div>
            <h3 className="text-base font-bold text-zinc-200">No resources found</h3>
            <p className="text-xs text-zinc-500 mt-1 mb-4">
              {searchQuery
                ? `No posts matched "${searchQuery}". Try different keywords or reset filters.`
                : 'No submissions yet in this category. Be the first to share something!'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                  setSelectedTag('all');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 bg-zinc-900 border border-white/[0.08] hover:bg-zinc-800 transition-all cursor-pointer"
              >
                Clear all filters
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!user) setIsAuthModalOpen(true);
                  else setIsNewPostOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer"
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
      <footer className="w-full border-t border-white/[0.06] py-6 mt-12 bg-[#08090d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-400">TeamHub</span>
            <span>—</span>
            <span>Developer Hub & Live Compiler</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isSupabaseLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-zinc-400 font-mono text-[11px]">
                {isSupabaseLive ? 'Supabase Synchronized' : 'Local Fallback'}
              </span>
            </span>
            <button
              onClick={() => setIsDatabaseModalOpen(true)}
              className="text-zinc-400 hover:text-indigo-400 underline decoration-white/10 underline-offset-4 cursor-pointer"
            >
              Schema / SQL
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <NewPostModal
        isOpen={isNewPostOpen}
        onClose={() => setIsNewPostOpen(false)}
        onPostCreated={(newPost) => {
          setPosts((prev) => [newPost, ...prev]);
        }}
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
          onPostUpdated={(updated) => {
            setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setEditingPost(null);
          }}
        />
      )}

      {/* Interactive Code Runner Modal */}
      <CodeRunnerModal
        isOpen={isCodeRunnerOpen}
        onClose={() => {
          setIsCodeRunnerOpen(false);
          setCodeRunnerInitialPost(null);
        }}
        initialPost={codeRunnerInitialPost}
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
