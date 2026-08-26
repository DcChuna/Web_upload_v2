import { supabase } from './supabase';
import { Post, PostRating, PostViewLog, PostAnalytics, PostType } from '../types';
import { INITIAL_POSTS } from '../data';
import { UserProfile } from '../context/AuthContext';

const STORAGE_KEY_POSTS = 'teamhub_posts';
const STORAGE_KEY_RATINGS = 'teamhub_ratings';
const STORAGE_KEY_VIEWS = 'teamhub_views';
const STORAGE_KEY_FAVORITES_PREFIX = 'teamhub_favorites_';

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function getLocalPosts(): Post[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_POSTS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse local posts:', e);
  }
  localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(INITIAL_POSTS));
  return INITIAL_POSTS;
}

function saveLocalPosts(posts: Post[]) {
  try {
    localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(posts));
  } catch (e) {
    console.warn('Failed to save local posts:', e);
  }
}

function getLocalRatings(): PostRating[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_RATINGS);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return [];
}

function saveLocalRatings(ratings: PostRating[]) {
  try {
    localStorage.setItem(STORAGE_KEY_RATINGS, JSON.stringify(ratings));
  } catch (e) {}
}

function getLocalViews(): PostViewLog[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VIEWS);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return [];
}

function saveLocalViews(views: PostViewLog[]) {
  try {
    localStorage.setItem(STORAGE_KEY_VIEWS, JSON.stringify(views));
  } catch (e) {}
}

function getFavoritesKey(userEmail?: string | null): string {
  const clean = userEmail ? userEmail.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') : 'guest';
  return `${STORAGE_KEY_FAVORITES_PREFIX}${clean}`;
}

export const DataService = {
  getFavorites(userEmail?: string | null): string[] {
    try {
      const key = getFavoritesKey(userEmail);
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading favorites:', e);
    }
    return [];
  },

  toggleFavorite(postId: string, userEmail?: string | null): { isFavorite: boolean; favorites: string[] } {
    const key = getFavoritesKey(userEmail);
    const favorites = this.getFavorites(userEmail);
    const exists = favorites.includes(postId);
    let updated: string[];

    if (exists) {
      updated = favorites.filter((id) => id !== postId);
    } else {
      updated = [...favorites, postId];
    }

    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving favorites:', e);
    }

    return { isFavorite: !exists, favorites: updated };
  },

  async getPosts(): Promise<{ posts: Post[]; source: 'supabase' | 'local' }> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const formatted: Post[] = data.map((item: any) => ({
          id: item.id,
          title: item.title || 'Untitled',
          url: item.url || '#',
          type: (['project', 'link', 'game'].includes(item.type) ? item.type : 'project') as PostType,
          description: item.description || '',
          image_url: item.image_url || null,
          tags: Array.isArray(item.tags) ? item.tags : (typeof item.tags === 'string' ? item.tags.split(',') : []),
          views_count: Number(item.views_count) || 0,
          avg_rating: Number(item.avg_rating) || 0,
          ratings_count: Number(item.ratings_count) || 0,
          created_at: item.created_at || new Date().toISOString(),
          user_id: item.user_id,
          user_name: item.user_name || 'Team Member',
          user_email: item.user_email,
        }));

        saveLocalPosts(formatted);
        return { posts: formatted, source: 'supabase' };
      }
    } catch (err) {
      console.warn('Supabase fetch error, fallback to local storage:', err);
    }

    const localPosts = getLocalPosts();
    return { posts: localPosts, source: 'local' };
  },

  async createPost(
    newPost: Omit<Post, 'id' | 'views_count' | 'avg_rating' | 'ratings_count' | 'created_at'>,
    user?: UserProfile | null
  ): Promise<{ post: Post; savedToSupabase: boolean; error?: string }> {
    const id = crypto.randomUUID ? crypto.randomUUID() : `post-${Date.now()}`;
    const now = new Date().toISOString();
    
    const postItem: Post = {
      ...newPost,
      id,
      type: newPost.type || 'project',
      views_count: 0,
      avg_rating: 0,
      ratings_count: 0,
      created_at: now,
      user_id: user?.id || newPost.user_id,
      user_name: user?.name || newPost.user_name || 'Team Member',
      user_email: user?.email || newPost.user_email,
      tags: newPost.tags && newPost.tags.length > 0 ? newPost.tags : ['General'],
    };

    const localPosts = getLocalPosts();
    const updated = [postItem, ...localPosts];
    saveLocalPosts(updated);

    let savedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const payload = {
        title: postItem.title,
        url: postItem.url,
        type: postItem.type,
        description: postItem.description,
        image_url: postItem.image_url,
        tags: postItem.tags,
        views_count: 0,
        avg_rating: 0,
        ratings_count: 0,
        user_id: user?.id || null,
        user_name: user?.name || 'Team Member',
        user_email: user?.email || null,
      };

      const { data, error } = await supabase.from('posts').insert([payload]).select().single();
      if (!error && data) {
        savedToSupabase = true;
        postItem.id = data.id;
        const refreshed = getLocalPosts().map((p) => (p.id === id ? { ...p, id: data.id } : p));
        saveLocalPosts(refreshed);
      } else if (error) {
        supabaseError = error.message;
      }
    } catch (err: any) {
      supabaseError = err?.message;
      console.warn('Supabase post insert failed, using local only:', err);
    }

    return { post: postItem, savedToSupabase, error: supabaseError };
  },

  async updatePost(
    postId: string,
    updatedFields: {
      title?: string;
      url?: string;
      type?: PostType;
      description?: string;
      image_url?: string | null;
      tags?: string[];
    }
  ): Promise<{ post: Post; savedToSupabase: boolean; error?: string }> {
    const posts = getLocalPosts();
    const index = posts.findIndex((p) => p.id === postId);
    
    let updatedPost: Post = {
      ...(index !== -1 ? posts[index] : ({} as Post)),
      ...updatedFields,
      id: postId,
      tags: updatedFields.tags && updatedFields.tags.length > 0 ? updatedFields.tags : (index !== -1 ? posts[index].tags : ['General']),
    };

    if (index !== -1) {
      posts[index] = updatedPost;
      saveLocalPosts(posts);
    }

    let savedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      if (isValidUUID(postId)) {
        const payload: any = {};
        if (updatedFields.title !== undefined) payload.title = updatedFields.title.trim();
        if (updatedFields.url !== undefined) payload.url = updatedFields.url.trim();
        if (updatedFields.type !== undefined) payload.type = updatedFields.type;
        if (updatedFields.description !== undefined) payload.description = updatedFields.description.trim();
        if (updatedFields.image_url !== undefined) payload.image_url = updatedFields.image_url;
        if (updatedFields.tags !== undefined) payload.tags = updatedFields.tags;

        const { data, error } = await supabase
          .from('posts')
          .update(payload)
          .eq('id', postId)
          .select()
          .single();

        if (!error && data) {
          updatedPost = { ...updatedPost, ...data };
          savedToSupabase = true;
          if (index !== -1) {
            posts[index] = updatedPost;
            saveLocalPosts(posts);
          }
        } else if (error) {
          supabaseError = error.message;
        }
      }
    } catch (err: any) {
      supabaseError = err?.message;
      console.warn('Supabase update post error:', err);
    }

    return { post: updatedPost, savedToSupabase, error: supabaseError };
  },

  async recordView(postId: string): Promise<number> {
    const posts = getLocalPosts();
    const index = posts.findIndex((p) => p.id === postId);
    let newViews = 1;
    if (index !== -1) {
      posts[index].views_count = (posts[index].views_count || 0) + 1;
      newViews = posts[index].views_count;
      saveLocalPosts(posts);
    }

    const views = getLocalViews();
    views.push({
      id: `view-${Date.now()}-${Math.random()}`,
      post_id: postId,
      viewed_at: new Date().toISOString(),
    });
    saveLocalViews(views);

    try {
      if (isValidUUID(postId)) {
        await supabase.rpc('increment_post_views', { target_post_id: postId });
      }
    } catch (e) {}

    return newViews;
  },

  async ratePost(
    postId: string,
    rating: number,
    user: UserProfile
  ): Promise<{ avg_rating: number; ratings_count: number }> {
    const ratings = getLocalRatings();
    const existingIdx = ratings.findIndex((r) => r.post_id === postId && (r.user_id === user.id || r.user_email === user.email));
    
    if (existingIdx !== -1) {
      ratings[existingIdx].rating = rating;
      ratings[existingIdx].created_at = new Date().toISOString();
    } else {
      ratings.push({
        id: `rating-${Date.now()}`,
        post_id: postId,
        user_id: user.id,
        user_email: user.email,
        rating,
        created_at: new Date().toISOString(),
      });
    }
    saveLocalRatings(ratings);

    const postRatings = ratings.filter((r) => r.post_id === postId);
    const sum = postRatings.reduce((acc, curr) => acc + curr.rating, 0);
    const count = postRatings.length;
    const avg = count > 0 ? Number((sum / count).toFixed(1)) : rating;

    const posts = getLocalPosts();
    const pIndex = posts.findIndex((p) => p.id === postId);
    if (pIndex !== -1) {
      posts[pIndex].avg_rating = avg;
      posts[pIndex].ratings_count = count;
      posts[pIndex].user_rating = rating;
      saveLocalPosts(posts);
    }

    return { avg_rating: avg, ratings_count: count };
  },

  async deletePost(postId: string): Promise<boolean> {
    const posts = getLocalPosts();
    const filtered = posts.filter((p) => p.id !== postId);
    saveLocalPosts(filtered);

    try {
      if (isValidUUID(postId)) {
        await supabase.from('posts').delete().eq('id', postId);
      }
    } catch (e) {
      console.warn('Supabase delete error:', e);
    }

    return true;
  },

  async uploadImage(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  },

  async getAnalytics(postId: string): Promise<PostAnalytics> {
    const posts = getLocalPosts();
    const post = posts.find((p) => p.id === postId);
    const ratings = getLocalRatings().filter((r) => r.post_id === postId);
    const views = getLocalViews().filter((v) => v.post_id === postId);

    const days: { [key: string]: number } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days[key] = 0;
    }

    views.forEach((v) => {
      const d = new Date(v.viewed_at);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (days[key] !== undefined) {
        days[key]++;
      }
    });

    const distribution = [1, 2, 3, 4, 5].map((star) => ({
      rating: star,
      count: ratings.filter((r) => r.rating === star).length,
    }));

    const viewsOverTime = Object.entries(days).map(([date, count]) => ({
      date,
      views: count,
    }));

    return {
      viewsOverTime,
      ratingDistribution: distribution,
      totalViews: post?.views_count || 0,
      totalRatings: post?.ratings_count || ratings.length,
      avgRating: post?.avg_rating || 0,
    };
  },
};
