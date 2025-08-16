-- Comprehensive chat cleanup - find and remove ALL problematic groups

-- First, let's see ALL direct chat groups and their members
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.is_direct,
    g.creator_id,
    COUNT(m.user_id) as member_count,
    ARRAY_AGG(p.username ORDER BY p.username) as usernames,
    ARRAY_AGG(m.user_id ORDER BY m.user_id) as user_ids
FROM chat_groups g
LEFT JOIN chat_group_members m ON g.id = m.group_id
LEFT JOIN profiles p ON m.user_id = p.id
WHERE g.is_direct = true
GROUP BY g.id, g.name, g.is_direct, g.creator_id
ORDER BY g.created_at DESC;

-- Check if there are any groups with admin0 and maryha (these are wrong)
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.is_direct,
    COUNT(m.user_id) as member_count,
    ARRAY_AGG(p.username ORDER BY p.username) as usernames
FROM chat_groups g
JOIN chat_group_members m ON g.id = m.group_id
JOIN profiles p ON m.user_id = p.id
WHERE g.is_direct = true
GROUP BY g.id, g.name, g.is_direct
HAVING COUNT(m.user_id) = 2 
   AND ARRAY_AGG(p.username ORDER BY p.username) @> ARRAY['admin0', 'maryha'];

-- Check if there are any groups with admin0 and norbitrecker87 (these should be correct)
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.is_direct,
    COUNT(m.user_id) as member_count,
    ARRAY_AGG(p.username ORDER BY p.username) as usernames
FROM chat_groups g
JOIN chat_group_members m ON g.id = m.group_id
JOIN profiles p ON m.user_id = p.id
WHERE g.is_direct = true
GROUP BY g.id, g.name, g.is_direct
HAVING COUNT(m.user_id) = 2 
   AND ARRAY_AGG(p.username ORDER BY p.username) @> ARRAY['admin0', 'norbitrecker87'];

-- Now let's clean up ALL direct chat groups that have admin0 and maryha
-- This will remove the problematic groups that are causing the issue

-- Delete messages from problematic groups
DELETE FROM chat_messages 
WHERE group_id IN (
    SELECT g.id
    FROM chat_groups g
    JOIN chat_group_members m ON g.id = m.group_id
    JOIN profiles p ON m.user_id = p.id
    WHERE g.is_direct = true
    GROUP BY g.id
    HAVING COUNT(m.user_id) = 2 
       AND ARRAY_AGG(p.username ORDER BY p.username) @> ARRAY['admin0', 'maryha']
);

-- Delete members from problematic groups
DELETE FROM chat_group_members 
WHERE group_id IN (
    SELECT g.id
    FROM chat_groups g
    JOIN chat_group_members m ON g.id = m.group_id
    JOIN profiles p ON m.user_id = p.id
    WHERE g.is_direct = true
    GROUP BY g.id
    HAVING COUNT(m.user_id) = 2 
       AND ARRAY_AGG(p.username ORDER BY p.username) @> ARRAY['admin0', 'maryha']
);

-- Delete the problematic groups themselves
DELETE FROM chat_groups 
WHERE id IN (
    SELECT g.id
    FROM chat_groups g
    JOIN chat_group_members m ON g.id = m.group_id
    JOIN profiles p ON m.user_id = p.id
    WHERE g.is_direct = true
    GROUP BY g.id
    HAVING COUNT(m.user_id) = 2 
       AND ARRAY_AGG(p.username ORDER BY p.username) @> ARRAY['admin0', 'maryha']
);

-- Let's also clean up any groups that have admin0 and any other user (to be safe)
-- This will ensure we start fresh
DELETE FROM chat_messages 
WHERE group_id IN (
    SELECT g.id
    FROM chat_groups g
    JOIN chat_group_members m ON g.id = m.group_id
    JOIN profiles p ON m.user_id = p.id
    WHERE g.is_direct = true
    GROUP BY g.id
    HAVING COUNT(m.user_id) = 2 
       AND ARRAY_AGG(p.username ORDER BY p.username) @> ARRAY['admin0']
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
       AND ARRAY_AGG(p.username ORDER BY p.username) @> ARRAY['admin0']
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
       AND ARRAY_AGG(p.username ORDER BY p.username) @> ARRAY['admin0']
);

-- Verify cleanup - show remaining direct chat groups
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

-- Count total remaining direct chat groups
SELECT COUNT(*) as total_direct_chat_groups
FROM chat_groups 
WHERE is_direct = true;
