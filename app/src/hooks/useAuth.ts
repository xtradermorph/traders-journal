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
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return

    let mounted = true

    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (error) {
          console.warn('Auth session check error:', error.message);
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: false,
            loading: false,
            session: null,
            user: null
          }))
          return
        }

        setAuthState(prev => ({
          ...prev,
          isAuthenticated: !!session,
          loading: false,
          session: session,
          user: session?.user ?? null
        }))
      } catch (error) {
        if (mounted) {
          console.warn('Auth check exception:', error);
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: false,
            loading: false,
            session: null,
            user: null
          }))
        }
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: !!session,
          loading: false,
          session: session,
          user: session?.user ?? null
        }))
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [isClient])

  return {
    ...authState,
    isClient
  }
}
