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

  -- Create cleanup function if it doesn't exist
  CREATE OR REPLACE FUNCTION cleanup_expired_password_tokens()
  RETURNS void AS $$
  BEGIN
    DELETE FROM password_reset_tokens 
    WHERE expires_at < NOW() OR used = TRUE;
  END;
  $$ LANGUAGE plpgsql;

  -- Grant permissions
  GRANT ALL ON password_reset_tokens TO authenticated;
  GRANT ALL ON password_reset_tokens TO anon;
  GRANT EXECUTE ON FUNCTION cleanup_expired_password_tokens() TO authenticated;
  GRANT EXECUTE ON FUNCTION cleanup_expired_password_tokens() TO anon;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the RPC function
GRANT EXECUTE ON FUNCTION create_password_reset_table() TO authenticated;
GRANT EXECUTE ON FUNCTION create_password_reset_table() TO anon;
