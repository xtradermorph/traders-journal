-- Messages System Setup for Traders Journal
-- This file contains all necessary SQL for the direct messaging system

-- 1. Create message_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE message_status AS ENUM ('SENT', 'DELIVERED', 'READ', 'DELETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    file_url TEXT,
    file_name TEXT,
    status message_status DEFAULT 'SENT',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT messages_check CHECK (receiver_id != sender_id)
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(sender_id, receiver_id, created_at);

-- 4. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for updated_at
DROP TRIGGER IF EXISTS update_messages_updated_at_trigger ON public.messages;
CREATE TRIGGER update_messages_updated_at_trigger
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_messages_updated_at();

-- 6. RLS Policies for messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see messages they sent or received
DROP POLICY IF EXISTS messages_select_policy ON public.messages;
CREATE POLICY messages_select_policy ON public.messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

-- Policy: Users can only insert messages as sender
DROP POLICY IF EXISTS messages_insert_policy ON public.messages;
CREATE POLICY messages_insert_policy ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );

-- Policy: Users can only update messages they sent
DROP POLICY IF EXISTS messages_update_policy ON public.messages;
CREATE POLICY messages_update_policy ON public.messages
    FOR UPDATE USING (
        auth.uid() = sender_id
    );

-- Policy: Users can delete messages they sent or received
DROP POLICY IF EXISTS messages_delete_policy ON public.messages;
CREATE POLICY messages_delete_policy ON public.messages
    FOR DELETE USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

-- 7. Function to get unread message count for a user
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

-- 8. Function to mark messages as read
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

-- 9. Function to get conversation list with unread counts
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

-- 10. Function to soft delete messages
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

-- 11. Function to cleanup old deleted messages (older than 30 days)
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

-- 12. Create a view for unread message notifications
CREATE OR REPLACE VIEW user_unread_notifications AS
SELECT 
    receiver_id as user_id,
    COUNT(*) as unread_count,
    MAX(created_at) as latest_unread_time
FROM public.messages
WHERE is_read = false 
AND deleted_at IS NULL
GROUP BY receiver_id;

-- 13. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_as_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_message(UUID, UUID) TO authenticated;
GRANT SELECT ON user_unread_notifications TO authenticated;

-- 14. Create a scheduled job to cleanup old messages (optional - requires pg_cron extension)
-- Uncomment if pg_cron is available in your Supabase instance
-- SELECT cron.schedule('cleanup-old-messages', '0 2 * * *', 'SELECT cleanup_old_messages();');

-- 15. Insert some test data (optional - for development)
-- INSERT INTO public.messages (sender_id, receiver_id, content, message_type)
-- VALUES 
--     ('test-sender-uuid', 'test-receiver-uuid', 'Hello!', 'text'),
--     ('test-receiver-uuid', 'test-sender-uuid', 'Hi there!', 'text');

-- 16. Verify setup
SELECT 'Messages system setup completed successfully!' as status;
