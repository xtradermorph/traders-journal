'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { AuthError, Session } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'
import { cookies } from 'next/headers'

interface CookieOptions {
  name: string;
  value: string;
  options: {
    path?: string;
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
  };
}

// Create a function to get the Supabase client
export const getSupabaseClient = () => {
  return createClientComponentClient<Database>()
}

// Create a global Supabase client (for client-side use)
export const supabase = createClientComponentClient<Database>()

// Check if environment variables are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
}

// Auth state management
export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Initial auth error:', error)
        setError(error.message || 'Failed to get session')
        setLoading(false)
        return
      }

      setSession(session)
      setLoading(false)
    }).catch((err: Error) => {
      console.error('Auth initialization error:', err)
      setError('Failed to initialize auth')
      setLoading(false)
    })

    // Listen for changes on auth state
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      setSession(session)
      setError(null)
    })

    return () => {
      authSubscription.unsubscribe()
    }
  }, [])

  // Return auth state and check if user is authenticated
  const isAuthenticated = !!session
  return { session, loading, error, isAuthenticated }
}

// Profile management
export async function getProfile(userId: string) {
  try {
    // Try using the RPC function first
    const { data, error } = await supabase
      .rpc('get_user_profile', { user_id: userId })
    
    if (error) {
      console.error('RPC Profile Fetch Error:', error)
      // Fall back to direct query as a backup
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
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
    const { data, error } = await supabase
      .rpc('update_user_profile', { 
        user_id: userId,
        profile_data: profileData
      })
    
    if (error) {
      console.error('RPC Profile Update Error:', error)
      // Fall back to direct update as a backup
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
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
export async function getTrades(user_id: string) {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user_id)
      .order('date', { ascending: false })
    
    if (error) throw new Error(error.message || 'Failed to fetch trades')
    return data
  } catch (error) {
    console.error('Trades Fetch Error:', error)
    throw new Error('Failed to fetch trades')
  }
}

// Authentication methods
export async function checkAuth() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw new Error(error.message || 'Failed to check authentication')
    return !!session
  } catch (error) {
    console.error('Auth Check Error:', error)
    throw new Error('Failed to check authentication')
  }
}

export async function logout() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message || 'Failed to logout')
  } catch (error) {
    console.error('Logout Error:', error)
    throw new Error('Failed to logout')
  }
}
