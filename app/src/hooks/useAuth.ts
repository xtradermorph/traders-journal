'use client'

import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [isClient, setIsClient] = useState(false);
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

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check auth state with Supabase - ALWAYS call this useEffect
  useEffect(() => {
    // Don't proceed if not on client side or if supabase is not available
    if (!isClient || !supabase) {
      setAuthState({
        isAuthenticated: false,
        loading: true,
        session: null,
        user: null
      });
      return;
    }

    const checkAuth = async () => {
      try {
        if (!supabase || !supabase.auth) {
          console.error('Supabase client not properly initialized');
          setAuthState({
            isAuthenticated: false,
            loading: false,
            session: null,
            user: null
          });
          return;
        }

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

    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      if (supabase && supabase.auth) {
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            setAuthState({
              isAuthenticated: !!session,
              loading: false,
              session: session,
              user: session?.user ?? null
            });
          }
        );
        subscription = authSubscription;
      }
    } catch (error) {
      console.error('Failed to set up auth state change listener:', error);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [isClient]);
  
  return {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    loading: authState.loading,
    session: authState.session
  };
}
