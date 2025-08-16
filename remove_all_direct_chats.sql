-- Remove ALL direct chat groups completely to start fresh

-- First, let's see what's still there
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.is_direct,
    g.creator_id,
    COUNT(m.user_id) as member_count,
    ARRAY_AGG(p.username ORDER BY p.username) as usernames
FROM chat_groups g
LEFT JOIN chat_group_members m ON g.id = m.group_id
LEFT JOIN profiles p ON m.user_id = p.id
WHERE g.is_direct = true
GROUP BY g.id, g.name, g.is_direct, g.creator_id;

-- Now let's remove ALL direct chat groups completely
-- Delete all messages from direct chat groups
DELETE FROM chat_messages 
WHERE group_id IN (
    SELECT id FROM chat_groups WHERE is_direct = true
);

-- Delete all members from direct chat groups
DELETE FROM chat_group_members 
WHERE group_id IN (
    SELECT id FROM chat_groups WHERE is_direct = true
);

-- Delete all direct chat groups
DELETE FROM chat_groups 
WHERE is_direct = true;

-- Verify all direct chat groups are gone
SELECT COUNT(*) as remaining_direct_chat_groups
FROM chat_groups 
WHERE is_direct = true;

-- Show all remaining chat groups (should only be group chats, not direct chats)
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.is_direct,
    COUNT(m.user_id) as member_count
FROM chat_groups g
LEFT JOIN chat_group_members m ON g.id = m.group_id
GROUP BY g.id, g.name, g.is_direct
ORDER BY g.created_at DESC;
