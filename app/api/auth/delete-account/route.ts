import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cleanupUserData } from '../../../lib/database-cleanup';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";


// Initialize admin Supabase client with service role key (only available server-side)
const supabaseUrl = process.env.SUPABASE_URL || 'https://oweimywvzmqoizsyotrt.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey || '');

export async function POST(request: Request) {
  try {
    // Create a Supabase client for the current request
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get auth session from request cookies
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get request body
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json({ error: 'Password is required to delete account' }, { status: 400 });
    }

    // First, verify the password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session.user.email || '',
      password,
    });

    if (signInError) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Clean up all user data
    try {
      await cleanupUserData(userId);
    } catch (cleanupError) {
      console.error('Error cleaning up user data:', cleanupError);
      return NextResponse.json({ error: 'Failed to clean up user data' }, { status: 500 });
    }

    // Delete the user account using admin client
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('Error deleting user account:', deleteError);
      return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 });
    }

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({ 
      success: true, 
      message: 'Account successfully deleted'
    });
  } catch (error) {
    console.error('Error in delete account API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
