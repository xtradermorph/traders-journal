-- Fix Chat Foreign Key Relationships
-- This script fixes the missing foreign key relationships that are causing ChatWidget errors

-- 1. Fix chat_group_members foreign key to chat_groups
ALTER TABLE chat_group_members 
ADD CONSTRAINT chat_group_members_group_id_fkey 
FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE;

-- 2. Fix chat_group_members foreign key to profiles
ALTER TABLE chat_group_members 
ADD CONSTRAINT chat_group_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. Fix chat_group_invitations foreign key to chat_groups
ALTER TABLE chat_group_invitations 
ADD CONSTRAINT chat_group_invitations_group_id_fkey 
FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE;

-- 4. Fix chat_group_invitations foreign key to profiles (inviter_id)
ALTER TABLE chat_group_invitations 
ADD CONSTRAINT chat_group_invitations_inviter_id_fkey 
FOREIGN KEY (inviter_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 5. Fix chat_group_invitations foreign key to profiles (invitee_id)
ALTER TABLE chat_group_invitations 
ADD CONSTRAINT chat_group_invitations_invitee_id_fkey 
FOREIGN KEY (invitee_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 6. Fix chat_groups foreign key to profiles (creator_id)
ALTER TABLE chat_groups 
ADD CONSTRAINT chat_groups_creator_id_fkey 
FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 7. Fix chat_messages foreign key to chat_groups
ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_group_id_fkey 
FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE;

-- 8. Fix chat_messages foreign key to profiles (sender_id)
ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Verify the constraints were created
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
