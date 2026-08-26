import React, { useState, useEffect, useMemo } from 'react';
import { Post, PostType, ViewMode, FilterType, SortOption } from './types';
import { DataService } from './lib/dataService';
import { Header } from './components/Header';
import { PostCard } from './components/PostCard';
import { DetailModal } from './components/DetailModal';
import { NewSubmissionModal } from './components/NewSubmissionModal';
import { EditSubmissionModal } from './components/EditSubmissionModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { AuthModal } from './components/AuthModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { EmptyState } from './components/EmptyState';
import { Toast } from './components/Toast';
import { useAuth } from './context/AuthContext';
import { RefreshCw, Sparkles, FolderGit2, Globe, Gamepad2, Heart, Award } from 'lucide-react';

export function App() {
  const { user, isAdmin } = useAuth();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [analyticsPost, setAnalyticsPost] = useState<Post | null>(null);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isNewSubmissionOpen, setIsNewSubmissionOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const result = await DataService.getPosts();
      setPosts(result.posts);
    } catch (e) {
      console.error('Failed to load posts:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    const favs = DataService.getFavorites(user?.email);
    setFavorites(favs);
  }, [user]);

  const handleToggleFavorite = (post: Post) => {
    const { isFavorite, favorites: updatedFavs } = DataService.toggleFavorite(post.id, user?.email);
    setFavorites(updatedFavs);
    if (isFavorite) {
      showToast(`❤️ Added "${post.title.slice(0, 20)}" to favorites!`);
    } else {
      showToast(`🤍 Removed "${post.title.slice(0, 20)}" from favorites`);
    }
  };

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => tagSet.add(t));
      }
    });
    return Array.from(tagSet).sort();
  }, [posts]);

  const counts = useMemo(() => {
    return {
      all: posts.length,
      project: posts.filter((p) => p.type === 'project').length,
      game: posts.filter((p) => p.type === 'game').length,
      link: posts.filter((p) => p.type === 'link').length,
      favorites: posts.filter((p) => favorites.includes(p.id)).length,
    };
  }, [posts, favorites]);

  const filteredPosts = useMemo(() => {
    return posts
      .filter((post) => {
        if (filterType === 'favorites') {
          if (!favorites.includes(post.id)) return false;
        } else if (filterType !== 'all' && post.type !== filterType) {
          return false;
        }

        if (selectedTag && (!post.tags || !post.tags.includes(selectedTag))) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = post.title.toLowerCase().includes(q);
          const matchesDesc = post.description?.toLowerCase().includes(q);
          const matchesUrl = post.url.toLowerCase().includes(q);
          const matchesUser = post.user_name?.toLowerCase().includes(q);
          const matchesTags = post.tags?.some((t) => t.toLowerCase().includes(q));
          return matchesTitle || matchesDesc || matchesUrl || matchesUser || matchesTags;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortOption === 'rating') {
          if (b.avg_rating === a.avg_rating) {
            return b.ratings_count - a.ratings_count;
          }
          return b.avg_rating - a.avg_rating;
        }
        if (sortOption === 'views') {
          return b.views_count - a.views_count;
        }
        if (sortOption === 'alphabetical') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [posts, filterType, favorites, selectedTag, searchQuery, sortOption]);

  const handleOpenLink = async (post: Post) => {
    try {
      const newViews = await DataService.recordView(post.id);
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, views_count: newViews } : p))
      );
    } catch (e) {
      console.error('Error logging view:', e);
    }
    window.open(post.url, '_blank', 'noopener,noreferrer');
  };

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
    showToast(`🎉 "${newPost.title.slice(0, 24)}" published successfully!`);
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
    showToast(`✨ Saved changes for "${updatedPost.title.slice(0, 24)}"`);
  };

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;
    const targetTitle = postToDelete.title;
    try {
      await DataService.deletePost(postToDelete.id);
      setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
      showToast(`🗑️ Deleted "${targetTitle.slice(0, 24)}"`);
    } catch (e) {
      showToast('❌ Failed to delete post');
    } finally {
      setPostToDelete(null);
    }
  };

  const featuredPost = useMemo(() => {
    if (posts.length === 0) return null;
    return [...posts].sort((a, b) => (b.avg_rating * b.ratings_count) - (a.avg_rating * a.ratings_count))[0];
  }, [posts]);

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterType={filterType}
        setFilterType={setFilterType}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        allTags={allTags}
        sortOption={sortOption}
        setSortOption={setSortOption}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenNewSubmission={() => {
          if (!user) {
            setIsAuthOpen(true);
          } else {
            setIsNewSubmissionOpen(true);
          }
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        counts={counts}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {!searchQuery && !selectedTag && filterType === 'all' && featuredPost && (
          <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-indigo-950/60 via-[#11131f] to-purple-950/40 border border-indigo-500/20 shadow-xl overflow-hidden backdrop-blur-sm">
            <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Featured Community Spotlight</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {featuredPost.title}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 leading-relaxed">
                  {featuredPost.description}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {featuredPost.tags?.slice(0, 3).map((t) => (
                    <span key={t} className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-zinc-300">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedPost(featuredPost)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-white/[0.1] transition-all cursor-pointer text-center"
                >
                  Explore Details
                </button>
                <button
                  onClick={() => handleOpenLink(featuredPost)}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{featuredPost.type === 'game' ? 'Play Game' : 'Launch Project'}</span>
                  {featuredPost.type === 'game' ? <Gamepad2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {(searchQuery || selectedTag || filterType !== 'all') && (
          <div className="flex items-center justify-between p-3 bg-zinc-900/60 border border-white/[0.06] rounded-xl text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-zinc-400">Showing filtered results:</span>
              {filterType !== 'all' && (
                <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] capitalize">
                  Filter: {filterType}
                </span>
              )}
              {selectedTag && (
                <span className="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-[11px]">
                  Tag: #{selectedTag}
                </span>
              )}
              {searchQuery && (
                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px]">
                  Query: "{searchQuery}"
                </span>
              )}
              <span className="text-zinc-400 font-mono">({filteredPosts.length} items)</span>
            </div>

            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTag(null);
                setFilterType('all');
              }}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs underline"
            >
              Reset all filters
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-xs font-mono">Loading hub database...</p>
          </div>
        ) : filteredPosts.length > 0 ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
                : 'space-y-3'
            }
          >
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                viewMode={viewMode}
                isFavorite={favorites.includes(post.id)}
                onOpenModal={(p) => setSelectedPost(p)}
                onOpenAnalytics={(p) => setAnalyticsPost(p)}
                onOpenLink={handleOpenLink}
                onToggleFavorite={handleToggleFavorite}
                onRequireAuth={() => setIsAuthOpen(true)}
                onShowToast={showToast}
                onDeletePost={(p) => setPostToDelete(p)}
                onEditPost={(p) => setEditingPost(p)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            filterType={filterType}
            searchQuery={searchQuery}
            selectedTag={selectedTag}
            onResetFilters={() => {
              setFilterType('all');
              setSearchQuery('');
              setSelectedTag(null);
            }}
            onOpenNewSubmission={() => {
              if (!user) {
                setIsAuthOpen(true);
              } else {
                setIsNewSubmissionOpen(true);
              }
            }}
          />
        )}
      </main>

      <DetailModal
        post={selectedPost}
        isOpen={!!selectedPost}
        isFavorite={selectedPost ? favorites.includes(selectedPost.id) : false}
        onClose={() => setSelectedPost(null)}
        onOpenAnalytics={(p) => setAnalyticsPost(p)}
        onOpenLink={handleOpenLink}
        onToggleFavorite={handleToggleFavorite}
        onRequireAuth={() => setIsAuthOpen(true)}
        onShowToast={showToast}
      />

      <NewSubmissionModal
        isOpen={isNewSubmissionOpen}
        onClose={() => setIsNewSubmissionOpen(false)}
        onPostCreated={handlePostCreated}
      />

      <EditSubmissionModal
        post={editingPost}
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        onPostUpdated={handlePostUpdated}
      />

      <AnalyticsModal
        post={analyticsPost}
        isOpen={!!analyticsPost}
        onClose={() => setAnalyticsPost(null)}
      />

      <DeleteConfirmModal
        post={postToDelete}
        isOpen={!!postToDelete}
        onClose={() => setPostToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(loggedUser) => {
          showToast(`✨ Welcome ${loggedUser.name}!`);
        }}
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
