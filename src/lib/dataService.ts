import { supabase } from './supabase';
import { Post, Rating, RatingBreakdown, PostAnalytics, PostType } from '../types';

const LOCAL_STORAGE_KEY_POSTS = 'teamhub_posts_v1';
const LOCAL_STORAGE_KEY_RATINGS = 'teamhub_ratings_v1';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const isValidUUID = (str?: string | null): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

export function getLocalPosts(): Post[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_POSTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalPosts(posts: Post[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_POSTS, JSON.stringify(posts));
  } catch (err) {
    console.warn('Local storage write error:', err);
  }
}

export const DataService = {
  // Check health of connection
  async checkHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('posts').select('id').limit(1);
      if (error) {
        return { healthy: false, error: error.message };
      }
      return { healthy: true };
    } catch (err: any) {
      return { healthy: false, error: err?.message || 'Connection failed' };
    }
  },

  async checkSupabaseConnection(): Promise<boolean> {
    try {
      const { error } = await supabase.from('posts').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  },

  isHealthy(): boolean {
    return true;
  },

  // Realtime subscription for instant multi-user synchronization
  subscribeToChanges(onUpdate: () => void): () => void {
    try {
      const channel = supabase
        .channel('public:posts-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'posts',
          },
          () => {
            onUpdate();
          }
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch {}
      };
    } catch {
      return () => {};
    }
  },

  // 1. Fetch Posts: Supabase is the single source of truth when online
  async fetchPosts(currentUserId?: string | null): Promise<Post[]> {
    try {
      const { data: supabaseData, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(supabaseData)) {
        // Authoritative data from Supabase
        const livePosts: Post[] = supabaseData.map((p: any) => ({
          id: p.id,
          created_at: p.created_at || new Date().toISOString(),
          title: p.title,
          url: p.url,
          type: (p.type || 'project') as PostType,
          description: p.description || '',
          image_url: p.image_url || null,
          tags: Array.isArray(p.tags) ? p.tags : ['General'],
          user_id: p.user_id || 'anonymous',
          user_email: p.user_email || 'admin@gmail.com',
          user_name: p.user_name || 'Admin',
          views_count: Number(p.views_count) || 0,
          avg_rating: Number(p.avg_rating) || 0,
          ratings_count: Number(p.ratings_count) || 0,
          user_rating: null,
          code_snippet: p.code_snippet || undefined,
          code_language: p.code_language || undefined,
          file_name: p.file_name || undefined,
        }));

        // Fetch user ratings if user ID is provided
        if (currentUserId && isValidUUID(currentUserId)) {
          try {
            const { data: userRatings } = await supabase
              .from('ratings')
              .select('post_id, rating')
              .eq('user_id', currentUserId);

            if (userRatings && userRatings.length > 0) {
              const ratingMap = new Map<string, number>();
              userRatings.forEach((r: any) => ratingMap.set(r.post_id, r.rating));
              livePosts.forEach((post) => {
                if (ratingMap.has(post.id)) {
                  post.user_rating = ratingMap.get(post.id) || null;
                }
              });
            }
          } catch {}
        }

        // Keep local cache completely in sync with Supabase
        saveLocalPosts(livePosts);
        return livePosts;
      } else if (error) {
        console.warn('Supabase fetch error, falling back to cache:', error.message);
      }
    } catch (err) {
      console.warn('Supabase fetch network error, falling back to cache:', err);
    }

    // Offline fallback only when Supabase cannot be reached
    return getLocalPosts();
  },

  async getPosts(currentUserId?: string | null): Promise<Post[]> {
    return this.fetchPosts(currentUserId);
  },

  // 2. Upload Image: Direct to Supabase Storage with base64 fallback
  async uploadImage(file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `uploads/${cleanFileName}`;

      const { data, error } = await supabase.storage
        .from('project-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('project-images')
          .getPublicUrl(filePath);
        if (publicUrlData?.publicUrl) return publicUrlData.publicUrl;
      }
    } catch (err) {
      console.warn('Supabase storage upload error:', err);
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  },

  // 3. Create Post
  async createPost(postData: {
    title: string;
    url: string;
    type: PostType;
    description: string;
    image_url?: string | null;
    tags: string[];
    user_id: string;
    user_email: string;
    user_name: string;
    code_snippet?: string;
    code_language?: string;
    file_name?: string;
  }): Promise<{ post: Post; savedToSupabase: boolean; error?: string }> {
    const fallbackUUID = generateUUID();
    const nowIso = new Date().toISOString();

    let createdPost: Post = {
      id: fallbackUUID,
      created_at: nowIso,
      title: postData.title.trim(),
      url: postData.url.trim(),
      type: postData.type,
      description: (postData.description || '').trim(),
      image_url: postData.image_url || null,
      tags: postData.tags && postData.tags.length > 0 ? postData.tags : ['General'],
      user_id: postData.user_id || 'admin-user',
      user_email: postData.user_email || 'admin@gmail.com',
      user_name: postData.user_name || 'Admin',
      views_count: 0,
      avg_rating: 0,
      ratings_count: 0,
      user_rating: null,
      code_snippet: postData.code_snippet,
      code_language: postData.code_language,
      file_name: postData.file_name,
    };

    // Save to local cache first
    const current = getLocalPosts();
    saveLocalPosts([createdPost, ...current.filter((p) => p.id !== createdPost.id)]);

    let savedToSupabase = false;
    let supabaseError: string | undefined;

    // Check if session has a valid Supabase authenticated user ID
    let currentAuthUserId: string | null = null;
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        currentAuthUserId = authData.user.id;
      }
    } catch {}

    const payload: any = {
      title: createdPost.title,
      url: createdPost.url,
      type: createdPost.type,
      description: createdPost.description,
      image_url: createdPost.image_url,
      tags: createdPost.tags,
      user_email: createdPost.user_email,
      user_name: createdPost.user_name,
      views_count: 0,
      avg_rating: 0,
      ratings_count: 0,
    };

    if (currentAuthUserId) {
      payload.user_id = currentAuthUserId;
    } else if (isValidUUID(postData.user_id)) {
      payload.user_id = postData.user_id;
    }

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        createdPost = { ...data, user_rating: null };
        savedToSupabase = true;
      } else if (error) {
        supabaseError = error.message;

        if (payload.user_id) {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.user_id;

          const retryRes = await supabase
            .from('posts')
            .insert([fallbackPayload])
            .select()
            .single();

          if (!retryRes.error && retryRes.data) {
            createdPost = { ...retryRes.data, user_rating: null };
            savedToSupabase = true;
            supabaseError = undefined;
          }
        }
      }
    } catch (e: any) {
      supabaseError = e?.message;
    }

    if (savedToSupabase) {
      const refreshed = getLocalPosts();
      saveLocalPosts([
        createdPost,
        ...refreshed.filter((p) => p.id !== fallbackUUID && p.id !== createdPost.id),
      ]);
    }

    return { post: createdPost, savedToSupabase, error: supabaseError };
  },

  // 4. Update Post
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

  // 5. Delete Post
  async deletePost(postId: string): Promise<boolean> {
    try {
      if (isValidUUID(postId)) {
        await supabase.from('posts').delete().eq('id', postId);
      }
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }

    const posts = getLocalPosts().filter((p) => p.id !== postId);
    saveLocalPosts(posts);
    return true;
  },

  // 6. Rate Post
  async ratePost(postId: string, ratingValue: number, user: { id: string; email: string }): Promise<{ avg_rating: number; ratings_count: number }> {
    let avg = ratingValue;
    let count = 1;

    try {
      if (isValidUUID(postId)) {
        let authUserId = user.id;
        if (!isValidUUID(authUserId)) {
          const { data: authData } = await supabase.auth.getUser();
          authUserId = authData?.user?.id || generateUUID();
        }

        await supabase.from('ratings').upsert(
          { post_id: postId, user_id: authUserId, rating: ratingValue },
          { onConflict: 'post_id,user_id' }
        );

        const { data: ratingsData } = await supabase
          .from('ratings')
          .select('rating')
          .eq('post_id', postId);

        if (ratingsData && ratingsData.length > 0) {
          count = ratingsData.length;
          const sum = ratingsData.reduce((acc: number, r: any) => acc + r.rating, 0);
          avg = Number((sum / count).toFixed(1));

          await supabase
            .from('posts')
            .update({ avg_rating: avg, ratings_count: count })
            .eq('id', postId);
        }
      }
    } catch (e) {
      console.warn('Supabase rating update notice:', e);
    }

    const posts = getLocalPosts();
    const targetPost = posts.find((p) => p.id === postId);
    if (targetPost) {
      targetPost.avg_rating = avg;
      targetPost.ratings_count = count;
      targetPost.user_rating = ratingValue;
      saveLocalPosts(posts);
    }

    return { avg_rating: avg, ratings_count: count };
  },

  // 7. Record View
  async recordView(postId: string): Promise<number> {
    try {
      if (isValidUUID(postId)) {
        const { data } = await supabase.from('posts').select('views_count').eq('id', postId).single();
        const nextViews = ((data?.views_count) || 0) + 1;
        await supabase.from('posts').update({ views_count: nextViews }).eq('id', postId);
        return nextViews;
      }
    } catch {}

    const posts = getLocalPosts();
    const target = posts.find((p) => p.id === postId);
    if (target) {
      target.views_count = (target.views_count || 0) + 1;
      saveLocalPosts(posts);
      return target.views_count;
    }
    return 1;
  },

  // 8. Analytics
  async getPostAnalytics(post: Post): Promise<PostAnalytics> {
    const breakdown: RatingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: post.ratings_count, average: post.avg_rating };
    try {
      if (isValidUUID(post.id)) {
        const { data: ratingsData } = await supabase.from('ratings').select('rating').eq('post_id', post.id);
        if (ratingsData && ratingsData.length > 0) {
          ratingsData.forEach((r: any) => {
            if (breakdown[r.rating as keyof RatingBreakdown] !== undefined) {
              (breakdown[r.rating as keyof RatingBreakdown] as number)++;
            }
          });
          breakdown.total = ratingsData.length;
        }
      }
    } catch {}

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
    const baseViewsPerDay = Math.max(1, Math.round(post.views_count / 7));
    const recentViews = days.map((day, idx) => ({
      date: day,
      count: Math.max(1, Math.round(baseViewsPerDay * (0.7 + idx * 0.1))),
    }));

    return { post, ratingBreakdown: breakdown, recentViews };
  },
};
