-- Remove the specific problematic chat group that's causing the direct message issue
-- This will delete the group and all its data

-- First, delete all messages in this group
DELETE FROM chat_messages WHERE group_id = '2753fd6c-8346-48b9-a7bd-51425204d0a7';

-- Then, delete all members of this group
DELETE FROM chat_group_members WHERE group_id = '2753fd6c-8346-48b9-a7bd-51425204d0a7';

-- Finally, delete the group itself
DELETE FROM chat_groups WHERE id = '2753fd6c-8346-48b9-a7bd-51425204d0a7';

-- Verify the group is deleted
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.creator_id,
    COUNT(m.user_id) as member_count
FROM chat_groups g
LEFT JOIN chat_group_members m ON g.id = m.group_id
WHERE g.id = '2753fd6c-8346-48b9-a7bd-51425204d0a7'
GROUP BY g.id, g.name, g.creator_id;

-- This should return no rows if the deletion was successful
