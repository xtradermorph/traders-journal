'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
import { supabase } from '../src/lib/supabase';
import { Card, CardContent, CardFooter } from '../src/components/ui/card';
import { Input } from '../src/components/ui/input';
import { Button } from '../src/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../src/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../src/components/ui/avatar';
import { MedalIcon } from '../src/components/MedalIcon';
import { Search, X, Users, TrendingUp, Star, Calendar, Eye, UserPlus, UserCheck, UserX, MessageSquare } from 'lucide-react';
import { useToast } from '../src/hooks/use-toast';
import { calculateMedalTypeFromWinRate } from '../src/lib/medal-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../src/components/ui/tooltip';
import { PageHeader } from '../src/components/PageHeader';
import { UserProfile } from '../src/types';
import { PublicProfileView } from '../src/components/PublicProfileView';
import { sendFriendRequest, getFriendshipStatusString, acceptFriendRequest, declineFriendRequest, cancelFriendRequest } from '../lib/friendsUtils';
import { useMessageStore } from '../src/lib/store/messageStore';
import DashboardFooter from '../src/components/DashboardFooter';

interface Trader {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  win_rate: number | null;
  performance_rank: number | null;
  user_presence: {
    status: string;
    last_seen_at: string;
  } | null;
  public_profile?: boolean;
}

interface TraderCardProps {
  trader: Trader;
  onSendMessage: (traderId: string) => void;
  onSendFriendRequest: (traderId: string) => void;
  onAcceptFriendRequest: (traderId: string) => void;
  onDeclineFriendRequest: (traderId: string) => void;
  onCancelFriendRequest: (traderId: string) => void;
  friendshipStatus: 'NONE' | 'FRIENDS' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'BLOCKED';
  onViewProfile: (traderId: string) => void;
}

const TraderCard = ({ 
  trader, 
  onSendMessage,
  onSendFriendRequest, 
  onAcceptFriendRequest, 
  onDeclineFriendRequest, 
  onCancelFriendRequest,
  friendshipStatus, 
  onViewProfile 
}: TraderCardProps) => {
  const isOnline = trader.user_presence?.status === 'online';
  const medalType = trader.win_rate ? calculateMedalTypeFromWinRate(trader.win_rate) : null;
  
  const renderActionButton = () => {
    switch (friendshipStatus) {
      case 'NONE':
        return (
          <Button
            variant="default"
            size="sm"
            onClick={() => onSendFriendRequest(trader.id)}
            className="flex items-center gap-1 sm:gap-2 transition-all duration-200 text-xs sm:text-sm h-8 sm:h-9"
          >
            <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Add Friend</span>
            <span className="sm:hidden">Add</span>
          </Button>
        );
      case 'FRIENDS':
        return (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
          >
            <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Friends</span>
            <span className="sm:hidden">Friends</span>
          </Button>
        );
      case 'PENDING_SENT':
        return (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
            >
              <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Request Sent</span>
              <span className="sm:hidden">Sent</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancelFriendRequest(trader.id)}
              className="text-orange-600 border-orange-600 hover:text-orange-700 hover:bg-orange-50 h-8 sm:h-9"
              title="Cancel friend request"
            >
              <UserX className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        );
      case 'PENDING_RECEIVED':
        return (
          <div className="flex gap-1">
            <Button
              variant="default"
              size="sm"
              onClick={() => onAcceptFriendRequest(trader.id)}
              className="text-xs px-2 py-1 h-8 sm:h-9 bg-green-500 hover:bg-green-600 text-white"
              title="Accept friend request"
            >
              <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDeclineFriendRequest(trader.id)}
              className="text-xs px-2 py-1 h-8 sm:h-9 text-destructive border-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive"
              title="Decline friend request"
            >
              <UserX className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        );
      case 'BLOCKED':
        return (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
          >
            <UserX className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Blocked</span>
            <span className="sm:hidden">Blocked</span>
          </Button>
        );
      default:
        return null;
    }
  };
  
  return (
    <Card className="hover:shadow-lg transition-all duration-200 group border-border/50 hover:border-border">
      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="relative flex-shrink-0">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-background">
                <AvatarImage src={trader.avatar_url || undefined} alt={trader.username} />
                <AvatarFallback>{trader.username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              {isOnline && (
                <div className="absolute -bottom-1 -right-1 h-3 w-3 sm:h-4 sm:w-4 bg-green-500 rounded-full border-2 border-background shadow-sm"></div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-base sm:text-lg truncate">{trader.username}</h3>
                {medalType && <MedalIcon medalType={medalType} size="sm" />}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center cursor-help">
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        {trader.win_rate ? `${trader.win_rate}%` : 'N/A'}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Win rate - percentage of profitable trades</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {trader.performance_rank && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center cursor-help">
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          #{trader.performance_rank}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Performance ranking among all traders</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center cursor-help">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        {new Date(trader.created_at).toLocaleDateString()}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Member since - registration date</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
        <div className="flex flex-col gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewProfile(trader.id)}
            className="w-full group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors text-xs sm:text-sm"
          >
            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">View Profile</span>
            <span className="sm:hidden">View</span>
          </Button>
          <div className="flex gap-1 sm:gap-2 justify-center">
            {renderActionButton()}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onSendMessage(trader.id)}
                    className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
                  >
                    <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send Message</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

const TradersPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { setCurrentConversation } = useMessageStore();
  
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [friendshipStatuses, setFriendshipStatuses] = useState<Map<string, 'NONE' | 'FRIENDS' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'BLOCKED'>>(new Map());
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const tradersPerPage = 12;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTraders = useCallback(async () => {
    try {
      setLoading(true);

      
      // Get current user to exclude from results
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;
      
      const offset = (currentPage - 1) * tradersPerPage;
      
      let query = supabase
        .from('profiles')
        .select(`
          id, 
          username, 
          avatar_url, 
          created_at, 
          win_rate, 
          performance_rank,
          user_settings!inner(public_profile)
        `)
        .not('username', 'is', null)
        .eq('user_settings.public_profile', true);

      // Exclude current user from results
      if (currentUserId) {
        query = query.neq('id', currentUserId);
      }



      // Apply search filter if provided
      if (debouncedSearchQuery) {
        // First, check if there's an exact username match (for private profiles)
        const exactMatchQuery = supabase
          .from('profiles')
          .select(`
            id, 
            username, 
            avatar_url, 
            created_at, 
            win_rate, 
            performance_rank,
            user_settings!inner(public_profile)
          `)
          .eq('username', debouncedSearchQuery.trim())
          .not('username', 'is', null);
        
        if (currentUserId) {
          exactMatchQuery.neq('id', currentUserId);
        }
        
        const { data: exactMatchData } = await exactMatchQuery;
        
        if (exactMatchData && exactMatchData.length > 0) {
          // If exact match found, include it regardless of privacy setting
          // Also include public profiles that match the search term
          const publicMatchesQuery = supabase
            .from('profiles')
            .select(`
              id, 
              username, 
              avatar_url, 
              created_at, 
              win_rate, 
              performance_rank,
              user_settings!inner(public_profile)
            `)
            .not('username', 'is', null)
            .eq('user_settings.public_profile', true)
            .or(`username.ilike.%${debouncedSearchQuery}%,first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%`);
          
          if (currentUserId) {
            publicMatchesQuery.neq('id', currentUserId);
          }
          
          const { data: publicMatchesData } = await publicMatchesQuery;
          
          // Combine exact match with public matches, removing duplicates
          const allMatches = [...exactMatchData];
          if (publicMatchesData) {
            publicMatchesData.forEach(publicMatch => {
              if (!allMatches.find(match => match.id === publicMatch.id)) {
                allMatches.push(publicMatch);
              }
            });
          }
          
          // Set the results directly
          setTraders(allMatches.map(trader => ({
            id: trader.id,
            username: trader.username,
            avatar_url: trader.avatar_url,
            created_at: trader.created_at,
            win_rate: trader.win_rate,
            performance_rank: trader.performance_rank,
            public_profile: trader.user_settings?.[0]?.public_profile || false,
            user_presence: null
          })));
          
          // Calculate total pages for combined results
          setTotalPages(Math.ceil(allMatches.length / tradersPerPage));
          return;
        } else {
          // No exact match found, search only public profiles with partial matching
          query = query.or(`username.ilike.%${debouncedSearchQuery}%,first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%`);
        }
      }

      // Apply sorting
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'performance_high':
          query = query.order('performance_rank', { ascending: true });
          break;
        case 'performance_low':
          query = query.order('performance_rank', { ascending: false });
          break;
        case 'win_rate_high':
          query = query.order('win_rate', { ascending: false });
          break;
        case 'win_rate_low':
          query = query.order('win_rate', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      query = query.range(offset, offset + tradersPerPage - 1);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching traders:', error);
        toast({
          title: "Error",
          description: "Failed to load traders.",
          variant: "destructive",
        });
        setTraders([]);
        setTotalPages(1);
        return;
      }

      // Filter out traders without usernames and transform data
      let filteredTraders = (data || [])
        .filter(trader => trader.username)
        .map(trader => ({
          id: trader.id,
          username: trader.username,
          avatar_url: trader.avatar_url,
          created_at: trader.created_at,
          win_rate: trader.win_rate,
          performance_rank: trader.performance_rank,
          public_profile: trader.user_settings?.[0]?.public_profile || false,
          user_presence: null
        }));
      setTraders(filteredTraders);

      // Calculate total pages - use a simple approach
      try {
        let countQuery = supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .not('username', 'is', null)
          .eq('user_settings.public_profile', true);
        
        // Exclude current user from count
        if (currentUserId) {
          countQuery = countQuery.neq('id', currentUserId);
        }
        
        // Apply search filter to count query if provided
        if (debouncedSearchQuery) {
          countQuery = countQuery.or(`username.ilike.%${debouncedSearchQuery}%,first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%`);
        }
        
        const { count } = await countQuery;
        
        // Use a simple pagination approach
        const totalCount = count || 0;
        setTotalPages(Math.ceil(totalCount / tradersPerPage));
      } catch (countError) {
        console.error('Count query error:', countError);
        // Fallback to a simple pagination
        setTotalPages(1);
      }

    } catch (error) {
      console.error('Error in fetchTraders:', error);
      toast({
        title: "Error",
        description: "Failed to load traders.",
        variant: "destructive",
      });
      setTraders([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, sortBy, currentPage, toast]);

  const fetchFriendshipStatuses = useCallback(async (traderIds: string[]) => {
    try {
      console.log('fetchFriendshipStatuses called with:', traderIds.length, 'traders');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return;
      }

      console.log('User authenticated:', user.id);
      const newStatuses = new Map<string, 'NONE' | 'FRIENDS' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'BLOCKED'>();
      
      // Process traders in batches to avoid overwhelming the database
      const batchSize = 5;
      for (let i = 0; i < traderIds.length; i += batchSize) {
        const batch = traderIds.slice(i, i + batchSize);
        
        // Process batch in parallel with timeout
        const batchPromises = batch.map(async (traderId) => {
          try {
            console.log('Getting friendship status for trader:', traderId);
            const status = await Promise.race([
              getFriendshipStatusString(traderId),
              new Promise<'NONE'>((resolve) => setTimeout(() => resolve('NONE'), 5000)) // 5 second timeout
            ]);
            console.log('Status for', traderId, ':', status);
            return { traderId, status };
          } catch (error) {
            console.error('Error getting status for trader', traderId, ':', error);
            return { traderId, status: 'NONE' as const };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({ traderId, status }) => {
          newStatuses.set(traderId, status);
        });
      }
      
      console.log('Setting friendship statuses:', newStatuses.size);
      setFriendshipStatuses(newStatuses);
    } catch (error) {
      console.error('Error fetching friendship statuses:', error);
      // Set all to NONE as fallback
      const fallbackStatuses = new Map<string, 'NONE'>();
      traderIds.forEach(id => fallbackStatuses.set(id, 'NONE'));
      setFriendshipStatuses(fallbackStatuses);
    }
  }, []);

  useEffect(() => {
    fetchTraders();
  }, [debouncedSearchQuery, sortBy, currentPage]);

  // Fetch friendship statuses when traders change
  useEffect(() => {
    if (traders.length > 0) {
      console.log('Fetching friendship statuses for', traders.length, 'traders');
      fetchFriendshipStatuses(traders.map(t => t.id));
    }
  }, [traders]);

  const handleSendFriendRequest = async (traderId: string) => {
    try {
      const result = await sendFriendRequest(traderId);
      
      if (result.data) {
        toast({
          title: "Friend Request Sent",
          description: "Your friend request has been sent successfully.",
        });
        // Update the friendship status for all traders
        fetchFriendshipStatuses(traders.map(t => t.id));
      } else if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request.",
        variant: "destructive",
      });
    }
  };

  const handleAcceptFriendRequest = async (traderId: string) => {
    try {
      const result = await acceptFriendRequest(traderId);
      
      if (result.data) {
        toast({
          title: "Friend Request Accepted",
          description: "You are now friends with this trader.",
        });
        fetchFriendshipStatuses(traders.map(t => t.id));
      } else if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: "Error",
        description: "Failed to accept friend request.",
        variant: "destructive",
      });
    }
  };

  const handleDeclineFriendRequest = async (traderId: string) => {
    try {
      const result = await declineFriendRequest(traderId);
      
      if (result.data) {
        toast({
          title: "Friend Request Declined",
          description: "Friend request has been declined.",
        });
        fetchFriendshipStatuses(traders.map(t => t.id));
      } else if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      toast({
        title: "Error",
        description: "Failed to decline friend request.",
        variant: "destructive",
      });
    }
  };

  const handleCancelFriendRequest = async (traderId: string) => {
    try {
      const result = await cancelFriendRequest(traderId);
      
      if (result.success) {
        toast({
          title: "Friend Request Cancelled",
          description: "Friend request has been cancelled.",
        });
        fetchFriendshipStatuses(traders.map(t => t.id));
      } else if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      toast({
        title: "Error",
        description: "Failed to cancel friend request.",
        variant: "destructive",
      });
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  };

  const handleViewProfile = async (traderId: string) => {
    console.log('handleViewProfile called with traderId:', traderId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', traderId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile information.",
          variant: "destructive",
        });
        return;
      }

      console.log('Profile data fetched:', data);
      setSelectedProfile(data);
      setIsProfileModalOpen(true);
      console.log('Modal state set - selectedProfile:', data, 'isOpen:', true);
    } catch (error) {
      console.error('Error opening profile:', error);
      toast({
        title: "Error",
        description: "Failed to open profile.",
        variant: "destructive",
      });
    }
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedProfile(null);
  };

  const handleSendMessage = async (recipientId: string) => {
    try {
      // Find the trader's information to get their username
      const trader = traders.find(t => t.id === recipientId);
      if (!trader) {
        toast({
          title: 'Error',
          description: 'Trader not found.',
          variant: 'destructive',
        });
        return;
      }

      // Get current user information
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to send messages.',
          variant: 'destructive',
        });
        return;
      }

      // Create a conversation object for the new messaging system
      const conversation = {
        id: recipientId,
        user_id: user.id,
        other_user_id: recipientId,
        other_user: {
          id: recipientId,
          username: trader.username,
          avatar_url: trader.avatar_url
        },
        last_message: undefined,
        unread_count: 0,
        updated_at: new Date().toISOString()
      };

      // Set the current conversation and navigate to messages page
      setCurrentConversation(conversation);
      router.push('/messages');

      toast({
        title: 'Message',
        description: `Opening conversation with ${trader.username}`,
      });

    } catch (error) {
      console.error('Error opening conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to open conversation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <PageHeader title="Discover Traders" showBackButton backUrl="/dashboard" />
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
        <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
        <div className="relative w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-4 sm:my-6 md:my-8 z-10 flex flex-col min-h-[80vh] max-h-[90vh]">
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8">
              <div className="mb-6 sm:mb-8">
                <p className="text-sm sm:text-base text-muted-foreground">
                  Connect with fellow traders and explore their performance
                </p>
              </div>

              {/* Search and Filter Section */}
              <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by username, first name, or last name... (exact username shows private profiles)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10 text-sm sm:text-base"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSearch}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[200px] text-sm sm:text-base">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="performance_high">Performance (High to Low)</SelectItem>
                      <SelectItem value="performance_low">Performance (Low to High)</SelectItem>
                      <SelectItem value="win_rate_high">Win Rate (High to Low)</SelectItem>
                      <SelectItem value="win_rate_low">Win Rate (Low to High)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground">
                  💡 Tip: Enter an exact username to find private profiles, or search by name for public profiles only
                </div>
              </div>

              {/* Results Section */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-muted rounded-full"></div>
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-muted rounded w-3/4"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0 px-6 pb-6">
                        <div className="flex gap-2 w-full">
                          <div className="h-9 bg-muted rounded flex-1"></div>
                          <div className="h-9 bg-muted rounded w-20"></div>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : traders.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No traders found</h3>
                  <p className="text-muted-foreground">
                    {debouncedSearchQuery 
                      ? `No traders found matching "${debouncedSearchQuery}"`
                      : "No public traders available at the moment."
                    }
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {traders.map((trader) => (
                      <TraderCard
                        key={trader.id}
                        trader={trader}
                        onSendMessage={handleSendMessage}
                        onSendFriendRequest={handleSendFriendRequest}
                        onAcceptFriendRequest={handleAcceptFriendRequest}
                        onDeclineFriendRequest={handleDeclineFriendRequest}
                        onCancelFriendRequest={handleCancelFriendRequest}
                        friendshipStatus={friendshipStatuses.get(trader.id) || 'NONE'}
                        onViewProfile={handleViewProfile}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="flex items-center px-4">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Profile Modal */}
            {selectedProfile && (
              <PublicProfileView
                profile={selectedProfile}
                isOpen={isProfileModalOpen}
                onClose={closeProfileModal}
                onSendMessage={handleSendMessage}
              />
            )}
            <DashboardFooter />
          </div>
        </div>
      </div>
    </>
  );
};

export default TradersPage; 