-- Function to find an existing direct chat or create a new one
CREATE OR REPLACE FUNCTION create_or_get_direct_chat(
    recipient_id_param uuid
)
RETURNS TABLE (group_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER -- Important for creating chats on behalf of users
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