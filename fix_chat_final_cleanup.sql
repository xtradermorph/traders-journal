-- FINAL CHAT CLEANUP - Remove ALL conflicting policies and create clean ones
-- This will resolve the database issues completely

-- Step 1: Disable RLS completely
ALTER TABLE chat_group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_invitations DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (comprehensive cleanup)
-- Chat Group Members
DROP POLICY IF EXISTS "chat_group_members_delete_policy" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_insert_policy" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_select_policy" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_update_policy" ON chat_group_members;
DROP POLICY IF EXISTS "chat_members_select" ON chat_group_members;
DROP POLICY IF EXISTS "chat_members_insert" ON chat_group_members;
DROP POLICY IF EXISTS "chat_members_update" ON chat_group_members;
DROP POLICY IF EXISTS "chat_members_delete" ON chat_group_members;
DROP POLICY IF EXISTS "members_own_data" ON chat_group_members;
DROP POLICY IF EXISTS "user_memberships_only" ON chat_group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON chat_group_members;
DROP POLICY IF EXISTS "Group members can view group members" ON chat_group_members;

-- Chat Groups
DROP POLICY IF EXISTS "Members can view their chat groups" ON chat_groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON chat_groups;
DROP POLICY IF EXISTS "Allow all authenticated inserts" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_select" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_insert" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_update" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_delete" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_member_select" ON chat_groups;
DROP POLICY IF EXISTS "groups_own_data" ON chat_groups;
DROP POLICY IF EXISTS "groups_member_access" ON chat_groups;
DROP POLICY IF EXISTS "user_groups_only" ON chat_groups;
DROP POLICY IF EXISTS "member_group_access" ON chat_groups;
DROP POLICY IF EXISTS "Users can create groups" ON chat_groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON chat_groups;

-- Chat Messages
DROP POLICY IF EXISTS "Group members can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Group members can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Sender can delete their own message" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_update" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_group_select" ON chat_messages;
DROP POLICY IF EXISTS "messages_own_data" ON chat_messages;
DROP POLICY IF EXISTS "messages_group_access" ON chat_messages;
DROP POLICY IF EXISTS "user_messages_only" ON chat_messages;
DROP POLICY IF EXISTS "member_message_access" ON chat_messages;

-- Chat Invitations
DROP POLICY IF EXISTS "Group members can send invitations" ON chat_group_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON chat_group_invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON chat_group_invitations;
DROP POLICY IF EXISTS "chat_invitations_select" ON chat_group_invitations;
DROP POLICY IF EXISTS "chat_invitations_insert" ON chat_group_invitations;
DROP POLICY IF EXISTS "chat_invitations_update" ON chat_group_invitations;
DROP POLICY IF EXISTS "chat_invitations_delete" ON chat_group_invitations;
DROP POLICY IF EXISTS "chat_invitations_group_select" ON chat_group_invitations;
DROP POLICY IF EXISTS "invitations_own_data" ON chat_group_invitations;
DROP POLICY IF EXISTS "invitations_group_access" ON chat_group_invitations;
DROP POLICY IF EXISTS "user_invitations_only" ON chat_group_invitations;
DROP POLICY IF EXISTS "member_invitation_access" ON chat_group_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON chat_group_invitations;

-- Step 3: Re-enable RLS
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_invitations ENABLE ROW LEVEL SECURITY;

-- Step 4: Create ONLY the correct policies (no conflicts)

-- Chat Group Members - Simple user-based policies
CREATE POLICY "members_own_memberships" ON chat_group_members
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Chat Groups - Simple creator-based policies
CREATE POLICY "groups_own_groups" ON chat_groups
    FOR ALL TO authenticated
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());

-- Chat Messages - Simple sender-based policies
CREATE POLICY "messages_own_messages" ON chat_messages
    FOR ALL TO authenticated
    USING (sender_id = auth.uid())
    WITH CHECK (sender_id = auth.uid());

-- Chat Invitations - Simple user-based policies
CREATE POLICY "invitations_own_invitations" ON chat_group_invitations
    FOR ALL TO authenticated
    USING (invitee_id = auth.uid() OR inviter_id = auth.uid())
    WITH CHECK (inviter_id = auth.uid());

-- Step 5: Create SEPARATE policies for group access (no circular references)
-- These use direct subqueries to avoid recursion

-- Allow users to see groups they're members of
CREATE POLICY "groups_member_view" ON chat_groups
    FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT group_id 
            FROM chat_group_members 
            WHERE user_id = auth.uid()
        )
    );

-- Allow users to see messages in groups they're members of
CREATE POLICY "messages_member_view" ON chat_messages
    FOR SELECT TO authenticated
    USING (
        group_id IN (
            SELECT group_id 
            FROM chat_group_members 
            WHERE user_id = auth.uid()
        )
    );

-- Allow users to see invitations for groups they're members of
CREATE POLICY "invitations_member_view" ON chat_group_invitations
    FOR SELECT TO authenticated
    USING (
        group_id IN (
            SELECT group_id 
            FROM chat_group_members 
            WHERE user_id = auth.uid()
        )
    );

-- Step 6: Fix the create_or_get_direct_chat function
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

-- Step 7: Grant all necessary permissions
GRANT EXECUTE ON FUNCTION create_or_get_direct_chat(uuid) TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON chat_groups TO authenticated;
GRANT ALL ON chat_group_members TO authenticated;
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON chat_group_invitations TO authenticated;

-- Step 8: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_group_members_user_id ON chat_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_group_id ON chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_group_id ON chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_groups_creator_id ON chat_groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_chat_groups_is_direct ON chat_groups(is_direct);
