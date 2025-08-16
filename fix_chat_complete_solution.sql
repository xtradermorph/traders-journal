-- COMPLETE CHAT FIX - Fix all RLS policies and function permissions
-- This will resolve infinite recursion and message creation issues

-- Step 1: Temporarily disable RLS to clean up
ALTER TABLE chat_group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_invitations DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "chat_group_members_delete_policy" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_insert_policy" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_select_policy" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_update_policy" ON chat_group_members;

DROP POLICY IF EXISTS "Members can view their chat groups" ON chat_groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON chat_groups;
DROP POLICY IF EXISTS "Allow all authenticated inserts" ON chat_groups;

DROP POLICY IF EXISTS "Group members can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Group members can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Sender can delete their own message" ON chat_messages;

DROP POLICY IF EXISTS "Group members can send invitations" ON chat_group_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON chat_group_invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON chat_group_invitations;

-- Step 3: Re-enable RLS
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_invitations ENABLE ROW LEVEL SECURITY;

-- Step 4: Create SIMPLE, non-recursive policies

-- Chat Group Members - Simple policies
CREATE POLICY "members_own_data" ON chat_group_members
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Chat Groups - Simple policies
CREATE POLICY "groups_own_data" ON chat_groups
    FOR ALL TO authenticated
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());

-- Chat Messages - Simple policies
CREATE POLICY "messages_own_data" ON chat_messages
    FOR ALL TO authenticated
    USING (sender_id = auth.uid())
    WITH CHECK (sender_id = auth.uid());

-- Chat Invitations - Simple policies
CREATE POLICY "invitations_own_data" ON chat_group_invitations
    FOR ALL TO authenticated
    USING (invitee_id = auth.uid() OR inviter_id = auth.uid())
    WITH CHECK (inviter_id = auth.uid());

-- Step 5: Create additional policies for group functionality (non-recursive)
-- These policies allow group members to see each other's content

-- Allow group members to see messages in their groups
CREATE POLICY "messages_group_access" ON chat_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_group_members cgm
            WHERE cgm.group_id = chat_messages.group_id
            AND cgm.user_id = auth.uid()
        )
    );

-- Allow group members to see group info
CREATE POLICY "groups_member_access" ON chat_groups
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_group_members cgm
            WHERE cgm.group_id = chat_groups.id
            AND cgm.user_id = auth.uid()
        )
    );

-- Allow group members to see invitations
CREATE POLICY "invitations_group_access" ON chat_group_invitations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_group_members cgm
            WHERE cgm.group_id = chat_group_invitations.group_id
            AND cgm.user_id = auth.uid()
        )
    );

-- Step 6: Fix the create_or_get_direct_chat function
-- Drop and recreate with proper permissions
DROP FUNCTION IF EXISTS create_or_get_direct_chat(uuid);

CREATE OR REPLACE FUNCTION create_or_get_direct_chat(
    recipient_id_param uuid
)
RETURNS TABLE (group_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_group_id uuid;
    new_group_id uuid;
    current_user_id uuid := auth.uid();
BEGIN
    -- Check if a direct chat between the two users already exists
    SELECT g.id INTO existing_group_id
    FROM chat_groups g
    JOIN chat_group_members m1 ON g.id = m1.group_id
    JOIN chat_group_members m2 ON g.id = m2.group_id
    WHERE g.is_direct = TRUE
      AND m1.user_id = current_user_id
      AND m2.user_id = recipient_id_param;

    IF existing_group_id IS NOT NULL THEN
        -- If it exists, return the existing group_id
        RETURN QUERY SELECT existing_group_id;
    ELSE
        -- If it doesn't exist, create a new group and add members
        -- 1. Create the new chat group
        INSERT INTO chat_groups (name, creator_id, is_direct)
        VALUES ('Direct Chat', current_user_id, TRUE)
        RETURNING id INTO new_group_id;

        -- 2. Add the current user as a member
        INSERT INTO chat_group_members (group_id, user_id)
        VALUES (new_group_id, current_user_id);

        -- 3. Add the recipient as a member
        INSERT INTO chat_group_members (group_id, user_id)
        VALUES (new_group_id, recipient_id_param);

        -- 4. Return the new group_id
        RETURN QUERY SELECT new_group_id;
    END IF;
END;
$$;

-- Step 7: Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_or_get_direct_chat(uuid) TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 8: Ensure tables have proper permissions
GRANT ALL ON chat_groups TO authenticated;
GRANT ALL ON chat_group_members TO authenticated;
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON chat_group_invitations TO authenticated;

-- Step 9: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_group_members_user_id ON chat_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_group_id ON chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_group_id ON chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
