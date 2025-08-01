import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://oweimywvzmqoizsyotrt.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey || '');

export async function POST(request: Request) {
  try {
    // Get auth session from request cookies
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get request body
    const { traderId } = await request.json();
    
    if (!traderId) {
      return NextResponse.json({ error: 'Trader ID is required' }, { status: 400 });
    }

    // Delete the follow relationship
    const { error } = await supabase
      .from('trader_follows')
      .delete()
      .eq('follower_id', userId)
      .eq('followed_id', traderId);
    
    if (error) {
      console.error('Error unfollowing trader:', error);
      return NextResponse.json({ error: 'Failed to unfollow trader' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Trader unfollowed successfully'
    });
  } catch (error) {
    console.error('Error in unfollow trader API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
