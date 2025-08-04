export type TimeframeType = 
  | 'M10' | 'M15' | 'M30' 
  | 'H1' | 'H2' | 'H4' | 'H8' 
  | 'W1' | 'MN1' | 'DAILY';
export type AnalysisStatus = 'DRAFT' | 'COMPLETED' | 'ARCHIVED';
export type TradeRecommendation = 'LONG' | 'SHORT' | 'NEUTRAL' | 'AVOID';
export type QuestionType = 'TEXT' | 'MULTIPLE_CHOICE' | 'RATING' | 'BOOLEAN' | 'ANNOUNCEMENTS';

export interface TDAQuestion {
  id: string;
  timeframe: TimeframeType;
  question_text: string;
  question_type: QuestionType;
  options?: string[];
  required: boolean;
  order_index: number;
  created_at: string;
  is_active: boolean;
}

export interface TDAAnswer {
  id: string;
  analysis_id: string;
  question_id: string;
  answer_text?: string;
  answer_value?: unknown;
  created_at: string;
}

export interface TDAAnnouncement {
  id: string;
  analysis_id: string;
  timeframe: TimeframeType;
  time: string;
  announcement_type: string;
  impact: 'MEDIUM' | 'HIGH';
  created_at: string;
}

export interface TDAScreenshot {
  id: string;
  analysis_id: string;
  timeframe: TimeframeType;
  file_url: string;
  file_name: string;
  file_size: number;
  created_at: string;
}

export interface TDATimeframeAnalysis {
  id: string;
  analysis_id: string;
  timeframe: TimeframeType;
  created_at: string;
  updated_at: string;
  analysis_data: Record<string, unknown>;
  timeframe_probability?: number;
  timeframe_sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timeframe_strength?: number;
}

export interface TopDownAnalysis {
  id: string;
  user_id: string;
  currency_pair: string;
  analysis_date: string;
  analysis_time?: string;
  status: AnalysisStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  
  // AI Analysis Results
  overall_probability?: number;
  trade_recommendation?: TradeRecommendation;
  confidence_level?: number;
  risk_level?: string;
  ai_summary?: string;
  ai_reasoning?: string;
  
  // Metadata
  notes?: string;
  tags?: string[];
}

export interface TDAFormData {
  currency_pair: string;
  notes?: string;
  timeframes: {
    [key in TimeframeType]: {
      answers: Record<string, unknown>;
      probability?: number;
      sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      strength?: number;
    };
  };
}

export interface TDAAnalysisResult {
  analysis: TopDownAnalysis;
  timeframe_analyses: TDATimeframeAnalysis[];
  answers: TDAAnswer[];
  questions: TDAQuestion[];
}

export interface AIAnalysisResponse {
  overall_probability: number;
  trade_recommendation: TradeRecommendation;
  confidence_level: number;
  risk_level: string;
  ai_summary: string;
  ai_reasoning: string;
  timeframe_breakdown: {
    [key in TimeframeType]: {
      probability: number;
      sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      strength: number;
      reasoning: string;
    };
  };
}

export interface TDAProgress {
  currentStep: number;
  totalSteps: number;
  completedTimeframes: TimeframeType[];
  currentTimeframe?: TimeframeType;
}

export interface TDAValidationError {
  timeframe: TimeframeType;
  question_id: string;
  message: string;
} 