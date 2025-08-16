-- Investigate the chat issue
-- First, let's see what groups exist and their members

-- Check all direct chat groups
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.is_direct,
    g.creator_id,
    COUNT(m.user_id) as member_count,
    ARRAY_AGG(m.user_id) as member_ids
FROM chat_groups g
LEFT JOIN chat_group_members m ON g.id = m.group_id
WHERE g.is_direct = true
GROUP BY g.id, g.name, g.is_direct, g.creator_id
ORDER BY g.created_at DESC;

-- Check specific group that's causing issues
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.is_direct,
    g.creator_id,
    p.username as creator_username
FROM chat_groups g
LEFT JOIN profiles p ON g.creator_id = p.id
WHERE g.id = '79824dcc-ac0b-4eb4-9bdd-c0f584317e36';

-- Check members of this specific group
SELECT 
    m.group_id,
    m.user_id,
    p.username,
    m.created_at as member_since
FROM chat_group_members m
LEFT JOIN profiles p ON m.user_id = p.id
WHERE m.group_id = '79824dcc-ac0b-4eb4-9bdd-c0f584317e36'
ORDER BY m.created_at;

-- Check if there are any groups with both admin0 and norbitrecker87
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.is_direct,
    COUNT(m.user_id) as member_count,
    ARRAY_AGG(p.username) as usernames
FROM chat_groups g
JOIN chat_group_members m ON g.id = m.group_id
JOIN profiles p ON m.user_id = p.id
WHERE g.is_direct = true
GROUP BY g.id, g.name, g.is_direct
HAVING COUNT(m.user_id) = 2 
   AND ARRAY_AGG(p.username) @> ARRAY['admin0', 'norbitrecker87'];

-- Now let's fix the create_or_get_direct_chat function to be more precise
DROP FUNCTION IF EXISTS create_or_get_direct_chat(recipient_id_param UUID);

CREATE OR REPLACE FUNCTION create_or_get_direct_chat(recipient_id_param UUID)
RETURNS TABLE(group_id UUID, group_name TEXT, is_direct BOOLEAN, creator_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    existing_group_id UUID;
    new_group_id UUID;
    recipient_username TEXT;
    current_username TEXT;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get usernames for better debugging
    SELECT username INTO current_username FROM profiles WHERE id = current_user_id;
    SELECT username INTO recipient_username FROM profiles WHERE id = recipient_id_param;
    
    -- Check if a direct chat already exists between these two users
    -- This is more precise - we check for exactly 2 members and both users must be members
    SELECT g.id INTO existing_group_id
    FROM chat_groups g
    JOIN chat_group_members m1 ON g.id = m1.group_id AND m1.user_id = current_user_id
    JOIN chat_group_members m2 ON g.id = m2.group_id AND m2.user_id = recipient_id_param
    WHERE g.is_direct = true
    AND (
        SELECT COUNT(*) 
        FROM chat_group_members m3 
        WHERE m3.group_id = g.id
    ) = 2;
    
    -- If existing group found, return it
    IF existing_group_id IS NOT NULL THEN
        RAISE NOTICE 'Found existing direct chat: % between % and %', existing_group_id, current_username, recipient_username;
        RETURN QUERY
        SELECT 
            g.id,
            g.name,
            g.is_direct,
            g.creator_id
        FROM chat_groups g
        WHERE g.id = existing_group_id;
        RETURN;
    END IF;
    
    -- Create new direct chat group
    INSERT INTO chat_groups (id, name, is_direct, creator_id)
    VALUES (gen_random_uuid(), 'Direct Chat', true, current_user_id)
    RETURNING id INTO new_group_id;
    
    -- Add both users as members
    INSERT INTO chat_group_members (group_id, user_id)
    VALUES 
        (new_group_id, current_user_id),
        (new_group_id, recipient_id_param);
    
    RAISE NOTICE 'Created new direct chat: % between % and %', new_group_id, current_username, recipient_username;
    
    -- Return the new group
    RETURN QUERY
    SELECT 
        g.id,
        g.name,
        g.is_direct,
        g.creator_id
    FROM chat_groups g
    WHERE g.id = new_group_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_or_get_direct_chat(UUID) TO authenticated;

-- Test the function
SELECT * FROM create_or_get_direct_chat('12abfa92-d00e-44fb-b6c9-94679b3baaaa'::UUID);
