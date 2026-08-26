export type PostType = 'project' | 'link' | 'game';

export interface Post {
  id: string;
  title: string;
  url: string;
  type: PostType;
  description?: string;
  image_url?: string | null;
  tags: string[];
  views_count: number;
  avg_rating: number;
  ratings_count: number;
  created_at: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_rating?: number;
  is_favorite?: boolean;
}

export interface PostRating {
  id: string;
  post_id: string;
  user_id: string;
  user_email: string;
  rating: number;
  created_at: string;
}

export interface PostViewLog {
  id: string;
  post_id: string;
  viewed_at: string;
  referrer?: string;
}

export type ViewMode = 'grid' | 'list';
export type FilterType = 'all' | 'project' | 'game' | 'link' | 'favorites';
export type SortOption = 'newest' | 'rating' | 'views' | 'alphabetical';

export interface PostAnalytics {
  viewsOverTime: { date: string; views: number }[];
  ratingDistribution: { rating: number; count: number }[];
  totalViews: number;
  totalRatings: number;
  avgRating: number;
}
