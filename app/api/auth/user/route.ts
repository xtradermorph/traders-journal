import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Create a Supabase client for the Route Handler
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('API - Auth check:', { 
      hasSession: !!session,
      sessionError: sessionError ? JSON.stringify(sessionError) : 'none',
      cookies: Array.from(cookieStore.getAll()).map(c => c.name)
    });

    if (sessionError || !session) {
      console.log('API - No session found');
      return NextResponse.json({ 
        isAuthenticated: false, 
        user: null 
      });
    }

    // Get the user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json({ 
        isAuthenticated: false, 
        user: null 
      });
    }

    // Get the profile data
    let profileData;
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();
      
    profileData = data;

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 is the error code for "no rows returned"
      console.error('Error fetching profile:', profileError);
      
      // If profile doesn't exist, create it
      if (profileError.code === 'PGRST104') {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userData.user.id,
            username: userData.user.user_metadata?.username || userData.user.email?.split('@')[0],
            email: userData.user.email,
            avatar_url: userData.user.user_metadata?.avatar_url,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          profileData = newProfile;
        }
      }
    }

    // Combine user and profile data
    const user = {
      id: userData.user.id,
      email: userData.user.email,
      username: profileData?.username || userData.user.user_metadata?.username || userData.user.email?.split('@')[0],
      avatar_url: profileData?.avatar_url || userData.user.user_metadata?.avatar_url,
      profession: profileData?.profession || '',
      location: profileData?.location || '',
      trader_status: profileData?.trader_status || '',
      trader_type: profileData?.trader_type || '',
      bio: profileData?.bio || '',
      years_experience: profileData?.years_experience,
      trading_frequency: profileData?.trading_frequency || '',
      markets: profileData?.markets || '',
      trading_goal: profileData?.trading_goal || '',
      trading_challenges: profileData?.trading_challenges || ''
    };

    return NextResponse.json({ 
      isAuthenticated: true, 
      user 
    });
  } catch (error) {
    console.error('Error in user API:', error);
    return NextResponse.json({ 
      isAuthenticated: false, 
      user: null,
      error: 'Failed to authenticate user'
    }, { status: 500 });
  }
}