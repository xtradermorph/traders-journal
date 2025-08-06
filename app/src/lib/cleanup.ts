import { createClient } from '@supabase/supabase-js';

// Supabase URL is safe to use from the public env var
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;

// For client-side operations, we'll use the regular supabase client
import { supabase as regularClient } from './supabase';

// Service role key - this should be properly set in your environment variables
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Deletes all user data from Supabase
 * @param userId The ID of the user to delete
 * @returns Promise that resolves when all data is deleted
 */
export async function cleanupUserData(userId: string): Promise<void> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Service role key not configured');
    }

    // Create admin client with service role key for operations that require elevated permissions
    const adminClient = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Starting cleanup for user: ${userId}`);

    // 1. Delete user's avatar from storage if it exists
    try {
      const { data: profileData } = await regularClient
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      if (profileData?.avatar_url) {
        // Extract path from URL - assuming format like '/storage/v1/object/public/avatars/[filename]'
        const avatarPath = profileData.avatar_url.split('/').pop();
        if (avatarPath) {
          await adminClient.storage.from('avatars').remove([avatarPath]);
          console.log('Avatar deleted from storage');
        }
      }
    } catch (error) {
      console.error('Error deleting avatar:', error);
      // Continue with other deletions even if avatar deletion fails
    }

    // 2. Delete TDA-related data first (due to foreign key constraints)
    try {
      // Get all TDA analyses for this user
      const { data: tdaAnalyses } = await adminClient
        .from('top_down_analyses')
        .select('id')
        .eq('user_id', userId);

      if (tdaAnalyses && tdaAnalyses.length > 0) {
        const analysisIds = tdaAnalyses.map(analysis => analysis.id);
        
        // Delete TDA screenshots from storage
        for (const analysisId of analysisIds) {
          try {
            const { data: screenshots } = await adminClient
              .from('tda_screenshots')
              .select('screenshot_url')
              .eq('analysis_id', analysisId);

            if (screenshots && screenshots.length > 0) {
              const screenshotPaths = screenshots
                .map(s => s.screenshot_url?.split('/').pop())
                .filter(Boolean);
              
              if (screenshotPaths.length > 0) {
                await adminClient.storage.from('tda-screenshots').remove(screenshotPaths);
              }
            }
          } catch (error) {
            console.error(`Error deleting TDA screenshots for analysis ${analysisId}:`, error);
          }
        }

        // Delete TDA-related records
        await adminClient.from('tda_screenshots').delete().in('analysis_id', analysisIds);
        await adminClient.from('tda_answers').delete().in('analysis_id', analysisIds);
        await adminClient.from('tda_announcements').delete().in('analysis_id', analysisIds);
        await adminClient.from('tda_timeframe_analyses').delete().in('analysis_id', analysisIds);
        await adminClient.from('tda_analysis_history').delete().in('analysis_id', analysisIds);
      }

      // Delete TDA analyses
      await adminClient.from('top_down_analyses').delete().eq('user_id', userId);
      console.log('TDA data deleted');
    } catch (error) {
      console.error('Error deleting TDA data:', error);
    }

    // 3. Delete trade-related data
    try {
      // Get all trades for this user
      const { data: trades } = await adminClient
        .from('trades')
        .select('id')
        .eq('user_id', userId);

      if (trades && trades.length > 0) {
        const tradeIds = trades.map(trade => trade.id);
        
        // Delete trade images from storage
        for (const trade of trades) {
          try {
            const { data: tradeData } = await adminClient
              .from('trades')
              .select('image_urls')
              .eq('id', trade.id)
              .single();

            if (tradeData?.image_urls && tradeData.image_urls.length > 0) {
              const imagePaths = tradeData.image_urls
                .map((url: string) => url.split('/').pop())
                .filter(Boolean);
              
              if (imagePaths.length > 0) {
                await adminClient.storage.from('trade-images').remove(imagePaths);
              }
            }
          } catch (error) {
            console.error(`Error deleting trade images for trade ${trade.id}:`, error);
          }
        }

        // Delete shared trades related to these trades
        await adminClient.from('shared_trades').delete().in('trade_id', tradeIds);
        await adminClient.from('shared_trades').delete().in('original_trade_id', tradeIds);
      }

      // Delete trades
      await adminClient.from('trades').delete().eq('user_id', userId);
      console.log('Trade data deleted');
    } catch (error) {
      console.error('Error deleting trade data:', error);
    }

    // 4. Delete trade setups and related data
    try {
      const { data: tradeSetups } = await adminClient
        .from('trade_setups')
        .select('id')
        .eq('user_id', userId);

      if (tradeSetups && tradeSetups.length > 0) {
        const setupIds = tradeSetups.map(setup => setup.id);
        
        await adminClient.from('trade_setup_comments').delete().in('trade_setup_id', setupIds);
        await adminClient.from('trade_setup_likes').delete().in('trade_setup_id', setupIds);
        await adminClient.from('trade_setup_tags').delete().in('setup_id', setupIds);
      }

      await adminClient.from('trade_setups').delete().eq('user_id', userId);
      console.log('Trade setup data deleted');
    } catch (error) {
      console.error('Error deleting trade setup data:', error);
    }

    // 5. Delete social and messaging data
    try {
      await adminClient.from('messages').delete().eq('sender_id', userId);
      await adminClient.from('messages').delete().eq('receiver_id', userId);
      await adminClient.from('friend_requests').delete().eq('sender_id', userId);
      await adminClient.from('friend_requests').delete().eq('recipient_id', userId);
      await adminClient.from('trader_friends').delete().eq('user1_id', userId);
      await adminClient.from('trader_friends').delete().eq('user2_id', userId);
      await adminClient.from('user_blocks').delete().eq('blocker_id', userId);
      await adminClient.from('user_blocks').delete().eq('blocked_id', userId);
      console.log('Social data deleted');
    } catch (error) {
      console.error('Error deleting social data:', error);
    }

    // 6. Delete shared trades data
    try {
      await adminClient.from('shared_trades').delete().eq('sharer_id', userId);
      await adminClient.from('shared_trades').delete().eq('shared_by_user_id', userId);
      await adminClient.from('shared_trades').delete().eq('shared_with_user_id', userId);
      await adminClient.from('shared_trades').delete().eq('recipient_id', userId);
      await adminClient.from('shared_trade_comments').delete().eq('user_id', userId);
      await adminClient.from('shared_trade_likes').delete().eq('user_id', userId);
      console.log('Shared trades data deleted');
    } catch (error) {
      console.error('Error deleting shared trades data:', error);
    }

    // 7. Delete chat-related data
    try {
      // Get chat groups where user is creator
      const { data: createdGroups } = await adminClient
        .from('chat_groups')
        .select('id')
        .eq('creator_id', userId);

      if (createdGroups && createdGroups.length > 0) {
        const groupIds = createdGroups.map(group => group.id);
        
        await adminClient.from('chat_messages').delete().in('group_id', groupIds);
        await adminClient.from('chat_group_members').delete().in('group_id', groupIds);
        await adminClient.from('chat_group_invitations').delete().in('group_id', groupIds);
        await adminClient.from('chat_groups').delete().in('id', groupIds);
      }

      // Delete user's chat memberships and messages
      await adminClient.from('chat_group_members').delete().eq('user_id', userId);
      await adminClient.from('chat_group_invitations').delete().eq('inviter_id', userId);
      await adminClient.from('chat_group_invitations').delete().eq('invitee_id', userId);
      await adminClient.from('chat_messages').delete().eq('sender_id', userId);
      console.log('Chat data deleted');
    } catch (error) {
      console.error('Error deleting chat data:', error);
    }

    // 8. Delete support data
    try {
      await adminClient.from('support_requests').delete().eq('user_id', userId);
      await adminClient.from('support_replies').delete().eq('admin_id', userId);
      console.log('Support data deleted');
    } catch (error) {
      console.error('Error deleting support data:', error);
    }

    // 9. Delete user presence and settings
    try {
      await adminClient.from('user_presence').delete().eq('user_id', userId);
      await adminClient.from('user_settings').delete().eq('user_id', userId);
      console.log('User presence and settings deleted');
    } catch (error) {
      console.error('Error deleting user presence/settings:', error);
    }

    // 10. Delete profile (must be done before auth user)
    await adminClient.from('profiles').delete().eq('id', userId);
    console.log('Profile deleted');

    // 11. Delete the auth user (must be done last)
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      throw deleteUserError;
    }

    console.log('User data cleanup completed successfully');
  } catch (error) {
    console.error('Error during user data cleanup:', error);
    throw error;
  }
}
