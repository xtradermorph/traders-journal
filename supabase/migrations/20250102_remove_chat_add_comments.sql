-- Migration: Remove chat tables and enhance trade setup comments
-- Date: 2025-01-02

-- First, drop all chat-related tables and their dependencies
-- Drop in reverse order of dependencies

-- Drop chat messages first (depends on chat_groups)
DROP TABLE IF EXISTS chat_messages CASCADE;

-- Drop chat group members (depends on chat_groups)
DROP TABLE IF EXISTS chat_group_members CASCADE;

-- Drop chat group invitations (depends on chat_groups)
DROP TABLE IF EXISTS chat_group_invitations CASCADE;

-- Drop chat groups
DROP TABLE IF EXISTS chat_groups CASCADE;

-- Now enhance the trade_setup_comments table with additional features

-- Add new columns to trade_setup_comments table
ALTER TABLE trade_setup_comments 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dislikes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;

-- Create table for comment reactions (likes/dislikes)
CREATE TABLE IF NOT EXISTS trade_setup_comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES trade_setup_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(comment_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trade_setup_comment_reactions_comment_id 
ON trade_setup_comment_reactions(comment_id);

CREATE INDEX IF NOT EXISTS idx_trade_setup_comment_reactions_user_id 
ON trade_setup_comment_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_trade_setup_comment_reactions_type 
ON trade_setup_comment_reactions(reaction_type);

-- Create function to update comment reaction counts
CREATE OR REPLACE FUNCTION update_comment_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.reaction_type = 'like' THEN
            UPDATE trade_setup_comments 
            SET likes_count = likes_count + 1 
            WHERE id = NEW.comment_id;
        ELSIF NEW.reaction_type = 'dislike' THEN
            UPDATE trade_setup_comments 
            SET dislikes_count = dislikes_count + 1 
            WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.reaction_type = 'like' THEN
            UPDATE trade_setup_comments 
            SET likes_count = GREATEST(likes_count - 1, 0) 
            WHERE id = OLD.comment_id;
        ELSIF OLD.reaction_type = 'dislike' THEN
            UPDATE trade_setup_comments 
            SET dislikes_count = GREATEST(dislikes_count - 1, 0) 
            WHERE id = OLD.comment_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle reaction type change
        IF OLD.reaction_type = 'like' AND NEW.reaction_type = 'dislike' THEN
            UPDATE trade_setup_comments 
            SET likes_count = GREATEST(likes_count - 1, 0),
                dislikes_count = dislikes_count + 1 
            WHERE id = NEW.comment_id;
        ELSIF OLD.reaction_type = 'dislike' AND NEW.reaction_type = 'like' THEN
            UPDATE trade_setup_comments 
            SET dislikes_count = GREATEST(dislikes_count - 1, 0),
                likes_count = likes_count + 1 
            WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment reactions
DROP TRIGGER IF EXISTS trigger_update_comment_reaction_counts ON trade_setup_comment_reactions;
CREATE TRIGGER trigger_update_comment_reaction_counts
    AFTER INSERT OR UPDATE OR DELETE ON trade_setup_comment_reactions
    FOR EACH ROW EXECUTE FUNCTION update_comment_reaction_counts();

-- Create function to handle comment editing
CREATE OR REPLACE FUNCTION handle_comment_edit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.content != NEW.content THEN
        NEW.is_edited = TRUE;
        NEW.edited_at = now();
        NEW.edit_history = OLD.edit_history || jsonb_build_object(
            'timestamp', now(),
            'content', OLD.content
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment editing
DROP TRIGGER IF EXISTS trigger_handle_comment_edit ON trade_setup_comments;
CREATE TRIGGER trigger_handle_comment_edit
    BEFORE UPDATE ON trade_setup_comments
    FOR EACH ROW EXECUTE FUNCTION handle_comment_edit();

-- Create RLS policies for comment reactions
ALTER TABLE trade_setup_comment_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions on comments they can see
CREATE POLICY "Users can view comment reactions" ON trade_setup_comment_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trade_setup_comments c
            JOIN trade_setups ts ON c.trade_setup_id = ts.id
            WHERE c.id = trade_setup_comment_reactions.comment_id
            AND (ts.is_public OR ts.user_id = auth.uid())
        )
    );

-- Users can add their own reactions
CREATE POLICY "Users can add comment reactions" ON trade_setup_comment_reactions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM trade_setup_comments c
            JOIN trade_setups ts ON c.trade_setup_id = ts.id
            WHERE c.id = trade_setup_comment_reactions.comment_id
            AND (ts.is_public OR ts.user_id = auth.uid())
        )
    );

-- Users can update their own reactions
CREATE POLICY "Users can update their own reactions" ON trade_setup_comment_reactions
    FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions" ON trade_setup_comment_reactions
    FOR DELETE USING (user_id = auth.uid());

-- Create function to get comment with reactions
CREATE OR REPLACE FUNCTION get_comment_with_reactions(comment_id UUID)
RETURNS TABLE (
    id UUID,
    trade_setup_id UUID,
    user_id UUID,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    parent_id UUID,
    likes_count INTEGER,
    dislikes_count INTEGER,
    is_edited BOOLEAN,
    edited_at TIMESTAMP WITH TIME ZONE,
    user_reaction TEXT,
    user_username TEXT,
    user_avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.trade_setup_id,
        c.user_id,
        c.content,
        c.created_at,
        c.updated_at,
        c.parent_id,
        c.likes_count,
        c.dislikes_count,
        c.is_edited,
        c.edited_at,
        cr.reaction_type as user_reaction,
        p.username as user_username,
        p.avatar_url as user_avatar_url
    FROM trade_setup_comments c
    LEFT JOIN profiles p ON c.user_id = p.id
    LEFT JOIN trade_setup_comment_reactions cr ON c.id = cr.comment_id AND cr.user_id = auth.uid()
    WHERE c.id = comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON trade_setup_comment_reactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_comment_with_reactions(UUID) TO authenticated;

-- Update existing comment counts to ensure they're accurate
UPDATE trade_setup_comments 
SET likes_count = (
    SELECT COUNT(*) 
    FROM trade_setup_comment_reactions 
    WHERE comment_id = trade_setup_comments.id AND reaction_type = 'like'
),
dislikes_count = (
    SELECT COUNT(*) 
    FROM trade_setup_comment_reactions 
    WHERE comment_id = trade_setup_comments.id AND reaction_type = 'dislike'
);

