-- Fix infinite recursion in chat_group_members RLS policies
-- The issue is that the policies are referencing each other in a circular manner

-- First, let's drop the problematic policies
DROP POLICY IF EXISTS "chat_group_members_delete_policy" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_insert_policy" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_select_policy" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_update_policy" ON chat_group_members;

-- Now create simplified, non-recursive policies
CREATE POLICY "chat_group_members_delete_policy" ON chat_group_members
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "chat_group_members_insert_policy" ON chat_group_members
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_group_members_select_policy" ON chat_group_members
    FOR SELECT TO authenticated
    USING (true); -- Allow authenticated users to see all memberships

CREATE POLICY "chat_group_members_update_policy" ON chat_group_members
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Also fix the chat_groups policy that might be causing issues
DROP POLICY IF EXISTS "Members can view their chat groups" ON chat_groups;

CREATE POLICY "Members can view their chat groups" ON chat_groups
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM chat_group_members 
            WHERE chat_group_members.group_id = chat_groups.id 
            AND chat_group_members.user_id = auth.uid()
        )
    );

-- Fix chat_messages policies to prevent recursion
DROP POLICY IF EXISTS "Group members can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Group members can send messages" ON chat_messages;

CREATE POLICY "Group members can view messages" ON chat_messages
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM chat_group_members 
            WHERE chat_group_members.group_id = chat_messages.group_id 
            AND chat_group_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Group members can send messages" ON chat_messages
    FOR INSERT TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_group_members 
            WHERE chat_group_members.group_id = chat_messages.group_id 
            AND chat_group_members.user_id = auth.uid()
        )
        AND sender_id = auth.uid()
    );

-- Fix chat_group_invitations policies
DROP POLICY IF EXISTS "Group members can send invitations" ON chat_group_invitations;

CREATE POLICY "Group members can send invitations" ON chat_group_invitations
    FOR INSERT TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_group_members 
            WHERE chat_group_members.group_id = chat_group_invitations.group_id 
            AND chat_group_members.user_id = auth.uid()
        )
    );
