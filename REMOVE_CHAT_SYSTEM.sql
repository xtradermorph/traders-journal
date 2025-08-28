-- SQL Scripts to Remove Chat Widget System from Supabase
-- Run these scripts in your Supabase SQL Editor

-- 1. Drop Chat-Related Functions
DROP FUNCTION IF EXISTS public.create_or_get_direct_chat(recipient_id_param uuid);

-- 2. Drop Chat-Related Tables (in correct order due to foreign key constraints)
-- First drop tables that reference other tables
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_group_members CASCADE;
DROP TABLE IF EXISTS public.chat_group_invitations CASCADE;

-- Then drop the main chat_groups table
DROP TABLE IF EXISTS public.chat_groups CASCADE;

-- 3. Verify removal (optional - run to confirm tables are gone)
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name LIKE 'chat_%';

-- 4. Clean up any remaining indexes (if any)
-- These will be automatically dropped with the tables, but you can verify:
-- SELECT indexname FROM pg_indexes WHERE tablename LIKE 'chat_%';

-- 5. Clean up any remaining policies (if any)
-- These will be automatically dropped with the tables, but you can verify:
-- SELECT policyname FROM pg_policies WHERE tablename LIKE 'chat_%';

-- Note: The existing 'messages' table will remain as it's used for the new direct messaging system
-- This table already has the correct structure for direct messaging between users
