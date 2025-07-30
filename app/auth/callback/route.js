import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  
  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    return NextResponse.redirect(requestUrl.origin + `/login?error=${encodeURIComponent(error_description || error)}`);
  }
  
  if (!code) {
    console.error('No code provided in callback');
    return NextResponse.redirect(requestUrl.origin + '/login?error=missing_code');
  }
  
  try {
    // Create a new cookie store
    const cookieStore = cookies();
    
    // Create a new supabase client
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore,
    });
    
    // Exchange the code for a session - this is the critical part
    console.log('Exchanging code for session...');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(requestUrl.origin + `/login?error=${encodeURIComponent(error.message)}`);
    }
    
    console.log('Session exchange successful');
    
    // Don't try to create profiles or settings here - let the database trigger handle it
    // Just redirect to the dashboard
    return NextResponse.redirect(requestUrl.origin + '/dashboard');
  } catch (error) {
    console.error('Exception in auth callback:', error);
    return NextResponse.redirect(requestUrl.origin + `/login?error=${encodeURIComponent('server_error')}`);
  }
}
