import { Post, Rating, PostView, PostAnalytics } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { SEED_POSTS } from './mockSeedData';

const LOCAL_STORAGE_KEY = 'teamhub_posts_v2';
const FAVORITES_KEY = 'teamhub_favorites';

export function getLocalPosts(): Post[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_POSTS));
      return SEED_POSTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading localStorage posts', e);
    return SEED_POSTS;
  }
}

export function saveLocalPosts(posts: Post[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(posts));
  } catch (e) {
    console.error('Failed saving to localStorage', e);
  }
}

class DataServiceClass {
  private isConnected = false;

  async checkHealth(): Promise<{ healthy: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      this.isConnected = false;
      return { healthy: false, error: 'Supabase credentials not configured. Using local persistence.' };
    }
    try {
      const { error } = await supabase.from('posts').select('id').limit(1);
      if (error) {
        this.isConnected = false;
        return { healthy: false, error: error.message };
      }
      this.isConnected = true;
      return { healthy: true };
    } catch (err: any) {
      this.isConnected = false;
      return { healthy: false, error: err?.message || 'Connection failed' };
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  subscribeToChanges(onUpdate: () => void): () => void {
    if (!isSupabaseConfigured) return () => {};

    const channel = supabase
      .channel('teamhub_posts_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        onUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async fetchPosts(currentUserId?: string): Promise<{ posts: Post[]; source: 'supabase' | 'local' }> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          this.isConnected = true;
          return { posts: data as Post[], source: 'supabase' };
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local state:', err);
      }
    }

    this.isConnected = false;
    const local = getLocalPosts();
    return { posts: local, source: 'local' };
  }

  async createPost(postData: Omit<Post, 'id' | 'created_at' | 'avg_rating' | 'ratings_count' | 'views_count'>): Promise<Post> {
    const newPost: Post = {
      ...postData,
      id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
      views_count: 0,
      avg_rating: 0,
      ratings_count: 0,
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('posts')
          .insert([newPost])
          .select()
          .single();

        if (!error && data) {
          return data as Post;
        }
      } catch (err) {
        console.warn('Supabase insert failed, storing locally:', err);
      }
    }

    const current = getLocalPosts();
    const updated = [newPost, ...current];
    saveLocalPosts(updated);
    return newPost;
  }

  async updatePost(postId: string, updates: Partial<Post>): Promise<Post> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('posts')
          .update(updates)
          .eq('id', postId)
          .select()
          .single();

        if (!error && data) {
          return data as Post;
        }
      } catch (err) {
        console.warn('Supabase update failed, modifying locally:', err);
      }
    }

    const current = getLocalPosts();
    const idx = current.findIndex((p) => p.id === postId);
    if (idx === -1) throw new Error('Post not found');

    const updated = { ...current[idx], ...updates };
    current[idx] = updated;
    saveLocalPosts(current);
    return updated;
  }

  async deletePost(postId: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('posts').delete().eq('id', postId);
        if (!error) return true;
      } catch (err) {
        console.warn('Supabase delete failed, deleting locally:', err);
      }
    }

    const current = getLocalPosts();
    const filtered = current.filter((p) => p.id !== postId);
    saveLocalPosts(filtered);
    return true;
  }

  async incrementViews(postId: string, userId?: string): Promise<number> {
    const current = getLocalPosts();
    const idx = current.findIndex((p) => p.id === postId);
    const newCount = idx !== -1 ? (current[idx].views_count || 0) + 1 : 1;

    if (idx !== -1) {
      current[idx].views_count = newCount;
      saveLocalPosts(current);
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('post_views').insert([{ post_id: postId, user_id: userId || null }]);
        await supabase.rpc('increment_views', { target_post_id: postId });
      } catch (e) {
        // quiet fallback
      }
    }

    return newCount;
  }

  async submitRating(postId: string, userId: string, score: number): Promise<{ avg_rating: number; ratings_count: number }> {
    const current = getLocalPosts();
    const idx = current.findIndex((p) => p.id === postId);
    
    let avg = score;
    let count = 1;

    if (idx !== -1) {
      const p = current[idx];
      count = (p.ratings_count || 0) + 1;
      avg = Number((((p.avg_rating || 0) * (p.ratings_count || 0) + score) / count).toFixed(1));
      current[idx].avg_rating = avg;
      current[idx].ratings_count = count;
      current[idx].user_rating = score;
      saveLocalPosts(current);
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('ratings').upsert(
          { post_id: postId, user_id: userId, rating: score },
          { onConflict: 'post_id,user_id' }
        );
      } catch (e) {
        // quiet fallback
      }
    }

    return { avg_rating: avg, ratings_count: count };
  }

  getFavorites(): string[] {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  toggleFavorite(postId: string): string[] {
    const favs = this.getFavorites();
    const next = favs.includes(postId) ? favs.filter((id) => id !== postId) : [...favs, postId];
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {}
    return next;
  }

  async getPostAnalytics(post: Post): Promise<PostAnalytics> {
    const breakdown: { 1: number; 2: number; 3: number; 4: number; 5: number; total: number; average: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      total: post.ratings_count || 0,
      average: post.avg_rating || 0,
    };

    if (post.ratings_count && post.avg_rating) {
      const star = Math.min(5, Math.max(1, Math.round(post.avg_rating))) as 1 | 2 | 3 | 4 | 5;
      breakdown[star] = post.ratings_count;
    }

    const today = new Date();
    const recentViews = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      return {
        date: dateStr,
        count: Math.max(0, Math.floor((post.views_count || 5) / (7 - i + 1))),
      };
    });

    return {
      post,
      ratingBreakdown: breakdown,
      recentViews,
    };
  }
}

export const DataService = new DataServiceClass();
