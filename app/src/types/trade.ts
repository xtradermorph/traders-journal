export interface Trade {
  id: string;
  user_id: string;
  currency_pair: string;
  trade_type: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price: number;
  stop_loss?: number;
  take_profit?: number;
  lot_size: number;
  risk_reward_ratio?: number;
  profit_loss?: number;
  currency?: string;
  pnl_percentage?: number;
  status: 'OPEN' | 'CLOSED';
  date: string;
  entry_time?: string;
  exit_time?: string;
  duration?: number;
  pips?: number;
  notes?: string;
  image_urls?: string[];
  tags?: string | string[];
  created_at: string;
  updated_at: string;
} 