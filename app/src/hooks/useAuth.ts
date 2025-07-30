'use client'

import { useEffect, useState } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  if (!supabase) {
    console.error('Supabase client is not initialized');
    return {
      isAuthenticated: false,
      user: null,
      loading: false,
      session: null
    };
  }

  // Create a local state to track auth state
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    loading: boolean;
    session: Session | null;
    user: User | null;
  }>({
    isAuthenticated: false,
    loading: true,
    session: null,
    user: null
  });
  
  // Check auth state with Supabase
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth check error:', error);
          setAuthState({
            isAuthenticated: false,
            loading: false,
            session: null,
            user: null
          });
          return;
        }

        setAuthState({
          isAuthenticated: !!session,
          loading: false,
          session: session,
          user: session?.user ?? null
        });
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthState({
          isAuthenticated: false,
          loading: false,
          session: null,
          user: null
        });
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthState({
          isAuthenticated: !!session,
          loading: false,
          session: session,
          user: session?.user ?? null
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);
  
  return {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    loading: authState.loading,
    session: authState.session
  };
}
