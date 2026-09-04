export type PostType = 'project' | 'link' | 'code';

export interface Post {
  id: string;
  created_at: string;
  title: string;
  url: string;
  type: PostType;
  description: string;
  image_url?: string | null;
  tags: string[];
  user_id: string;
  user_email: string;
  user_name: string;
  views_count: number;
  avg_rating: number;
  ratings_count: number;
  user_rating?: number | null;
  code_snippet?: string;
  code_language?: string;
  file_name?: string;
}

export interface Rating {
  id: string;
  post_id: string;
  user_id: string;
  rating: number;
  created_at: string;
}

export interface PostView {
  id: string;
  post_id: string;
  user_id?: string | null;
  created_at: string;
}

export interface RatingBreakdown {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  total: number;
  average: number;
}

export interface PostAnalytics {
  post: Post;
  ratingBreakdown: RatingBreakdown;
  recentViews: { date: string; count: number }[];
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  display_name?: string;
  avatar_url?: string;
  role?: 'admin' | 'member';
}

export type SortOption = 'latest' | 'top_rated' | 'most_viewed';
export type FilterType = 'all' | 'project' | 'link' | 'code';
export type ViewMode = 'grid' | 'compact';

export type SupportedLanguage = 
  | 'python' 
  | 'javascript' 
  | 'typescript' 
  | 'html' 
  | 'json' 
  | 'c' 
  | 'cpp'
  | 'bash';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timestamp: string;
  engine: 'pyodide-wasm' | 'server-native' | 'js-sandbox' | 'html-preview';
}
