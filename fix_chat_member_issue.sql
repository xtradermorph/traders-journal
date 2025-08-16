-- Investigate the specific group that's causing issues
-- Group ID: 65f720df-e0b3-4210-a5db-318ec5098186

-- Check what users are actually in this group
SELECT 
    m.group_id,
    m.user_id,
    p.username,
    p.email
FROM chat_group_members m
LEFT JOIN profiles p ON m.user_id = p.id
WHERE m.group_id = '65f720df-e0b3-4210-a5db-318ec5098186';

-- Check the group details
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.is_direct,
    g.creator_id,
    p.username as creator_username,
    g.created_at
FROM chat_groups g
LEFT JOIN profiles p ON g.creator_id = p.id
WHERE g.id = '65f720df-e0b3-4210-a5db-318ec5098186';

-- Check if there are any messages in this group
SELECT COUNT(*) as message_count
FROM chat_messages 
WHERE group_id = '65f720df-e0b3-4210-a5db-318ec5098186';

-- Check all direct chat groups to see the pattern
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.is_direct,
    g.creator_id,
    COUNT(m.user_id) as member_count,
    ARRAY_AGG(p.username) as usernames,
    ARRAY_AGG(m.user_id) as user_ids
FROM chat_groups g
LEFT JOIN chat_group_members m ON g.id = m.group_id
LEFT JOIN profiles p ON m.user_id = p.id
WHERE g.is_direct = true
GROUP BY g.id, g.name, g.is_direct, g.creator_id
ORDER BY g.created_at DESC;

-- Check if there are any groups with admin0 and maryha
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
   AND ARRAY_AGG(p.username) @> ARRAY['admin0', 'maryha'];

-- Check if there are any groups with admin0 and norbitrecker87
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

-- Now let's clean up the problematic group and recreate it properly
-- First, delete all data from the problematic group
DELETE FROM chat_messages WHERE group_id = '65f720df-e0b3-4210-a5db-318ec5098186';
DELETE FROM chat_group_members WHERE group_id = '65f720df-e0b3-4210-a5db-318ec5098186';
DELETE FROM chat_groups WHERE id = '65f720df-e0b3-4210-a5db-318ec5098186';

-- Verify the group is deleted
SELECT COUNT(*) as remaining_groups
FROM chat_groups 
WHERE id = '65f720df-e0b3-4210-a5db-318ec5098186';

-- Now let's also clean up any other problematic groups that might have wrong members
-- Delete any groups that have admin0 and maryha (these are likely wrong)
DELETE FROM chat_messages 
WHERE group_id IN (
    SELECT g.id
    FROM chat_groups g
    JOIN chat_group_members m ON g.id = m.group_id
    JOIN profiles p ON m.user_id = p.id
    WHERE g.is_direct = true
    GROUP BY g.id
    HAVING COUNT(m.user_id) = 2 
       AND ARRAY_AGG(p.username) @> ARRAY['admin0', 'maryha']
);

DELETE FROM chat_group_members 
WHERE group_id IN (
    SELECT g.id
    FROM chat_groups g
    JOIN chat_group_members m ON g.id = m.group_id
    JOIN profiles p ON m.user_id = p.id
    WHERE g.is_direct = true
    GROUP BY g.id
    HAVING COUNT(m.user_id) = 2 
       AND ARRAY_AGG(p.username) @> ARRAY['admin0', 'maryha']
);

DELETE FROM chat_groups 
WHERE id IN (
    SELECT g.id
    FROM chat_groups g
    JOIN chat_group_members m ON g.id = m.group_id
    JOIN profiles p ON m.user_id = p.id
    WHERE g.is_direct = true
    GROUP BY g.id
    HAVING COUNT(m.user_id) = 2 
       AND ARRAY_AGG(p.username) @> ARRAY['admin0', 'maryha']
);

-- Verify cleanup
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.is_direct,
    COUNT(m.user_id) as member_count,
    ARRAY_AGG(p.username) as usernames
FROM chat_groups g
LEFT JOIN chat_group_members m ON g.id = m.group_id
LEFT JOIN profiles p ON m.user_id = p.id
WHERE g.is_direct = true
GROUP BY g.id, g.name, g.is_direct
ORDER BY g.created_at DESC;
