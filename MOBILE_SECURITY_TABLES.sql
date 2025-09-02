-- =====================================================
-- MOBILE & SECURITY ENHANCEMENT TABLES
-- =====================================================
-- This script creates tables for biometric authentication,
-- push notifications, and enhanced audit logging

-- =====================================================
-- 1. BIOMETRIC AUTHENTICATION TABLES
-- =====================================================

-- Table for storing biometric credentials
CREATE TABLE IF NOT EXISTS user_biometric_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    sign_count BIGINT DEFAULT 0,
    transports TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one credential per user
    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_user_id 
ON user_biometric_credentials(user_id);

-- =====================================================
-- 2. PUSH NOTIFICATION TABLES
-- =====================================================

-- Table for push notification subscriptions
CREATE TABLE IF NOT EXISTS push_notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one subscription per user
    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
ON push_notification_subscriptions(user_id);

-- Table for push notification history
CREATE TABLE IF NOT EXISTS push_notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    action_taken TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Index for performance
    CONSTRAINT valid_notification_type CHECK (
        notification_type IN (
            'trade_alert', 'friend_request', 'trade_shared', 
            'medal_achievement', 'system_notification'
        )
    )
);

-- Indexes for push notification history
CREATE INDEX IF NOT EXISTS idx_push_history_user_id 
ON push_notification_history(user_id);

CREATE INDEX IF NOT EXISTS idx_push_history_sent_at 
ON push_notification_history(sent_at);

CREATE INDEX IF NOT EXISTS idx_push_history_type 
ON push_notification_history(notification_type);

-- =====================================================
-- 3. ENHANCED AUDIT LOGGING TABLES
-- =====================================================

-- Enhanced audit logs table (if not exists, add new columns)
DO $$ 
BEGIN
    -- Add new columns to existing audit_logs table if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_logs' AND column_name = 'severity') THEN
        ALTER TABLE audit_logs ADD COLUMN severity TEXT DEFAULT 'MEDIUM';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_logs' AND column_name = 'category') THEN
        ALTER TABLE audit_logs ADD COLUMN category TEXT DEFAULT 'SYSTEM';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_logs' AND column_name = 'metadata') THEN
        ALTER TABLE audit_logs ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add constraints for new columns (using DO block to handle IF NOT EXISTS)
DO $$ 
BEGIN
    -- Add severity constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_severity' 
        AND table_name = 'audit_logs'
    ) THEN
        ALTER TABLE audit_logs 
        ADD CONSTRAINT valid_severity 
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));
    END IF;
    
    -- Add category constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_category' 
        AND table_name = 'audit_logs'
    ) THEN
        ALTER TABLE audit_logs 
        ADD CONSTRAINT valid_category 
        CHECK (category IN ('AUTHENTICATION', 'TRADE', 'USER_PROFILE', 'SYSTEM', 'SECURITY', 'DATA_ACCESS'));
    END IF;
END $$;

-- =====================================================
-- 4. OFFLINE MODE TABLES
-- =====================================================

-- Table for tracking offline sync status
CREATE TABLE IF NOT EXISTS offline_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_status TEXT DEFAULT 'pending',
    pending_items_count INTEGER DEFAULT 0,
    failed_items_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one sync status per user
    UNIQUE(user_id),
    
    CONSTRAINT valid_sync_status CHECK (
        sync_status IN ('pending', 'syncing', 'completed', 'failed')
    )
);

-- Index for offline sync status
CREATE INDEX IF NOT EXISTS idx_offline_sync_user_id 
ON offline_sync_status(user_id);

CREATE INDEX IF NOT EXISTS idx_offline_sync_status 
ON offline_sync_status(sync_status);

-- =====================================================
-- 5. MOBILE DEVICE TRACKING
-- =====================================================

-- Table for tracking mobile devices
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_type TEXT NOT NULL,
    device_name TEXT,
    os_name TEXT,
    os_version TEXT,
    browser_name TEXT,
    browser_version TEXT,
    is_mobile BOOLEAN DEFAULT false,
    is_tablet BOOLEAN DEFAULT false,
    screen_resolution TEXT,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique device per user
    UNIQUE(user_id, device_id),
    
    CONSTRAINT valid_device_type CHECK (
        device_type IN ('mobile', 'tablet', 'desktop', 'unknown')
    )
);

-- Indexes for user devices
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id 
ON user_devices(user_id);

CREATE INDEX IF NOT EXISTS idx_user_devices_device_type 
ON user_devices(device_type);

CREATE INDEX IF NOT EXISTS idx_user_devices_last_used 
ON user_devices(last_used_at);

-- =====================================================
-- 6. SECURITY MONITORING TABLES
-- =====================================================

-- Table for security alerts
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_alert_type CHECK (
        alert_type IN (
            'suspicious_login', 'multiple_failed_attempts', 
            'unusual_activity', 'data_access_violation',
            'permission_change', 'system_anomaly'
        )
    ),
    
    CONSTRAINT valid_severity CHECK (
        severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
    )
);

-- Indexes for security alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id 
ON security_alerts(user_id);

CREATE INDEX IF NOT EXISTS idx_security_alerts_type 
ON security_alerts(alert_type);

CREATE INDEX IF NOT EXISTS idx_security_alerts_severity 
ON security_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved 
ON security_alerts(is_resolved);

-- =====================================================
-- 7. COMPLIANCE REPORTING TABLES
-- =====================================================

-- Table for compliance reports
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    generated_by UUID REFERENCES profiles(id),
    report_data JSONB NOT NULL,
    compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
    risk_indicators TEXT[],
    recommendations TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_report_type CHECK (
        report_type IN (
            'daily', 'weekly', 'monthly', 'quarterly', 'yearly',
            'incident', 'audit', 'security', 'compliance'
        )
    )
);

-- Indexes for compliance reports
CREATE INDEX IF NOT EXISTS idx_compliance_reports_type 
ON compliance_reports(report_type);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_period 
ON compliance_reports(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_score 
ON compliance_reports(compliance_score);

-- =====================================================
-- 8. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE user_biometric_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

-- Biometric credentials policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_biometric_credentials' 
        AND policyname = 'Users can manage their own biometric credentials'
    ) THEN
        CREATE POLICY "Users can manage their own biometric credentials"
        ON user_biometric_credentials
        FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Push notification subscriptions policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'push_notification_subscriptions' 
        AND policyname = 'Users can manage their own push subscriptions'
    ) THEN
        CREATE POLICY "Users can manage their own push subscriptions"
        ON push_notification_subscriptions
        FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Push notification history policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'push_notification_history' 
        AND policyname = 'Users can view their own notification history'
    ) THEN
        CREATE POLICY "Users can view their own notification history"
        ON push_notification_history
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'push_notification_history' 
        AND policyname = 'System can insert notification history'
    ) THEN
        CREATE POLICY "System can insert notification history"
        ON push_notification_history
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Offline sync status policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'offline_sync_status' 
        AND policyname = 'Users can view their own sync status'
    ) THEN
        CREATE POLICY "Users can view their own sync status"
        ON offline_sync_status
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'offline_sync_status' 
        AND policyname = 'Users can update their own sync status'
    ) THEN
        CREATE POLICY "Users can update their own sync status"
        ON offline_sync_status
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- User devices policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_devices' 
        AND policyname = 'Users can manage their own devices'
    ) THEN
        CREATE POLICY "Users can manage their own devices"
        ON user_devices
        FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Security alerts policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'security_alerts' 
        AND policyname = 'Users can view their own security alerts'
    ) THEN
        CREATE POLICY "Users can view their own security alerts"
        ON security_alerts
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'security_alerts' 
        AND policyname = 'Admins can view all security alerts'
    ) THEN
        CREATE POLICY "Admins can view all security alerts"
        ON security_alerts
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'ADMIN'
            )
        );
    END IF;
END $$;

-- Compliance reports policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'compliance_reports' 
        AND policyname = 'Admins can view compliance reports'
    ) THEN
        CREATE POLICY "Admins can view compliance reports"
        ON compliance_reports
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'ADMIN'
            )
        );
    END IF;
END $$;

-- =====================================================
-- 9. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
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
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_biometric_credentials_updated_at'
    ) THEN
        CREATE TRIGGER update_biometric_credentials_updated_at
            BEFORE UPDATE ON user_biometric_credentials
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_push_subscriptions_updated_at'
    ) THEN
        CREATE TRIGGER update_push_subscriptions_updated_at
            BEFORE UPDATE ON push_notification_subscriptions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_offline_sync_updated_at'
    ) THEN
        CREATE TRIGGER update_offline_sync_updated_at
            BEFORE UPDATE ON offline_sync_status
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_devices_updated_at'
    ) THEN
        CREATE TRIGGER update_user_devices_updated_at
            BEFORE UPDATE ON user_devices
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_security_alerts_updated_at'
    ) THEN
        CREATE TRIGGER update_security_alerts_updated_at
            BEFORE UPDATE ON security_alerts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- 10. PERFORMANCE INDEXES
-- =====================================================

-- Composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_severity_category
ON audit_logs(user_id, severity, category);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_severity
ON audit_logs(created_at, severity);

CREATE INDEX IF NOT EXISTS idx_push_history_user_type_sent
ON push_notification_history(user_id, notification_type, sent_at);

CREATE INDEX IF NOT EXISTS idx_security_alerts_user_severity_resolved
ON security_alerts(user_id, severity, is_resolved);

-- Full-text search indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_fts
ON audit_logs USING gin(to_tsvector('english', action));

CREATE INDEX IF NOT EXISTS idx_security_alerts_description_fts
ON security_alerts USING gin(to_tsvector('english', description));

-- =====================================================
-- 11. DATA CLEANUP AND MAINTENANCE
-- =====================================================

-- Function to clean up old audit logs (keep last 2 years)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old push notification history (keep last 6 months)
CREATE OR REPLACE FUNCTION cleanup_old_push_history()
RETURNS void AS $$
BEGIN
    DELETE FROM push_notification_history 
    WHERE sent_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up resolved security alerts (keep last 1 year)
CREATE OR REPLACE FUNCTION cleanup_resolved_security_alerts()
RETURNS void AS $$
BEGIN
    DELETE FROM security_alerts 
    WHERE is_resolved = true 
    AND resolved_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. MONITORING AND ALERTS
-- =====================================================

-- Function to check for suspicious activity
CREATE OR REPLACE FUNCTION check_suspicious_activity()
RETURNS TABLE(
    user_id UUID,
    alert_type TEXT,
    severity TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Multiple failed login attempts
    SELECT 
        al.user_id,
        'multiple_failed_attempts'::TEXT,
        'HIGH'::TEXT,
        'Multiple failed login attempts detected'::TEXT
    FROM audit_logs al
    WHERE al.action = 'LOGIN_FAILED'
    AND al.created_at > NOW() - INTERVAL '1 hour'
    GROUP BY al.user_id
    HAVING COUNT(*) >= 5;

    -- Unusual data access patterns
    RETURN QUERY
    SELECT 
        al.user_id,
        'unusual_activity'::TEXT,
        'MEDIUM'::TEXT,
        'Unusual data access pattern detected'::TEXT
    FROM audit_logs al
    WHERE al.category = 'DATA_ACCESS'
    AND al.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY al.user_id
    HAVING COUNT(*) >= 100;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. VERIFICATION AND SUMMARY
-- =====================================================

-- Verify all tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'user_biometric_credentials',
        'push_notification_subscriptions',
        'push_notification_history',
        'offline_sync_status',
        'user_devices',
        'security_alerts',
        'compliance_reports'
    );
    
    IF table_count = 7 THEN
        RAISE NOTICE 'All mobile and security tables created successfully';
    ELSE
        RAISE WARNING 'Some tables may not have been created. Expected: 7, Found: %', table_count;
    END IF;
END $$;

-- Display summary of what was created
SELECT 
    'Mobile & Security Enhancement Tables' as feature,
    'Completed' as status,
    NOW() as completed_at;
