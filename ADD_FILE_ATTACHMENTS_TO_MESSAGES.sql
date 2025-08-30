-- Add file attachment columns to messages table
-- Run this in your Supabase SQL editor

-- Add file_url and file_name columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Add message_type column if it doesn't exist
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- Create index for better performance on file queries
CREATE INDEX IF NOT EXISTS idx_messages_file_url ON messages(file_url) WHERE file_url IS NOT NULL;

-- Update existing messages to have default message_type
UPDATE messages SET message_type = 'text' WHERE message_type IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('file_url', 'file_name', 'message_type')
ORDER BY column_name;
