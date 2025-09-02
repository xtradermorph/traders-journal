-- =====================================================
-- AI MARKET ANALYSIS TABLES
-- =====================================================
-- This script creates tables for storing AI-powered market analysis data
-- including sentiment analysis, risk predictions, behavioral patterns,
-- market correlations, volatility predictions, and AI insights

-- =====================================================
-- 1. AI MARKET ANALYSIS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_market_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('sentiment', 'risk', 'pattern', 'correlation', 'volatility')),
    currency_pair TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. AI INSIGHTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('SENTIMENT', 'RISK', 'PATTERN', 'CORRELATION', 'VOLATILITY')),
    currency_pair TEXT NOT NULL,
    insight TEXT NOT NULL,
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    actionable BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- =====================================================
-- 3. MARKET SENTIMENT HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS market_sentiment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_pair TEXT NOT NULL,
    overall_sentiment TEXT NOT NULL CHECK (overall_sentiment IN ('BULLISH', 'BEARISH', 'NEUTRAL')),
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    news_sentiment_score NUMERIC,
    technical_sentiment_score NUMERIC,
    social_sentiment_score NUMERIC,
    factors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. RISK PREDICTION HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS risk_prediction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_pair TEXT NOT NULL,
    trade_type TEXT NOT NULL CHECK (trade_type IN ('LONG', 'SHORT')),
    entry_price NUMERIC,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    probability_score INTEGER NOT NULL CHECK (probability_score >= 0 AND probability_score <= 100),
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    factors JSONB,
    recommendations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. BEHAVIORAL PATTERN HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS behavioral_pattern_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_pair TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    pattern_type TEXT NOT NULL CHECK (pattern_type IN ('TREND_FOLLOWING', 'MEAN_REVERSION', 'BREAKOUT', 'CONSOLIDATION')),
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    historical_accuracy NUMERIC CHECK (historical_accuracy >= 0 AND historical_accuracy <= 1),
    description TEXT,
    suggested_action TEXT,
    pattern_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. MARKET CORRELATION HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS market_correlation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_pair TEXT NOT NULL,
    secondary_pair TEXT NOT NULL,
    correlation_coefficient NUMERIC NOT NULL CHECK (correlation_coefficient >= -1 AND correlation_coefficient <= 1),
    strength TEXT NOT NULL CHECK (strength IN ('STRONG', 'MODERATE', 'WEAK')),
    direction TEXT NOT NULL CHECK (direction IN ('POSITIVE', 'NEGATIVE')),
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    correlation_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. VOLATILITY PREDICTION HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS volatility_prediction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_pair TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    expected_volatility TEXT NOT NULL CHECK (expected_volatility IN ('LOW', 'MEDIUM', 'HIGH', 'EXTREME')),
    probability_score INTEGER NOT NULL CHECK (probability_score >= 0 AND probability_score <= 100),
    factors JSONB,
    risk_implications JSONB,
    prediction_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. AI MODEL PERFORMANCE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_type TEXT NOT NULL CHECK (model_type IN ('sentiment', 'risk', 'pattern', 'correlation', 'volatility')),
    accuracy_score NUMERIC CHECK (accuracy_score >= 0 AND accuracy_score <= 1),
    precision_score NUMERIC CHECK (precision_score >= 0 AND precision_score <= 1),
    recall_score NUMERIC CHECK (recall_score >= 0 AND recall_score <= 1),
    f1_score NUMERIC CHECK (f1_score >= 0 AND f1_score <= 1),
    total_predictions INTEGER DEFAULT 0,
    correct_predictions INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    performance_data JSONB
);

-- =====================================================
-- 9. MARKET DATA SOURCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS market_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('news', 'technical', 'social', 'economic', 'price')),
    api_endpoint TEXT,
    api_key_hash TEXT,
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    reliability_score NUMERIC CHECK (reliability_score >= 0 AND reliability_score <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. AI ANALYSIS CONFIGURATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_analysis_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- AI Market Analysis indexes
CREATE INDEX IF NOT EXISTS idx_ai_market_analysis_type ON ai_market_analysis(type);
CREATE INDEX IF NOT EXISTS idx_ai_market_analysis_currency_pair ON ai_market_analysis(currency_pair);
CREATE INDEX IF NOT EXISTS idx_ai_market_analysis_created_at ON ai_market_analysis(created_at);

-- AI Insights indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_currency_pair ON ai_insights(currency_pair);
CREATE INDEX IF NOT EXISTS idx_ai_insights_actionable ON ai_insights(actionable);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at);

-- Market Sentiment History indexes
CREATE INDEX IF NOT EXISTS idx_market_sentiment_currency_pair ON market_sentiment_history(currency_pair);
CREATE INDEX IF NOT EXISTS idx_market_sentiment_overall ON market_sentiment_history(overall_sentiment);
CREATE INDEX IF NOT EXISTS idx_market_sentiment_created_at ON market_sentiment_history(created_at);

-- Risk Prediction History indexes
CREATE INDEX IF NOT EXISTS idx_risk_prediction_currency_pair ON risk_prediction_history(currency_pair);
CREATE INDEX IF NOT EXISTS idx_risk_prediction_risk_level ON risk_prediction_history(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_prediction_created_at ON risk_prediction_history(created_at);

-- Behavioral Pattern History indexes
CREATE INDEX IF NOT EXISTS idx_behavioral_pattern_currency_pair ON behavioral_pattern_history(currency_pair);
CREATE INDEX IF NOT EXISTS idx_behavioral_pattern_type ON behavioral_pattern_history(pattern_type);
CREATE INDEX IF NOT EXISTS idx_behavioral_pattern_created_at ON behavioral_pattern_history(created_at);

-- Market Correlation History indexes
CREATE INDEX IF NOT EXISTS idx_market_correlation_primary_pair ON market_correlation_history(primary_pair);
CREATE INDEX IF NOT EXISTS idx_market_correlation_secondary_pair ON market_correlation_history(secondary_pair);
CREATE INDEX IF NOT EXISTS idx_market_correlation_strength ON market_correlation_history(strength);
CREATE INDEX IF NOT EXISTS idx_market_correlation_created_at ON market_correlation_history(created_at);

-- Volatility Prediction History indexes
CREATE INDEX IF NOT EXISTS idx_volatility_prediction_currency_pair ON volatility_prediction_history(currency_pair);
CREATE INDEX IF NOT EXISTS idx_volatility_prediction_volatility ON volatility_prediction_history(expected_volatility);
CREATE INDEX IF NOT EXISTS idx_volatility_prediction_created_at ON volatility_prediction_history(created_at);

-- AI Model Performance indexes
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_type ON ai_model_performance(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_accuracy ON ai_model_performance(accuracy_score);

-- Market Data Sources indexes
CREATE INDEX IF NOT EXISTS idx_market_data_sources_type ON market_data_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_market_data_sources_active ON market_data_sources(is_active);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ai_market_analysis_type_currency_created ON ai_market_analysis(type, currency_pair, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type_currency_actionable ON ai_insights(type, currency_pair, actionable);
CREATE INDEX IF NOT EXISTS idx_market_sentiment_currency_created ON market_sentiment_history(currency_pair, created_at);
CREATE INDEX IF NOT EXISTS idx_risk_prediction_currency_risk_created ON risk_prediction_history(currency_pair, risk_level, created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE ai_market_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_sentiment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_prediction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_pattern_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_correlation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE volatility_prediction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_config ENABLE ROW LEVEL SECURITY;

-- AI Market Analysis policies
DO $$
BEGIN
    -- Users can view their own analysis data
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_market_analysis' 
        AND policyname = 'Users can view their own analysis data'
    ) THEN
        CREATE POLICY "Users can view their own analysis data"
        ON ai_market_analysis
        FOR SELECT USING (true);
    END IF;

    -- System can insert analysis data
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_market_analysis' 
        AND policyname = 'System can insert analysis data'
    ) THEN
        CREATE POLICY "System can insert analysis data"
        ON ai_market_analysis
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- AI Insights policies
DO $$
BEGIN
    -- Users can view insights
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_insights' 
        AND policyname = 'Users can view insights'
    ) THEN
        CREATE POLICY "Users can view insights"
        ON ai_insights
        FOR SELECT USING (true);
    END IF;

    -- System can insert insights
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_insights' 
        AND policyname = 'System can insert insights'
    ) THEN
        CREATE POLICY "System can insert insights"
        ON ai_insights
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Market Sentiment History policies
DO $$
BEGIN
    -- Users can view sentiment history
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'market_sentiment_history' 
        AND policyname = 'Users can view sentiment history'
    ) THEN
        CREATE POLICY "Users can view sentiment history"
        ON market_sentiment_history
        FOR SELECT USING (true);
    END IF;

    -- System can insert sentiment data
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'market_sentiment_history' 
        AND policyname = 'System can insert sentiment data'
    ) THEN
        CREATE POLICY "System can insert sentiment data"
        ON market_sentiment_history
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Risk Prediction History policies
DO $$
BEGIN
    -- Users can view risk predictions
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'risk_prediction_history' 
        AND policyname = 'Users can view risk predictions'
    ) THEN
        CREATE POLICY "Users can view risk predictions"
        ON risk_prediction_history
        FOR SELECT USING (true);
    END IF;

    -- System can insert risk predictions
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'risk_prediction_history' 
        AND policyname = 'System can insert risk predictions'
    ) THEN
        CREATE POLICY "System can insert risk predictions"
        ON risk_prediction_history
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Behavioral Pattern History policies
DO $$
BEGIN
    -- Users can view behavioral patterns
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'behavioral_pattern_history' 
        AND policyname = 'Users can view behavioral patterns'
    ) THEN
        CREATE POLICY "Users can view behavioral patterns"
        ON behavioral_pattern_history
        FOR SELECT USING (true);
    END IF;

    -- System can insert behavioral patterns
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'behavioral_pattern_history' 
        AND policyname = 'System can insert behavioral patterns'
    ) THEN
        CREATE POLICY "System can insert behavioral patterns"
        ON behavioral_pattern_history
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Market Correlation History policies
DO $$
BEGIN
    -- Users can view correlations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'market_correlation_history' 
        AND policyname = 'Users can view correlations'
    ) THEN
        CREATE POLICY "Users can view correlations"
        ON market_correlation_history
        FOR SELECT USING (true);
    END IF;

    -- System can insert correlations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'market_correlation_history' 
        AND policyname = 'System can insert correlations'
    ) THEN
        CREATE POLICY "System can insert correlations"
        ON market_correlation_history
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Volatility Prediction History policies
DO $$
BEGIN
    -- Users can view volatility predictions
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'volatility_prediction_history' 
        AND policyname = 'Users can view volatility predictions'
    ) THEN
        CREATE POLICY "Users can view volatility predictions"
        ON volatility_prediction_history
        FOR SELECT USING (true);
    END IF;

    -- System can insert volatility predictions
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'volatility_prediction_history' 
        AND policyname = 'System can insert volatility predictions'
    ) THEN
        CREATE POLICY "System can insert volatility predictions"
        ON volatility_prediction_history
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- AI Model Performance policies
DO $$
BEGIN
    -- Admins can view model performance
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_model_performance' 
        AND policyname = 'Admins can view model performance'
    ) THEN
        CREATE POLICY "Admins can view model performance"
        ON ai_model_performance
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'ADMIN'
            )
        );
    END IF;

    -- System can insert model performance
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_model_performance' 
        AND policyname = 'System can insert model performance'
    ) THEN
        CREATE POLICY "System can insert model performance"
        ON ai_model_performance
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Market Data Sources policies
DO $$
BEGIN
    -- Admins can manage data sources
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'market_data_sources' 
        AND policyname = 'Admins can manage data sources'
    ) THEN
        CREATE POLICY "Admins can manage data sources"
        ON market_data_sources
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'ADMIN'
            )
        );
    END IF;
END $$;

-- AI Analysis Config policies
DO $$
BEGIN
    -- Admins can manage config
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_analysis_config' 
        AND policyname = 'Admins can manage config'
    ) THEN
        CREATE POLICY "Admins can manage config"
        ON ai_analysis_config
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'ADMIN'
            )
        );
    END IF;
END $$;

-- =====================================================
-- TRIGGERS FOR UPDATED_AT COLUMNS
-- =====================================================

-- Create or replace the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DO $$
BEGIN
    -- AI Market Analysis trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_ai_market_analysis_updated_at'
    ) THEN
        CREATE TRIGGER update_ai_market_analysis_updated_at
            BEFORE UPDATE ON ai_market_analysis
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- AI Insights trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_ai_insights_updated_at'
    ) THEN
        CREATE TRIGGER update_ai_insights_updated_at
            BEFORE UPDATE ON ai_insights
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Market Data Sources trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_market_data_sources_updated_at'
    ) THEN
        CREATE TRIGGER update_market_data_sources_updated_at
            BEFORE UPDATE ON market_data_sources
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- AI Analysis Config trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_ai_analysis_config_updated_at'
    ) THEN
        CREATE TRIGGER update_ai_analysis_config_updated_at
            BEFORE UPDATE ON ai_analysis_config
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert sample AI analysis configuration
INSERT INTO ai_analysis_config (config_key, config_value, description) VALUES
('sentiment_weights', '{"news": 0.4, "technical": 0.4, "social": 0.2}', 'Weights for sentiment analysis factors'),
('risk_thresholds', '{"low": 25, "medium": 50, "high": 75, "critical": 100}', 'Risk level thresholds'),
('volatility_timeframes', '["1H", "4H", "1D", "1W"]', 'Available volatility prediction timeframes'),
('correlation_pairs', '["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD"]', 'Currency pairs for correlation analysis'),
('pattern_confidence_min', '60', 'Minimum confidence threshold for pattern recognition'),
('model_update_frequency', '"1D"', 'Frequency for updating AI model performance metrics')
ON CONFLICT (config_key) DO NOTHING;

-- Insert sample market data sources
INSERT INTO market_data_sources (source_name, source_type, api_endpoint, reliability_score) VALUES
('Alpha Vantage', 'price', 'https://www.alphavantage.co/', 0.9),
('News API', 'news', 'https://newsapi.org/', 0.85),
('Twitter API', 'social', 'https://developer.twitter.com/', 0.8),
('Economic Calendar', 'economic', 'https://www.investing.com/', 0.9),
('Technical Analysis', 'technical', 'internal', 0.95)
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify all tables were created
SELECT 
    'AI Market Analysis Tables' as feature,
    'Completed' as status,
    NOW() as completed_at;

-- Display table count
SELECT 
    schemaname,
    tablename,
    'Created' as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'ai_market_analysis',
    'ai_insights',
    'market_sentiment_history',
    'risk_prediction_history',
    'behavioral_pattern_history',
    'market_correlation_history',
    'volatility_prediction_history',
    'ai_model_performance',
    'market_data_sources',
    'ai_analysis_config'
)
ORDER BY tablename;

-- Display index count
SELECT 
    COUNT(*) as total_indexes,
    COUNT(*) FILTER (WHERE indexname LIKE 'idx_%') as performance_indexes
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
    'ai_market_analysis',
    'ai_insights',
    'market_sentiment_history',
    'risk_prediction_history',
    'behavioral_pattern_history',
    'market_correlation_history',
    'volatility_prediction_history',
    'ai_model_performance',
    'market_data_sources',
    'ai_analysis_config'
);
