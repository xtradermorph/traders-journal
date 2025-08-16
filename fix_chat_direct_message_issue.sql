-- Fix for direct message issue - messages always going to same user
-- The issue might be in the create_or_get_direct_chat function

-- Drop and recreate the function with better logic
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
    -- First, check if a direct chat between the two users already exists
    -- This query looks for a group that has BOTH users as members
    SELECT g.id INTO existing_group_id
    FROM chat_groups g
    WHERE g.is_direct = TRUE
      AND EXISTS (
          SELECT 1 FROM chat_group_members m1 
          WHERE m1.group_id = g.id AND m1.user_id = current_user_id
      )
      AND EXISTS (
          SELECT 1 FROM chat_group_members m2 
          WHERE m2.group_id = g.id AND m2.user_id = recipient_id_param
      );

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

-- Also create a function to debug direct chat issues
CREATE OR REPLACE FUNCTION debug_direct_chat(
    recipient_id_param uuid
)
RETURNS TABLE (
    current_user_id uuid,
    recipient_id uuid,
    existing_groups jsonb,
    new_group_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid := auth.uid();
    existing_groups jsonb;
    new_group_id uuid;
BEGIN
    -- Get all direct groups for current user
    SELECT jsonb_agg(
        jsonb_build_object(
            'group_id', g.id,
            'group_name', g.name,
            'members', (
                SELECT jsonb_agg(m.user_id)
                FROM chat_group_members m
                WHERE m.group_id = g.id
            )
        )
    ) INTO existing_groups
    FROM chat_groups g
    WHERE g.is_direct = TRUE
      AND EXISTS (
          SELECT 1 FROM chat_group_members m 
          WHERE m.group_id = g.id AND m.user_id = current_user_id
      );

    RETURN QUERY SELECT 
        current_user_id,
        recipient_id_param,
        existing_groups,
        new_group_id;
END;
$$;

-- Grant execute permission for debug function
GRANT EXECUTE ON FUNCTION debug_direct_chat(uuid) TO authenticated;
