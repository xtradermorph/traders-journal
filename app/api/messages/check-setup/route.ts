import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if messages table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);
    
    if (tableError) {
      return NextResponse.json({ 
        status: 'missing',
        error: 'Messages table does not exist',
        details: tableError.message,
        code: tableError.code,
        setup_required: true,
        instructions: 'Run the MESSAGES_SYSTEM_SETUP.sql script in your Supabase SQL editor'
      });
    }

    // Check if we can insert a test message
    const testMessage = {
      sender_id: user.id,
      receiver_id: user.id, // Temporarily use self for testing
      content: 'Test message for setup verification',
      message_type: 'text',
      is_read: false
    };

    const { data: insertTest, error: insertError } = await supabase
      .from('messages')
      .insert(testMessage)
      .select('id')
      .single();

    if (insertError) {
      return NextResponse.json({ 
        status: 'error',
        error: 'Messages table exists but insert failed',
        details: insertError.message,
        code: insertError.code,
        setup_required: true
      });
    }

    // Clean up test message
    await supabase
      .from('messages')
      .delete()
      .eq('id', insertTest.id);

    return NextResponse.json({ 
      status: 'ok',
      message: 'Messages table exists and is working correctly'
    });

  } catch (error) {
    console.error('Messages setup check error:', error);
    return NextResponse.json({ 
      status: 'error',
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
