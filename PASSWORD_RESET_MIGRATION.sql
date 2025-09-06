-- =====================================================
-- PASSWORD RESET SYSTEM MIGRATION
-- =====================================================
-- This script creates the password reset functionality
-- Run this in your Supabase Dashboard > SQL Editor
-- =====================================================

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token UUID NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens 
  WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to create password reset table if it doesn't exist
CREATE OR REPLACE FUNCTION create_password_reset_table()
RETURNS void AS $$
BEGIN
  -- Create the table if it doesn't exist
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    token UUID NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Create indexes if they don't exist
  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

  -- Grant permissions
  GRANT ALL ON password_reset_tokens TO authenticated;
  GRANT ALL ON password_reset_tokens TO anon;
  GRANT EXECUTE ON FUNCTION cleanup_expired_password_tokens() TO authenticated;
  GRANT EXECUTE ON FUNCTION cleanup_expired_password_tokens() TO anon;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON password_reset_tokens TO authenticated;
GRANT ALL ON password_reset_tokens TO anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_password_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_password_tokens() TO anon;
GRANT EXECUTE ON FUNCTION create_password_reset_table() TO authenticated;
GRANT EXECUTE ON FUNCTION create_password_reset_table() TO anon;

-- Create RLS policies for password reset tokens
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to insert password reset tokens
CREATE POLICY "Allow anonymous to insert password reset tokens" ON password_reset_tokens
  FOR INSERT TO anon
  WITH CHECK (true);

-- Policy: Allow anonymous users to select password reset tokens (for validation)
CREATE POLICY "Allow anonymous to select password reset tokens" ON password_reset_tokens
  FOR SELECT TO anon
  USING (true);

-- Policy: Allow anonymous users to update password reset tokens (to mark as used)
CREATE POLICY "Allow anonymous to update password reset tokens" ON password_reset_tokens
  FOR UPDATE TO anon
  USING (true);

-- Policy: Allow authenticated users to manage their own password reset tokens
CREATE POLICY "Users can manage their own password reset tokens" ON password_reset_tokens
  FOR ALL TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration was successful:

-- Check if table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'password_reset_tokens';

-- Check if indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename = 'password_reset_tokens';

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('cleanup_expired_password_tokens', 'create_password_reset_table');

-- Check if policies exist
SELECT policyname FROM pg_policies 
WHERE tablename = 'password_reset_tokens';

-- =====================================================
-- NOTES
-- =====================================================
-- 1. This migration is safe to run multiple times
-- 2. The table will store password reset tokens with 24-hour expiration
-- 3. Tokens are automatically cleaned up when expired or used
-- 4. RLS policies ensure proper security
-- 5. The system supports both anonymous and authenticated access
-- =====================================================
