-- FINAL FIX for direct message issue - completely rewrite the function
-- The issue is that the function is finding wrong existing chats

-- Drop and recreate the function with completely new logic
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
    member_count integer;
BEGIN
    -- First, check if a direct chat between the two users already exists
    -- This query is more precise - it looks for a direct group with exactly 2 members
    -- and both users must be members
    SELECT g.id INTO existing_group_id
    FROM chat_groups g
    WHERE g.is_direct = TRUE
      AND g.creator_id = current_user_id
      AND (
          SELECT COUNT(*) 
          FROM chat_group_members m 
          WHERE m.group_id = g.id
      ) = 2
      AND EXISTS (
          SELECT 1 FROM chat_group_members m1 
          WHERE m1.group_id = g.id AND m1.user_id = current_user_id
      )
      AND EXISTS (
          SELECT 1 FROM chat_group_members m2 
          WHERE m2.group_id = g.id AND m2.user_id = recipient_id_param
      );

    -- If no existing group found, also check groups created by the recipient
    IF existing_group_id IS NULL THEN
        SELECT g.id INTO existing_group_id
        FROM chat_groups g
        WHERE g.is_direct = TRUE
          AND g.creator_id = recipient_id_param
          AND (
              SELECT COUNT(*) 
              FROM chat_group_members m 
              WHERE m.group_id = g.id
          ) = 2
          AND EXISTS (
              SELECT 1 FROM chat_group_members m1 
              WHERE m1.group_id = g.id AND m1.user_id = current_user_id
          )
          AND EXISTS (
              SELECT 1 FROM chat_group_members m2 
              WHERE m2.group_id = g.id AND m2.user_id = recipient_id_param
          );
    END IF;

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_or_get_direct_chat(uuid) TO authenticated;

-- Create a function to clean up orphaned direct chats
CREATE OR REPLACE FUNCTION cleanup_orphaned_direct_chats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    orphaned_group record;
BEGIN
    -- Find and delete direct chat groups that don't have exactly 2 members
    FOR orphaned_group IN
        SELECT g.id
        FROM chat_groups g
        WHERE g.is_direct = TRUE
          AND (
              SELECT COUNT(*) 
              FROM chat_group_members m 
              WHERE m.group_id = g.id
          ) != 2
    LOOP
        -- Delete messages first
        DELETE FROM chat_messages WHERE group_id = orphaned_group.id;
        -- Delete members
        DELETE FROM chat_group_members WHERE group_id = orphaned_group.id;
        -- Delete the group
        DELETE FROM chat_groups WHERE id = orphaned_group.id;
    END LOOP;
END;
$$;

-- Grant execute permission for cleanup function
GRANT EXECUTE ON FUNCTION cleanup_orphaned_direct_chats() TO authenticated;

-- Create a function to list all direct chats for debugging
CREATE OR REPLACE FUNCTION list_direct_chats()
RETURNS TABLE (
    group_id uuid,
    group_name text,
    creator_id uuid,
    member_count bigint,
    members jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        g.id as group_id,
        g.name as group_name,
        g.creator_id,
        COUNT(m.user_id) as member_count,
        jsonb_agg(
            jsonb_build_object(
                'user_id', m.user_id,
                'username', p.username
            )
        ) as members
    FROM chat_groups g
    LEFT JOIN chat_group_members m ON g.id = m.group_id
    LEFT JOIN profiles p ON m.user_id = p.id
    WHERE g.is_direct = TRUE
      AND EXISTS (
          SELECT 1 FROM chat_group_members m2 
          WHERE m2.group_id = g.id AND m2.user_id = current_user_id
      )
    GROUP BY g.id, g.name, g.creator_id
    ORDER BY g.created_at DESC;
END;
$$;

-- Grant execute permission for list function
GRANT EXECUTE ON FUNCTION list_direct_chats() TO authenticated;
