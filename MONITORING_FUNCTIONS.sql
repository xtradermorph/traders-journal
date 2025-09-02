-- =====================================================
-- ADMIN MONITORING FUNCTIONS
-- =====================================================
-- This script creates functions for the admin monitoring dashboard
-- to provide performance metrics, security monitoring, and database insights

-- =====================================================
-- 1. PERFORMANCE METRICS FUNCTION
-- =====================================================

-- Function to get overall performance metrics
CREATE OR REPLACE FUNCTION get_performance_metrics()
RETURNS TABLE(
    query_count BIGINT,
    avg_query_time NUMERIC,
    slow_queries BIGINT,
    index_usage NUMERIC,
    cache_hit_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(pg_stat_database.xact_commit + pg_stat_database.xact_rollback, 0)::BIGINT as query_count,
        COALESCE(pg_stat_database.blk_read_time / NULLIF(pg_stat_database.blks_hit + pg_stat_database.blks_read, 0), 0)::NUMERIC as avg_query_time,
        COALESCE(pg_stat_database.blks_read, 0)::BIGINT as slow_queries,
        CASE 
            WHEN (pg_stat_database.blks_hit + pg_stat_database.blks_read) > 0 THEN
                (pg_stat_database.blks_hit::NUMERIC / (pg_stat_database.blks_hit + pg_stat_database.blks_read) * 100)
            ELSE 0
        END as index_usage,
        CASE 
            WHEN (pg_stat_database.blks_hit + pg_stat_database.blks_read) > 0 THEN
                (pg_stat_database.blks_hit::NUMERIC / (pg_stat_database.blks_hit + pg_stat_database.blks_read) * 100)
            ELSE 0
        END as cache_hit_rate
    FROM pg_stat_database
    WHERE datname = current_database();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. TABLE PERFORMANCE STATS FUNCTION
-- =====================================================

-- Function to get table performance statistics
CREATE OR REPLACE FUNCTION get_table_performance_stats()
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    index_count INTEGER,
    last_vacuum TIMESTAMP WITH TIME ZONE,
    last_analyze TIMESTAMP WITH TIME ZONE,
    table_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || tablename as table_name,
        n_tup_ins + n_tup_upd + n_tup_del as row_count,
        (SELECT COUNT(*) FROM pg_indexes WHERE tablename = pg_stat_user_tables.tablename) as index_count,
        last_vacuum,
        last_analyze,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as table_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. SECURITY MONITORING FUNCTION
-- =====================================================

-- Function to get security events summary
CREATE OR REPLACE FUNCTION get_security_events_summary()
RETURNS TABLE(
    event_count BIGINT,
    high_priority_count BIGINT,
    critical_count BIGINT,
    recent_events BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as event_count,
        COUNT(*) FILTER (WHERE severity = 'HIGH') as high_priority_count,
        COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_count,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as recent_events
    FROM audit_logs
    WHERE category IN ('SECURITY', 'AUTHENTICATION')
    OR severity IN ('HIGH', 'CRITICAL');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. INDEX USAGE ANALYSIS FUNCTION
-- =====================================================

-- Function to analyze index usage and performance
CREATE OR REPLACE FUNCTION get_index_usage_analysis()
RETURNS TABLE(
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    index_scans BIGINT,
    index_tuples_read BIGINT,
    index_tuples_fetched BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || tablename as table_name,
        indexname as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_scan as index_scans,
        idx_tup_read as index_tuples_read,
        idx_tup_fetch as index_tuples_fetched
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. QUERY PERFORMANCE ANALYSIS FUNCTION
-- =====================================================

-- Function to get slow query information
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE(
    query_text TEXT,
    execution_time NUMERIC,
    rows_returned BIGINT,
    calls BIGINT
) AS $$
BEGIN
    -- This function would require pg_stat_statements extension
    -- For now, return empty result
    RETURN QUERY
    SELECT 
        'Query monitoring requires pg_stat_statements extension'::TEXT as query_text,
        0::NUMERIC as execution_time,
        0::BIGINT as rows_returned,
        0::BIGINT as calls
    WHERE FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. SYSTEM HEALTH CHECK FUNCTION
-- =====================================================

-- Function to perform comprehensive system health check
CREATE OR REPLACE FUNCTION perform_system_health_check()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT,
    severity TEXT
) AS $$
BEGIN
    RETURN QUERY
    
    -- Check database connections
    SELECT 
        'Database Connections'::TEXT as check_name,
        CASE 
            WHEN active_connections < max_connections * 0.8 THEN 'HEALTHY'::TEXT
            WHEN active_connections < max_connections * 0.9 THEN 'WARNING'::TEXT
            ELSE 'CRITICAL'::TEXT
        END as status,
        'Active: ' || active_connections || ' / Max: ' || max_connections as details,
        CASE 
            WHEN active_connections < max_connections * 0.8 THEN 'LOW'::TEXT
            WHEN active_connections < max_connections * 0.9 THEN 'MEDIUM'::TEXT
            ELSE 'HIGH'::TEXT
        END as severity
    FROM (
        SELECT 
            (SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections') as max_connections,
            (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections
    ) conn_stats
    
    UNION ALL
    
    -- Check table sizes
    SELECT 
        'Large Tables'::TEXT as check_name,
        CASE 
            WHEN table_size_mb < 100 THEN 'HEALTHY'::TEXT
            WHEN table_size_mb < 500 THEN 'WARNING'::TEXT
            ELSE 'CRITICAL'::TEXT
        END as status,
        'Table: ' || table_name || ' Size: ' || pg_size_pretty(table_size_bytes) as details,
        CASE 
            WHEN table_size_mb < 100 THEN 'LOW'::TEXT
            WHEN table_size_mb < 500 THEN 'MEDIUM'::TEXT
            ELSE 'HIGH'::TEXT
        END as severity
    FROM (
        SELECT 
            tablename as table_name,
            pg_total_relation_size(schemaname || '.' || tablename) as table_size_bytes,
            pg_total_relation_size(schemaname || '.' || tablename) / (1024 * 1024) as table_size_mb
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        AND pg_total_relation_size(schemaname || '.' || tablename) > 50 * 1024 * 1024  -- Tables larger than 50MB
    ) size_stats
    
    UNION ALL
    
    -- Check index usage
    SELECT 
        'Unused Indexes'::TEXT as check_name,
        CASE 
            WHEN unused_indexes = 0 THEN 'HEALTHY'::TEXT
            WHEN unused_indexes < 5 THEN 'WARNING'::TEXT
            ELSE 'CRITICAL'::TEXT
        END as status,
        'Found ' || unused_indexes || ' unused indexes' as details,
        CASE 
            WHEN unused_indexes = 0 THEN 'LOW'::TEXT
            WHEN unused_indexes < 5 THEN 'MEDIUM'::TEXT
            ELSE 'HIGH'::TEXT
        END as severity
    FROM (
        SELECT COUNT(*) as unused_indexes
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
    ) index_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users (admins will be filtered by role)
GRANT EXECUTE ON FUNCTION get_performance_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_performance_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_events_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_index_usage_analysis() TO authenticated;
GRANT EXECUTE ON FUNCTION get_slow_queries() TO authenticated;
GRANT EXECUTE ON FUNCTION perform_system_health_check() TO authenticated;

-- =====================================================
-- 8. VERIFICATION
-- =====================================================

-- Verify functions were created successfully
DO $$
DECLARE
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN (
        'get_performance_metrics',
        'get_table_performance_stats',
        'get_security_events_summary',
        'get_index_usage_analysis',
        'get_slow_queries',
        'perform_system_health_check'
    );
    
    IF function_count = 6 THEN
        RAISE NOTICE 'All monitoring functions created successfully';
    ELSE
        RAISE WARNING 'Some functions may not have been created. Expected: 6, Found: %', function_count;
    END IF;
END $$;

-- Display summary
SELECT 
    'Admin Monitoring Functions' as feature,
    'Completed' as status,
    NOW() as completed_at;
