import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

// Create a server-side Supabase client
export const createServerSupabaseClient = () => {
  return createServerComponentClient<Database>({ cookies })
}

// Export a default instance for convenience
export const supabase = createServerSupabaseClient() 