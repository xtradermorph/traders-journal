-- Fix Messages System - Handle Existing Function Conflicts
-- Run this script if you got errors about existing functions

-- 1. Drop existing functions that might conflict
DROP FUNCTION IF EXISTS cleanup_old_messages() CASCADE;
DROP FUNCTION IF EXISTS get_unread_message_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_messages_as_read(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_conversations(UUID) CASCADE;
DROP FUNCTION IF EXISTS soft_delete_message(UUID, UUID) CASCADE;

-- 2. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_messages_updated_at_trigger ON public.messages;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS messages_select_policy ON public.messages;
DROP POLICY IF EXISTS messages_insert_policy ON public.messages;
DROP POLICY IF EXISTS messages_update_policy ON public.messages;
DROP POLICY IF EXISTS messages_delete_policy ON public.messages;

-- 4. Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_messages_sender_id;
DROP INDEX IF EXISTS idx_messages_receiver_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_is_read;
DROP INDEX IF EXISTS idx_messages_conversation;

-- 5. Drop existing view if it exists
DROP VIEW IF EXISTS user_unread_notifications;

-- 6. Create the trigger function first
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Now recreate the functions with correct signatures
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.messages
        WHERE receiver_id = user_uuid 
        AND is_read = false 
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_messages_as_read(sender_uuid UUID, receiver_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.messages
    SET is_read = true, updated_at = now()
    WHERE sender_id = sender_uuid 
    AND receiver_id = receiver_uuid 
    AND is_read = false
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_conversations(user_uuid UUID)
RETURNS TABLE (
    conversation_id UUID,
    other_user_id UUID,
    other_username TEXT,
    other_avatar_url TEXT,
    last_message_content TEXT,
    last_message_created_at TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER,
    conversation_updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH conversation_messages AS (
        SELECT 
            CASE 
                WHEN m.sender_id = user_uuid THEN m.receiver_id
                ELSE m.sender_id
            END as other_user_id,
            m.content,
            m.created_at,
            m.is_read,
            m.sender_id,
            m.receiver_id
        FROM public.messages m
        WHERE (m.sender_id = user_uuid OR m.receiver_id = user_uuid)
        AND m.deleted_at IS NULL
    ),
    conversation_summaries AS (
        SELECT 
            cm.other_user_id,
            MAX(cm.created_at) as last_message_time,
            COUNT(CASE WHEN cm.receiver_id = user_uuid AND NOT cm.is_read THEN 1 END) as unread_count
        FROM conversation_messages cm
        GROUP BY cm.other_user_id
    )
    SELECT 
        cs.other_user_id as conversation_id,
        cs.other_user_id,
        p.username as other_username,
        p.avatar_url as other_avatar_url,
        cm.content as last_message_content,
        cm.created_at as last_message_created_at,
        cs.unread_count,
        cs.last_message_time as conversation_updated_at
    FROM conversation_summaries cs
    JOIN public.profiles p ON p.id = cs.other_user_id
    JOIN conversation_messages cm ON cm.other_user_id = cs.other_user_id 
        AND cm.created_at = cs.last_message_time
    ORDER BY cs.last_message_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION soft_delete_message(message_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.messages
    SET deleted_at = now(), updated_at = now()
    WHERE id = message_uuid 
    AND (sender_id = user_uuid OR receiver_id = user_uuid)
    AND deleted_at IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.messages
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < now() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(sender_id, receiver_id, created_at);

-- 9. Recreate trigger
CREATE TRIGGER update_messages_updated_at_trigger
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_messages_updated_at();

-- 10. Recreate policies
CREATE POLICY messages_select_policy ON public.messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

CREATE POLICY messages_insert_policy ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );

CREATE POLICY messages_update_policy ON public.messages
    FOR UPDATE USING (
        auth.uid() = sender_id
    );

CREATE POLICY messages_delete_policy ON public.messages
    FOR DELETE USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

-- 11. Recreate view
CREATE OR REPLACE VIEW user_unread_notifications AS
SELECT 
    receiver_id as user_id,
    COUNT(*) as unread_count,
    MAX(created_at) as latest_unread_time
FROM public.messages
WHERE is_read = false 
AND deleted_at IS NULL
GROUP BY receiver_id;

-- 12. Grant permissions
GRANT EXECUTE ON FUNCTION get_unread_message_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_as_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_message(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_messages() TO authenticated;
GRANT SELECT ON user_unread_notifications TO authenticated;

-- 13. Verify setup
SELECT 'Messages system functions fixed successfully!' as status;
