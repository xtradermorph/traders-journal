-- Clean up the problematic chat group that's causing the direct message issue
-- This will remove the chat group that's incorrectly being found

-- First, let's see what direct chats exist
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
GROUP BY g.id, g.name, g.creator_id
ORDER BY g.created_at DESC;

-- Remove the specific problematic group (replace with the actual group_id from above query)
-- DELETE FROM chat_messages WHERE group_id = '2753fd6c-8346-48b9-a7bd-51425204d0a7';
-- DELETE FROM chat_group_members WHERE group_id = '2753fd6c-8346-48b9-a7bd-51425204d0a7';
-- DELETE FROM chat_groups WHERE id = '2753fd6c-8346-48b9-a7bd-51425204d0a7';

-- Or clean up all orphaned direct chats (uncomment if needed)
-- SELECT cleanup_orphaned_direct_chats();
