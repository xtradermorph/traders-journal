"use client"

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase/index";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
// Trade shared email notification will be handled by API route
import type { Trade } from '@/types/trade';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Users, User, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ShareTradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade | null;
}

interface User {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_friend?: boolean;
}

const ShareTradeDialog = ({ isOpen, onClose, trade }: ShareTradeDialogProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [shareType, setShareType] = useState<'username' | 'friend' | 'search'>('username');
  const [recipientUsername, setRecipientUsername] = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [hasFriends, setHasFriends] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isValidatingUsername, setIsValidatingUsername] = useState(false);
  const [usernameValidationResult, setUsernameValidationResult] = useState<User | null>(null);

  // Fetch user's friends
  const fetchFriends = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('trader_friends')
        .select(`
          user1:user1_id(id, username, avatar_url),
          user2:user2_id(id, username, avatar_url)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'ACCEPTED');

      if (error) throw error;

      const friendsList: User[] = (data || []).map((item: any) => {
        // Determine which user is the friend (not the current user)
        const friend = item.user1?.id === user.id ? item.user2 : item.user1;
        return {
          id: friend.id,
          username: friend.username,
          avatar_url: friend.avatar_url,
          is_friend: true
        };
      });
      
      setFriends(friendsList);
      setHasFriends(friendsList.length > 0);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast({
        id: 'friends-fetch-error',
        title: 'Error Loading Friends',
        description: 'Failed to load your friends list. Please try again.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Search for users by username, first_name, or last_name
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // For private profile search, require exact username match
      let searchQuery;
      if (shareType === 'search') {
        // Use exact username matching for better privacy
        searchQuery = supabase
          .from('profiles')
          .select('id, username, first_name, last_name, avatar_url')
          .eq('username', query.trim()) // Exact match only
          .neq('id', user.id) // Exclude current user
          .limit(10);
      } else {
        // For other share types, use partial matching
        searchQuery = supabase
          .from('profiles')
          .select('id, username, first_name, last_name, avatar_url')
          .or(`username.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
          .neq('id', user.id) // Exclude current user
          .limit(10);
      }

      const { data, error } = await searchQuery;

      if (error) throw error;

      // Mark friends in search results
      const searchResultsWithFriendStatus: User[] = (data || []).map((profile: any) => ({
        id: profile.id,
        username: profile.username,
        first_name: profile.first_name,
        last_name: profile.last_name,
        avatar_url: profile.avatar_url,
        is_friend: friends.some(friend => friend.id === profile.id)
      }));

      setSearchResults(searchResultsWithFriendStatus);

      // Show message if no exact match found for private search (only for search tab, not real-time)
      if (shareType === 'search' && (!data || data.length === 0)) {
        toast({
          id: 'no-user-found',
          title: 'User Not Found',
          description: `No user found with username "${query.trim()}". Please check the spelling and try again.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        id: 'search-error',
        title: 'Error Searching Users',
        description: 'Failed to search for users. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  }, [shareType, friends]);

  // Validate username for the "Enter Username" section
  const validateUsername = useCallback(async (username: string) => {
    if (!username.trim()) {
      setUsernameValidationResult(null);
      return;
    }

    setIsValidatingUsername(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url')
        .eq('username', username.trim())
        .neq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No user found
          setUsernameValidationResult(null);
        } else {
          throw error;
        }
      } else {
        // User found
        setUsernameValidationResult({
          id: data.id,
          username: data.username,
          first_name: data.first_name,
          last_name: data.last_name,
          avatar_url: data.avatar_url,
          is_friend: friends.some(friend => friend.id === data.id)
        });
      }
    } catch (error) {
      console.error('Error validating username:', error);
      setUsernameValidationResult(null);
    } finally {
      setIsValidatingUsername(false);
    }
  }, [friends]);

  // Load data when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen, fetchFriends]);

  // Search users when search query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (shareType === 'search' && searchQuery.trim()) {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, shareType, searchUsers]);

  // Clear search results when query is emptied
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Validate username when recipientUsername changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (shareType === 'username' && recipientUsername.trim()) {
        validateUsername(recipientUsername);
      } else {
        setUsernameValidationResult(null);
      }
    }, 500); // 500ms delay to avoid too many requests

    return () => clearTimeout(timeoutId);
  }, [recipientUsername, shareType, validateUsername]);

  // Share trade mutation
  const shareTradeMutation = useMutation({
    mutationFn: async () => {
      if (!trade) throw new Error('No trade to share');

      let targetUsername = '';

      if (shareType === 'username') {
        if (usernameValidationResult) {
          targetUsername = usernameValidationResult.username;
        } else {
          targetUsername = recipientUsername.trim();
        }
      } else if (shareType === 'friend') {
        const selectedFriend = friends.find(f => f.id === selectedFriendId);
        if (!selectedFriend) throw new Error('Selected friend not found');
        targetUsername = selectedFriend.username;
      } else if (shareType === 'search') {
        const selectedUser = searchResults.find(u => u.id === selectedFriendId);
        if (!selectedUser) throw new Error('Selected user not found');
        targetUsername = selectedUser.username;
      }

      if (!targetUsername) {
        throw new Error('No recipient specified');
      }

      // Call the share_trade_with_user function
      const { data, error } = await supabase.rpc('share_trade_with_user', {
        p_trade_id: trade.id,
        p_recipient_username: targetUsername
      });

      if (error) {
        console.error('Share trade error:', error);
        throw new Error(`Failed to share trade: ${error.message}`);
      }

      return data;
    },
    onSuccess: async (data) => {
      // Send email notification to recipient
      try {
        if (data && data.recipient_id && trade) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await fetch('/api/notifications/trade-shared', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                recipientId: data.recipient_id,
                senderId: user.id,
                tradeId: trade.id
              }),
            });
          }
        }
      } catch (emailError) {
        console.error('Error sending trade shared email:', emailError);
        // Don't fail the share if email fails
      }

      toast({
        id: 'trade-share-success',
        title: 'Trade Shared Successfully',
        description: `Your trade has been shared with the selected user.`,
        variant: 'default',
      });
      onClose();
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        id: 'trade-share-error',
        title: 'Error Sharing Trade',
        description: error.message || 'Failed to share trade. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const resetForm = () => {
    setShareType('username');
    setRecipientUsername('');
    setSelectedFriendId('');
    setSearchQuery('');
    setSearchResults([]);
    setUsernameValidationResult(null);
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const handleShare = () => {
    if (shareType === 'username' && !recipientUsername.trim()) {
      toast({
        id: 'username-required',
        title: 'Username Required',
        description: 'Please enter a username to share with.',
        variant: 'destructive',
      });
      return;
    }

    if ((shareType === 'friend' || shareType === 'search') && !selectedFriendId) {
      toast({
        id: 'user-required',
        title: 'User Required',
        description: 'Please select a user to share with.',
        variant: 'destructive',
      });
      return;
    }

    shareTradeMutation.mutate();
  };

  if (!trade) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Trade</DialogTitle>
          <DialogDescription>
            Share your {trade.currency_pair} trade with another trader. Choose how you want to find them.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-3">
            <Label className="text-base font-medium">Share Method</Label>
            <div className="grid gap-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="username"
                  name="shareType"
                  value="username"
                  checked={shareType === 'username'}
                  onChange={(e) => setShareType(e.target.value as 'username')}
                  className="h-4 w-4"
                />
                <Label htmlFor="username" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Enter Username</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Share with any trader by entering their username
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="friend"
                  name="shareType"
                  value="friend"
                  checked={shareType === 'friend'}
                  onChange={(e) => setShareType(e.target.value as 'friend')}
                  disabled={!hasFriends}
                  className="h-4 w-4"
                />
                <Label htmlFor="friend" className={`flex-1 cursor-pointer ${!hasFriends ? 'text-muted-foreground' : ''}`}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Select from Friends</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {hasFriends ? 'Share with one of your friends' : 'No friends available'}
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="search"
                  name="shareType"
                  value="search"
                  checked={shareType === 'search'}
                  onChange={(e) => setShareType(e.target.value as 'search')}
                  className="h-4 w-4"
                />
                <Label htmlFor="search" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <span>Search Traders (Private)</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Search by exact username for privacy protection
                  </p>
                </Label>
              </div>
            </div>
          </div>

          {/* Username input */}
          {shareType === 'username' && (
            <div className="space-y-2">
              <Label htmlFor="recipient-username">Recipient Username</Label>
              <Input
                id="recipient-username"
                placeholder="Enter username (e.g., trader123)"
                value={recipientUsername}
                onChange={(e) => setRecipientUsername(e.target.value)}
              />
              
              {isValidatingUsername && (
                <div className="text-sm text-muted-foreground">Validating username...</div>
              )}
              
              {usernameValidationResult && (
                <div className="space-y-2">
                  <Label>User Found</Label>
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={usernameValidationResult.avatar_url || undefined} alt={usernameValidationResult.username} />
                      <AvatarFallback>{usernameValidationResult.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-green-800 dark:text-green-200">{usernameValidationResult.username}</span>
                      {usernameValidationResult.first_name && usernameValidationResult.last_name && (
                        <span className="text-xs text-green-600 dark:text-green-300">
                          {usernameValidationResult.first_name} {usernameValidationResult.last_name}
                        </span>
                      )}
                    </div>
                    {usernameValidationResult.is_friend && (
                      <Badge variant="secondary" className="text-xs">Friend</Badge>
                    )}
                  </div>
                </div>
              )}
              
              {recipientUsername && !isValidatingUsername && !usernameValidationResult && (
                <div className="text-sm text-red-600 dark:text-red-400">No user found with this username</div>
              )}
            </div>
          )}

          {/* Friend selection */}
          {shareType === 'friend' && (
            <div className="space-y-2">
              {!hasFriends ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You need to have friends to share trades with them. Add friends from the Friends page first.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Label htmlFor="friend-select">Select Friend</Label>
                  <Select value={selectedFriendId} onValueChange={setSelectedFriendId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a friend" />
                    </SelectTrigger>
                    <SelectContent>
                      {friends.map((friend) => (
                        <SelectItem key={friend.id} value={friend.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={friend.avatar_url || undefined} alt={friend.username} />
                              <AvatarFallback>{friend.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span>{friend.username}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          )}

          {/* Search traders */}
          {shareType === 'search' && (
            <div className="space-y-2">
              <Label htmlFor="search-traders">Search Traders (Private)</Label>
              <Input
                id="search-traders"
                placeholder="Enter exact username (e.g., trader123)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
              {isSearching && (
                <div className="text-sm text-muted-foreground">Searching...</div>
              )}
              
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <Label>Select User</Label>
                  <Select value={selectedFriendId} onValueChange={setSelectedFriendId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {searchResults.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                              <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.username}</span>
                              {user.first_name && user.last_name && (
                                <span className="text-xs text-muted-foreground">
                                  {user.first_name} {user.last_name}
                                </span>
                              )}
                            </div>
                            {user.is_friend && (
                              <Badge variant="secondary" className="text-xs">Friend</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {searchQuery && !isSearching && searchResults.length === 0 && (
                <div className="text-sm text-muted-foreground">No users found matching "{searchQuery}"</div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleShare}
            disabled={
              shareTradeMutation.isPending || 
              (shareType === 'username' && !recipientUsername.trim() && !usernameValidationResult) ||
              (shareType === 'friend' && !hasFriends) ||
              ((shareType === 'friend' || shareType === 'search') && !selectedFriendId)
            }
          >
            {shareTradeMutation.isPending ? 'Sharing...' : 'Share Trade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareTradeDialog; 