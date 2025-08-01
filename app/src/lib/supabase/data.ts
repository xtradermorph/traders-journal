'use client'

import { supabase } from './index'

// Profile management
export async function getProfile(userId: string) {
  try {
    // Try using the RPC function first
    const { data, error } = await supabase.rpc('get_user_profile', { user_id: userId })
    
    if (error) {
      console.error('RPC Profile Fetch Error:', error)
      // Fall back to direct query as a backup
      const { data: fallbackData, error: fallbackError } = await supabase.from('profiles')
        .select('id, username, email')
        .eq('id', userId)
        .single()
      
      if (fallbackError) throw new Error(fallbackError.message || 'Failed to fetch profile')
      return fallbackData
    }
    
    return data
  } catch (error) {
    console.error('Profile Fetch Error:', error)
    throw new Error('Failed to fetch profile')
  }
}

export async function updateProfile(userId: string, profileData: Partial<{ username: string; email: string }>) {
  try {
    // Try using the RPC function first
    const { data, error } = await supabase.rpc('update_user_profile', { 
      user_id: userId,
      profile_data: profileData
    })
    
    if (error) {
      console.error('RPC Profile Update Error:', error)
      // Fall back to direct update as a backup
      const { data: fallbackData, error: fallbackError } = await supabase.from('profiles')
        .update(profileData)
        .eq('id', userId)
        .select('id, username, email')
        .single()
      
      if (fallbackError) throw new Error(fallbackError.message || 'Failed to update profile')
      return fallbackData
    }
    
    return data
  } catch (error) {
    console.error('Profile Update Error:', error)
    throw new Error('Failed to update profile')
  }
}

// Trade records management
export async function getTrades(userId: string) {
  try {
    const { data, error } = await supabase.from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(error.message || 'Failed to fetch trades')
    return data
  } catch (error) {
    console.error('Trades Fetch Error:', error)
    throw new Error('Failed to fetch trades')
  }
} 