-- Check the newly created group and its members
-- Group ID: af0a0644-fe15-4860-9289-59b2fb50ff00

-- Check what users are actually in this group
SELECT 
    m.group_id,
    m.user_id,
    p.username,
    p.email
FROM chat_group_members m
LEFT JOIN profiles p ON m.user_id = p.id
WHERE m.group_id = 'af0a0644-fe15-4860-9289-59b2fb50ff00';

-- Check the group details
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.is_direct,
    g.creator_id,
    p.username as creator_username
FROM chat_groups g
LEFT JOIN profiles p ON g.creator_id = p.id
WHERE g.id = 'af0a0644-fe15-4860-9289-59b2fb50ff00';

-- Check if there are any other direct chat groups
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.is_direct,
    COUNT(m.user_id) as member_count,
    ARRAY_AGG(p.username ORDER BY p.username) as usernames
FROM chat_groups g
LEFT JOIN chat_group_members m ON g.id = m.group_id
LEFT JOIN profiles p ON m.user_id = p.id
WHERE g.is_direct = true
GROUP BY g.id, g.name, g.is_direct
ORDER BY g.created_at DESC;
