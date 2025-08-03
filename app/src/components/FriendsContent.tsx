"use client";

import React, { useState, useEffect } from "react";
import { supabase, useAuth } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CircleDot, Search, UserMinus, UserPlus, Users, Clock, Mail, Bell, BellOff } from "lucide-react";

interface Friend {
  id: string;
  username: string;
  avatar_url?: string;
  profession?: string;
  online_status: boolean;
  last_seen?: string;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  sender: {
    username: string;
    avatar_url?: string;
    profession?: string;
  };
  created_at: string;
}

type FriendData = {
  friend: {
    id: string;
    username: string;
    avatar_url?: string;
    profession?: string;
  };
};

type PresenceData = {
  user_id: string;
  last_seen_at: string;
  status?: string | null;
};

interface ToastProps {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

const FriendsContent = () => {
  const router = useRouter();
  const { session } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Format time ago function
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000; // years
    if (interval > 1) return Math.floor(interval) + 'y ago';
    interval = seconds / 2592000; // months
    if (interval > 1) return Math.floor(interval) + 'mo ago';
    interval = seconds / 86400; // days
    if (interval > 1) return Math.floor(interval) + 'd ago';
    interval = seconds / 3600; // hours
    if (interval > 1) return Math.floor(interval) + 'h ago';
    interval = seconds / 60; // minutes
    if (interval > 1) return Math.floor(interval) + 'm ago';
    return 'just now';
  };

  // Handle accepting friend request
  const handleAcceptRequest = async (requestId: string) => {
    if (!session?.user?.id) return;

    try {
      // Get the request details
      const { data: request } = await supabase
        .from('friend_requests')
        .select('sender_id')
        .eq('id', requestId)
        .single();

      if (!request) throw new Error('Request not found');

      // Create bidirectional friendship
      const { error: friendError } = await supabase.from('trader_friends').insert([
        { user_id: session.user.id, friend_id: request.sender_id },
        { user_id: request.sender_id, friend_id: session.user.id }
      ]);

      if (friendError) throw friendError;

      // Update request status
      const { error: statusError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (statusError) throw statusError;

      // Update UI
      setFriendRequests(prev => prev.filter(r => r.id !== requestId));
      toast({
        id: "friend-request-accepted",
        title: "Success",
        description: "Friend request accepted"
      });

    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        id: "friend-request-accept-error",
        title: "Error",
        description: "Failed to accept friend request"
      });
    }
  };

  // Handle declining friend request
  const handleDeclineRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) throw error;

      // Update UI
      setFriendRequests(prev => prev.filter(r => r.id !== requestId));
      toast({
        id: "friend-request-declined",
        title: "Success",
        description: "Friend request declined"
      });

    } catch (error) {
      console.error('Error declining friend request:', error);
      toast({
        id: "friend-request-decline-error",
        title: "Error",
        description: "Failed to decline friend request"
      });
    }
  };

  // Fetch friends and friend requests
  useEffect(() => {
    const fetchFriends = async () => {
      if (!session?.user?.id) return;
      
      try {
        // Fetch friends
        const { data: friendsData, error: friendsError } = await supabase
          .from('trader_friends')
          .select(`
            friend:friend_id(
              id,
              username,
              avatar_url,
              profession
            )
          `)
          .eq('user_id', session.user.id) as { data: FriendData[] | null, error: unknown };

        if (friendsError) throw friendsError;

        // Fetch online status for each friend
        const friendIds = friendsData?.map(f => f.friend.id) || [];
        const { data: presenceData } = await supabase
          .from('user_presence')
          .select('*')
          .in('user_id', friendIds) as { data: PresenceData[] | null, error: unknown };

        // Combine friend data with online status
        const friendsWithStatus: Friend[] = (friendsData || []).map(f => {
          const presence = (presenceData || []).find(p => p.user_id === f.friend.id);
          const lastActive = presence?.last_seen_at ? new Date(presence.last_seen_at).getTime() : 0;
          const isOnline = presence?.status === 'ONLINE' && (Date.now() - lastActive < 15 * 60 * 1000);
          return {
            ...f.friend,
            online_status: isOnline,
            last_seen: presence?.last_seen_at
          };
        });

        setFriends(friendsWithStatus);

        // Fetch friend requests
        const { data: requestsData, error: requestsError } = await supabase
          .from('friend_requests')
          .select(`
            id,
            sender_id,
            created_at,
            sender:profiles!friend_requests_sender_id_fkey(
              username,
              avatar_url,
              profession
            )
          `)
          .eq('receiver_id', session.user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }) as { data: FriendRequest[] | null, error: unknown };

        if (requestsError) throw requestsError;
        setFriendRequests(requestsData || []);

      } catch (error) {
        console.error('Error fetching friends:', error);
        toast({
          id: "friends-fetch-error",
          title: "Error",
          description: "Failed to fetch friends"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchFriends();
    const interval = setInterval(() => {
      fetchFriends();
    }, 60000);
    return () => clearInterval(interval);
  }, [session, toast]);

  // Handle removing a friend
  const handleRemoveFriend = async (friendId: string) => {
    if (!session?.user?.id) return;

    try {
      // Remove both friendship records (bidirectional)
      const { error } = await supabase
        .from('trader_friends')
        .delete()
        .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
        .or(`user_id.eq.${friendId},friend_id.eq.${friendId}`);

      if (error) throw error;

      // Update local state
      setFriends(prev => prev.filter(f => f.id !== friendId));

      toast({
        id: "friend-removed",
        title: "Success",
        description: "Successfully removed from your friends list"
      });
    } catch (error) {
      console.error('Error removing friend:', error);
      toast({
        id: "friend-remove-error",
        title: "Error",
        description: "Failed to remove friend"
      });
    }
  };

  // Filter friends based on search query
  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.profession?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="friends" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Friends
            {friends.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {friends.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Requests
            {friendRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {friendRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <Input
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <TabsContent value="friends" className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center p-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">No friends yet</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {searchQuery ? "No friends match your search" : "Start adding friends to connect with other traders"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] rounded-md border p-4">
              <div className="space-y-4">
                {filteredFriends.map((friend) => (
                  <Card key={friend.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={friend.avatar_url || ''} alt={friend.username} />
                            <AvatarFallback>{friend.username[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold">{friend.username}</h4>
                              {friend.online_status ? (
                                <Badge variant="default" className="bg-green-500">
                                  <CircleDot className="h-3 w-3 mr-1" />
                                  Online
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Last seen {formatTimeAgo(friend.last_seen || '')}
                                </Badge>
                              )}
                            </div>
                            {friend.profession && (
                              <p className="text-sm text-muted-foreground">{friend.profession}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/profile/${friend.id}`)}
                          >
                            View Profile
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveFriend(friend.id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            </div>
          ) : friendRequests.length === 0 ? (
            <div className="text-center p-8">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">No friend requests</h3>
              <p className="text-sm text-muted-foreground mt-2">
                When someone adds you as a friend, their request will appear here
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] rounded-md border p-4">
              <div className="space-y-4">
                {friendRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={request.sender.avatar_url || ''} alt={request.sender.username} />
                            <AvatarFallback>{request.sender.username[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="text-sm font-semibold">{request.sender.username}</h4>
                            {request.sender.profession && (
                              <p className="text-sm text-muted-foreground">{request.sender.profession}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Sent {formatTimeAgo(request.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleAcceptRequest(request.id)}
                          >
                            Accept
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeclineRequest(request.id)}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FriendsContent;
