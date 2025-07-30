'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

// Create a single instance of the Supabase client
export const supabase = createClientComponentClient<Database>()

// Export all the auth and data functions
export * from './auth'
export * from './data'