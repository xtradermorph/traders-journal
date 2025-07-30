'use server'

import { createServerClient } from '@supabase/ssr'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

interface LoginRequest {
  username: string
  password: string
}

interface LoginResponse {
  user: any
  session: any
  profile: any
}

interface ErrorResponse {
  message: string
  details?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get headers from request context
    const headersList = headers()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            const cookies = headersList.get('cookie') || ''
            return cookies
              .split(';')
              .map(cookie => cookie.trim())
              .map(cookie => {
                const [name, value] = cookie.split('=', 2)
                return { name: name.trim(), value: decodeURIComponent(value) }
              })
          },
          setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                // In API routes, we can't set cookies directly
                // We'll handle this through the response headers
              })
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      },
    )

    const body = await request.json()
    const { username, password } = body as LoginRequest
    
    if (!username || !password) {
      return NextResponse.json(
        { message: 'Username and password are required' } as ErrorResponse,
        { status: 400 }
      )
    }

    console.log('Looking up user with username:', username)
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('username', username)
      .single()

    if (userError || !userData) {
      console.error('User lookup failed:', userError || 'No user data found')
      return NextResponse.json(
        { message: 'User not found' } as ErrorResponse,
        { status: 404 }
      )
    }

    console.log('Found user with email:', userData.email)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password
    })

    if (authError) {
      console.error('Authentication error:', authError)
      return NextResponse.json(
        { 
          message: 'Authentication failed',
          details: authError.message
        } as ErrorResponse,
        { status: 401 }
      )
    }

    if (!authData?.session) {
      console.error('No session in auth response:', authData)
      return NextResponse.json(
        { message: 'Failed to sign in' } as ErrorResponse,
        { status: 401 }
      )
    }

    console.log('Successfully authenticated user:', authData.user.id)
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.error('Failed to fetch profile:', profileError)
      return NextResponse.json(
        { 
          message: 'Failed to fetch user profile',
          details: profileError.message
        } as ErrorResponse,
        { status: 500 }
      )
    }

    // Create response
    const response = NextResponse.json({
      user: authData.user,
      session: authData.session,
      profile: profileData
    } as LoginResponse)

    // Set the session cookie
    if (authData.session) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/' as const,
        maxAge: authData.session.expires_at
      }

      const accessCookie = `sb-access-token=${authData.session.access_token}; HttpOnly; Secure=${cookieOptions.secure}; SameSite=${cookieOptions.sameSite}; Path=${cookieOptions.path}; Max-Age=${cookieOptions.maxAge}`
      const refreshCookie = `sb-refresh-token=${authData.session.refresh_token}; HttpOnly; Secure=${cookieOptions.secure}; SameSite=${cookieOptions.sameSite}; Path=${cookieOptions.path}; Max-Age=${cookieOptions.maxAge}`

      response.headers.set('Set-Cookie', accessCookie)
      response.headers.append('Set-Cookie', refreshCookie)
    }

    return response

  } catch (error: unknown) {
    console.error('Login route error:', error)
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred'

    const statusCode = 500

    return NextResponse.json(
      { 
        message: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      } as ErrorResponse,
      { status: statusCode }
    )
  }
}