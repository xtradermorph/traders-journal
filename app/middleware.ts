import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })
  
  try {
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    // If there's an auth error, don't redirect immediately - let the client handle it
    if (error) {
      console.warn('Middleware auth error:', error.message);
      // Continue without redirecting to allow the client to handle the error
      return res;
    }
    
    // Define protected routes that require authentication
    const protectedRoutes = [
      '/dashboard',
      '/profile',
      '/trade-records',
      '/friends',
      '/shared-trades',
      '/settings',
      '/social-forum',
      '/traders',
      '/support'
    ]
    
    // Check if the current path is a protected route
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )
    
    // If accessing a protected route without authentication, redirect to login
    if (isProtectedRoute && !session) {
      const loginUrl = new URL('/login', request.url)
      // Add the current URL as a redirect parameter
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Remove automatic redirect to ensure users must go through full authentication flow
    // This ensures Turnstile security check is always required
    
    return res
  } catch (error) {
    console.warn('Middleware exception:', error);
    // On any error, continue without redirecting to prevent infinite loops
    return res;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}