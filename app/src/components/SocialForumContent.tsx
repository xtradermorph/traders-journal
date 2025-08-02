"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
// Import types from the types file we created
import { TradeSetup, UserProfile } from '../types';
import { 
  Users, MessageSquare, ThumbsUp, MessageCircle, Share2, 
  Filter, TrendingUp, Globe, User, PlusCircle, AlertTriangle, Eye, EyeOff,
  X, Calendar, BarChart3, Clock, SortAsc, SortDesc, Loader2, Trash2, Send
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from '@/lib/supabase';
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Comment {
  id: string;
  trade_setup_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  user?: UserProfile;
}

const SocialForumContent = () => {
  console.log('SocialForumContent component loading...');
  
  const router = useRouter();
  const { toast } = useToast();

  // Consolidated state
  const [state, setState] = useState({
    activeTab: 'community' as 'community' | 'my-setups' | 'trending',
    activeForumTab: 'gbp_usd',
    isLoading: true,
    isInitialized: false,
    user_id: null as string | null,
    shareDialogOpen: false,
    selectedTradeSetup: null as string | null,
    selectedForum: 'gbp_usd',
    deleteDialogOpen: false,
    setupToDelete: null as string | null,
    filterDialogOpen: false,
  });

  // Filter state
  const [filters, setFilters] = useState({
    timeRange: 'all' as 'all' | 'today' | 'week' | 'month',
    sortBy: 'newest' as 'newest' | 'oldest' | 'likes' | 'comments',
  });

  // Data state
  const [data, setData] = useState({
    communitySetups: [] as TradeSetup[],
    mySetups: [] as TradeSetup[],
    trendingSetups: [] as TradeSetup[],
  });

  // Comment state
  const [comments, setComments] = React.useState<{ [setupId: string]: Comment[] }>({});
  const [commentInputs, setCommentInputs] = React.useState<{ [setupId: string]: string }>({});
  const [replyInputs, setReplyInputs] = React.useState<{ [commentId: string]: string }>({});
  const [replyingTo, setReplyingTo] = React.useState<{ [setupId: string]: string | null }>({});
  const [openComments, setOpenComments] = React.useState<{ [setupId: string]: boolean }>({});
  const [loadingComments, setLoadingComments] = React.useState<{ [setupId: string]: boolean }>({});
  const [submittingComment, setSubmittingComment] = React.useState<{ [setupId: string]: boolean }>({});
  const [deletingComment, setDeletingComment] = React.useState<{ [commentId: string]: boolean }>({});
  const [commentCounts, setCommentCounts] = React.useState<{ [setupId: string]: number }>({});

  // Like state per trade
  const [likedSetups, setLikedSetups] = React.useState<{ [setupId: string]: boolean }>({});
  const [likeCounts, setLikeCounts] = React.useState<{ [setupId: string]: number }>({});
  const [liking, setLiking] = React.useState<{ [setupId: string]: boolean }>({});
  const [deletingTrade, setDeletingTrade] = React.useState<{ [setupId: string]: boolean }>({});

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = React.useState<{ [setupId: string]: boolean }>({});
  const [shareType, setShareType] = React.useState<'friends' | 'public' | 'private' | 'link'>('friends');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([]);
  const [sharing, setSharing] = React.useState(false);
  const [friends, setFriends] = React.useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = React.useState(false);

  // Separate search state for public and private tabs
  const [publicSearchQuery, setPublicSearchQuery] = React.useState('');
  const [publicSearchResults, setPublicSearchResults] = React.useState<any[]>([]);
  const [privateSearchQuery, setPrivateSearchQuery] = React.useState('');
  const [privateSearchResults, setPrivateSearchResults] = React.useState<any[]>([]);
  const [privateSearchPerformed, setPrivateSearchPerformed] = React.useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState<{ [setupId: string]: boolean }>({});
  const [deleteType, setDeleteType] = React.useState<'trade' | 'comment'>('trade');
  const [itemToDelete, setItemToDelete] = React.useState<{ id: string, setupId?: string } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState<{ [forum: string]: number }>({
    gbp_usd: 1,
    eur_usd: 1,
    usd_jpy: 1,
    other: 1
  });
  const cardsPerPage = 5; // Maximum 5 cards per currency pair

  // Memoized filtered and sorted data
  const filteredData = useMemo(() => {
    const { communitySetups, mySetups, trendingSetups } = data;
    const { activeTab, activeForumTab } = state;

    // First, get the base data based on active tab
    let baseData: TradeSetup[] = [];
    if (activeTab === 'community') {
      const currencyPairMap: { [key: string]: string } = {
        'gbp_usd': 'GBP/USD',
        'eur_usd': 'EUR/USD',
        'usd_jpy': 'USD/JPY'
      };

      if (activeForumTab === 'other') {
        baseData = communitySetups.filter(setup => 
          setup.currency_pair && !['GBP/USD', 'EUR/USD', 'USD/JPY'].includes(setup.currency_pair)
        );
    } else {
        const currencyPair = currencyPairMap[activeForumTab];
        baseData = currencyPair ? communitySetups.filter(setup => setup.currency_pair === currencyPair) : [];
      }
    } else if (activeTab === 'my-setups') {
      // My Setups should only show user's own setups
      baseData = mySetups;
    } else {
      // Trending tab - show most popular setups based on engagement
      baseData = trendingSetups;
    }

    // Apply time filter
    let filteredData = baseData;
    if (filters.timeRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filters.timeRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filteredData = filteredData.filter(setup => 
        new Date(setup.created_at) >= cutoffDate
      );
    }

    // Apply sorting
    filteredData.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'likes':
          return (b.likes_count || 0) - (a.likes_count || 0);
        case 'comments':
          return (b.comments_count || 0) - (a.comments_count || 0);
        default:
          return 0;
      }
    });

    return filteredData;
  }, [data, state.activeTab, state.activeForumTab, filters]);

  // Pagination logic
  const getCurrentPageData = useMemo(() => {
    const forum = state.activeForumTab;
    const startIndex = (currentPage[forum] - 1) * cardsPerPage;
    const endIndex = startIndex + cardsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, state.activeForumTab, cardsPerPage]);

  const totalPages = useMemo(() => {
    const forum = state.activeForumTab;
    return Math.ceil(filteredData.length / cardsPerPage);
  }, [filteredData, state.activeForumTab, cardsPerPage]);

  const handlePageChange = (page: number) => {
    const forum = state.activeForumTab;
    setCurrentPage(prev => ({ ...prev, [forum]: page }));
  };

  // Reset pagination when forum tab changes
  useEffect(() => {
    const forum = state.activeForumTab;
    if (currentPage[forum] !== 1) {
      setCurrentPage(prev => ({ ...prev, [forum]: 1 }));
    }
  }, [state.activeForumTab]);

  // Reusable pagination component
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center items-center gap-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(1)}
          disabled={currentPage[state.activeForumTab] === 1}
        >
          First
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(Math.max(1, currentPage[state.activeForumTab] - 1))}
          disabled={currentPage[state.activeForumTab] === 1}
        >
          Previous
        </Button>
        <span className="mx-4 text-sm font-medium">
          Page {currentPage[state.activeForumTab]} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(Math.min(totalPages, currentPage[state.activeForumTab] + 1))}
          disabled={currentPage[state.activeForumTab] === totalPages}
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage[state.activeForumTab] === totalPages}
        >
          Last
        </Button>
      </div>
    );
  };

  // Consolidated fetch function with better error handling
  const fetchTradeSetups = useCallback(async (userId: string) => {
    console.log('fetchTradeSetups called with user_id:', userId);
    
    try {
      console.log('Starting to fetch trade setups...');
      setState(prev => ({ ...prev, isLoading: true }));

      const communityQuery = supabase
        .from('trade_setups')
        .select(`
          *,
          user:user_id(*, user_presence(status, last_seen_at)),
          tags:trade_setup_tags(*)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      
      const mySetupsQuery = supabase
        .from('trade_setups')
        .select(`
          *,
          user:user_id(*, user_presence(status, last_seen_at)),
          tags:trade_setup_tags(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const trendingQuery = supabase
        .from('trade_setups')
        .select(`
          *,
          user:user_id(*, user_presence(status, last_seen_at)),
          tags:trade_setup_tags(*)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);

      console.log('Executing queries...');
      const [communityResult, mySetupsResult, trendingResult] = await Promise.all([
        communityQuery,
        mySetupsQuery,
        trendingQuery
      ]);

      console.log('Query results:', {
        communityResult,
        mySetupsResult,
        trendingResult
      });

      if (communityResult.error) throw communityResult.error;
      if (mySetupsResult.error) throw mySetupsResult.error;
      if (trendingResult.error) throw trendingResult.error;

      setData({
        communitySetups: communityResult.data || [],
        mySetups: mySetupsResult.data || [],
        trendingSetups: trendingResult.data || [],
      });
      
      // Initialize comment counts from database
      const allSetups = [
        ...(communityResult.data || []),
        ...(mySetupsResult.data || []),
        ...(trendingResult.data || [])
      ];
      
      const initialCommentCounts: { [key: string]: number } = {};
      allSetups.forEach(setup => {
        if (setup.comments_count !== undefined && setup.comments_count !== null) {
          initialCommentCounts[setup.id] = setup.comments_count;
        }
      });
      
      setCommentCounts(prev => ({ ...prev, ...initialCommentCounts }));
      
      console.log('Fetched data:', {
        communitySetups: communityResult.data || [],
        mySetups: mySetupsResult.data || [],
        trendingSetups: trendingResult.data || [],
      });
      
      console.log('Initialized comment counts:', initialCommentCounts);
    } catch (error) {
      console.error('Error fetching trade setups:', error);
      toast({
        title: "Error",
        description: "Failed to load trade setups. Please try again.",
        variant: 'destructive'
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [toast]);

  // Single useEffect for initialization and data fetching
  useEffect(() => {
    console.log('SocialForumContent initialization useEffect called');
    
    const initializeComponent = async () => {
      console.log('initializeComponent function called');
      try {
        // Get current user
        const { data: userData, error } = await supabase.auth.getUser();
        console.log('Auth result:', { userData, error });
        
        // Also check session directly
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('Session check:', { sessionData, sessionError });
        
        if (error) {
          console.error('Error fetching user:', error);
          return;
        }

        const userId = userData?.user?.id;
        console.log('User ID:', userId);
        
        let finalUserId = userId;
        
        if (!userId) {
          console.log('No user ID found - user may not be authenticated');
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          console.log('Session refresh result:', { refreshData, refreshError });
          
          if (refreshData?.user?.id) {
            console.log('Session refreshed, new user ID:', refreshData.user.id);
            finalUserId = refreshData.user.id;
          } else {
            console.log('Session refresh failed, redirecting to login');
            // Redirect to login if no user is found
            window.location.href = '/login';
            return;
          }
        }

        // Handle URL parameters
        const url = new URL(window.location.href);
        const tabParam = url.searchParams.get('tab');
        const forumParam = url.searchParams.get('forum');
        
        console.log('URL parameters:', { tabParam, forumParam });
        
        setState(prev => ({
          ...prev,
          user_id: finalUserId,
          activeTab: (tabParam && ['community', 'my-setups', 'trending'].includes(tabParam)) 
            ? tabParam as 'community' | 'my-setups' | 'trending' 
            : prev.activeTab,
          activeForumTab: (forumParam && ['gbp_usd', 'eur_usd', 'usd_jpy', 'other'].includes(forumParam)) 
            ? forumParam 
            : prev.activeForumTab,
          selectedForum: (forumParam && ['gbp_usd', 'eur_usd', 'usd_jpy', 'other'].includes(forumParam)) 
            ? forumParam 
            : prev.selectedForum,
          isInitialized: true,
        }));
        
        console.log('Set state with:', {
          activeTab: (tabParam && ['community', 'my-setups', 'trending'].includes(tabParam)) 
            ? tabParam as 'community' | 'my-setups' | 'trending' 
            : 'default',
          activeForumTab: (forumParam && ['gbp_usd', 'eur_usd', 'usd_jpy', 'other'].includes(forumParam)) 
            ? forumParam 
            : 'default'
        });

        // Fetch data if user is authenticated
        if (finalUserId) {
          console.log('User authenticated, calling fetchTradeSetups...');
          await fetchTradeSetups(finalUserId);
        } else {
          console.log('No user ID, not calling fetchTradeSetups');
        }
      } catch (error) {
        console.error('Error initializing component:', error);
        toast({
          title: 'Error',
          description: 'Failed to load forum data. Please refresh the page.',
          variant: 'destructive'
        });
      } finally {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };
    
    if (!state.isInitialized) {
      initializeComponent();
    }
  }, [fetchTradeSetups, toast, state.isInitialized]);

  // Debounced real-time subscription
  useEffect(() => {
    if (!state.user_id || !state.isInitialized) return;

    let timeoutId: NodeJS.Timeout;

    const tradeSetupsChannel = supabase
      .channel('trade_setups')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_setups' }, () => {
        // Debounce the refetch to prevent excessive calls
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (state.user_id) {
            fetchTradeSetups(state.user_id);
          }
        }, 2000);
      })
      .subscribe();

    // Real-time comments subscription
    const commentsChannel = supabase
      .channel('trade_setup_comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_setup_comments' }, (payload) => {
        // Handle new comments in real-time
        if (payload.eventType === 'INSERT') {
          const newComment = payload.new;
          // Fetch comments for the specific trade setup that got a new comment
          if (newComment.trade_setup_id) {
            fetchComments(newComment.trade_setup_id);
            // Increment comment count immediately for better UX
            setCommentCounts(prev => ({ 
              ...prev, 
              [newComment.trade_setup_id]: (prev[newComment.trade_setup_id] || 0) + 1 
            }));
          }
        }
        // Handle comment deletions
        if (payload.eventType === 'DELETE') {
          const deletedComment = payload.old;
          if (deletedComment.trade_setup_id) {
            fetchComments(deletedComment.trade_setup_id);
            // Decrement comment count
            setCommentCounts(prev => ({ 
              ...prev, 
              [deletedComment.trade_setup_id]: Math.max(0, (prev[deletedComment.trade_setup_id] || 0) - 1) 
            }));
          }
        }
      })
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(tradeSetupsChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [state.user_id, state.isInitialized, fetchTradeSetups]);

  // State update helpers
  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleCreateTradeSetup = () => {
    router.push('/social-forum/create');
  };

  // Fetch likes for a trade setup (on mount or after like/unlike)
  const fetchLikes = async (setupId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    const { data: likes, error } = await supabase
      .from('trade_setup_likes')
      .select('user_id')
      .eq('trade_setup_id', setupId);
    if (!error && likes) {
      setLikeCounts((prev) => ({ ...prev, [setupId]: likes.length }));
      setLikedSetups((prev) => ({ ...prev, [setupId]: !!likes.find((l: any) => l.user_id === user_id) }));
    }
  };

  // Like/unlike handler
  const handleLikeTradeSetup = async (setupId: string) => {
    setLiking((prev) => ({ ...prev, [setupId]: true }));
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;
    const liked = likedSetups[setupId];
    if (liked) {
      // Unlike
      await supabase
        .from('trade_setup_likes')
        .delete()
        .eq('trade_setup_id', setupId)
        .eq('user_id', user_id);
    } else {
      // Like
      await supabase
        .from('trade_setup_likes')
        .insert({ trade_setup_id: setupId, user_id });
    }
    setLiking((prev) => ({ ...prev, [setupId]: false }));
    fetchLikes(setupId);
  };

  // On mount, fetch likes for visible trades
  useEffect(() => {
    filteredData.forEach((setup) => {
      fetchLikes(setup.id);
      // Auto-load comments for all trade setups since they're always visible now
      if (!comments[setup.id] && !loadingComments[setup.id]) {
        fetchComments(setup.id);
      }
    });
    // eslint-disable-next-line
  }, [filteredData.length]);

  // Safe delete trade handler
  const handleDeleteTrade = (setupId: string) => {
    setDeleteType('trade');
    setItemToDelete({ id: setupId });
    setDeleteConfirmOpen((prev) => ({ ...prev, [setupId]: true }));
  };

  // Confirm delete trade
  const confirmDeleteTrade = async () => {
    if (!itemToDelete) return;
    
    setDeletingTrade((prev) => ({ ...prev, [itemToDelete.id]: true }));
    await supabase
      .from('trade_setups')
          .delete()
      .eq('id', itemToDelete.id);
    setDeletingTrade((prev) => ({ ...prev, [itemToDelete.id]: false }));
    
    // Remove from UI
    setData((prev) => ({
      ...prev,
      communitySetups: prev.communitySetups.filter((s) => s.id !== itemToDelete.id),
      mySetups: prev.mySetups.filter((s) => s.id !== itemToDelete.id),
      trendingSetups: prev.trendingSetups.filter((s) => s.id !== itemToDelete.id),
    }));
    
    setDeleteConfirmOpen((prev) => ({ ...prev, [itemToDelete.id]: false }));
    setItemToDelete(null);
    toast({ title: 'Trade deleted', description: 'Your trade setup was deleted.' });
  };

  // Fetch user's friends
  const fetchFriends = async () => {
    setLoadingFriends(true);
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    const { data, error } = await supabase
      .from('friends')
      .select(`
        friend_id,
        profiles!friends_friend_id_fkey (
          id,
          username,
          email,
          avatar_url
        )
      `)
      .eq('user_id', user_id)
      .eq('status', 'accepted');

    if (!error && data) {
      setFriends(data.map((item: any) => item.profiles));
    }
    setLoadingFriends(false);
  };

  // Auto-search when searchQuery changes
  useEffect(() => {
    console.log('searchQuery changed to:', searchQuery);
    if (searchQuery.trim()) {
      console.log('Auto-triggering search for:', searchQuery);
      searchUsers(searchQuery);
      } else {
      console.log('Clearing search results');
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Search for users by username, first_name, or last_name
  const searchUsers = async (query: string, exactMatch: boolean = false) => {
    if (!query.trim()) {
      if (exactMatch) {
        setPrivateSearchResults([]);
      } else {
        setPublicSearchResults([]);
      }
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let searchQuery;
      if (exactMatch) {
        // Use exact username matching for private profiles
        searchQuery = supabase
          .from('profiles')
          .select('id, username, first_name, last_name, avatar_url')
          .eq('username', query.trim()) // Exact match only
          .neq('id', user.id) // Exclude current user
          .limit(10);
      } else {
        // Use partial matching for public profiles
        searchQuery = supabase
          .from('profiles')
          .select('id, username, first_name, last_name, avatar_url')
          .or(`username.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
          .neq('id', user.id) // Exclude current user
          .limit(10);
      }

      const { data, error } = await searchQuery;

      if (error) throw error;

      // Set the appropriate results state based on search type
      if (exactMatch) {
        setPrivateSearchResults(data || []);
        setPrivateSearchPerformed(true); // Mark that a search has been performed
        // Show message if no exact match found (only for button click, not real-time search)
        if (!data || !Array.isArray(data) || data.length === 0) {
        toast({
            id: 'no-user-found',
            title: 'User Not Found',
            description: `No user found with username "${query.trim()}". Please check the spelling and try again.`,
            variant: 'destructive',
          });
        }
      } else {
        setPublicSearchResults(data || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        id: 'search-error',
        title: 'Error Searching Users',
        description: 'Failed to search for users. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle search queries for public tab
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (shareType === 'public' && publicSearchQuery.trim()) {
        searchUsers(publicSearchQuery, false); // Use partial matching for public profiles
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [publicSearchQuery, shareType]);

  // Clear public search results when query is emptied
  useEffect(() => {
    if (!publicSearchQuery.trim()) {
      setPublicSearchResults([]);
    }
  }, [publicSearchQuery]);

  // Clear private search results when query is emptied
  useEffect(() => {
    if (!privateSearchQuery.trim()) {
      setPrivateSearchResults([]);
      setPrivateSearchPerformed(false);
    }
  }, [privateSearchQuery]);

  // Handle share dialog open
  const handleShareDialogOpen = async (setupId: string) => {
    setShareDialogOpen((prev) => ({ ...prev, [setupId]: true }));
    setSelectedUsers([]);
    setSearchQuery('');
    setSearchResults([]);
    setPublicSearchQuery('');
    setPublicSearchResults([]);
    setPrivateSearchQuery('');
    setPrivateSearchResults([]);
    setPrivateSearchPerformed(false);
    await fetchFriends();
  };

  // Handle share submission
  const handleShareSubmit = async (setupId: string) => {
    if (selectedUsers.length === 0) {
      toast({ title: 'No users selected', description: 'Please select at least one user to share with.', variant: 'destructive' });
      return;
    }

    setSharing(true);
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return;

    try {
      // Create share records
      const shareRecords = selectedUsers.map(userId => ({
          trade_setup_id: setupId,
        shared_by: user_id,
        shared_with: userId,
        share_type: shareType,
        status: 'pending'
      }));

      const { error } = await supabase
        .from('trade_setup_shares')
        .insert(shareRecords);

      if (error) throw error;

      toast({
        title: 'Shared successfully', 
        description: `Trade shared with ${selectedUsers.length} user(s).` 
      });
      setShareDialogOpen((prev) => ({ ...prev, [setupId]: false }));
    } catch (error) {
      console.error('Error sharing trade:', error);
      toast({
        title: 'Error', 
        description: 'Failed to share trade. Please try again.', 
        variant: 'destructive'
      });
    } finally {
      setSharing(false);
    }
  };

  // Share handler (opens dialog)
  const handleShareTrade = (setupId: string) => {
    handleShareDialogOpen(setupId);
  };

  const handleReportTradeSetup = async (setupId: string) => {
    if (!state.user_id) {
      toast({
        title: "Error",
        description: "You must be logged in to report trade setups.",
        variant: 'destructive'
      });
      return;
    }

    try {
      // Implementation for reporting trade setups
        toast({
        title: "Success",
        description: "Trade setup reported successfully!",
      });
    } catch (error) {
      console.error('Error reporting trade setup:', error);
      toast({
        title: "Error",
        description: "Failed to report trade setup. Please try again.",
        variant: 'destructive'
      });
    }
  };

  const handleShareTradeSetup = async (setupId: string) => {
    updateState({ 
      shareDialogOpen: true, 
      selectedTradeSetup: setupId 
    });
  };
  
  const handleShareToForum = async (tradeSetupId: string, forum: string) => {
    if (!state.user_id) {
      toast({
        title: "Error",
        description: "You must be logged in to share trade setups.",
        variant: 'destructive'
      });
      return;
    }

    try {
      // Implementation for sharing trade setups
      toast({
        title: "Success",
        description: "Trade setup shared successfully!",
      });
      updateState({ shareDialogOpen: false, selectedTradeSetup: null });
    } catch (error) {
      console.error('Error sharing trade setup:', error);
      toast({
        title: "Error",
        description: "Failed to share trade setup. Please try again.",
        variant: 'destructive'
      });
    }
  };

  const handleDeleteTradeSetup = (setupId: string) => {
    updateState({ 
      deleteDialogOpen: true, 
      setupToDelete: setupId 
    });
  };

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      timeRange: 'all',
      sortBy: 'newest',
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.timeRange !== 'all') count++;
    if (filters.sortBy !== 'newest') count++;
    return count;
  };

  // Fetch comments for a trade setup (with parent_id)
  const fetchComments = async (setupId: string) => {
    setLoadingComments((prev) => ({ ...prev, [setupId]: true }));
    try {
      const { data, error } = await supabase
        .from('trade_setup_comments')
        .select(`
          *,
          user:profiles(id, username, avatar_url)
        `)
        .eq('trade_setup_id', setupId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setComments((prev) => ({ ...prev, [setupId]: data || [] }));
      // Initialize comment count when comments are loaded
      const topLevelCount = (data || []).filter((c: any) => !c.parent_id).length;
      setCommentCounts((prev) => ({ ...prev, [setupId]: topLevelCount }));
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments((prev) => ({ ...prev, [setupId]: false }));
    }
  };

  // Handle toggling comments
  const handleToggleComments = (setupId: string) => {
    setOpenComments((prev) => {
      const isOpen = !prev[setupId];
      if (isOpen && !comments[setupId]) {
        fetchComments(setupId);
      }
      return { ...prev, [setupId]: isOpen };
    });
  };

  // Handle comment input change
  const handleCommentInputChange = (setupId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [setupId]: value }));
  };

  // Handle submitting a new comment
  const handleSubmitComment = async (setupId: string) => {
    const content = commentInputs[setupId]?.trim();
    if (!content) return;
    setSubmittingComment((prev) => ({ ...prev, [setupId]: true }));
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    const { error } = await supabase
      .from('trade_setup_comments')
      .insert({ trade_setup_id: setupId, content, user_id });
    setSubmittingComment((prev) => ({ ...prev, [setupId]: false }));
    if (!error) {
      setCommentInputs((prev) => ({ ...prev, [setupId]: '' }));
      // Immediately increment comment count for better UX
      setCommentCounts((prev) => ({ ...prev, [setupId]: (prev[setupId] || 0) + 1 }));
      fetchComments(setupId);
    }
  };

  // Handle reply input change
  const handleReplyInputChange = (commentId: string, value: string) => {
    setReplyInputs((prev) => ({ ...prev, [commentId]: value }));
  };

  // Handle reply button click
  const handleReplyClick = (setupId: string, commentId: string) => {
    setReplyingTo((prev) => ({ ...prev, [setupId]: prev[setupId] === commentId ? null : commentId }));
  };

  // Handle submitting a reply
  const handleSubmitReply = async (setupId: string, parentId: string) => {
    const content = replyInputs[parentId]?.trim();
    if (!content) return;
    setSubmittingComment((prev) => ({ ...prev, [setupId]: true }));
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    const { error } = await supabase
      .from('trade_setup_comments')
      .insert({ trade_setup_id: setupId, content, parent_id: parentId, user_id });
    setSubmittingComment((prev) => ({ ...prev, [setupId]: false }));
    if (!error) {
      setReplyInputs((prev) => ({ ...prev, [parentId]: '' }));
      setReplyingTo((prev) => ({ ...prev, [setupId]: null }));
      fetchComments(setupId);
    }
  };

  // Safe delete comment handler
  const handleDeleteComment = (setupId: string, commentId: string) => {
    setDeleteType('comment');
    setItemToDelete({ id: commentId, setupId });
    setDeleteConfirmOpen((prev) => ({ ...prev, [commentId]: true }));
  };

  // Confirm delete comment
  const confirmDeleteComment = async () => {
    if (!itemToDelete) return;
    
    setDeletingComment((prev) => ({ ...prev, [itemToDelete.id]: true }));
    
    const { error } = await supabase
      .from('trade_setup_comments')
      .delete()
      .eq('id', itemToDelete.id);

    if (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error', 
        description: 'Failed to delete comment. Please try again.', 
        variant: 'destructive'
      });
    } else {
      // Remove from UI
      if (itemToDelete.setupId) {
        setComments((prev) => ({
          ...prev,
          [String(itemToDelete.setupId)]: prev[String(itemToDelete.setupId)].filter((c: any) => c.id !== itemToDelete.id)
        }));
      }
      toast({ title: 'Comment deleted', description: 'Your comment was deleted.' });
    }
    
    setDeletingComment((prev) => ({ ...prev, [itemToDelete.id]: false }));
    setDeleteConfirmOpen((prev) => ({ ...prev, [itemToDelete.id]: false }));
    setItemToDelete(null);
  };

  // Helper: build nested comment tree
  function buildCommentTree(comments: Comment[]): any[] {
    const map: { [id: string]: any } = {};
    const roots: any[] = [];
    comments.forEach((c) => (map[c.id] = { ...c, replies: [] }));
    comments.forEach((c) => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].replies.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });
    return roots;
  }

  // Recursive comment renderer
  function renderComment(setupId: string, comment: any, depth = 0) {
    const isOwner = comment.user_id === state.user_id;
    const isReplying = replyingTo[setupId] === comment.id;
    
    return (
      <div key={comment.id} className={`space-y-1 ${depth > 0 ? 'ml-4 border-l-2 border-muted pl-2' : ''}`}>
        <div className="flex items-start gap-2">
          <Avatar className="h-5 w-5 flex-shrink-0">
            <AvatarImage src={comment.user?.avatar_url} alt={comment.user?.username || 'User'} />
            <AvatarFallback className="text-xs">
              {comment.user?.username?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-foreground">
                {comment.user?.username || 'Anonymous'}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="bg-background border rounded-lg p-2 mb-1">
              <p className="text-xs text-foreground">{comment.content}</p>
            </div>
            {/* Action buttons on the right side below the message */}
            <div className="flex items-center justify-end gap-1 mb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReplyClick(setupId, comment.id)}
                className="h-4 w-4 p-0 hover:bg-muted"
              >
                <MessageSquare className="h-2.5 w-2.5" />
              </Button>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteComment(setupId, comment.id)}
                  disabled={deletingComment[comment.id]}
                  className="h-4 w-4 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {deletingComment[comment.id] ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-2.5 w-2.5" />
                  )}
                </Button>
              )}
            </div>
            
            {/* Reply input */}
            {isReplying && (
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Write a reply..."
                  value={replyInputs[comment.id] || ''}
                  onChange={(e) => handleReplyInputChange(comment.id, e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmitReply(setupId, comment.id)}
                  onBlur={() => {
                    // Close reply box if input is empty and user clicks away
                    if (!replyInputs[comment.id]?.trim()) {
                      setTimeout(() => {
                        setReplyingTo(prev => ({ ...prev, [setupId]: null }));
                        setReplyInputs(prev => ({ ...prev, [comment.id]: '' }));
                      }, 200);
                    }
                  }}
                  className="h-6 text-xs"
                />
                <Button
                  size="sm"
                  onClick={() => handleSubmitReply(setupId, comment.id)}
                  disabled={submittingComment[setupId] || !replyInputs[comment.id]?.trim()}
                  className="h-6 px-2 text-xs"
                >
                  {submittingComment[setupId] ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-1">
            {comment.replies.map((reply: any) => renderComment(setupId, reply, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  const renderTradeSetupCard = (setup: TradeSetup) => {
    const isOwner = setup.user_id === state.user_id;
    const tagList = Array.isArray(setup.tags)
      ? setup.tags.map((t: any) => (typeof t === 'string' ? t : t.tag || t.name || ''))
      : [];
    
    // Handle both single image_url and image_urls array
    const images = setup.image_urls && Array.isArray(setup.image_urls) 
      ? setup.image_urls 
      : setup.image_url 
        ? [setup.image_url] 
        : [];
    
    // Top-level comment count
    const topLevelCommentCount = (comments[setup.id] || []).filter((c: any) => !c.parent_id).length;
    // Use database comments_count as fallback, then local state, then commentCounts state
    const totalCommentCount = setup.comments_count ?? commentCounts[setup.id] ?? topLevelCommentCount;
    // Like count (from state or setup.likes_count)
    const likeCount = likeCounts[setup.id] ?? setup.likes_count ?? 0;
    const liked = likedSetups[setup.id] || false;
    
    return (
      <Card key={setup.id} className="mb-3 hover:shadow-md transition-shadow duration-200">
        <div className="flex">
          {/* Left 2/3 - Trade Setup Content */}
          <div className="w-2/3 p-4 border-r">
            {/* Header with user info and pair */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={setup.user?.avatar_url || undefined} alt={setup.user?.username || 'User'} />
                  <AvatarFallback className="text-xs">
                    {setup.user?.username?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center space-x-2">
                  <div>
                    <p className="font-medium text-sm">{setup.user?.username || 'Anonymous'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(setup.created_at).toLocaleDateString()} at {new Date(setup.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
          </div>
                  <div className={`w-1 h-1 rounded-full ${setup.user?.user_presence?.status === 'online' && new Date().getTime() - new Date(setup.user.user_presence.last_seen_at).getTime() < 15 * 60 * 1000 ? 'bg-green-500' : 'bg-gray-400'}`} />
          </div>
        </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs font-medium">
                  {setup.currency_pair || setup.pair}
                </Badge>
                {setup.is_public ? (
                  <Eye className="h-3 w-3 text-green-500" />
                ) : (
                  <EyeOff className="h-3 w-3 text-gray-500" />
                )}
          </div>
            </div>

            {/* Title and Description */}
            <div className="mb-2">
              <h3 className="font-semibold text-sm mb-1 line-clamp-1">{setup.title}</h3>
              {setup.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{setup.description}</p>
              )}
            </div>

            {/* Tags - Compact design */}
            {tagList.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {tagList.slice(0, 2).map((tag, idx) => (
                  <Badge 
                    key={tag + idx} 
                    variant="secondary" 
                    className="text-xs px-1 py-0.5 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                  >
                    #{tag}
                  </Badge>
                ))}
                {tagList.length > 2 && (
                  <Badge variant="outline" className="text-xs px-1 py-0.5">
                    +{tagList.length - 2}
              </Badge>
            )}
          </div>
            )}

            {/* Images Row - Compact */}
            {images.length > 0 && (
              <div className="mb-2">
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {images.slice(0, 3).map((url: string, idx: number) => (
                    <div 
                      key={idx} 
                      className="relative flex-shrink-0 cursor-pointer group"
                      onClick={() => {
                        const modal = document.createElement('div');
                        modal.className = 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4';
                        modal.onclick = () => modal.remove();
                        
                        const img = document.createElement('img');
                        img.src = url;
                        img.className = 'max-w-full max-h-full object-contain rounded-lg';
                        img.alt = `Trade setup image ${idx + 1}`;
                        
                        modal.appendChild(img);
                        document.body.appendChild(modal);
                      }}
                    >
                      <img
                        src={url}
                        alt={`Trade setup image ${idx + 1}`}
                        className="w-16 h-12 object-cover rounded border shadow-sm group-hover:shadow-md transition-shadow duration-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded transition-colors duration-200" />
        </div>
                  ))}
                  {images.length > 3 && (
                    <div className="flex-shrink-0 w-16 h-12 bg-muted rounded border flex items-center justify-center">
                      <span className="text-xs font-medium">+{images.length - 3}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trade Details - Ultra compact */}
            <div className="bg-muted/30 rounded p-2 mb-2">
              <div className="flex flex-wrap gap-3 justify-between">
                <div className="text-center min-w-[60px]">
                  <p className="text-xs font-medium text-muted-foreground">Direction</p>
                  <div className={`text-xs font-bold px-1 py-0.5 rounded ${
                    setup.direction === 'LONG' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {setup.direction}
                  </div>
                </div>
                <div className="text-center min-w-[60px]">
                  <p className="text-xs font-medium text-muted-foreground">Entry</p>
                  <p className="text-xs font-bold">{setup.entry_price}</p>
                </div>
                <div className="text-center min-w-[60px]">
                  <p className="text-xs font-medium text-muted-foreground">Target</p>
                  <p className="text-xs font-bold text-green-600 dark:text-green-400">
                    {(setup as any).target_price ?? setup.take_profit}
                  </p>
                </div>
                <div className="text-center min-w-[60px]">
                  <p className="text-xs font-medium text-muted-foreground">Stop Loss</p>
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">{setup.stop_loss}</p>
                </div>
                <div className="text-center min-w-[60px]">
                  <p className="text-xs font-medium text-muted-foreground">Timeframe</p>
                  <p className="text-xs font-bold">{setup.timeframe}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons - Compact */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={liked ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleLikeTradeSetup(setup.id)}
                  disabled={liking[setup.id]}
                  className={`h-6 px-2 text-xs ${liked ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'hover:bg-muted'}`}
                >
                  <ThumbsUp className={`h-3 w-3 ${liked ? 'text-white' : ''}`} />
                  {likeCount > 0 && <span className="ml-1 text-xs">{likeCount}</span>}
        </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleShareTrade(setup.id)}
                  className="h-6 px-2 hover:bg-muted text-xs"
                >
                  <Share2 className="h-3 w-3 mr-1" />
          <span>Share</span>
        </Button>
              </div>
              
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTrade(setup.id)}
                  disabled={deletingTrade[setup.id]}
                  className="h-6 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {deletingTrade[setup.id] ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
        </Button>
              )}
            </div>
          </div>

          {/* Right 1/3 - Live Comments Area */}
          <div className="w-1/3 p-3 bg-muted/20">
            <div className="h-full flex flex-col">
              {/* Comments Header */}
              <div className="flex items-center justify-between mb-2 pb-2 border-b">
                <h4 className="text-sm font-medium">Live Chat ({totalCommentCount})</h4>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              </div>

              {/* Comments List - Fixed height, scrollable */}
              <div 
                className="flex-1 overflow-y-auto mb-2 space-y-2 min-h-[120px] max-h-[200px]"
                ref={(el) => {
                  // Auto-scroll to bottom when new comments arrive
                  if (el && comments[setup.id]?.length > 0) {
                    setTimeout(() => {
                      el.scrollTop = el.scrollHeight;
                    }, 100);
                  }
                }}
              >
                {loadingComments[setup.id] ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {buildCommentTree(comments[setup.id] || []).map((comment) => 
                      renderComment(setup.id, comment, 0)
                    )}
                    {comments[setup.id]?.length === 0 && (
                      <div className="text-center py-4">
                        <MessageCircle className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">
                          Start the conversation!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Comment Input - Always visible */}
              <div className="border-t pt-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={commentInputs[setup.id] || ''}
                    onChange={(e) => handleCommentInputChange(setup.id, e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment(setup.id)}
                    className="h-7 text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSubmitComment(setup.id)}
                    disabled={submittingComment[setup.id] || !commentInputs[setup.id]?.trim()}
                    className="h-7 px-2 text-xs"
                  >
                    {submittingComment[setup.id] ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </Card>
  );
  };

  const renderEmptyForum = (forumName: string | undefined, createAction: () => void) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-10">
        <Globe className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">{forumName} Forum</h3>
        <p className="text-muted-foreground text-center mb-4">
          No trade setups in this forum yet. Be the first to share a setup!
        </p>
        <Button onClick={createAction}>
          Create Trade Setup
        </Button>
      </CardContent>
    </Card>
  );

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="mb-4">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-6 w-[300px] mb-2" />
            <Skeleton className="h-4 w-full mb-4" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, j) => (
                <div key={j}>
                  <Skeleton className="h-3 w-[80px] mb-1" />
                  <Skeleton className="h-5 w-[100px]" />
            </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderFilterDialog = () => (
    <Dialog open={state.filterDialogOpen} onOpenChange={(open) => updateState({ filterDialogOpen: open })}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Sort Trade Setups
          </DialogTitle>
          <DialogDescription>
            Customize your view by filtering and sorting trade setups.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Time Range Filter */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Time Range
            </Label>
            <Select value={filters.timeRange} onValueChange={(value) => handleFilterChange('timeRange', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Options */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <SortAsc className="h-4 w-4" />
              Sort By
            </Label>
            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="likes">Most Liked</SelectItem>
                <SelectItem value="comments">Most Commented</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={resetFilters}>
            Reset Filters
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => updateState({ filterDialogOpen: false })}>
              Cancel
            </Button>
            <Button onClick={() => updateState({ filterDialogOpen: false })}>
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const updateUrlWithParams = (tab: string, forum?: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    if (forum) {
      url.searchParams.set('forum', forum);
    }
    window.history.replaceState({}, '', url.toString());
  };

  // Don't render until initialized
  if (!state.isInitialized) {
    return <div className="flex justify-center items-center h-64"><Skeleton className="h-8 w-32" /></div>;
  }

  // Handle share with user selection
  const handleShareWithUser = (user: any) => {
    if (selectedUsers.includes(user.id)) {
      setSelectedUsers(prev => prev.filter(id => id !== user.id));
    } else {
      setSelectedUsers(prev => [...prev, user.id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Dialog */}
      <Dialog open={state.deleteDialogOpen} onOpenChange={(open) => updateState({ deleteDialogOpen: open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Trade Setup</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this trade setup? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => updateState({ deleteDialogOpen: false })}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteTrade}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      {renderFilterDialog()}

      <Tabs 
        defaultValue="community" 
        value={state.activeTab}
        className="w-full" 
        onValueChange={(value) => {
          updateState({ activeTab: value as "community" | "my-setups" | "trending" });
          updateUrlWithParams(value);
        }}>
        <div className="flex justify-between items-center mb-6">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="community" className="flex items-center justify-center">
              <Globe className="h-4 w-4 mr-2" />
              Community Setups
            </TabsTrigger>
            <TabsTrigger value="my-setups" className="flex items-center justify-center">
              <User className="h-4 w-4 mr-2" />
              My Setups
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center justify-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Trending
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* Community Setups Tab Content */}
        <TabsContent value="community">
          <Tabs 
            defaultValue="gbp_usd" 
            value={state.activeForumTab} 
            onValueChange={(value) => {
              updateState({ activeForumTab: value, selectedForum: value });
              updateUrlWithParams('community', value);
            }}>
            <div className="flex justify-between items-center mb-6">
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="gbp_usd" className="flex items-center justify-center">
                  GBP/USD
                </TabsTrigger>
                <TabsTrigger value="eur_usd" className="flex items-center justify-center">
                  EUR/USD
                </TabsTrigger>
                <TabsTrigger value="usd_jpy" className="flex items-center justify-center">
                  USD/JPY
                </TabsTrigger>
                <TabsTrigger value="other" className="flex items-center justify-center">
                  Other Pairs
                </TabsTrigger>
              </TabsList>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => updateState({ filterDialogOpen: true })}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filter
                {getActiveFiltersCount() > 0 && (
                  <Badge variant="secondary" className="h-5 w-5 p-0 text-xs">
                    {getActiveFiltersCount()}
                  </Badge>
                )}
              </Button>
            </div>

            <TabsContent value="gbp_usd" className="space-y-4">
              {state.isLoading ? (
                renderLoadingSkeleton()
              ) : getCurrentPageData.length > 0 ? (
                <div>{getCurrentPageData.map(renderTradeSetupCard)}</div>
              ) : (
                renderEmptyForum('GBP/USD', handleCreateTradeSetup)
              )}
              {renderPagination()}
            </TabsContent>

            <TabsContent value="eur_usd" className="space-y-4">
              {state.isLoading ? (
                renderLoadingSkeleton()
              ) : getCurrentPageData.length > 0 ? (
                <div>{getCurrentPageData.map(renderTradeSetupCard)}</div>
              ) : (
                renderEmptyForum('EUR/USD', handleCreateTradeSetup)
              )}
              {renderPagination()}
            </TabsContent>

            <TabsContent value="usd_jpy" className="space-y-4">
              {state.isLoading ? (
                renderLoadingSkeleton()
              ) : getCurrentPageData.length > 0 ? (
                <div>{getCurrentPageData.map(renderTradeSetupCard)}</div>
              ) : (
                renderEmptyForum('USD/JPY', handleCreateTradeSetup)
              )}
              {renderPagination()}
            </TabsContent>

            <TabsContent value="other" className="space-y-4">
              {state.isLoading ? (
                renderLoadingSkeleton()
              ) : getCurrentPageData.length > 0 ? (
                <div>{getCurrentPageData.map(renderTradeSetupCard)}</div>
              ) : (
                renderEmptyForum('Other Pairs', handleCreateTradeSetup)
              )}
              {renderPagination()}
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        {/* My Setups Tab Content */}
        <TabsContent value="my-setups">
          <div className="flex justify-between items-center mb-6">
            <div>
            <h2 className="text-xl font-bold">My Trade Setups</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your personal trade setups - private only
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => updateState({ filterDialogOpen: true })}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary" className="h-5 w-5 p-0 text-xs">
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
          </div>
          
          {state.isLoading ? (
            renderLoadingSkeleton()
          ) : getCurrentPageData.length > 0 ? (
            <div>{getCurrentPageData.map(renderTradeSetupCard)}</div>
          ) : (
            <div>
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <User className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">My Trade Setups</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    You haven't created any trade setups yet. Create your first one!
                  </p>
                  <Button onClick={handleCreateTradeSetup}>
                    Create Your First Setup
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
          {renderPagination()}
        </TabsContent>
        
        {/* Trending Tab Content */}
        <TabsContent value="trending">
          <div className="flex justify-between items-center mb-6">
            <div>
            <h2 className="text-xl font-bold">Trending Trade Setups</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Most popular and engaging setups based on likes, comments, and shares
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => updateState({ filterDialogOpen: true })}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary" className="h-5 w-5 p-0 text-xs">
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
          </div>
          
          {state.isLoading ? (
            renderLoadingSkeleton()
          ) : getCurrentPageData.length > 0 ? (
            <div>{getCurrentPageData.map(renderTradeSetupCard)}</div>
          ) : (
            <div>
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">Trending Setups</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    No trending trade setups yet. Check back later for popular setups!
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          {renderPagination()}
        </TabsContent>
      </Tabs>
      
      {/* Share Dialog */}
      {Object.keys(shareDialogOpen).map(setupId => 
        shareDialogOpen[setupId] && (
          <Dialog key={setupId} open={shareDialogOpen[setupId]} onOpenChange={(open) => 
            setShareDialogOpen(prev => ({ ...prev, [setupId]: open }))
          }>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Trade Setup</DialogTitle>
            <DialogDescription>
                  Choose how you want to share this trade setup
            </DialogDescription>
          </DialogHeader>
              
              <Tabs value={shareType} onValueChange={(value: any) => setShareType(value)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="friends">Friends</TabsTrigger>
                  <TabsTrigger value="public">Public Users</TabsTrigger>
                  <TabsTrigger value="private">Private</TabsTrigger>
                  <TabsTrigger value="link">Copy Link</TabsTrigger>
                </TabsList>
                
                <TabsContent value="friends" className="space-y-4">
                  <div className="max-h-60 overflow-y-auto">
                    {loadingFriends ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : friends.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No friends found</p>
                    ) : (
                      friends.map((friend) => (
                        <div 
                          key={friend.id} 
                          className={`flex items-center space-x-3 p-2 rounded cursor-pointer ${
                            selectedUsers.includes(friend.id)
                              ? 'bg-blue-500 text-white'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => {
                            if (selectedUsers.includes(friend.id)) {
                              setSelectedUsers(prev => prev.filter(id => id !== friend.id));
                            } else {
                              setSelectedUsers(prev => [...prev, friend.id]);
                            }
                          }}
                        >
                          <Checkbox
                            checked={selectedUsers.includes(friend.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers(prev => [...prev, friend.id]);
                              } else {
                                setSelectedUsers(prev => prev.filter(id => id !== friend.id));
                              }
                            }}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={friend.avatar_url} />
                            <AvatarFallback>{friend.username?.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className={`font-medium ${
                              selectedUsers.includes(friend.id) ? 'text-white' : ''
                            }`}>{friend.username}</p>
                            <p className={`text-sm ${
                              selectedUsers.includes(friend.id) 
                                ? 'text-blue-100' 
                                : 'text-muted-foreground'
                            }`}>{friend.email}</p>
          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="public" className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Search by username, first name, or last name..."
                      value={publicSearchQuery}
                      onChange={(e) => setPublicSearchQuery(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {publicSearchResults.length === 0 && publicSearchQuery.trim() ? (
                      <p className="text-muted-foreground text-center py-4">No users found</p>
                    ) : (
                      publicSearchResults.map((result) => (
                        <div
                          key={result.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                            selectedUsers.includes(result.id)
                              ? 'bg-blue-500 text-white'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => handleShareWithUser(result)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(result.id)}
                            onChange={() => handleShareWithUser(result)}
                            className="h-4 w-4"
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={result.avatar_url || '/default-avatar.png'} />
                            <AvatarFallback>
                              {result.username?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              selectedUsers.includes(result.id) ? 'text-white' : ''
                            }`}>
                              {result.username}
                            </p>
                            {result.first_name && result.last_name && (
                              <p className={`text-xs truncate ${
                                selectedUsers.includes(result.id) 
                                  ? 'text-blue-100' 
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {result.first_name} {result.last_name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="private" className="space-y-4">
                  <input
                    type="text"
                    placeholder="Enter exact username..."
                    value={privateSearchQuery}
                    onChange={(e) => setPrivateSearchQuery(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button
                    onClick={() => {
                      if (privateSearchQuery.trim()) {
                        searchUsers(privateSearchQuery.trim(), true);
                      }
                    }}
                    disabled={!privateSearchQuery.trim()}
                  >
                    Search User
                  </Button>
                  <div className="max-h-60 overflow-y-auto">
                    {!privateSearchPerformed ? (
                      <p className="text-muted-foreground text-center py-4">Enter a username and click "Search User" to find someone</p>
                    ) : privateSearchResults.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No user found with that exact username</p>
                    ) : (
                      privateSearchResults.map((result) => (
                        <div
                          key={result.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                            selectedUsers.includes(result.id)
                              ? 'bg-blue-500 text-white'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => handleShareWithUser(result)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(result.id)}
                            onChange={() => handleShareWithUser(result)}
                            className="h-4 w-4"
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={result.avatar_url || '/default-avatar.png'} />
                            <AvatarFallback>
                              {result.username?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              selectedUsers.includes(result.id) ? 'text-white' : ''
                            }`}>
                              {result.username}
                            </p>
                            {result.first_name && result.last_name && (
                              <p className={`text-xs truncate ${
                                selectedUsers.includes(result.id) 
                                  ? 'text-blue-100' 
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {result.first_name} {result.last_name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="link" className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      value={`${window.location.origin}/social-forum/${setupId}`}
                      readOnly
                    />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/social-forum/${setupId}`);
                        toast({ title: 'Link copied', description: 'Trade link copied to clipboard.' });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
              
              {shareType !== 'link' && (
          <DialogFooter>
                  <Button
                    onClick={() => handleShareSubmit(setupId)}
                    disabled={selectedUsers.length === 0 || sharing}
                  >
                    {sharing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sharing...
                      </>
                    ) : (
                      `Share with ${selectedUsers.length} user(s)`
                    )}
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        )
      )}

      {/* Delete Confirmation Dialog */}
      {Object.keys(deleteConfirmOpen).map(itemId => 
        deleteConfirmOpen[itemId] && (
          <Dialog key={itemId} open={deleteConfirmOpen[itemId]} onOpenChange={(open) => 
            setDeleteConfirmOpen(prev => ({ ...prev, [itemId]: open }))
          }>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this {deleteType === 'trade' ? 'trade setup' : 'comment'}? 
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteConfirmOpen(prev => ({ ...prev, [itemId]: false }));
                    setItemToDelete(null);
                  }}
                >
              Cancel
            </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (deleteType === 'trade') {
                      confirmDeleteTrade();
                    } else {
                      confirmDeleteComment();
                    }
                  }}
                >
                  Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        )
      )}
    </div>
  );
};

export default SocialForumContent;
