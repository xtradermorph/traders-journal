-- Check and Fix Chat Foreign Key Relationships (Fixed Version)
-- This script checks if foreign key constraints exist before creating them

-- Function to safely add foreign key constraint
CREATE OR REPLACE FUNCTION add_foreign_key_if_not_exists(
    p_table_name text,
    p_column_name text,
    p_foreign_table_name text,
    p_foreign_column_name text,
    p_constraint_name text
) RETURNS void AS $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = p_constraint_name
        AND table_schema = 'public'
    ) THEN
        -- Add the constraint
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(%I) ON DELETE CASCADE',
            p_table_name, p_constraint_name, p_column_name, p_foreign_table_name, p_foreign_column_name
        );
        RAISE NOTICE 'Added foreign key constraint: %', p_constraint_name;
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists: %', p_constraint_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add foreign key constraints safely
SELECT add_foreign_key_if_not_exists('chat_group_members', 'group_id', 'chat_groups', 'id', 'chat_group_members_group_id_fkey');
SELECT add_foreign_key_if_not_exists('chat_group_members', 'user_id', 'profiles', 'id', 'chat_group_members_user_id_fkey');
SELECT add_foreign_key_if_not_exists('chat_group_invitations', 'group_id', 'chat_groups', 'id', 'chat_group_invitations_group_id_fkey');
SELECT add_foreign_key_if_not_exists('chat_group_invitations', 'inviter_id', 'profiles', 'id', 'chat_group_invitations_inviter_id_fkey');
SELECT add_foreign_key_if_not_exists('chat_group_invitations', 'invitee_id', 'profiles', 'id', 'chat_group_invitations_invitee_id_fkey');
SELECT add_foreign_key_if_not_exists('chat_groups', 'creator_id', 'profiles', 'id', 'chat_groups_creator_id_fkey');
SELECT add_foreign_key_if_not_exists('chat_messages', 'group_id', 'chat_groups', 'id', 'chat_messages_group_id_fkey');
SELECT add_foreign_key_if_not_exists('chat_messages', 'sender_id', 'profiles', 'id', 'chat_messages_sender_id_fkey');

-- Clean up the function
DROP FUNCTION add_foreign_key_if_not_exists(text, text, text, text, text);

-- Verify all constraints are in place
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('chat_group_members', 'chat_group_invitations', 'chat_groups', 'chat_messages')
ORDER BY tc.table_name, tc.constraint_name;
