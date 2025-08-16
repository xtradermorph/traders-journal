import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })
  
  try {
    // Get current session with a timeout
    const sessionPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Session check timeout')), 3000)
    )
    
    const { data: { session }, error } = await Promise.race([
      sessionPromise,
      timeoutPromise
    ]) as any
    
    // If there's an auth error or timeout, don't redirect - let the client handle it
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
    
    // Skip middleware for login page to prevent redirect loops
    if (request.nextUrl.pathname === '/login') {
      return res
    }
    
    // Check if the current path is a protected route
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )
    
    // Only redirect if we're certain there's no session AND we're on a protected route
    // This prevents false redirects during auth state transitions
    if (isProtectedRoute && session === null && !session) {
      // Add a small delay to allow auth state to stabilize
      // This prevents rapid redirects during auth state changes
      const loginUrl = new URL('/login', request.url)
      // Add the current URL as a redirect parameter
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
      
      // Set a cookie to indicate this was a middleware redirect
      const response = NextResponse.redirect(loginUrl)
      response.cookies.set('auth-redirect', 'true', { 
        maxAge: 60, // 1 minute
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      })
      
      return response
    }
    
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
     * - _next/webpack-hmr (hot reload)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public|_next/webpack-hmr).*)',
  ],
}