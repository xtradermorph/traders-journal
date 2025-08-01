import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { deleteTradeSetup } from '../../../../lib/database-cleanup';

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
    const { setupId } = await request.json();
    
    if (!setupId) {
      return NextResponse.json({ error: 'Trade setup ID is required' }, { status: 400 });
    }

    // Use the comprehensive cleanup function
    const result = await deleteTradeSetup(setupId, userId);
    
    if (!result.success) {
      console.error('Error deleting trade setup:', result.error);
      return NextResponse.json({ 
        error:
          typeof result.error === 'string'
            ? result.error
            : (result.error && typeof result.error === 'object' && 'message' in result.error && typeof result.error.message === 'string'
                ? result.error.message
                : 'Failed to delete trade setup')
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Trade setup and all related data deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete trade setup API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
