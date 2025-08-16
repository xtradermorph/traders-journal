-- Complete fix for chat RLS policies - eliminate all circular references
-- This approach creates simple, non-recursive policies

-- First, disable RLS temporarily to clean up
ALTER TABLE chat_group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_invitations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
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

-- Re-enable RLS
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_invitations ENABLE ROW LEVEL SECURITY;

-- Create SIMPLE, non-recursive policies for chat_group_members
CREATE POLICY "chat_members_select" ON chat_group_members
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "chat_members_insert" ON chat_group_members
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_members_update" ON chat_group_members
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_members_delete" ON chat_group_members
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Create SIMPLE policies for chat_groups
CREATE POLICY "chat_groups_select" ON chat_groups
    FOR SELECT TO authenticated
    USING (creator_id = auth.uid());

CREATE POLICY "chat_groups_insert" ON chat_groups
    FOR INSERT TO authenticated
    WITH CHECK (creator_id = auth.uid());

CREATE POLICY "chat_groups_update" ON chat_groups
    FOR UPDATE TO authenticated
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());

CREATE POLICY "chat_groups_delete" ON chat_groups
    FOR DELETE TO authenticated
    USING (creator_id = auth.uid());

-- Create SIMPLE policies for chat_messages
CREATE POLICY "chat_messages_select" ON chat_messages
    FOR SELECT TO authenticated
    USING (sender_id = auth.uid());

CREATE POLICY "chat_messages_insert" ON chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (sender_id = auth.uid());

CREATE POLICY "chat_messages_update" ON chat_messages
    FOR UPDATE TO authenticated
    USING (sender_id = auth.uid())
    WITH CHECK (sender_id = auth.uid());

CREATE POLICY "chat_messages_delete" ON chat_messages
    FOR DELETE TO authenticated
    USING (sender_id = auth.uid());

-- Create SIMPLE policies for chat_group_invitations
CREATE POLICY "chat_invitations_select" ON chat_group_invitations
    FOR SELECT TO authenticated
    USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

CREATE POLICY "chat_invitations_insert" ON chat_group_invitations
    FOR INSERT TO authenticated
    WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "chat_invitations_update" ON chat_group_invitations
    FOR UPDATE TO authenticated
    USING (invitee_id = auth.uid() OR inviter_id = auth.uid())
    WITH CHECK (invitee_id = auth.uid() OR inviter_id = auth.uid());

CREATE POLICY "chat_invitations_delete" ON chat_group_invitations
    FOR DELETE TO authenticated
    USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

-- Now create additional policies for group members to see each other's messages
-- This is a separate policy that doesn't create recursion
CREATE POLICY "chat_messages_group_select" ON chat_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_group_members cgm
            WHERE cgm.group_id = chat_messages.group_id
            AND cgm.user_id = auth.uid()
        )
    );

-- Policy for group members to see group info
CREATE POLICY "chat_groups_member_select" ON chat_groups
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_group_members cgm
            WHERE cgm.group_id = chat_groups.id
            AND cgm.user_id = auth.uid()
        )
    );

-- Policy for group members to see invitations
CREATE POLICY "chat_invitations_group_select" ON chat_group_invitations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_group_members cgm
            WHERE cgm.group_id = chat_group_invitations.group_id
            AND cgm.user_id = auth.uid()
        )
    );
