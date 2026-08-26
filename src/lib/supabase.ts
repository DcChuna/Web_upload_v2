import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://omakybgrklvehnrfenhc.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYWt5Ymdya2x2ZWhucmZlbmhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNTM2NzAsImV4cCI6MjEwMjgyOTY3MH0.33SAEHfZNqOTsQKZhxWySnu605XKKVdl9KLLg0ELyGA';

const getSupabaseUrl = (): string => {
  try {
    const envUrl = (import.meta as any)?.env?.VITE_SUPABASE_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http')) return envUrl.trim();
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('custom_supabase_url');
      if (stored && stored.startsWith('http')) return stored.trim();
    }
  } catch (e) {}
  return FALLBACK_URL;
};

const getSupabaseKey = (): string => {
  try {
    const envKey = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY;
    if (envKey && typeof envKey === 'string' && envKey.startsWith('eyJ')) return envKey.trim();
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('custom_supabase_anon_key');
      if (stored && stored.startsWith('eyJ')) return stored.trim();
      if (stored) {
        localStorage.removeItem('custom_supabase_anon_key');
      }
    }
  } catch (e) {}
  return FALLBACK_ANON_KEY;
};

export const SUPABASE_URL = getSupabaseUrl();
export const SUPABASE_ANON_KEY = getSupabaseKey();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const updateSupabaseClient = (url: string, anonKey: string) => {
  try {
    localStorage.setItem('custom_supabase_url', url);
    localStorage.setItem('custom_supabase_anon_key', anonKey);
    window.location.reload();
  } catch (e) {}
};

export const SUPABASE_CONFIG = {
  get url() {
    return getSupabaseUrl();
  },
  get anonKey() {
    return getSupabaseKey();
  },
};
