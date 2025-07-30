-- Create a stored procedure to clean up all data related to a user
CREATE OR REPLACE FUNCTION cleanup_user_data(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  setup_record RECORD;
  avatar_path TEXT;
BEGIN
  -- First, get the user's profile to find their avatar path
  SELECT avatar_url INTO avatar_path
  FROM profiles
  WHERE id = user_id_param;
  
  -- Delete all messages sent by or received by this user
  DELETE FROM messages
  WHERE sender_id = user_id_param OR receiver_id = user_id_param;
  
  -- Delete all friend requests
  DELETE FROM friend_requests
  WHERE sender_id = user_id_param OR recipient_id = user_id_param;
  
  -- Delete all friend relationships
  DELETE FROM trader_friends
  WHERE user1_id = user_id_param OR user2_id = user_id_param;
  
  -- Delete all user blocks
  DELETE FROM user_blocks
  WHERE blocker_id = user_id_param OR blocked_id = user_id_param;
  
  -- Delete all likes on trade setups by this user
  DELETE FROM trade_setup_likes
  WHERE user_id = user_id_param;
  
  -- Delete all comments on trade setups by this user
  DELETE FROM trade_setup_comments
  WHERE user_id = user_id_param;
  
  -- Delete all trade setups by this user and their related data
  -- First, get all trade setups by this user to clean up their images
  FOR setup_record IN 
    SELECT id, chart_image_url FROM trade_setups WHERE user_id = user_id_param
  LOOP
    -- Delete comments on this trade setup
    DELETE FROM trade_setup_comments
    WHERE trade_setup_id = setup_record.id;
    
    -- Delete likes on this trade setup
    DELETE FROM trade_setup_likes
    WHERE trade_setup_id = setup_record.id;
    
    -- Delete tags for this trade setup
    DELETE FROM trade_setup_tags
    WHERE setup_id = setup_record.id;
    
    -- Note: Storage cleanup will be handled by the application layer
    -- as Supabase functions cannot directly access storage
  END LOOP;
  
  -- Now delete the trade setups themselves
  DELETE FROM trade_setups
  WHERE user_id = user_id_param;
  
  -- Delete all trades by this user
  DELETE FROM trades
  WHERE user_id = user_id_param;
  
  -- Delete all support requests by this user
  DELETE FROM support_requests
  WHERE user_id = user_id_param;
  
  -- Delete user presence
  DELETE FROM user_presence
  WHERE user_id = user_id_param;
  
  -- Delete user settings
  DELETE FROM user_settings
  WHERE user_id = user_id_param;
  
  -- Finally, delete the profile
  DELETE FROM profiles
  WHERE id = user_id_param;
  
  -- Note: Avatar cleanup from storage will be handled by the application layer
  -- as Supabase functions cannot directly access storage buckets
END;
$$;

-- Create a function to clean up trade setup data including storage
CREATE OR REPLACE FUNCTION cleanup_trade_setup(setup_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all comments on this trade setup
  DELETE FROM trade_setup_comments
  WHERE trade_setup_id = setup_id_param;
  
  -- Delete all likes on this trade setup
  DELETE FROM trade_setup_likes
  WHERE trade_setup_id = setup_id_param;
  
  -- Delete all tags for this trade setup
  DELETE FROM trade_setup_tags
  WHERE setup_id = setup_id_param;
  
  -- Delete the trade setup itself
  DELETE FROM trade_setups
  WHERE id = setup_id_param;
  
  -- Note: Storage cleanup will be handled by the application layer
  -- as Supabase functions cannot directly access storage
END;
$$;

-- Create a trigger to automatically clean up user data when a user is deleted from auth.users
CREATE OR REPLACE FUNCTION handle_deleted_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call our cleanup function
  PERFORM cleanup_user_data(OLD.id);
  RETURN OLD;
END;
$$;

-- Create the trigger on the auth.users table
DROP TRIGGER IF EXISTS on_user_deleted ON auth.users;
CREATE TRIGGER on_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_deleted_user();

-- Create a function to decrement the likes count
CREATE OR REPLACE FUNCTION decrement_count(row_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Get the current count
  SELECT likes_count INTO current_count
  FROM trade_setups
  WHERE id = row_id;
  
  -- Decrement the count, but don't go below 0
  IF current_count > 0 THEN
    UPDATE trade_setups
    SET likes_count = likes_count - 1
    WHERE id = row_id;
    
    RETURN current_count - 1;
  ELSE
    RETURN 0;
  END IF;
END;
$$;

-- Create a function to decrement the comments count
CREATE OR REPLACE FUNCTION decrement_comments_count(row_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Get the current count
  SELECT comments_count INTO current_count
  FROM trade_setups
  WHERE id = row_id;
  
  -- Decrement the count, but don't go below 0
  IF current_count > 0 THEN
    UPDATE trade_setups
    SET comments_count = comments_count - 1
    WHERE id = row_id;
    
    RETURN current_count - 1;
  ELSE
    RETURN 0;
  END IF;
END;
$$;

-- Create triggers to maintain referential integrity

-- When a comment is deleted, decrement the comments count
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only decrement for top-level comments (not replies)
  IF OLD.parent_id IS NULL THEN
    PERFORM decrement_comments_count(OLD.trade_setup_id);
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_comment_deleted
  AFTER DELETE ON trade_setup_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_count();

-- When a like is deleted, decrement the likes count
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM decrement_count(OLD.trade_setup_id);
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_like_deleted
  AFTER DELETE ON trade_setup_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_likes_count();

-- Add CASCADE DELETE to foreign key constraints where appropriate
-- This ensures that when a trade setup is deleted, all related data is automatically deleted

-- Note: These ALTER TABLE statements should be run manually in Supabase dashboard
-- as they modify table structure and may require careful consideration

-- Example of what should be added (run these in Supabase SQL editor):
/*
ALTER TABLE trade_setup_comments 
DROP CONSTRAINT trade_setup_comments_trade_setup_id_fkey,
ADD CONSTRAINT trade_setup_comments_trade_setup_id_fkey 
FOREIGN KEY (trade_setup_id) REFERENCES trade_setups(id) ON DELETE CASCADE;

ALTER TABLE trade_setup_likes 
DROP CONSTRAINT trade_setup_likes_trade_setup_id_fkey,
ADD CONSTRAINT trade_setup_likes_trade_setup_id_fkey 
FOREIGN KEY (trade_setup_id) REFERENCES trade_setups(id) ON DELETE CASCADE;

ALTER TABLE trade_setup_tags 
DROP CONSTRAINT trade_setup_tags_setup_id_fkey,
ADD CONSTRAINT trade_setup_tags_setup_id_fkey 
FOREIGN KEY (setup_id) REFERENCES trade_setups(id) ON DELETE CASCADE;
*/
