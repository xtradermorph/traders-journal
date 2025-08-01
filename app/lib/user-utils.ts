import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/user';

/**
 * Deletes a user and all associated data
 * @param userId The user ID to delete
 */
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    // First delete from users table
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId);

    if (usersError) {
      console.error('Error deleting user data:', usersError);
      throw usersError;
    }

    // Then delete from auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting auth user:', authError);
      throw authError;
    }
  } catch (error) {
    console.error('Error during user deletion:', error);
    throw error;
  }
};

/**
 * Checks if a username is available
 * @param username The username to check
 * @returns true if username is available, false otherwise
 */
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('Error checking username availability:', error);
      throw error;
    }

    return !data;
  } catch (error) {
    console.error('Error during username availability check:', error);
    throw error;
  }
};

/**
 * Checks if an email is available
 * @param email The email to check
 * @returns true if email is available, false otherwise
 */
export const isEmailAvailable = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Error checking email availability:', error);
      throw error;
    }

    return !data;
  } catch (error) {
    console.error('Error during email availability check:', error);
    throw error;
  }
};

/**
 * Updates user profile information
 * @param userId The user ID to update
 * @param updates The profile updates to apply
 */
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error during profile update:', error);
    throw error;
  }
};

/**
 * Gets user profile by user ID
 * @param userId The user ID to fetch
 * @returns User profile data
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }

    return data as UserProfile;
  } catch (error) {
    console.error('Error during profile fetch:', error);
    throw error;
  }
};