-- Add trade_setup_dislikes table
CREATE TABLE IF NOT EXISTS trade_setup_dislikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_setup_id UUID NOT NULL REFERENCES trade_setups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(trade_setup_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trade_setup_dislikes_trade_setup_id ON trade_setup_dislikes(trade_setup_id);
CREATE INDEX IF NOT EXISTS idx_trade_setup_dislikes_user_id ON trade_setup_dislikes(user_id);

-- Add RLS policies for trade_setup_dislikes
ALTER TABLE trade_setup_dislikes ENABLE ROW LEVEL SECURITY;

-- Users can view dislikes for public trade setups or their own
CREATE POLICY "Dislikes visibility" ON trade_setup_dislikes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trade_setups
            WHERE trade_setups.id = trade_setup_dislikes.trade_setup_id
            AND (trade_setups.is_public OR trade_setups.user_id = auth.uid())
        )
    );

-- Users can insert their own dislikes
CREATE POLICY "Users can dislike trade setups" ON trade_setup_dislikes
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can remove their own dislikes
CREATE POLICY "Users can remove own dislikes" ON trade_setup_dislikes
    FOR DELETE USING (user_id = auth.uid());

-- Users cannot update dislikes
CREATE POLICY "Users cannot update dislikes" ON trade_setup_dislikes
    FOR UPDATE USING (false);

-- Add dislikes_count column to trade_setups table
ALTER TABLE trade_setups ADD COLUMN IF NOT EXISTS dislikes_count INTEGER DEFAULT 0;

-- Create function to update dislikes count
CREATE OR REPLACE FUNCTION update_trade_setup_dislikes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE trade_setups 
        SET dislikes_count = dislikes_count + 1 
        WHERE id = NEW.trade_setup_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE trade_setups 
        SET dislikes_count = dislikes_count - 1 
        WHERE id = OLD.trade_setup_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update dislikes count
DROP TRIGGER IF EXISTS trade_setup_dislikes_count_trigger ON trade_setup_dislikes;
CREATE TRIGGER trade_setup_dislikes_count_trigger
    AFTER INSERT OR DELETE ON trade_setup_dislikes
    FOR EACH ROW
    EXECUTE FUNCTION update_trade_setup_dislikes_count();

-- Initialize dislikes count for existing trade setups
UPDATE trade_setups 
SET dislikes_count = (
    SELECT COUNT(*) 
    FROM trade_setup_dislikes 
    WHERE trade_setup_dislikes.trade_setup_id = trade_setups.id
);

