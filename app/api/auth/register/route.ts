import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Initialize Supabase client with service role key from environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://oweimywvzmqoizsyotrt.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZWlteXd2em1xb2l6c3lvdHJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI4NDU3NCwiZXhwIjoyMDY0ODYwNTc0fQ.5sC0t0GshmS2_vy3X-w82jcRCFvvxjILGgb6phOWXwE';

// Create admin client with service role key for secure operations
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Zod schema for input validation - matches client-side validation
const registerSchema = z.object({
  username: z.string().min(6, 'Username must be at least 6 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
});

/**
 * Registration API endpoint
 * Creates a new user in Supabase Auth and a corresponding profile in the profiles table
 */
export async function POST(request: Request) {
  try {
    console.log('Server-side registration API called');
    const body = await request.json();
    console.log('Request body received:', JSON.stringify(body));

    // Validate input using Zod
    try {
      const validatedData = registerSchema.parse(body);
      console.log('Input validation passed');
      
      // Destructure validated data
      const { username, email, password } = validatedData;
      const normalizedEmail = email.toLowerCase().trim();
      
      console.log('Registering user with email:', normalizedEmail);

      // ULTRA SIMPLIFIED APPROACH FOR DEBUGGING
      // Create user with admin API and auto-confirm
      console.log('Creating user with admin API');
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true, // Auto-confirm email for production
        user_metadata: { username, name: username } // Include both username and name for compatibility
      });

      if (createError) {
        console.error('Admin create user error:', createError);
        // Return the detailed error for debugging
        return NextResponse.json(
          { 
            error: 'Database error creating new user', 
            details: createError 
          },
          { status: 400 }
        );
      }

      if (!userData?.user) {
        console.error('No user data returned');
        return NextResponse.json(
          { error: 'Failed to create user account - no user data returned' },
          { status: 400 }
        );
      }

      console.log('User created successfully with ID:', userData.user.id);
      
      // DIRECT INSERT APPROACH - Simplest possible profile creation
      console.log('Creating profile with direct insert');
      const { error: insertError } = await supabase.from('profiles').insert({
        id: userData.user.id,
        username,
        email: normalizedEmail,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_trades: 0,
        win_rate: 0,
        medal_type: 'bronze',
        performance_rank: 0,
        role: 'user'
      });
      
      if (insertError) {
        console.error('Profile creation error:', insertError);
        // Return the detailed error for debugging
        return NextResponse.json(
          { 
            error: 'Database error creating profile', 
            details: insertError 
          },
          { status: 400 }
        );
      } else {
        console.log('Profile created successfully');
      }
      
      return NextResponse.json(
        {
          message: 'User registered successfully',
          user: userData.user,
          redirectTo: '/login'
        },
        { status: 201 }
      );
    } catch (validationError) {
      console.error('Validation error:', validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Invalid input', 
            details: validationError.errors 
          }, 
          { status: 400 }
        );
      }
      throw validationError; // Re-throw if it's not a Zod error
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Return detailed error information for debugging
    return NextResponse.json(
      { 
        error: error?.message || 'Registration failed. Please try again later.',
        stack: error?.stack,
        name: error?.name
      }, 
      { status: 500 }
    );
  }
}