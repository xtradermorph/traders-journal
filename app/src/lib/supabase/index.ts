'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Create a single instance of the Supabase client
let supabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export const supabase = (() => {
  if (!isBrowser) {
    // Return a mock client for SSR
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: () => Promise.resolve({ error: null }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      }),
      rpc: () => Promise.resolve({ data: null, error: null }),
    } as any;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClientComponentClient<Database>()
    } catch (error) {
      console.error('Failed to create Supabase client:', error)
      // Return a fallback client
      return {
        auth: {
          getSession: async () => ({ data: { session: null }, error: new Error('Supabase client not available') }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signOut: async () => ({ error: new Error('Supabase client not available') })
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: new Error('Supabase client not available') }),
              order: () => ({ data: [], error: new Error('Supabase client not available') })
            })
          }),
          upsert: async () => ({ error: new Error('Supabase client not available') })
        }),
        rpc: async () => ({ data: null, error: new Error('Supabase client not available') })
      } as any
    }
  }

  return supabaseClient
})()

// Export all the auth and data functions
export * from './auth'
export * from './data'