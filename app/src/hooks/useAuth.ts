'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface AuthState {
  isAuthenticated: boolean
  loading: boolean
  session: any
  user: any
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    loading: true,
    session: null,
    user: null
  })
  const [lastSessionCheck, setLastSessionCheck] = useState<number>(0)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return

    let mounted = true
    let timeoutId: NodeJS.Timeout
    
    // Try to restore session from localStorage if available
    const restoreSession = () => {
      try {
        const storedSession = localStorage.getItem('supabase.auth.token')
        if (storedSession) {
          const parsed = JSON.parse(storedSession)
          if (parsed && parsed.access_token) {
            // We have a stored session, set loading to false but keep checking
            setAuthState(prev => ({
              ...prev,
              loading: false
            }))
          }
        }
      } catch (error) {
        console.warn('Error restoring session from storage:', error)
      }
    }
    
    // Restore session immediately
    restoreSession()

    const checkAuth = async () => {
      try {
        // Prevent too frequent session checks
        const now = Date.now()
        if (now - lastSessionCheck < 1000) {
          return // Skip if checked less than 1 second ago
        }
        setLastSessionCheck(now)

        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('Auth check timeout - keeping current state');
            setAuthState(prev => ({
              ...prev,
              loading: false
              // Don't reset authentication state on timeout
            }));
          }
        }, 5000); // 5 second timeout

        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return

        clearTimeout(timeoutId);

        if (error) {
          console.warn('Auth session check error:', error.message);
          // For any error, just stop loading but preserve current auth state
          // This prevents false logouts due to temporary network issues
          // Only reset auth state for specific errors that indicate actual auth failure
          if (error.message.includes('JWT expired') || 
              error.message.includes('Invalid JWT') ||
              error.message.includes('invalid_token')) {
            setAuthState(prev => ({
              ...prev,
              isAuthenticated: false,
              loading: false,
              session: null,
              user: null
            }))
          } else {
            setAuthState(prev => ({
              ...prev,
              loading: false
            }))
          }
          return
        }

        // Only update state if there's an actual change
        setAuthState(prev => {
          const newIsAuthenticated = !!session
          const newUser = session?.user ?? null
          
          // If authentication state hasn't changed, just update loading
          if (prev.isAuthenticated === newIsAuthenticated && 
              prev.user?.id === newUser?.id) {
            return {
              ...prev,
              loading: false
            }
          }
          
          return {
            ...prev,
            isAuthenticated: newIsAuthenticated,
            loading: false,
            session: session,
            user: newUser
          }
        })
      } catch (error) {
        if (mounted) {
          clearTimeout(timeoutId);
          console.warn('Auth check exception:', error);
          // On exception, just stop loading but preserve current state
          setAuthState(prev => ({
            ...prev,
            loading: false
          }))
        }
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        clearTimeout(timeoutId);
        
        console.log('Auth state change:', event, session?.user?.id);
        
        // Handle specific auth events
        if (event === 'TOKEN_REFRESHED' && session) {
          // Token was refreshed successfully, update session
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: true,
            loading: false,
            session: session,
            user: session.user
          }))
          return
        }
        
        if (event === 'SIGNED_OUT') {
          // User explicitly signed out
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: false,
            loading: false,
            session: null,
            user: null
          }))
          return
        }
        
        // Only update state if there's an actual change
        setAuthState(prev => {
          const newIsAuthenticated = !!session
          const newUser = session?.user ?? null
          
          // If authentication state hasn't changed, just update loading
          if (prev.isAuthenticated === newIsAuthenticated && 
              prev.user?.id === newUser?.id) {
            return {
              ...prev,
              loading: false
            }
          }
          
          return {
            ...prev,
            isAuthenticated: newIsAuthenticated,
            loading: false,
            session: session,
            user: newUser
          }
        })
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeoutId);
      subscription.unsubscribe()
    }
  }, [isClient])

  return {
    ...authState,
    isClient
  }
}
