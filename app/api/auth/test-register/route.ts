import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema
const testRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3)
});

// Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'https://oweimywvzmqoizsyotrt.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    console.log('Test registration API called');
    
    // Parse request body
    const body = await request.json();
    console.log('Request body:', body);
    
    // Validate input
    const { email, password, username } = testRegisterSchema.parse(body);
    console.log(`Testing registration with email: ${email}`);
    
    // Step 1: Check if user exists
    console.log('Step 1: Checking if user exists');
    try {
      // List users with this email
      const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.log('Error listing users:', listError);
      } else if (userList && userList.users) {
        const existingUser = userList.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (existingUser) {
          console.log('User already exists:', existingUser);
          return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
        }
      }
    } catch (checkError) {
      console.error('Error during user check:', checkError);
    }
    
    // Step 2: Try to create user with admin API
    console.log('Step 2: Creating user with admin API');
    try {
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password,
        email_confirm: true,
        user_metadata: { username }
      });
      
      if (createError) {
        console.error('Admin create user error:', createError);
        return NextResponse.json({ 
          error: `Error creating user: ${createError.message}`,
          details: createError
        }, { status: 500 });
      }
      
      if (!userData || !userData.user) {
        console.error('No user data returned');
        return NextResponse.json({ error: 'No user data returned' }, { status: 500 });
      }
      
      console.log('User created successfully:', userData.user.id);
      
      // Step 3: Try to create profile
      console.log('Step 3: Creating profile');
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userData.user.id,
          username,
          email: email.toLowerCase().trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_trades: 0,
          win_rate: 0,
          medal_type: 'bronze',
          performance_rank: 0,
          role: 'user'
        });
      
      if (profileError) {
        console.error('Profile creation error:', profileError);
        return NextResponse.json({ 
          error: `Error creating profile: ${profileError.message}`,
          user: userData.user,
          details: profileError
        }, { status: 500 });
      }
      
      console.log('Profile created successfully');
      
      // Return success
      return NextResponse.json({ 
        success: true,
        message: 'User and profile created successfully',
        user: {
          id: userData.user.id,
          email: userData.user.email,
          username
        }
      });
    } catch (createUserError: unknown) {
      console.error('Unexpected error during user creation:', createUserError);
      return NextResponse.json({ 
        error: `Error during user creation: ${createUserError instanceof Error ? createUserError.message : 'Unknown error'}`,
        stack: createUserError instanceof Error ? createUserError.stack : undefined
      }, { status: 500 });
    }
    
  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    
    return NextResponse.json({ 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
