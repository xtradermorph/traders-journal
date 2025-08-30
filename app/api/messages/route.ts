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

    if (action === 'unread-count') {
      // Get total unread message count for the user
      const { data: unreadMessages, error } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('is_read', false)
        .is('deleted_at', null);

      if (error) {
        console.error('Error fetching unread count:', error);
        return NextResponse.json({ error: 'Failed to fetch unread count' }, { status: 500 });
      }

      return NextResponse.json({ 
        unreadCount: unreadMessages?.length || 0 
      });

    } else if (action === 'conversations') {
      // Fetch all conversations for the user
      const { data: conversations, error } = await supabase
        .from('messages')
                 .select(`
           id,
           sender_id,
           receiver_id,
           content,
           file_url,
           file_name,
           message_type,
           is_read,
           created_at,
           updated_at,
           sender:profiles!messages_sender_id_fkey(id, username, avatar_url),
           receiver:profiles!messages_receiver_id_fkey(id, username, avatar_url)
         `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .is('deleted_at', null)
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
           file_url,
           file_name,
           message_type,
           is_read,
           created_at,
           updated_at,
           sender:profiles!messages_sender_id_fkey(id, username, avatar_url)
         `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${conversationId}),and(sender_id.eq.${conversationId},receiver_id.eq.${user.id})`)
        .is('deleted_at', null)
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
    console.log('POST /api/messages - Starting request processing');
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    console.log('POST /api/messages - Getting current user');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('POST /api/messages - Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('POST /api/messages - User authenticated:', user.id);

    // Check if messages table exists
    console.log('POST /api/messages - Checking if messages table exists');
    const { data: tableCheck, error: tableError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.log('POST /api/messages - Messages table error:', tableError);
      return NextResponse.json({ 
        error: 'Messages table not available', 
        details: tableError.message,
        code: tableError.code 
      }, { status: 500 });
    }
    console.log('POST /api/messages - Messages table exists and is accessible');

    console.log('POST /api/messages - Parsing request body');
    const body = await request.json();
    console.log('POST /api/messages - Request body:', body);
    const { receiver_id, content, file_url, file_name, message_type } = body;

    if (!receiver_id || !content) {
      console.log('POST /api/messages - Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate that receiver exists
    console.log('POST /api/messages - Validating receiver:', receiver_id);
    const { data: receiver, error: receiverError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', receiver_id)
      .single();

    if (receiverError || !receiver) {
      console.log('POST /api/messages - Receiver validation failed:', receiverError);
      return NextResponse.json({ 
        error: 'Receiver not found', 
        details: 'The user you are trying to message does not exist' 
      }, { status: 404 });
    }
    console.log('POST /api/messages - Receiver validated successfully');

    // Prevent sending message to self
    if (receiver_id === user.id) {
      return NextResponse.json({ 
        error: 'Cannot send message to yourself', 
        details: 'You cannot send a message to your own profile' 
      }, { status: 400 });
    }

    // Insert the message
    console.log('POST /api/messages - Attempting to insert message');
    const messageData = {
      sender_id: user.id,
      receiver_id,
      content,
      file_url,
      file_name,
      message_type: message_type || 'text',
      is_read: false
    };
    console.log('POST /api/messages - Message data to insert:', messageData);
    
    const { data: message, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select(`
        id,
        sender_id,
        receiver_id,
        content,
        file_url,
        file_name,
        message_type,
        is_read,
        created_at,
        updated_at,
        sender:profiles!messages_sender_id_fkey(id, username, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return NextResponse.json({ 
        error: 'Failed to send message', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    return NextResponse.json({ message });

  } catch (error) {
    console.error('Send message API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    // Soft delete the message
    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error) {
      console.error('Error deleting message:', error);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete message API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
