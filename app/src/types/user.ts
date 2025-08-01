import { Tables } from './supabase'

export type MedalType = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export type UserProfile = {
  id: string;
  created_at: string;
  updated_at: string;
  username: string | null | undefined;
  email: string | null | undefined;
  avatar_url: string | null | undefined;
  first_name: string | null | undefined;
  last_name: string | null | undefined;
  trader_status: string | null | undefined;
  trader_type: string | null | undefined;
  bio: string | null | undefined;
  years_experience: number | null | undefined;
  trading_frequency: string | null | undefined;
  markets: string | null | undefined;
  trading_goal: string | null | undefined;
  trading_challenges: string | null | undefined;
  medal_type: MedalType | null | undefined;
  win_rate?: number;
  total_trades?: number;
  performance_rank?: string;
  is_online: boolean;
  last_active_at: string | null | undefined;
}

export interface UserSession {
  user: {
    id: string
    email?: string
    user_metadata?: {
      username?: string
      avatar_url?: string
    }
  }
  session?: {
    access_token: string
    refresh_token: string
  }
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    email: boolean
    push: boolean
    marketing: boolean
  }
  language: string
  timezone: string
} 