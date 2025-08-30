-- Check if Messages System is Already Set Up
-- Run this script first to verify if MESSAGES_SYSTEM_SETUP.sql needs to be run

-- 1. Check if messages table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') 
        THEN '✅ Messages table EXISTS' 
        ELSE '❌ Messages table DOES NOT EXIST' 
    END as table_status;

-- 2. Check if message_status enum exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') 
        THEN '✅ message_status enum EXISTS' 
        ELSE '❌ message_status enum DOES NOT EXIST' 
    END as enum_status;

-- 3. Check if key functions exist
SELECT 
    expected_functions.routine_name,
    CASE 
        WHEN r.routine_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST'
    END as function_status
FROM (
    SELECT 'get_unread_message_count' as routine_name
    UNION ALL
    SELECT 'mark_messages_as_read'
    UNION ALL
    SELECT 'get_user_conversations'
    UNION ALL
    SELECT 'soft_delete_message'
    UNION ALL
    SELECT 'cleanup_old_messages'
) as expected_functions
LEFT JOIN information_schema.routines r ON r.routine_name = expected_functions.routine_name 
    AND r.routine_schema = 'public';

-- 4. Check if RLS policies exist for messages table
SELECT 
    expected_policies.policyname,
    CASE 
        WHEN p.policyname IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST'
    END as policy_status
FROM (
    SELECT 'messages_select_policy' as policyname
    UNION ALL
    SELECT 'messages_insert_policy'
    UNION ALL
    SELECT 'messages_update_policy'
    UNION ALL
    SELECT 'messages_delete_policy'
) as expected_policies
LEFT JOIN pg_policies p ON p.policyname = expected_policies.policyname 
    AND p.tablename = 'messages';

-- 5. Check if key indexes exist
SELECT 
    expected_indexes.indexname,
    CASE 
        WHEN i.indexname IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST'
    END as index_status
FROM (
    SELECT 'idx_messages_sender_id' as indexname
    UNION ALL
    SELECT 'idx_messages_receiver_id'
    UNION ALL
    SELECT 'idx_messages_created_at'
    UNION ALL
    SELECT 'idx_messages_is_read'
    UNION ALL
    SELECT 'idx_messages_conversation'
) as expected_indexes
LEFT JOIN pg_indexes i ON i.indexname = expected_indexes.indexname 
    AND i.tablename = 'messages';

-- 6. Check if view exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_unread_notifications' AND table_schema = 'public') 
        THEN '✅ user_unread_notifications view EXISTS' 
        ELSE '❌ user_unread_notifications view DOES NOT EXIST' 
    END as view_status;

-- 7. Check if trigger exists
SELECT 
    expected_triggers.trigger_name,
    CASE 
        WHEN t.trigger_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST'
    END as trigger_status
FROM (
    SELECT 'update_messages_updated_at_trigger' as trigger_name
) as expected_triggers
LEFT JOIN information_schema.triggers t ON t.trigger_name = expected_triggers.trigger_name 
    AND t.event_object_table = 'messages';

-- 8. Summary and Recommendation
SELECT 
    'SUMMARY' as check_type,
    CASE 
        WHEN (
            EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') AND
            EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') AND
            EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_unread_message_count' AND routine_schema = 'public') AND
            EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'messages_select_policy' AND tablename = 'messages')
        ) 
        THEN '✅ MESSAGING SYSTEM IS ALREADY SET UP - No need to run MESSAGES_SYSTEM_SETUP.sql'
        ELSE '❌ MESSAGING SYSTEM IS NOT COMPLETE - You should run MESSAGES_SYSTEM_SETUP.sql'
    END as recommendation;
