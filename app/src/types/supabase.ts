import { MedalType } from './user'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          username: string | null
          email: string | null
          avatar_url: string | null
          trader_status: string | null
          trader_type: string | null
          bio: string | null
          years_experience: number | null
          trading_frequency: string | null
          markets: string | null
          trading_goal: string | null
          trading_challenges: string | null
          is_online: boolean
          last_active_at: string | null
          follower_count: number
          following_count: number
          win_rate: number | null
          total_trades: number | null
          performance_rank: string | null
          medal_type: MedalType | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          username?: string | null
          email?: string | null
          avatar_url?: string | null
          trader_status?: string | null
          trader_type?: string | null
          bio?: string | null
          years_experience?: number | null
          trading_frequency?: string | null
          markets?: string | null
          trading_goal?: string | null
          trading_challenges?: string | null
          is_online?: boolean
          last_active_at?: string | null
          follower_count?: number
          following_count?: number
          win_rate?: number | null
          total_trades?: number | null
          performance_rank?: string | null
          medal_type?: MedalType | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          username?: string | null
          email?: string | null
          avatar_url?: string | null
          trader_status?: string | null
          trader_type?: string | null
          bio?: string | null
          years_experience?: number | null
          trading_frequency?: string | null
          markets?: string | null
          trading_goal?: string | null
          trading_challenges?: string | null
          is_online?: boolean
          last_active_at?: string | null
          follower_count?: number
          following_count?: number
          win_rate?: number | null
          total_trades?: number | null
          performance_rank?: string | null
          medal_type?: MedalType | null
        }
      }
      trader_friends: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T] 