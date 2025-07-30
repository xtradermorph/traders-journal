import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
// Friend request email notification will be handled by API route

// Define the structure of a friendship record based on your table
interface SenderProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

export interface Friendship {
  id: string;
  user1_id: string;
  user2_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED';
  action_user_id: string;
  created_at: string;
  updated_at: string;
}

// Helper to get the current authenticated user's ID
const getCurrentUserId = async (): Promise<string | null> => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user) {
    console.error('Error getting session or user not logged in:', error?.message);
    return null;
  }
  return session.user.id;
};

// Helper to normalize user IDs (user1_id is always the smaller ID)
// This helps in consistently querying and ensuring uniqueness for a pair.
const normalizeUserIds = (userIdA: string, userIdB: string): { user1_id: string, user2_id: string } => {
  if (userIdA < userIdB) {
    return { user1_id: userIdA, user2_id: userIdB };
  }
  return { user1_id: userIdB, user2_id: userIdA };
};

/**
 * Sends a friend request from the current user to the recipient.
 */
export const sendFriendRequest = async (recipientId: string): Promise<{ data?: any; error?: string }> => {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { error: 'User not authenticated.' };
  if (currentUserId === recipientId) return { error: 'Cannot send a friend request to yourself.' };

  try {
    // Check if a friend request already exists
    const { data: existingRequest, error: fetchError } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${currentUserId})`)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingRequest) {
      if (existingRequest.status === 'accepted') return { error: 'You are already friends.' };
      if (existingRequest.status === 'pending' && existingRequest.sender_id === currentUserId) return { error: 'Friend request already sent.' };
      if (existingRequest.status === 'pending' && existingRequest.sender_id !== currentUserId) return { error: 'This user has already sent you a friend request.' };
      if (existingRequest.status === 'declined') {
        // Allow sending a new request after a declined one
        // Delete the old declined request first
        await supabase
          .from('friend_requests')
          .delete()
          .eq('id', existingRequest.id);
      } else {
        return { error: 'A pending relationship already exists.' }
      }
    }

    const { data, error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: currentUserId,
        recipient_id: recipientId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Send email notification to recipient
    try {
      await fetch('/api/notifications/friend-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId,
          senderId: currentUserId
        }),
      });
    } catch (emailError) {
      console.error('Error sending friend request email:', emailError);
      // Don't fail the friend request if email fails
    }

    return { data };
  } catch (error: any) {
    console.error('Error sending friend request:', error.message);
    return { error: error.message || 'Failed to send friend request.' };
  }
};

/**
 * Accepts a friend request.
 */
export const acceptFriendRequest = async (senderId: string): Promise<{ data?: any; error?: string }> => {
  const currentUserId = await getCurrentUserId(); // This is the user accepting the request
  if (!currentUserId) return { error: 'User not authenticated.' };

  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('sender_id', senderId)
      .eq('recipient_id', currentUserId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    if (!data) return { error: 'Friend request not found or already actioned.'}
    return { data };
  } catch (error: any) {
    console.error('Error accepting friend request:', error.message);
    return { error: error.message || 'Failed to accept friend request.' };
  }
};

/**
 * Declines a friend request.
 */
export const declineFriendRequest = async (senderId: string): Promise<{ data?: any; error?: string }> => {
  const currentUserId = await getCurrentUserId(); // This is the user declining
  if (!currentUserId) return { error: 'User not authenticated.' };

  try {
    // Update status to declined
    const { data, error } = await supabase
      .from('friend_requests')
      .update({
        status: 'declined',
        updated_at: new Date().toISOString(),
      })
      .eq('sender_id', senderId)
      .eq('recipient_id', currentUserId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    if (!data) return { error: 'Friend request not found or already actioned.'}
    return { data };
  } catch (error: any) {
    console.error('Error declining friend request:', error.message);
    return { error: error.message || 'Failed to decline friend request.' };
  }
};

/**
 * Cancels a friend request sent by the current user.
 */
export const cancelFriendRequest = async (recipientId: string): Promise<{ success?: boolean; error?: string }> => {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { error: 'User not authenticated.' };

  try {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('sender_id', currentUserId)
      .eq('recipient_id', recipientId)
      .eq('status', 'pending');

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error canceling friend request:', error.message);
    return { error: error.message || 'Failed to cancel friend request.' };
  }
};

/**
 * Removes a friend (unfriends).
 */
export const removeFriend = async (friendId: string): Promise<{ success?: boolean; error?: string }> => {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { error: 'User not authenticated.' };

  try {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('status', 'accepted')
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${currentUserId})`);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error removing friend:', error.message);
    return { error: error.message || 'Failed to remove friend.' };
  }
};

/**
 * Fetches the list of accepted friends for a given user.
 * Returns an array of profile objects for the friends.
 */
export const getFriends = async (userId: string): Promise<{ data?: any[]; error?: string }> => {
  if (!userId) return { error: 'User ID is required.' };
  try {
    // Fetch friend request records where the user is involved and status is accepted
    const { data: friendships, error: friendshipError } = await supabase
      .from('friend_requests')
      .select('sender_id, recipient_id')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);

    if (friendshipError) throw friendshipError;
    if (!friendships || friendships.length === 0) return { data: [] };

    // Extract friend IDs (the other user in each friendship)
    const friendIds = friendships.map(f => f.sender_id === userId ? f.recipient_id : f.sender_id);

    if (friendIds.length === 0) return { data: [] };

    // Fetch profiles of these friends, including presence
    const { data: friendsProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*, user_presence(status, last_seen_at)')
      .in('id', friendIds);
    if (profilesError) throw profilesError;
    return { data: friendsProfiles || [] };

  } catch (error: any) {
    console.error('Error fetching friends:', error.message);
    return { error: error.message || 'Failed to fetch friends.' };
  }
};

/**
 * Fetches a specific friendship record between two users.
 */
export const getFriendshipStatus = async (otherUserId: string): Promise<{ data?: Friendship | null; error?: string }> => {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { error: 'User not authenticated.' };
  if (currentUserId === otherUserId) return { error: 'Cannot check friendship status with yourself.' };

  const { user1_id, user2_id } = normalizeUserIds(currentUserId, otherUserId);

  try {
    const { data, error } = await supabase
      .from('trader_friends')
      .select('*')
      .eq('user1_id', user1_id)
      .eq('user2_id', user2_id)
      .maybeSingle();

    if (error) throw error;
    return { data };
  } catch (error: any) {
    console.error('Error fetching friendship status:', error.message);
    return { error: error.message || 'Failed to fetch friendship status.' };
  }
};

/**
 * Gets the friendship status as a simple string for UI display.
 * Returns: 'NONE' | 'FRIENDS' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'BLOCKED'
 */
export const getFriendshipStatusString = async (otherUserId: string): Promise<'NONE' | 'FRIENDS' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'BLOCKED'> => {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId || currentUserId === otherUserId) return 'NONE';

  try {
    // Check for friend request status - use two separate queries instead of complex OR
    let requestData = null;
    
    // First check if current user sent a request to other user
    const { data: sentRequest, error: sentError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', currentUserId)
      .eq('recipient_id', otherUserId)
      .maybeSingle();

    if (sentError) {
      console.error('Error fetching sent friend request:', sentError);
    } else if (sentRequest) {
      requestData = sentRequest;
    }

    // If no sent request found, check if other user sent a request to current user
    if (!requestData) {
      const { data: receivedRequest, error: receivedError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('sender_id', otherUserId)
        .eq('recipient_id', currentUserId)
        .maybeSingle();

      if (receivedError) {
        console.error('Error fetching received friend request:', receivedError);
      } else if (receivedRequest) {
        requestData = receivedRequest;
      }
    }

    if (!requestData) return 'NONE';

    switch (requestData.status) {
      case 'accepted':
        return 'FRIENDS';
      case 'pending':
        return requestData.sender_id === currentUserId ? 'PENDING_SENT' : 'PENDING_RECEIVED';
      case 'declined':
      default:
        return 'NONE';
    }
  } catch (error) {
    console.error('Error fetching friendship status string:', error);
    return 'NONE';
  }
};

/**
 * Fetches pending incoming friend requests for the current user.
 */
export const getPendingIncomingRequests = async (): Promise<{ data?: any[]; error?: string }> => {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { error: 'User not authenticated.' };

  try {
    // Fetch pending requests where current user is the recipient
    const { data: rawRequests, error: rawRequestError } = await supabase
      .from('friend_requests')
      .select('id, created_at, sender_id, recipient_id, status')
      .eq('recipient_id', currentUserId)
      .eq('status', 'pending');

    if (rawRequestError) throw rawRequestError;
    if (!rawRequests || rawRequests.length === 0) return { data: [] };

    const senderIds = rawRequests.map(req => req.sender_id);
    if (senderIds.length === 0) return { data: [] };

    const { data: senders, error: sendersError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', senderIds)
      .returns<SenderProfile[]>();

    if (sendersError) throw sendersError;

    const enrichedRequests = rawRequests.map(req => {
      const senderProfile = senders?.find((s: SenderProfile) => s.id === req.sender_id);
      return { ...req, sender_profile: senderProfile };
    });

    return { data: enrichedRequests };

  } catch (error: any) {
    console.error('Error fetching pending incoming requests:', error.message);
    return { error: error.message || 'Failed to fetch pending requests.' };
  }
};

/**
 * Blocks a user.
 * Creates or updates a friendship record to 'BLOCKED' status.
 * The action_user_id will be the ID of the user performing the block.
 */
export const blockUser = async (blockedUserId: string): Promise<{ data?: Friendship; error?: string }> => {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { error: 'User not authenticated.' };
  if (currentUserId === blockedUserId) return { error: 'Cannot block yourself.' };

  const { user1_id, user2_id } = normalizeUserIds(currentUserId, blockedUserId);

  try {
    const { data, error } = await supabase
      .from('trader_friends')
      .upsert({
        user1_id,
        user2_id,
        status: 'BLOCKED',
        action_user_id: currentUserId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user1_id,user2_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error during blockUser upsert:', error);
      throw error;
    }
    return { data };
  } catch (error: any) {
    console.error('Error blocking user:', error.message);
    return { error: error.message || 'Failed to block user.' };
  }
};

/**
 * Unblocks a user.
 * This means deleting the 'BLOCKED' friendship record that was initiated by the current user.
 */
export const unblockUser = async (unblockedUserId: string): Promise<{ success?: boolean; error?: string }> => {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { error: 'User not authenticated.' };

  const { user1_id, user2_id } = normalizeUserIds(currentUserId, unblockedUserId);

  try {
    const { error, count } = await supabase
      .from('trader_friends')
      .delete()
      .eq('user1_id', user1_id)
      .eq('user2_id', user2_id)
      .eq('status', 'BLOCKED')
      .eq('action_user_id', currentUserId);

    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    console.error('Error unblocking user:', error.message);
    return { error: error.message || 'Failed to unblock user.' };
  }
};
