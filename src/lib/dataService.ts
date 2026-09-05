import { supabase } from './supabase';
import { Post, PostAnalytics, RatingBreakdown, PostType } from '../types';
import { MOCK_POSTS } from './mockSeedData';

const LOCAL_STORAGE_KEY = 'teamhub_posts_cache';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const isValidUUID = (str: string | null | undefined): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

const getLocalPosts = (): Post[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

const saveLocalPosts = (posts: Post[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(posts));
  } catch (e) {}
};

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

  // Alias for compatibility
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

  // Realtime subscription helper
  subscribeToChanges(onUpdate: () => void): () => void {
    try {
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'posts' },
          () => {
            onUpdate();
          }
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch (e) {}
      };
    } catch (e) {
      return () => {};
    }
  },

  // 1. Fetch all posts
  async fetchPosts(currentUserId?: string | null): Promise<Post[]> {
    try {
      const { data: supabaseData, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(supabaseData)) {
        let ratingMap = new Map<string, number>();

        if (currentUserId && isValidUUID(currentUserId)) {
          const { data: userRatings } = await supabase
            .from('ratings')
            .select('post_id, rating')
            .eq('user_id', currentUserId);

          if (userRatings && userRatings.length > 0) {
            userRatings.forEach((r: any) => ratingMap.set(r.post_id, r.rating));
          }
        }

        const livePosts: Post[] = supabaseData.map((post: any) => {
          let userRating: number | undefined = undefined;
          if (ratingMap.has(post.id)) {
            userRating = ratingMap.get(post.id);
          }

          return {
            id: post.id,
            title: post.title,
            description: post.description || '',
            url: post.url,
            type: post.type || 'link',
            image_url: post.image_url || undefined,
            user_id: post.user_id || undefined,
            user_name: post.user_name || 'Team Member',
            user_email: post.user_email || undefined,
            views_count: Number(post.views_count) || 0,
            avg_rating: Number(post.avg_rating) || 0,
            ratings_count: Number(post.ratings_count) || 0,
            tags: Array.isArray(post.tags) ? post.tags : [],
            created_at: post.created_at,
            user_rating: userRating,
            code_snippet: post.code_snippet || undefined,
            code_language: post.code_language || undefined,
            file_name: post.file_name || undefined,
          };
        });

        saveLocalPosts(livePosts);
        return livePosts;
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to cached local storage:', err);
    }

    const cached = getLocalPosts();
    if (cached && cached.length > 0) {
      return cached;
    }

    return getLocalPosts();
  },

  async getPosts(currentUserId?: string | null): Promise<Post[]> {
    return this.fetchPosts(currentUserId);
  },

  // 2. Upload Image: Direct to Supabase Storage with base64 fallback
  async uploadImage(file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { data, error } = await supabase.storage
        .from('post-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) return publicUrlData.publicUrl;
      }
    } catch (err) {
      console.warn('Storage upload error, converting to base64 inline representation:', err);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  },

  // 3. Create a post
  async createPost(
    postData: {
      title: string;
      description?: string;
      url: string;
      type: PostType;
      image_url?: string;
      tags?: string[];
      code_snippet?: string;
      code_language?: string;
      file_name?: string;
    },
    userContext?: { id?: string; email?: string; name?: string }
  ): Promise<Post> {
    const newPostId = generateUUID();
    const createdPost: Post = {
      id: newPostId,
      title: postData.title.trim(),
      description: postData.description?.trim() || '',
      url: postData.url.trim(),
      type: postData.type,
      image_url: postData.image_url || undefined,
      user_id: userContext?.id || undefined,
      user_name: userContext?.name || userContext?.email?.split('@')[0] || 'Team Member',
      user_email: userContext?.email || undefined,
      views_count: 0,
      avg_rating: 0,
      ratings_count: 0,
      tags: postData.tags || [],
      created_at: new Date().toISOString(),
      code_snippet: postData.code_snippet,
      code_language: postData.code_language,
      file_name: postData.file_name,
    };

    const current = getLocalPosts();
    saveLocalPosts([createdPost, ...current.filter((p) => p.id !== createdPost.id)]);

    try {
      let currentAuthUserId: string | null = null;
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          currentAuthUserId = authData.user.id;
        }
      } catch (e) {}

      const payload: any = {
        id: newPostId,
        title: createdPost.title,
        description: createdPost.description,
        url: createdPost.url,
        type: createdPost.type,
        image_url: createdPost.image_url || null,
        user_name: createdPost.user_name,
        user_email: createdPost.user_email || null,
        views_count: 0,
        avg_rating: 0,
        ratings_count: 0,
        tags: createdPost.tags,
        created_at: createdPost.created_at,
        code_snippet: createdPost.code_snippet || null,
        code_language: createdPost.code_language || null,
        file_name: createdPost.file_name || null,
      };

      if (currentAuthUserId) {
        payload.user_id = currentAuthUserId;
      } else if (userContext?.id && isValidUUID(userContext.id)) {
        payload.user_id = userContext.id;
      }

      const { data, error } = await supabase
        .from('posts')
        .insert([payload])
        .select()
        .single();

      let savedToSupabase = false;

      if (!error && data) {
        savedToSupabase = true;
      } else if (error) {
        console.warn('Initial insert error:', error.message);
        if (payload.user_id) {
          delete payload.user_id;
          const retryRes = await supabase
            .from('posts')
            .insert([payload])
            .select()
            .single();

          if (!retryRes.error && retryRes.data) {
            savedToSupabase = true;
          } else {
            console.error('Retry insert also failed:', retryRes.error);
          }
        }
      }

      if (savedToSupabase) {
        const refreshed = getLocalPosts();
        saveLocalPosts([
          createdPost,
          ...refreshed.filter((p) => p.id !== createdPost.id),
        ]);
      }
    } catch (e) {
      console.warn('Network exception while saving post to Supabase:', e);
    }

    return createdPost;
  },

  // 4. Update Post
  async updatePost(
    postId: string,
    updatedFields: Partial<Post>
  ): Promise<Post | null> {
    const posts = getLocalPosts();
    const index = posts.findIndex((p) => p.id === postId);
    let updatedLocalPost: Post | null = null;

    if (index !== -1) {
      posts[index] = { ...posts[index], ...updatedFields };
      saveLocalPosts(posts);
      updatedLocalPost = posts[index];
    }

    try {
      if (isValidUUID(postId)) {
        const payload: any = {};
        if (updatedFields.title !== undefined) payload.title = updatedFields.title.trim();
        if (updatedFields.url !== undefined) payload.url = updatedFields.url.trim();
        if (updatedFields.type !== undefined) payload.type = updatedFields.type;
        if (updatedFields.description !== undefined) payload.description = updatedFields.description.trim();
        if (updatedFields.image_url !== undefined) payload.image_url = updatedFields.image_url;
        if (updatedFields.tags !== undefined) payload.tags = updatedFields.tags;
        if (updatedFields.code_snippet !== undefined) payload.code_snippet = updatedFields.code_snippet;
        if (updatedFields.code_language !== undefined) payload.code_language = updatedFields.code_language;
        if (updatedFields.file_name !== undefined) payload.file_name = updatedFields.file_name;

        const { data, error } = await supabase
          .from('posts')
          .update(payload)
          .eq('id', postId)
          .select()
          .single();

        if (!error && data) {
          const posts = getLocalPosts();
          const index = posts.findIndex((p) => p.id === postId);
          if (index !== -1) {
            posts[index] = { ...posts[index], ...data };
            saveLocalPosts(posts);
            return posts[index];
          }
        }
      }
    } catch (e) {
      console.warn('Supabase post update failed, local copy maintained:', e);
    }

    return updatedLocalPost;
  },

  // 5. Delete a post
  async deletePost(postId: string): Promise<boolean> {
    try {
      if (isValidUUID(postId)) {
        await supabase.from('ratings').delete().eq('post_id', postId);
        await supabase.from('views').delete().eq('post_id', postId);
        await supabase.from('posts').delete().eq('id', postId);
      }
    } catch (e) {
      console.warn('Supabase delete failed:', e);
    }

    const posts = getLocalPosts().filter((p) => p.id !== postId);
    saveLocalPosts(posts);
    return true;
  },

  // 6. Rate a post
  async ratePost(
    postId: string,
    rating: number,
    userContext?: { id?: string; email?: string }
  ): Promise<{ avg_rating: number; ratings_count: number }> {
    try {
      if (isValidUUID(postId)) {
        let authUserId = userContext?.id;
        if (!isValidUUID(authUserId)) {
          const { data: authData } = await supabase.auth.getUser();
          authUserId = authData?.user?.id;
        }

        if (isValidUUID(authUserId)) {
          await supabase.from('ratings').upsert(
            {
              post_id: postId,
              user_id: authUserId,
              rating,
              created_at: new Date().toISOString(),
            },
            { onConflict: 'post_id,user_id' }
          );

          const { data: ratingsData } = await supabase
            .from('ratings')
            .select('rating')
            .eq('post_id', postId);

          if (ratingsData && ratingsData.length > 0) {
            const count = ratingsData.length;
            const sum = ratingsData.reduce((acc, curr) => acc + curr.rating, 0);
            const avg = Number((sum / count).toFixed(2));

            await supabase
              .from('posts')
              .update({ avg_rating: avg, ratings_count: count })
              .eq('id', postId);

            return { avg_rating: avg, ratings_count: count };
          }
        }
      }
    } catch (e) {
      console.warn('Supabase rating failed, saving in memory:', e);
    }

    const posts = getLocalPosts();
    const targetPost = posts.find((p) => p.id === postId);
    if (targetPost) {
      targetPost.ratings_count = (targetPost.ratings_count || 0) + 1;
      targetPost.avg_rating = Number(
        (((targetPost.avg_rating || 0) + rating) / 2).toFixed(1)
      );
      saveLocalPosts(posts);
      return {
        avg_rating: targetPost.avg_rating,
        ratings_count: targetPost.ratings_count,
      };
    }

    return { avg_rating: rating, ratings_count: 1 };
  },

  // 7. Record a view
  async recordView(postId: string): Promise<void> {
    try {
      if (isValidUUID(postId)) {
        await supabase.rpc('increment_view_count', { target_post_id: postId });
      }
    } catch (e) {}

    const posts = getLocalPosts();
    const target = posts.find((p) => p.id === postId);
    if (target) {
      target.views_count = (target.views_count || 0) + 1;
      saveLocalPosts(posts);
    }
  },

  // 8. Fetch analytics
  async getPostAnalytics(post: Post): Promise<PostAnalytics> {
    const breakdown: RatingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    try {
      if (isValidUUID(post.id)) {
        const { data: ratingsData } = await supabase
          .from('ratings')
          .select('rating')
          .eq('post_id', post.id);

        if (ratingsData && ratingsData.length > 0) {
          ratingsData.forEach((r: any) => {
            if (breakdown[r.rating as keyof RatingBreakdown] !== undefined) {
              breakdown[r.rating as keyof RatingBreakdown]++;
            }
          });
        }
      }
    } catch (e) {}

    return {
      views: post.views_count,
      ratings_count: post.ratings_count,
      avg_rating: post.avg_rating,
      rating_breakdown: breakdown,
    };
  },
};
