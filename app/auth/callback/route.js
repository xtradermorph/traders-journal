import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token = requestUrl.searchParams.get('token');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  const type = requestUrl.searchParams.get('type');
  
  // Debug logging
  console.log('Auth callback received:', { code: !!code, token: !!token, type, error });
  
  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    return NextResponse.redirect(requestUrl.origin + `/login?error=${encodeURIComponent(error_description || error)}`);
  }
  
  try {
    // Check if this is a password recovery flow
    // We can detect this by checking if we have a code but no type, or if type is recovery
    const isRecoveryFlow = type === 'recovery' || (code && !type);
    
    if (isRecoveryFlow) {
      // For password reset with PKCE, we need to exchange the code for a session first
      console.log('Password recovery flow detected - exchanging code for session');
      
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ 
        cookies: () => cookieStore,
      });
      
      console.log('Exchanging recovery code for session...');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Error exchanging recovery code for session:', error);
        return NextResponse.redirect(requestUrl.origin + `/login?error=${encodeURIComponent(error.message)}`);
      }
      
      console.log('Recovery session exchange successful');
      
      // Redirect to reset password page - the session is now established
      return NextResponse.redirect(requestUrl.origin + '/reset-password');
    } else {
      // For other flows, we need a code
      if (!code) {
        console.error('No code provided in callback');
        return NextResponse.redirect(requestUrl.origin + '/login?error=missing_code');
      }
      // For other flows (signup, oauth), create a session normally
      const cookieStore = cookies();
      
      const supabase = createRouteHandlerClient({ 
        cookies: () => cookieStore,
      });
      
      console.log('Exchanging code for session...');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Error exchanging code for session:', error);
        return NextResponse.redirect(requestUrl.origin + `/login?error=${encodeURIComponent(error.message)}`);
      }
      
      console.log('Session exchange successful');
      
      if (type === 'signup') {
        // Email confirmation flow - redirect to dashboard
        return NextResponse.redirect(requestUrl.origin + '/dashboard');
      } else {
        // Default OAuth flow - redirect to dashboard
        return NextResponse.redirect(requestUrl.origin + '/dashboard');
      }
    }
  } catch (error) {
    console.error('Exception in auth callback:', error);
    return NextResponse.redirect(requestUrl.origin + `/login?error=${encodeURIComponent('server_error')}`);
  }
}
