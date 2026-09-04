import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Layers, 
  Zap, 
  Link as LinkIcon, 
  Search, 
  Trophy, 
  Database, 
  Sparkles, 
  ArrowUpRight, 
  Filter,
  Check,
  AlertCircle,
  Loader2,
  Bookmark,
  Share2,
  LayoutGrid,
  List,
  Trash2,
  Terminal
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Post, FilterType, SortOption, ViewMode } from './types';
import { DataService, getLocalPosts } from './lib/dataService';
import { Header } from './components/Header';
import { FeedControls } from './components/FeedControls';
import { PostCard } from './components/PostCard';
import { NewSubmissionModal } from './components/NewSubmissionModal';
import { AuthModal } from './components/AuthModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ShareModal } from './components/ShareModal';
import { DatabaseModal } from './components/DatabaseModal';
import { EditSubmissionModal } from './components/EditSubmissionModal';
import { CodeRunnerModal } from './components/CodeRunnerModal';

function MainApp() {
  const { user } = useAuth();

  // Feed State
  const [posts, setPosts] = useState<Post[]>(() => getLocalPosts());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('latest');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('th_view_mode');
      return (saved === 'compact' || saved === 'grid') ? saved : 'grid';
    } catch {
      return 'grid';
    }
  });

  // Deep-link highlighted post ID
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);

  // Modals
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [selectedAnalyticsPost, setSelectedAnalyticsPost] = useState<Post | null>(null);
  const [isCodeRunnerOpen, setIsCodeRunnerOpen] = useState(false);
  const [codeRunnerPost, setCodeRunnerPost] = useState<Post | null>(null);

  // System & Connection State
  const [isSupabaseLive, setIsSupabaseLive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Save viewMode preference
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('th_view_mode', mode);
    } catch {
      // ignore
    }
  };

  // Load posts
  const loadPosts = async () => {
    try {
      const fetched = await DataService.fetchPosts(user?.id);
      if (Array.isArray(fetched)) {
        setPosts(fetched);
      }
      const health = await DataService.checkHealth();
      setIsSupabaseLive(health.healthy);
    } catch (err) {
      console.warn('Failed to refresh posts:', err);
    }
  };

  useEffect(() => {
    loadPosts();

    // 1. Subscribe to live Supabase Postgres Realtime changes
    const unsubscribe = DataService.subscribeToChanges(() => {
      loadPosts();
    });

    // 2. Auto-refresh on window focus & every 4 seconds for instant cross-device sync
    const onFocus = () => loadPosts();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(loadPosts, 4000);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [user]);

  // Deep linking check on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const targetPostId = params.get('post') || window.location.hash.replace('#post-', '');
      if (targetPostId) {
        setHighlightedPostId(targetPostId);
        setTimeout(() => {
          const el = document.getElementById(`post-card-${targetPostId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 600);
      }
    }
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape') {
        setIsNewPostOpen(false);
        setIsAuthOpen(false);
        setIsLeaderboardOpen(false);
        setIsShareModalOpen(false);
        setSelectedAnalyticsPost(null);
        return;
      }

      if (!isInput) {
        if (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
          e.preventDefault();
          const searchEl = document.getElementById('global-search-input');
          searchEl?.focus();
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          setIsNewPostOpen(true);
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          setIsShareModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Post created callback: instant UI reflection
  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev.filter((p) => p.id !== newPost.id)]);

    if (filterType !== 'all' && filterType !== newPost.type) {
      setFilterType('all');
    }

    if (searchQuery.trim()) {
      setSearchQuery('');
    }
    if (selectedTag && (!newPost.tags || !newPost.tags.includes(selectedTag))) {
      setSelectedTag(null);
    }

    setHighlightedPostId(newPost.id);
    showToast(`🚀 Published "${newPost.title.slice(0, 24)}..." successfully!`);

    setTimeout(() => {
      const el = document.getElementById(`post-card-${newPost.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    loadPosts();
  };

  // Delete post handler
  const handleDeletePost = async (postToDelete: Post) => {
    setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
    await DataService.deletePost(postToDelete.id);
    showToast(`🗑️ Deleted "${postToDelete.title.slice(0, 20)}..."`);
  };

  // Update post handler
  const handlePostUpdated = (updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
    showToast(`✨ Saved changes for "${updatedPost.title.slice(0, 24)}"`);
  };

  // Extract all unique tags
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => tagSet.add(t));
      }
    });
    return Array.from(tagSet);
  }, [posts]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: posts.length,
      project: posts.filter((p) => p.type === 'project').length,
      link: posts.filter((p) => p.type === 'link').length,
      code: posts.filter((p) => p.type === 'code' || !!p.code_snippet).length,
    };
  }, [posts]);

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    return posts
      .filter((p) => {
        if (filterType !== 'all') {
          if (filterType === 'code') {
            if (p.type !== 'code' && !p.code_snippet) return false;
          } else if (p.type !== filterType) {
            return false;
          }
        }

        if (selectedTag && (!p.tags || !p.tags.includes(selectedTag))) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchDesc = (p.description || '').toLowerCase().includes(q);
          const matchAuthor = p.user_name.toLowerCase().includes(q);
          const matchUrl = p.url.toLowerCase().includes(q);
          const matchTags = (p.tags || []).some((t) => t.toLowerCase().includes(q));
          const matchCode = (p.code_snippet || '').toLowerCase().includes(q) || (p.file_name || '').toLowerCase().includes(q);

          if (!matchTitle && !matchDesc && !matchAuthor && !matchUrl && !matchTags && !matchCode) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'top_rated') {
          if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
          return b.ratings_count - a.ratings_count;
        }
        if (sortOption === 'most_viewed') {
          return b.views_count - a.views_count;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [posts, filterType, selectedTag, searchQuery, sortOption]);

  // Rate handler
  const handleRate = async (postId: string, rating: number) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    try {
      const result = await DataService.ratePost(postId, rating, {
        id: user.id,
        email: user.email || 'user@team.internal',
      });

      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              avg_rating: result.avg_rating,
              ratings_count: result.ratings_count,
              user_rating: rating,
            };
          }
          return p;
        })
      );

      showToast(`Rated ${rating} star${rating > 1 ? 's' : ''}!`);
    } catch (err) {
      console.error('Rating failed:', err);
    }
  };

  // Open link handler (increments view count and opens URL)
  const handleOpenLink = async (post: Post) => {
    DataService.recordView(post.id).then((newCount) => {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, views_count: newCount } : p))
      );
    });

    window.open(post.url, '_blank', 'noopener,noreferrer');
  };

  // Action to trigger new post
  const handleTriggerNewPost = () => {
    setIsNewPostOpen(true);
  };

  // Action to trigger analytics
  const handleOpenAnalytics = (post: Post) => {
    if (!user) {
      setIsAuthOpen(true);
      showToast('Sign in to view granular metrics');
    } else {
      setSelectedAnalyticsPost(post);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090c] text-zinc-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900/95 border border-indigo-500/40 text-xs font-medium text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Minimalist Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewPostModal={handleTriggerNewPost}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onOpenLeaderboardModal={() => setIsLeaderboardOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
        onOpenCodeRunner={() => {
          setCodeRunnerPost(null);
          setIsCodeRunnerOpen(true);
        }}
        isSupabaseLive={isSupabaseLive}
        totalPosts={posts.length}
      />

      {/* Minimalist Sub-Header Context Bar */}
      <div className="border-b border-white/[0.04] bg-[#090a0e]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Shared Knowledge &amp; Projects</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">
              Curated repository of team builds, blueprints, and developer resources.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Quick Online Code Compiler / Runner */}
            <button
              onClick={() => {
                setCodeRunnerPost(null);
                setIsCodeRunnerOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 hover:border-emerald-400/60 shadow-sm transition-all cursor-pointer"
              title="Open online code compiler and runner (Python, JavaScript, etc.)"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Compile &amp; Run</span>
            </button>

            {/* Quick Share with Friends Trigger */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.08] hover:border-white/[0.15] transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Share Hub</span>
            </button>

            {/* Quick New Submission */}
            <button
              onClick={handleTriggerNewPost}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] border border-indigo-400/30 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Share Resource</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Controls: Filter Pills, Sorts, View Mode, Dynamic Tag Badges */}
        <FeedControls
          currentFilter={filterType}
          onFilterChange={setFilterType}
          currentSort={sortOption}
          onSortChange={setSortOption}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          availableTags={availableTags}
          counts={counts}
        />

        {/* Feed Posts */}
        {filteredPosts.length === 0 ? (
          /* Empty Search or Filter State */
          <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-2xl bg-zinc-950/40 border border-white/[0.05]">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500 mb-2.5 border border-white/[0.08]">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">No resources found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mt-0.5 mb-4">
              {searchQuery || selectedTag
                ? 'Try adjusting your search terms or clearing active filters.'
                : 'No submissions posted yet. Be the first to share your project or favorite link!'}
            </p>
            <div className="flex items-center gap-2">
              {(searchQuery || selectedTag || filterType !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTag(null);
                    setFilterType('all');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={handleTriggerNewPost}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer"
              >
                + Create First Submission
              </button>
            </div>
          </div>
        ) : viewMode === 'compact' ? (
          /* Compact List View */
          <div className="space-y-2">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                viewMode="compact"
                isHighlighted={highlightedPostId === post.id}
                onRate={handleRate}
                onOpenLink={handleOpenLink}
                onOpenAnalytics={handleOpenAnalytics}
                onRequireAuth={() => setIsAuthOpen(true)}
                onShowToast={showToast}
                onDeletePost={handleDeletePost}
                onEditPost={(p) => setEditingPost(p)}
                onRunCode={(p) => {
                  setCodeRunnerPost(p);
                  setIsCodeRunnerOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          /* Grid Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                viewMode="grid"
                isHighlighted={highlightedPostId === post.id}
                onRate={handleRate}
                onOpenLink={handleOpenLink}
                onOpenAnalytics={handleOpenAnalytics}
                onRequireAuth={() => setIsAuthOpen(true)}
                onShowToast={showToast}
                onDeletePost={handleDeletePost}
                onEditPost={(p) => setEditingPost(p)}
                onRunCode={(p) => {
                  setCodeRunnerPost(p);
                  setIsCodeRunnerOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-white/[0.04] py-5 bg-[#06070a] mt-auto text-zinc-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="font-semibold text-zinc-300">TeamHub</span>
            <span>—</span>
            <span>Minimalist project sharing &amp; knowledge feed</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="hover:text-sky-400 transition-colors cursor-pointer"
            >
              Share with Friends
            </button>
            <span>•</span>
            <button
              onClick={() => setIsLeaderboardOpen(true)}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Leaderboard
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        totalPosts={posts.length}
      />

      <NewSubmissionModal
        isOpen={isNewPostOpen}
        onClose={() => setIsNewPostOpen(false)}
        onPostCreated={handlePostCreated}
      />

      <EditSubmissionModal
        post={editingPost}
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        onPostUpdated={handlePostUpdated}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <AnalyticsModal
        post={selectedAnalyticsPost}
        isOpen={!!selectedAnalyticsPost}
        onClose={() => setSelectedAnalyticsPost(null)}
        onOpenLink={handleOpenLink}
      />

      <LeaderboardModal
        posts={posts}
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        onOpenLink={handleOpenLink}
        onOpenAnalytics={handleOpenAnalytics}
      />

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

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
