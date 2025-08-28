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

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const action = searchParams.get('action');

    if (action === 'conversations') {
      // Fetch all conversations for the user
      const { data: conversations, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          message_type,
          file_url,
          file_name,
          is_read,
          created_at,
          updated_at,
          sender:profiles!messages_sender_id_fkey(id, username, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(id, username, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
      }

      // Group messages by conversation and get the latest message for each
      const conversationMap = new Map();
      
      conversations?.forEach((message) => {
        const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
        const otherUser = message.sender_id === user.id ? message.receiver : message.sender;
        
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            id: otherUserId,
            user_id: user.id,
            other_user_id: otherUserId,
            other_user: {
              id: otherUser.id,
              username: otherUser.username,
              avatar_url: otherUser.avatar_url
            },
            last_message: message,
            unread_count: 0,
            updated_at: message.created_at
          });
        } else {
          const existing = conversationMap.get(otherUserId);
          if (new Date(message.created_at) > new Date(existing.last_message.created_at)) {
            existing.last_message = message;
            existing.updated_at = message.created_at;
          }
        }
        
        // Count unread messages
        if (message.receiver_id === user.id && !message.is_read) {
          conversationMap.get(otherUserId).unread_count++;
        }
      });

      const conversationsList = Array.from(conversationMap.values());
      return NextResponse.json({ conversations: conversationsList });

    } else if (conversationId && action === 'messages') {
      // Fetch messages for a specific conversation
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          message_type,
          file_url,
          file_name,
          is_read,
          created_at,
          updated_at,
          sender:profiles!messages_sender_id_fkey(id, username, avatar_url)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${conversationId}),and(sender_id.eq.${conversationId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
      }

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', conversationId)
        .eq('is_read', false);

      return NextResponse.json({ messages });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Messages API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { receiver_id, content, message_type = 'text', file_url, file_name } = body;

    if (!receiver_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert the message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id,
        content,
        message_type,
        file_url,
        file_name,
        is_read: false
      })
      .select(`
        id,
        sender_id,
        receiver_id,
        content,
        message_type,
        file_url,
        file_name,
        is_read,
        created_at,
        updated_at,
        sender:profiles!messages_sender_id_fkey(id, username, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ message });

  } catch (error) {
    console.error('Send message API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
