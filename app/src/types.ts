// User profile type definition
export interface UserProfile {
  id: string;
  created_at: string;
  updated_at: string;
  username: string | null | undefined;
  email: string | null | undefined;
  avatar_url: string | null | undefined;
  profession: string | null | undefined;
  trader_status: string | null | undefined;
  trader_type: string | null | undefined;
  bio: string | null | undefined;
  years_experience: number | null | undefined;
  trading_frequency: string | null | undefined;
  markets: string | null | undefined;
  trading_goal: string | null | undefined;
  trading_challenges: string | null | undefined;
  medal_type: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | null | undefined;
  win_rate?: number;
  total_trades?: number;
  performance_rank?: string;
  is_online?: boolean;
  last_active_at?: string;
  user_presence?: {
    status: string;
    last_seen_at: string;
  };
}

// Trade setup type definition
export interface TradeSetup {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  currency_pair?: string;
  pair?: string;  // For backward compatibility
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  risk_reward_ratio?: number;
  timeframe?: string;
  image_url?: string;
  image_urls?: string[];  // Array of image URLs for multiple images
  chart_image_url?: string;
  tags?: string[];
  created_at: string;
  updated_at?: string;
  likes_count?: number;
  comments_count?: number;
  is_public?: boolean;
  forum_id?: string;
  direction?: 'LONG' | 'SHORT';
  user?: UserProfile;
}

// Comment type definition
export interface Comment {
  id: string;
  user_id: string;
  trade_setup_id: string;
  content: string;
  created_at: string;
  user?: UserProfile;
}

// Like type definition
export interface Like {
  id: string;
  user_id: string;
  trade_setup_id: string;
  created_at: string;
}
