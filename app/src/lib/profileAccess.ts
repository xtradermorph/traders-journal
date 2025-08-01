import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Create a Supabase client for use in this utility
const supabase = createClientComponentClient();

/**
 * Utility functions for accessing profile data safely
 * These functions handle the schema issues by trying RPC first, then falling back to direct access
 */

/**
 * Get a user profile by ID
 */
export async function getProfileById(userId: string) {
  try {
    // Try using the RPC function first
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_user_profile', { user_id: userId });
    
    if (!rpcError && rpcData && Array.isArray(rpcData)) {
      return { data: rpcData[0] || null, error: null };
    }
    if (!rpcError && rpcData) {
      return { data: rpcData, error: null };
    }
    
    // Fall back to direct query as a backup
    console.warn('RPC profile fetch failed, falling back to direct query:', rpcError);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    return { data, error };
  } catch (error) {
    console.error('Profile fetch error:', error);
    return { data: null, error };
  }
}

/**
 * Get multiple user profiles by IDs
 */
export async function getProfilesByIds(userIds: string[]) {
  if (!userIds.length) return { data: [], error: null };
  
  try {
    // For multiple profiles, we need to use direct query
    // but we'll wrap it in error handling
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);
    
    if (error) {
      console.error('Error fetching multiple profiles:', error);
      // Try to get profiles one by one using RPC as fallback
      const profiles = [];
      for (const userId of userIds) {
        const { data: profile } = await getProfileById(userId);
        if (profile) profiles.push(profile);
      }
      return { data: profiles, error: null };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Profiles fetch error:', error);
    return { data: [], error };
  }
}

/**
 * Update a user profile
 */
export async function updateUserProfile(userId: string, profileData: any) {
  try {
    // Try using the RPC function first
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('update_user_profile', { 
        user_id: userId,
        profile_data: profileData
      });
    
    if (!rpcError && rpcData) {
      return { data: rpcData, error: null };
    }
    
    // Fall back to direct update as a backup
    console.warn('RPC profile update failed, falling back to direct update:', rpcError);
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select('*')
      .single();
    
    return { data, error };
  } catch (error) {
    console.error('Profile update error:', error);
    return { data: null, error };
  }
}

/**
 * Insert a new profile
 */
export async function insertProfile(profileData: any) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profileData)
      .select('*')
      .single();
    
    return { data, error };
  } catch (error) {
    console.error('Profile insert error:', error);
    return { data: null, error };
  }
}

/**
 * Delete a profile
 */
export async function deleteProfile(userId: string) {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    return { error };
  } catch (error) {
    console.error('Profile delete error:', error);
    return { error };
  }
}

/**
 * Search for profiles
 */
export async function searchProfiles(query: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${query}%`)
      .limit(limit);
    
    if (error) {
      console.error('Profile search error:', error);
      return { data: [], error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Profile search error:', error);
    return { data: [], error };
  }
}

/**
 * Set user as online
 */
export async function setUserOnline(userId: string) {
  try {
    const timestamp = new Date().toISOString();
    
    // Skip updating profiles table since is_online and last_seen columns don't exist
    
    // Check if user exists in user_presence table
    const { data: existingPresence } = await supabase
      .from('user_presence')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Update or insert into user_presence table based on existence
    let presenceError;
    if (existingPresence) {
      // Update existing record
      const { error } = await supabase
        .from('user_presence')
        .update({ 
          last_seen_at: timestamp,
          status: 'ONLINE'
        })
        .eq('user_id', userId);
      presenceError = error;
    } else {
      // Insert new record
      const { error } = await supabase
        .from('user_presence')
        .insert({ 
          user_id: userId, 
          last_seen_at: timestamp,
          status: 'ONLINE'
        });
      presenceError = error;
    }
    
    if (presenceError) {
      console.error('Error setting user online in user_presence:', presenceError);
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Exception setting user online:', error);
    return { success: false, error };
  }
}

/**
 * Set user as offline
 */
export async function setUserOffline(userId: string) {
  try {
    const timestamp = new Date().toISOString();
    
    // Skip updating profiles table since is_online and last_seen columns don't exist
    
    // Check if user exists in user_presence table
    const { data: existingPresence } = await supabase
      .from('user_presence')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Update or insert into user_presence table based on existence
    let presenceError;
    if (existingPresence) {
      // Update existing record
      const { error } = await supabase
        .from('user_presence')
        .update({ 
          last_seen_at: timestamp,
          status: 'OFFLINE'
        })
        .eq('user_id', userId);
      presenceError = error;
    } else {
      // Insert new record
      const { error } = await supabase
        .from('user_presence')
        .insert({ 
          user_id: userId, 
          last_seen_at: timestamp,
          status: 'OFFLINE'
        });
      presenceError = error;
    }
    
    if (presenceError) {
      console.error('Error setting user offline in user_presence:', presenceError);
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Exception setting user offline:', error);
    return { success: false, error };
  }
}

/**
 * Update user's last seen timestamp
 */
export async function updateLastSeen(userId: string) {
  try {
    const timestamp = new Date().toISOString();
    
    // Skip updating profiles table since last_seen column doesn't exist
    
    // Check if user exists in user_presence table
    const { data: existingPresence } = await supabase
      .from('user_presence')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Update or insert into user_presence table based on existence
    let presenceError;
    if (existingPresence) {
      // Update existing record
      const { error } = await supabase
        .from('user_presence')
        .update({ 
          last_seen_at: timestamp
        })
        .eq('user_id', userId);
      presenceError = error;
    } else {
      // Insert new record
      const { error } = await supabase
        .from('user_presence')
        .insert({ 
          user_id: userId, 
          last_seen_at: timestamp,
          status: 'ONLINE' // Default status for new records
        });
      presenceError = error;
    }
    
    if (presenceError) {
      console.error('Error updating last seen in user_presence:', presenceError);
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Exception updating last seen:', error);
    return { success: false, error };
  }
}
