import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.SUPABASE_URL || 'https://oweimywvzmqoizsyotrt.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey || '');

/**
 * Cleanup all data related to a user when they delete their account
 * @param userId The ID of the user being deleted
 */
export async function cleanupUserData(userId: string) {
  try {
    console.log(`Starting cleanup for user: ${userId}`);
    
    // First, get the user's profile to find their avatar path
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user profile:', profileError);
    }
    
    // Get all trade setups by this user to clean up their images
    const { data: tradeSetups, error: setupsError } = await adminSupabase
      .from('trade_setups')
      .select('id, chart_image_url')
      .eq('user_id', userId);
    
    if (setupsError) {
      console.error('Error fetching trade setups:', setupsError);
    } else if (tradeSetups) {
      // Clean up storage for each trade setup
      for (const setup of tradeSetups) {
        await cleanupTradeSetupStorage(setup.id, setup.chart_image_url);
      }
    }
    
    // If user has an avatar in storage, delete it
    if (profile?.avatar_url) {
      await cleanupAvatarStorage(profile.avatar_url);
    }
    
    // Clean up TDA data
    await cleanupUserTDA(userId);
    
    // Call the database cleanup function
    const { error } = await adminSupabase.rpc('cleanup_user_data', { user_id_param: userId });
    
    if (error) {
      console.error('Error calling cleanup_user_data function:', error);
      throw error;
    }
    
    console.log(`Successfully cleaned up all data for user: ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error during user data cleanup:', error);
    throw error;
  }
}

/**
 * Cleanup storage for a specific trade setup
 * @param setupId The ID of the trade setup
 * @param chartImageUrl The chart image URL (optional)
 */
export async function cleanupTradeSetupStorage(setupId: string, chartImageUrl?: string) {
  try {
    console.log(`Cleaning up storage for trade setup: ${setupId}`);
    
    // Clean up chart image if it exists
    if (chartImageUrl) {
      await cleanupSetupImageStorage(chartImageUrl);
    }
    
    // List and delete all images in the setup-images bucket for this setup
    const { data: setupImages, error: listError } = await adminSupabase.storage
      .from('setup-images')
      .list(undefined, {
        search: setupId
      });
    
    if (listError) {
      console.error('Error listing setup images:', listError);
    } else if (setupImages && setupImages.length > 0) {
      const imagePaths = setupImages.map(img => img.name);
      const { error: deleteError } = await adminSupabase.storage
        .from('setup-images')
        .remove(imagePaths);
      
      if (deleteError) {
        console.error('Error deleting setup images:', deleteError);
      } else {
        console.log(`Deleted ${imagePaths.length} setup images for setup: ${setupId}`);
      }
    }
    
    // Also check trade-setup-images bucket (alternative naming)
    const { data: tradeSetupImages, error: tradeListError } = await adminSupabase.storage
      .from('trade-setup-images')
      .list(undefined, {
        search: setupId
      });
    
    if (tradeListError) {
      console.error('Error listing trade setup images:', tradeListError);
    } else if (tradeSetupImages && tradeSetupImages.length > 0) {
      const imagePaths = tradeSetupImages.map(img => img.name);
      const { error: deleteError } = await adminSupabase.storage
        .from('trade-setup-images')
        .remove(imagePaths);
      
      if (deleteError) {
        console.error('Error deleting trade setup images:', deleteError);
      } else {
        console.log(`Deleted ${imagePaths.length} trade setup images for setup: ${setupId}`);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error cleaning up trade setup storage:', error);
    throw error;
  }
}

/**
 * Cleanup avatar storage
 * @param avatarUrl The avatar URL
 */
export async function cleanupAvatarStorage(avatarUrl: string) {
  try {
    // Extract the path from the avatar URL
    // Avatar URLs are typically in format: /storage/v1/object/public/avatars/[filename]
    const avatarPath = avatarUrl.split('/').pop();
    
    if (avatarPath) {
      console.log('Deleting avatar:', avatarPath);
      const { error: storageError } = await adminSupabase.storage
        .from('avatars')
        .remove([avatarPath]);
      
      if (storageError) {
        console.error('Error deleting avatar from storage:', storageError);
      } else {
        console.log('Successfully deleted avatar from storage');
      }
    }
  } catch (avatarError) {
    console.error('Error processing avatar deletion:', avatarError);
  }
}

/**
 * Cleanup setup image storage
 * @param imageUrl The image URL
 */
export async function cleanupSetupImageStorage(imageUrl: string) {
  try {
    // Extract the path from the image URL
    const imagePath = imageUrl.split('/').pop();
    
    if (imagePath) {
      console.log('Deleting setup image:', imagePath);
      
      // Try different buckets
      const buckets = ['setup-images', 'trade-setup-images'];
      
      for (const bucket of buckets) {
        try {
          const { error: storageError } = await adminSupabase.storage
            .from(bucket)
            .remove([imagePath]);
          
          if (!storageError) {
            console.log(`Successfully deleted setup image from ${bucket}`);
            break; // Found and deleted, no need to check other buckets
          }
        } catch (error) {
          console.log(`Image not found in ${bucket} bucket`);
        }
      }
    }
  } catch (imageError) {
    console.error('Error processing setup image deletion:', imageError);
  }
}

/**
 * Delete a trade setup and all related data including storage
 * @param setupId The ID of the trade setup to delete
 * @param userId The ID of the user making the request (for authorization)
 */
export async function deleteTradeSetup(setupId: string, userId: string) {
  try {
    console.log(`Deleting trade setup: ${setupId} by user: ${userId}`);
    
    // First check if the user is authorized to delete this setup
    const { data: setup, error: fetchError } = await adminSupabase
      .from('trade_setups')
      .select('user_id, chart_image_url')
      .eq('id', setupId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching trade setup:', fetchError);
      throw fetchError;
    }
    
    // Only allow if the user is the setup owner
    if (setup.user_id !== userId) {
      throw new Error('Unauthorized: You can only delete your own trade setups');
    }
    
    // Clean up storage first
    await cleanupTradeSetupStorage(setupId, setup.chart_image_url);
    
    // Call the database cleanup function
    const { error } = await adminSupabase.rpc('cleanup_trade_setup', { setup_id_param: setupId });
    
    if (error) {
      console.error('Error calling cleanup_trade_setup function:', error);
      throw error;
    }
    
    console.log(`Successfully deleted trade setup: ${setupId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete trade setup:', error);
    return { success: false, error };
  }
}

/**
 * Cleanup all orphaned storage files
 * This function can be run periodically to clean up files that don't have corresponding database records
 */
export async function cleanupOrphanedStorage() {
  try {
    console.log('Starting orphaned storage cleanup...');
    
    // Clean up orphaned setup images
    const { data: setupImages, error: setupListError } = await adminSupabase.storage
      .from('setup-images')
      .list();
    
    if (setupListError) {
      console.error('Error listing setup images:', setupListError);
    } else if (setupImages) {
      for (const image of setupImages) {
        // Extract setup ID from filename (assuming format: setupId-timestamp.ext)
        const setupId = image.name.split('-')[0];
        
        // Check if this setup still exists in the database
        const { data: setup, error: checkError } = await adminSupabase
          .from('trade_setups')
          .select('id')
          .eq('id', setupId)
          .single();
        
        if (checkError || !setup) {
          // Setup doesn't exist, delete the image
          const { error: deleteError } = await adminSupabase.storage
            .from('setup-images')
            .remove([image.name]);
          
          if (deleteError) {
            console.error(`Error deleting orphaned image ${image.name}:`, deleteError);
          } else {
            console.log(`Deleted orphaned setup image: ${image.name}`);
          }
        }
      }
    }
    
    // Clean up orphaned avatars
    const { data: avatars, error: avatarListError } = await adminSupabase.storage
      .from('avatars')
      .list();
    
    if (avatarListError) {
      console.error('Error listing avatars:', avatarListError);
    } else if (avatars) {
      for (const avatar of avatars) {
        // Extract user ID from filename (assuming format: userId-timestamp.ext)
        const userId = avatar.name.split('-')[0];
        
        // Check if this user still exists in the database
        const { data: profile, error: checkError } = await adminSupabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();
        
        if (checkError || !profile) {
          // User doesn't exist, delete the avatar
          const { error: deleteError } = await adminSupabase.storage
            .from('avatars')
            .remove([avatar.name]);
          
          if (deleteError) {
            console.error(`Error deleting orphaned avatar ${avatar.name}:`, deleteError);
          } else {
            console.log(`Deleted orphaned avatar: ${avatar.name}`);
          }
        }
      }
    }
    
    console.log('Orphaned storage cleanup completed');
    return { success: true };
  } catch (error) {
    console.error('Error during orphaned storage cleanup:', error);
    throw error;
  }
}

/**
 * Cleanup all messages between two users
 * @param userId The ID of the user initiating the cleanup
 * @param otherUserId The ID of the other user in the conversation
 */
export async function cleanupMessages(userId: string, otherUserId: string) {
  try {
    // Delete all messages between these two users
    const { error } = await adminSupabase
      .from('messages')
      .delete()
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`);
    
    if (error) {
      console.error('Error cleaning up messages:', error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to clean up messages:', error);
    return { success: false, error };
  }
}

/**
 * Remove a friend relationship between two users
 * @param userId The ID of the user initiating the removal
 * @param friendId The ID of the friend to remove
 */
export async function removeFriend(userId: string, friendId: string) {
  try {
    // Delete the friend relationship in both directions
    const { error } = await adminSupabase
      .from('trader_follows')
      .delete()
      .or(`(follower_id.eq.${userId}.and.followed_id.eq.${friendId}),(follower_id.eq.${friendId}.and.followed_id.eq.${userId})`);
    
    if (error) {
      console.error('Error removing friend:', error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to remove friend:', error);
    return { success: false, error };
  }
}

/**
 * Delete a comment and all its replies
 * @param commentId The ID of the comment to delete
 * @param userId The ID of the user making the request (for authorization)
 */
export async function deleteComment(commentId: string, userId: string) {
  try {
    // First check if the user is authorized to delete this comment
    const { data: comment, error: fetchError } = await adminSupabase
      .from('trade_setup_comments')
      .select('user_id')
      .eq('id', commentId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching comment:', fetchError);
      throw fetchError;
    }
    
    // Only allow if the user is the comment owner
    if (comment.user_id !== userId) {
      throw new Error('Unauthorized: You can only delete your own comments');
    }
    
    // Delete the comment and all its replies
    const { error } = await adminSupabase
      .from('trade_setup_comments')
      .delete()
      .or(`id.eq.${commentId},parent_id.eq.${commentId}`);
    
    if (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return { success: false, error };
  }
}

// TDA Cleanup Functions
export const cleanupTDAAnnouncements = async (analysisId: string) => {
  try {
    const { error } = await adminSupabase
      .from('tda_announcements')
      .delete()
      .eq('analysis_id', analysisId);
    
    if (error) {
      console.error('Error cleaning up TDA announcements:', error);
      throw error;
    }
    
    console.log(`Cleaned up TDA announcements for analysis: ${analysisId}`);
  } catch (error) {
    console.error('Failed to cleanup TDA announcements:', error);
    throw error;
  }
};

export const cleanupTDAScreenshots = async (analysisId: string) => {
  try {
    // First get all screenshot records to delete files from storage
    const { data: screenshots, error: fetchError } = await adminSupabase
      .from('tda_screenshots')
      .select('file_url, file_name')
      .eq('analysis_id', analysisId);
    
    if (fetchError) {
      console.error('Error fetching TDA screenshots for cleanup:', fetchError);
      throw fetchError;
    }
    
    // Delete files from storage
    if (screenshots && screenshots.length > 0) {
      const filePaths = screenshots.map(screenshot => {
        // Extract file path from URL
        const urlParts = screenshot.file_url.split('/');
        return urlParts.slice(-2).join('/'); // Get bucket/filename
      });
      
      const { error: storageError } = await adminSupabase.storage
        .from('tda-screenshots')
        .remove(filePaths);
      
      if (storageError) {
        console.error('Error deleting TDA screenshot files from storage:', storageError);
        // Continue with database cleanup even if storage cleanup fails
      }
    }
    
    // Delete database records
    const { error: deleteError } = await adminSupabase
      .from('tda_screenshots')
      .delete()
      .eq('analysis_id', analysisId);
    
    if (deleteError) {
      console.error('Error cleaning up TDA screenshot records:', deleteError);
      throw deleteError;
    }
    
    console.log(`Cleaned up TDA screenshots for analysis: ${analysisId}`);
  } catch (error) {
    console.error('Failed to cleanup TDA screenshots:', error);
    throw error;
  }
};

export const cleanupTDAAnswers = async (analysisId: string) => {
  try {
    const { error } = await adminSupabase
      .from('tda_answers')
      .delete()
      .eq('analysis_id', analysisId);
    
    if (error) {
      console.error('Error cleaning up TDA answers:', error);
      throw error;
    }
    
    console.log(`Cleaned up TDA answers for analysis: ${analysisId}`);
  } catch (error) {
    console.error('Failed to cleanup TDA answers:', error);
    throw error;
  }
};

export const cleanupTDATimeframeAnalyses = async (analysisId: string) => {
  try {
    const { error } = await adminSupabase
      .from('tda_timeframe_analyses')
      .delete()
      .eq('analysis_id', analysisId);
    
    if (error) {
      console.error('Error cleaning up TDA timeframe analyses:', error);
      throw error;
    }
    
    console.log(`Cleaned up TDA timeframe analyses for analysis: ${analysisId}`);
  } catch (error) {
    console.error('Failed to cleanup TDA timeframe analyses:', error);
    throw error;
  }
};

export const cleanupCompleteTDA = async (analysisId: string) => {
  try {
    console.log(`Starting complete TDA cleanup for analysis: ${analysisId}`);
    
    // Clean up all related data in parallel
    await Promise.all([
      cleanupTDAAnnouncements(analysisId),
      cleanupTDAScreenshots(analysisId),
      cleanupTDAAnswers(analysisId),
      cleanupTDATimeframeAnalyses(analysisId)
    ]);
    
    // Finally delete the main analysis record
    const { error } = await adminSupabase
      .from('top_down_analyses')
      .delete()
      .eq('id', analysisId);
    
    if (error) {
      console.error('Error deleting TDA analysis record:', error);
      throw error;
    }
    
    console.log(`Complete TDA cleanup finished for analysis: ${analysisId}`);
  } catch (error) {
    console.error('Failed to cleanup complete TDA:', error);
    throw error;
  }
};

export const cleanupUserTDA = async (userId: string) => {
  try {
    console.log(`Starting TDA cleanup for user: ${userId}`);
    
    // Get all TDA analyses for the user
    const { data: analyses, error: fetchError } = await adminSupabase
      .from('top_down_analyses')
      .select('id')
      .eq('user_id', userId);
    
    if (fetchError) {
      console.error('Error fetching user TDA analyses:', fetchError);
      throw fetchError;
    }
    
    if (analyses && analyses.length > 0) {
      // Clean up each analysis
      await Promise.all(
        analyses.map(analysis => cleanupCompleteTDA(analysis.id))
      );
    }
    
    console.log(`TDA cleanup completed for user: ${userId}`);
  } catch (error) {
    console.error('Failed to cleanup user TDA:', error);
    throw error;
  }
};
