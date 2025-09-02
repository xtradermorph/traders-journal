-- Database Performance Optimization Scripts
-- Run these in your Supabase SQL editor for improved performance

-- =====================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =====================================================

-- 1. Trades Table - Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_trades_user_date_currency 
ON trades(user_id, date DESC, currency_pair);

CREATE INDEX IF NOT EXISTS idx_trades_user_type_date 
ON trades(user_id, trade_type, date DESC);

CREATE INDEX IF NOT EXISTS idx_trades_user_profit_date 
ON trades(user_id, profit_loss DESC, date DESC);

CREATE INDEX IF NOT EXISTS idx_trades_currency_date 
ON trades(currency_pair, date DESC);

-- 2. Messages Table - Composite indexes for conversation queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_read 
ON messages(sender_id, receiver_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread 
ON messages(receiver_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_date 
ON messages(sender_id, created_at DESC);

-- 3. Shared Trades Table - Composite indexes for forum and sharing
CREATE INDEX IF NOT EXISTS idx_shared_trades_forum_active_date 
ON shared_trades(forum_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_trades_user_date 
ON shared_trades(shared_by_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_trades_recipient_date 
ON shared_trades(shared_with_user_id, created_at DESC);

-- 4. Top Down Analysis Table - Composite indexes for analysis queries
CREATE INDEX IF NOT EXISTS idx_tda_user_currency_date 
ON top_down_analyses(user_id, currency_pair, analysis_date DESC);

CREATE INDEX IF NOT EXISTS idx_tda_user_status_date 
ON top_down_analyses(user_id, status, analysis_date DESC);

-- 5. Trade Setups Table - Composite indexes for forum queries
CREATE INDEX IF NOT EXISTS idx_setups_forum_public_date 
ON trade_setups(forum_id, is_public, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_setups_user_forum_date 
ON trade_setups(user_id, forum_id, created_at DESC);

-- 6. Comments Table - Composite indexes for threaded comments
CREATE INDEX IF NOT EXISTS idx_comments_parent_created 
ON trade_setup_comments(parent_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_comments_setup_created 
ON trade_setup_comments(trade_setup_id, created_at DESC);

-- =====================================================
-- FULL-TEXT SEARCH INDEXES
-- =====================================================

-- 1. Trade Notes - Full-text search for trade analysis
CREATE INDEX IF NOT EXISTS idx_trades_notes_fts 
ON trades USING gin(to_tsvector('english', notes));

-- 2. Trade Setup Descriptions - Full-text search for setups
CREATE INDEX IF NOT EXISTS idx_setups_description_fts 
ON trade_setups USING gin(to_tsvector('english', description));

-- 3. User Bios - Full-text search for user profiles
CREATE INDEX IF NOT EXISTS idx_profiles_bio_fts 
ON profiles USING gin(to_tsvector('english', bio));

-- =====================================================
-- PARTIAL INDEXES FOR ACTIVE DATA
-- =====================================================

-- 1. Active shared trades only
CREATE INDEX IF NOT EXISTS idx_shared_trades_active_only 
ON shared_trades(created_at DESC) WHERE is_active = true;

-- 2. Unread messages only
CREATE INDEX IF NOT EXISTS idx_messages_unread_only 
ON messages(receiver_id, created_at DESC) WHERE is_read = false;

-- 3. Recent trades only (last 30 days) - Removed due to NOW() function not being IMMUTABLE
-- Alternative: Use a regular index and filter in queries
-- CREATE INDEX IF NOT EXISTS idx_trades_recent_only 
-- ON trades(user_id, date DESC) WHERE date > NOW() - INTERVAL '30 days';

-- =====================================================
-- FUNCTION-BASED INDEXES - REMOVED DUE TO IMMUTABLE REQUIREMENTS
-- =====================================================

-- 1. Date-based indexes for common time queries - EXTRACT() function not IMMUTABLE
-- Alternative: Use regular indexes and filter in queries
-- CREATE INDEX IF NOT EXISTS idx_trades_date_month 
-- ON trades(EXTRACT(MONTH FROM date), EXTRACT(YEAR FROM date));

-- CREATE INDEX IF NOT EXISTS idx_trades_date_week 
-- ON trades(EXTRACT(WEEK FROM date), EXTRACT(YEAR FROM date));

-- 2. Performance-based indexes - ABS() function not IMMUTABLE
-- Alternative: Use regular indexes and filter in queries
-- CREATE INDEX IF NOT EXISTS idx_trades_profit_abs 
-- ON trades(ABS(profit_loss) DESC);

-- =====================================================
-- STATISTICS AND ANALYZE
-- =====================================================

-- Update table statistics for better query planning
ANALYZE trades;
ANALYZE messages;
ANALYZE shared_trades;
ANALYZE top_down_analyses;
ANALYZE trade_setups;
ANALYZE trade_setup_comments;
ANALYZE profiles;

-- =====================================================
-- QUERY OPTIMIZATION VIEWS
-- =====================================================

-- 1. User Trading Summary View
CREATE OR REPLACE VIEW user_trading_summary AS
SELECT 
    user_id,
    COUNT(*) as total_trades,
    COUNT(*) FILTER (WHERE trade_type = 'LONG') as long_trades,
    COUNT(*) FILTER (WHERE trade_type = 'SHORT') as short_trades,
    SUM(profit_loss) as total_pnl,
    AVG(profit_loss) as avg_pnl,
    SUM(profit_loss) FILTER (WHERE profit_loss > 0) as total_profit,
    SUM(profit_loss) FILTER (WHERE profit_loss < 0) as total_loss,
    MAX(date) as last_trade_date
FROM trades
GROUP BY user_id;

-- 2. Currency Pair Performance View
CREATE OR REPLACE VIEW currency_pair_performance AS
SELECT 
    currency_pair,
    COUNT(*) as total_trades,
    AVG(profit_loss) as avg_pnl,
    SUM(profit_loss) as total_pnl,
    COUNT(*) FILTER (WHERE profit_loss > 0) as profitable_trades,
    COUNT(*) FILTER (WHERE profit_loss < 0) as losing_trades
FROM trades
GROUP BY currency_pair;

-- 3. Monthly Performance View
CREATE OR REPLACE VIEW monthly_performance AS
SELECT 
    user_id,
    EXTRACT(YEAR FROM date) as year,
    EXTRACT(MONTH FROM date) as month,
    COUNT(*) as trades_count,
    SUM(profit_loss) as monthly_pnl,
    AVG(profit_loss) as avg_trade_pnl
FROM trades
GROUP BY user_id, EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date);

-- =====================================================
-- PERFORMANCE MONITORING QUERIES
-- =====================================================

-- Check index usage
SELECT 
    s.schemaname,
    s.relname as tablename,
    s.indexrelname as indexname,
    s.idx_scan,
    s.idx_tup_read,
    s.idx_tup_fetch
FROM pg_stat_user_indexes s
ORDER BY s.idx_scan DESC;

-- Check table statistics
SELECT 
    s.schemaname,
    s.relname as tablename,
    s.n_tup_ins,
    s.n_tup_upd,
    s.n_tup_del,
    s.n_live_tup,
    s.n_dead_tup,
    s.last_vacuum,
    s.last_autovacuum
FROM pg_stat_user_tables s
ORDER BY s.n_live_tup DESC;

-- Check slow queries (if pg_stat_statements is enabled)
-- SELECT query, calls, total_time, mean_time
-- FROM pg_stat_statements
-- ORDER BY mean_time DESC
-- LIMIT 10;

-- =====================================================
-- MAINTENANCE SCRIPTS
-- =====================================================

-- Vacuum and analyze tables (run periodically)
-- VACUUM ANALYZE trades;
-- VACUUM ANALYZE messages;
-- VACUUM ANALYZE shared_trades;

-- Reindex tables if needed (run during low traffic)
-- REINDEX TABLE trades;
-- REINDEX TABLE messages;
-- REINDEX TABLE shared_trades;

-- =====================================================
-- CONNECTION POOLING CONFIGURATION
-- =====================================================

-- Note: Connection pooling is configured in your .env file
-- The following settings are recommended for Supabase:

-- PGPOOLER_MAX_CLIENT_CONN=100
-- PGPOOLER_DEFAULT_POOL_SIZE=20
-- PGPOOLER_MAX_DB_CONNECTIONS=50
-- PGPOOLER_MAX_USER_CONNECTIONS=20

-- =====================================================
-- CACHING RECOMMENDATIONS
-- =====================================================

-- 1. Application-level caching for:
--    - User profiles (cache for 5 minutes)
--    - Trade summaries (cache for 1 minute)
--    - AI analysis results (cache for 15 minutes)
--    - Forum posts (cache for 2 minutes)

-- 2. Database query result caching:
--    - Use Redis for frequently accessed data
--    - Cache user settings and preferences
--    - Cache trading statistics and analytics

-- 3. Static asset caching:
--    - Cache images and files in CDN
--    - Use browser caching for static resources
--    - Implement service worker for offline caching

-- =====================================================
-- MONITORING AND ALERTS
-- =====================================================

-- Create monitoring functions for performance tracking
CREATE OR REPLACE FUNCTION check_table_sizes()
RETURNS TABLE(table_name text, size text) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name as table_name,
        pg_size_pretty(pg_total_relation_size(t.table_name::regclass)) as size
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    ORDER BY pg_total_relation_size(t.table_name::regclass) DESC;
END;
$$ LANGUAGE plpgsql;

-- Check table sizes
-- SELECT * FROM check_table_sizes();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify indexes were created
SELECT 
    i.schemaname,
    i.tablename,
    i.indexname,
    i.indexdef
FROM pg_indexes i
WHERE i.schemaname = 'public'
AND i.indexname LIKE 'idx_%'
ORDER BY i.tablename, i.indexname;

-- Check index usage statistics
SELECT 
    i.tablename,
    i.indexname,
    s.idx_scan,
    s.idx_tup_read,
    s.idx_tup_fetch
FROM pg_stat_user_indexes s
JOIN pg_indexes i ON s.indexrelname = i.indexname
WHERE i.indexname LIKE 'idx_%'
ORDER BY s.idx_scan DESC;
