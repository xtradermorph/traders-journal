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
    const { messageId, conversationId, deleteAll = false } = await request.json();
    
    if (!messageId && !conversationId) {
      return NextResponse.json({ error: 'Either messageId or conversationId is required' }, { status: 400 });
    }

    if (messageId) {
      // First check if the user is authorized to delete this message
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching message:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch message' }, { status: 500 });
      }
      
      // Only allow if the user is the message sender
      if (message.sender_id !== userId) {
        return NextResponse.json({ error: 'Unauthorized: You can only delete your own messages' }, { status: 403 });
      }
      
      // Delete the message
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      
      if (error) {
        console.error('Error deleting message:', error);
        return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
      }
    } else if (conversationId && deleteAll) {
      // Delete all messages in a conversation
      const otherUserId = conversationId;
      
      // Delete all messages between these two users
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`(sender_id.eq.${userId}.and.receiver_id.eq.${otherUserId}),(sender_id.eq.${otherUserId}.and.receiver_id.eq.${userId})`);
      
      if (error) {
        console.error('Error deleting conversation:', error);
        return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: messageId ? 'Message successfully deleted' : 'Conversation successfully deleted'
    });
  } catch (error) {
    console.error('Error in delete message API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
