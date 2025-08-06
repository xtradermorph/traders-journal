"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'; // Import useEffect and useRef
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  User,
  Settings,
  LifeBuoy, // For Support
  LogOut,
  PlusIcon, // Added PlusIcon
  Users, // For Traders
  Search, // For search input
  UserPlus, // For follow button
  UserMinus, // For unfollow button
  UserCheck, // For (already) friends or accepted requests
  UserX, // For remove friend, decline request
  Mail, // For incoming friend requests icon
  MonitorCheck,
  Share2, // For Shared Trades
  Clock,
  TrendingUp,
  MessagesSquare, // Added MessagesSquare
  BarChart3, // Added BarChart3
  ListOrdered, // Added ListOrdered

} from "lucide-react";
import { supabase } from '../lib/supabase';
import {
  Friendship,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getFriends,

  getPendingIncomingRequests,
  blockUser, // Added
  unblockUser // Added
} from '../../lib/friendsUtils';
import { calculateMedal } from '../lib/medal-utils';
import MedalIcon from './MedalIcon';
// Medal achievement email notification will be handled by API route
import { Trade } from '@shared/schema';
import { useRouter } from 'next/navigation';
import * as profileAccess from '../lib/profileAccess';
import { useToast } from '../hooks/use-toast';
import AddTradeDialog from './AddTradeDialog'; // Import AddTradeDialog
import TopDownAnalysisDialog from './TopDownAnalysisDialog'; // Import TopDownAnalysisDialog

import { useUserProfile } from "./UserProfileContext";
import { getTrades } from '../lib/api/trades';
import { MedalType } from '../types/user';

import { useTheme } from 'next-themes';

import { useAuth } from '../hooks/useAuth';

// This type might need to be adjusted based on the actual structure of your user object
interface UserData {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  email?: string;
  profession?: string;
  location?: string;
  trader_status?: string;
  trader_type?: string;
  bio?: string;
  years_experience?: string;
  trading_frequency?: string;
  markets?: string;
  trading_goal?: string;
  trading_challenges?: string;
  is_online?: boolean;
  last_active_at?: string;
  medal_type?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | null;
}

interface UserProfile {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  email?: string;
  profession?: string;
  location?: string;
  trader_status?: string;
  trader_type?: string;
  bio?: string;
  years_experience?: string;
  trading_frequency?: string;
  markets?: string;
  trading_goal?: string;
  trading_challenges?: string;
  is_online?: boolean;
  last_active_at?: string;
  medal_type?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | null;
}

interface DashboardHeaderProps {
  user: UserProfile | null;
  pageTitle: string;
  mainScrollRef: React.RefObject<HTMLDivElement>;
}





const DashboardHeader = ({ pageTitle = "Dashboard", mainScrollRef }: DashboardHeaderProps) => {
  const { profile: currentUser, isOnline } = useUserProfile();
  const { user: authUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [isTopDownAnalysisOpen, setIsTopDownAnalysisOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [tradersDropdownOpen, setTradersDropdownOpen] = useState(false);

  const [filteredTraders, setFilteredTraders] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTraderTab, setActiveTraderTab] = useState('online');
  const [friendsList, setFriendsList] = useState<UserData[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<(Friendship & { sender_profile?: UserData })[]>([]);
  const [friendshipStatuses, setFriendshipStatuses] = useState<Map<string, Friendship | null>>(new Map());
  const [activeTradersSubTab, setActiveTradersSubTab] = useState('myFriends'); // for 'myFriends' or 'requests' within the main 'friends' tab
  const [isFriendshipDataLoading, setIsFriendshipDataLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const tradersDropdownRef = useRef<HTMLDivElement>(null);
  const [userTrades, setUserTrades] = useState<Trade[]>([]);
  const [medalType, setMedalType] = useState<MedalType | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const fetchUserTrades = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching trades:', error);
        return;
      }
      
      setUserTrades(trades || []);
    } catch (error) {
      console.error('Error in fetchUserTrades:', error);
    }
  }, [currentUser?.id]);

  // Calculate medal type when userTrades changes
  useEffect(() => {
    const calculateAndSetMedal = () => {
      if (userTrades.length > 0) {
        const newMedal = calculateMedal(userTrades);
        
        // Check if user earned a new medal
        if (newMedal && newMedal !== medalType && currentUser?.id) {
                  // Send email notification for new medal achievement
        fetch('/api/notifications/medal-achievement', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: currentUser.id,
            medalType: newMedal
          }),
        }).catch((emailError) => {
          console.error('Error sending medal achievement email:', emailError);
          // Don't fail the medal calculation if email fails
        });
        }
        
        setMedalType(newMedal);
      } else {
        setMedalType(null);
      }
    };

    calculateAndSetMedal();
  }, [userTrades, medalType, currentUser?.id]);

  // Fetch user trades when component mounts
  useEffect(() => {
    if (currentUser?.id) {
      fetchUserTrades();
    }
  }, [currentUser?.id, fetchUserTrades]);

  // Handler functions for friend actions
  const handleSendFriendRequest = async (recipientId: string) => {
    if (!currentUser?.id) return;
    const result = await sendFriendRequest(recipientId);
    if (result.data) {
      toast({ title: 'Success', description: 'Friend request sent!' });
      // Update friendshipStatuses map optimistically or re-fetch
      setFriendshipStatuses(prev => new Map(prev).set(recipientId, result.data as unknown as Friendship));
      // Re-fetch to ensure all states (requests, friends list, statuses) are consistent
      fetchFriendshipData(); 
    } else if (result.error) {
      toast({ title: 'Error sending request', description: result.error, variant: 'destructive' });
    }
  };

  const handleAcceptFriendRequest = async (senderId: string) => {
    if (!currentUser?.id) return;
    const result = await acceptFriendRequest(senderId);
    if (result.data) {
      toast({ title: 'Success', description: 'Friend request accepted!' });
      // Re-fetch to update all related states (friendsList, incomingRequests, friendshipStatuses)
      fetchFriendshipData(); 
    } else if (result.error) {
      toast({ title: 'Error accepting request', description: result.error, variant: 'destructive' });
    }
  };

  const handleDeclineFriendRequest = async (senderId: string) => {
    if (!currentUser?.id) return;
    // Assuming declineFriendRequest in friendsUtils.ts updates status to 'DECLINED' or deletes row
    const result = await declineFriendRequest(senderId);
    if (result.data && !result.error) { // Success if data is present and no error
      toast({ title: 'Success', description: 'Friend request declined.' }); 
      fetchFriendshipData(); // Re-fetch to update all related states
    } else if (result.error) {
      toast({ title: 'Error declining request', description: result.error, variant: 'destructive' });
    }
  };

  const handleCancelFriendRequest = async (recipientId: string) => {
    if (!currentUser?.id) return;
    const result = await cancelFriendRequest(recipientId);
    if (result.success) {
      toast({ title: 'Success', description: 'Friend request cancelled.' });
      fetchFriendshipData(); // Re-fetch to update all related states
    } else if (result.error) {
      toast({ title: 'Error cancelling request', description: result.error, variant: 'destructive' });
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!currentUser?.id) return;
    const result = await removeFriend(friendId);
    if (result.success) {
      toast({ title: 'Success', description: 'Friend removed.', variant: 'default' });
      fetchFriendshipData(); // Re-fetch to update all related states
    } else if (result.error) {
      toast({ title: 'Error removing friend', description: result.error, variant: 'destructive' });
    }
  };

  const handleBlockUser = async (userIdToBlock: string) => {
    if (!currentUser?.id) return;
    const result = await blockUser(userIdToBlock);
    if (result.data) {
      toast({ title: 'User Blocked', description: 'This user has been blocked.', variant: 'default' });
      fetchFriendshipData(); // Refresh friendship data
    } else if (result.error) {
      toast({ title: 'Error Blocking User', description: result.error, variant: 'destructive' });
    }
  };

  const handleUnblockUser = async (userIdToUnblock: string) => {
    if (!currentUser?.id) return;
    const result = await unblockUser(userIdToUnblock);
    if (result.success) {
      toast({ title: 'User Unblocked', description: 'You can now send this user a friend request.', variant: 'default' });
      fetchFriendshipData(); // Refresh friendship data
    } else if (result.error) {
      toast({ title: 'Error Unblocking User', description: result.error, variant: 'destructive' });
    }
  };

  // Fetch data for the friends system
  const fetchFriendshipData = async () => {
    if (!currentUser?.id) return;

    setIsFriendshipDataLoading(true);
    try {
      // Fetch friends list
      const friendsResult = await getFriends(currentUser.id);
      if (friendsResult.data) {
        setFriendsList(friendsResult.data as unknown as UserData[]);
      } else if (friendsResult.error) {
        toast({ title: 'Error fetching friends', description: friendsResult.error, variant: 'destructive' });
      }

      // Fetch incoming friend requests
      const requestsResult = await getPendingIncomingRequests();
      if (requestsResult.data) {
        setIncomingRequests(requestsResult.data as unknown as (Friendship & { sender_profile?: UserData })[]);
      } else if (requestsResult.error) {
        toast({ title: 'Error fetching requests', description: requestsResult.error, variant: 'destructive' });
      }

      // Fetch all friendship statuses involving the current user using friend_requests table
      const { data: allUserFriendships, error: fsError } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`);

      if (fsError) {
        toast({ title: 'Error fetching friendship statuses', description: fsError.message, variant: 'destructive' });
      } else if (allUserFriendships) {
        const newStatuses = new Map<string, any>();
        allUserFriendships.forEach(fs => {
          const otherUserId = fs.sender_id === currentUser.id ? fs.recipient_id : fs.sender_id;
          // Convert friend_requests format to match expected Friendship format
          const friendshipData = {
            id: fs.id,
            user1_id: fs.sender_id,
            user2_id: fs.recipient_id,
            status: fs.status.toUpperCase(),
            action_user_id: fs.sender_id, // Always the sender_id in friend_requests
            created_at: fs.created_at,
            updated_at: fs.updated_at
          };
          newStatuses.set(otherUserId, friendshipData);
        });
        setFriendshipStatuses(newStatuses);
      }
    } catch (error: any) {
      toast({ title: 'Error loading friendship data', description: error.message, variant: 'destructive' });
    } finally {
      setIsFriendshipDataLoading(false);
    }
  };

  useEffect(() => {
    // Fetch friendship data when the dropdown is opened and the user is logged in
    if (currentUser?.id && tradersDropdownOpen) {
      fetchFriendshipData(); // This fetches friends-specific data (friends list, requests, statuses)
    }
    // Consider if friendship data should be cleared when dropdown closes or if re-fetching on open is sufficient.
    // For now, re-fetching on open is implemented.
  }, [currentUser?.id, tradersDropdownOpen]);

  useEffect(() => {
    // Fetch traders when the user is logged in
    if (currentUser?.id) {
      fetchTraders(); // This fetches all traders for the 'All Traders' and 'Online' tabs
      fetchFriendshipData(); // Also fetch friendship statuses for all traders
    }
  }, [currentUser?.id]);

  // Periodically refresh friendship data to keep it in sync
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const interval = setInterval(() => {
      fetchFriendshipData();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Fetch traders from Supabase
  const fetchTraders = async () => {
    setIsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) return;
      
      // Get followed traders
      
      // Get all traders except current user using our utility
      const { data, error } = await supabase
        .from('profiles')
        .select('*, user_presence(status, last_seen_at)')
        .neq('id', session.session.user.id)
        .order('username', { ascending: true });
      
      // If direct query fails, try a different approach
      if (error) {
        console.error('Error fetching traders:', error);
        // This is a fallback approach that would be complex to implement
        // For now, we'll just show an empty list if the direct query fails
        setFilteredTraders([]);
        return;
      }
      
      if (data) {
        // Add online status indicator
        const tradersWithOnlineStatus = data.map(trader => {
          const presence = trader.user_presence || {};
          const lastActive = presence.last_seen_at ? new Date(presence.last_seen_at).getTime() : 0;
          const isOnline = presence.status === 'ONLINE' && (Date.now() - lastActive < 15 * 60 * 1000);
          return {
            ...trader,
            is_online: isOnline,
            last_active_at: presence.last_seen_at,
            status: presence.status
          };
        });
        
        // Sort by online status first, then by username
        const sortedTraders = tradersWithOnlineStatus.sort((a, b) => {
          if (a.is_online && !b.is_online) return -1;
          if (!a.is_online && b.is_online) return 1;
          return (a.username || '').localeCompare(b.username || '');
        });
        
        setFilteredTraders(sortedTraders);
      }
    } catch (error) {
      console.error('Error in fetchTraders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Close traders dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (tradersDropdownRef.current && !tradersDropdownRef.current.contains(event.target as Node)) {
        setTradersDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Get the scrollable element from the ref
    const scrollableElement = mainScrollRef?.current;
    
    if (!scrollableElement) {
      // Only log in development mode when debugging is needed
      if (process.env.NODE_ENV === 'development') {
        // console.log('No scrollable element found for header auto-hide');
      }
      return;
    }
    
    // Only log in development mode when debugging is needed
    if (process.env.NODE_ENV === 'development') {
      // console.log('Setting up scroll listener for header auto-hide');
    }
    
    const handleScroll = () => {
      const currentScrollY = scrollableElement.scrollTop; // Use scrollTop of the ref
      if (currentScrollY <= 0) { 
        setIsHeaderVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 50) { 
        setIsHeaderVisible(false); 
      } else if (currentScrollY < lastScrollY) { 
        setIsHeaderVisible(true); 
      }
      setLastScrollY(currentScrollY);
    };
    
    // Initial call to set header state based on current scroll position
    handleScroll();
    
    // Add scroll event listener
    scrollableElement.addEventListener('scroll', handleScroll);
    
    // Clean up
    return () => {
      if (scrollableElement) {
        scrollableElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [mainScrollRef, lastScrollY]);
  
  // Force header to be visible when component mounts or when page changes
  useEffect(() => {
    setIsHeaderVisible(true);
    setLastScrollY(0);
    
    // Get the scrollable element and reset its scroll position
    const scrollableElement = mainScrollRef?.current;
    if (scrollableElement) {
      // Only reset scroll if we're at the top already (to avoid jarring experience when navigating between pages)
      if (scrollableElement.scrollTop < 50) {
        scrollableElement.scrollTop = 0;
      }
    }
  }, [pageTitle, mainScrollRef]);
  
  // Comment: Removed duplicate useEffect as it's now handled by the more comprehensive useEffect above

  // Update online status periodically
  useEffect(() => {
    if (!currentUser) return;
    
    // Update online status every 5 minutes
    const updateOnlineStatus = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user?.id) return;
        
        const now = new Date().toISOString();
        const { error } = await profileAccess.updateUserProfile(
          session.session.user.id,
          { 
            is_online: true,
            last_active_at: now
          }
        );
          
        if (error) console.error('Error updating online status:', error);
      } catch (error) {
        console.error('Error in updateOnlineStatus:', error);
      }
    };
    
    const intervalId = setInterval(updateOnlineStatus, 5 * 60 * 1000); // Every 5 minutes
    
    // Set up beforeunload event to mark user as offline when closing the browser
    const handleBeforeUnload = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) return;
      
      await profileAccess.updateUserProfile(
        session.session.user.id,
        { is_online: false }
      );
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  useEffect(() => {
    (async () => {
      const { data: { user: supaUser } } = await supabase.auth.getUser();
      if (!supaUser) return setIsAdmin(false);
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", supaUser.id)
        .maybeSingle();
      if (!error && data && data.role && data.role.toLowerCase() === "admin") {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    })();
  }, [supabase]);

  // Toggle follow/unfollow trader

  // Handle user logout
  const handleLogout = async () => {
    try {
      // Mark user as offline
      if (authUser?.id) {
        await profileAccess.updateUserProfile(
          authUser.id,
          { is_online: false }
        );
      }
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear local storage
      localStorage.removeItem('username');
      localStorage.removeItem('email');
      localStorage.removeItem('rememberedCredentials');
      
      // Clear any cached data
      if (typeof window !== 'undefined') {
        // Clear any other cached data
        sessionStorage.clear();
      }
      
      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Logout Error",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Session timeout - log out after 30 minutes of inactivity
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        toast({
          title: "Session Expired",
          description: "You have been logged out due to inactivity.",
          variant: "destructive",
        });
        handleLogout();
      }, 30 * 60 * 1000); // 30 minutes
    };

    // Reset timeout on user activity
    const handleActivity = () => resetTimeout();
    
    // Set up event listeners for user activity
    document.addEventListener('mousedown', handleActivity);
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('scroll', handleActivity);
    document.addEventListener('click', handleActivity);
    
    // Initial timeout
    resetTimeout();
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('scroll', handleActivity);
      document.removeEventListener('click', handleActivity);
    };
  }, []);

  // Fallback initials for Avatar if no username and no image
  const getInitials = (name?: string) => {
    if (!name) return "U"; // Default to U for User
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  useEffect(() => {
    const fetchAndSetTrades = async () => {
      if (!currentUser?.id) return;
      try {
        const trades = await getTrades();
        setUserTrades(trades || []);
        const medal = calculateMedal(trades || []);
        setMedalType(medal);
      } catch {
        setUserTrades([]);
        setMedalType(null);
      }
    };
    fetchAndSetTrades();
  }, [currentUser?.id]);

  useEffect(() => {
    fetchTraders();
    const interval = setInterval(() => {
      fetchTraders();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  return (
    <header 
      className={`bg-background border-b sticky top-0 z-30 px-4 sm:px-6 lg:px-8 transition-transform duration-300 ease-in-out ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="container mx-auto flex items-center justify-between py-4 px-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold gradient-heading select-none">
            {pageTitle}
          </h1>
          {isAdmin && (
            <Link href="/admin/monitoring" className="flex items-center px-3 py-1 rounded-md bg-muted hover:bg-primary/10 text-primary font-medium transition-colors ml-3">
              <MonitorCheck className="h-5 w-5 mr-1" />
              Monitoring
            </Link>
          )}
        </div>

        {/* Feature Buttons */}
        <div className="flex items-center space-x-4">
          {/* Top Down Analysis Button */}
          <Button
            onClick={() => setIsTopDownAnalysisOpen(true)}
            className={`h-12 w-12 rounded-full transition-all hover:scale-105 p-0 relative group ${theme === 'light' ? 'bg-[#222] hover:bg-[#222]' : 'bg-white hover:bg-white'}`}
          >
            <BarChart3 className="h-6 w-6 text-emerald-500 transition-transform group-hover:scale-110" />
            <span className="sr-only">Top Down Analysis</span>
            {/* Tooltip */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-background border px-3 py-2 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap text-sm z-50 dashboard-header-tooltip" style={{ background: '#fff' }}>
              <span className="dashboard-header-tooltip-text" style={{ color: '#222', fontWeight: 500 }}>Top Down Analysis</span>
            </div>
          </Button>

          {/* Add Trade Button */}
          <Button
            onClick={() => setIsAddTradeOpen(true)}
            className={`h-12 w-12 rounded-full transition-all hover:scale-105 p-0 relative group ${theme === 'light' ? 'bg-[#222] hover:bg-[#222]' : 'bg-white hover:bg-white'}`}
          >
            <PlusIcon className="h-6 w-6 text-orange-500 transition-transform group-hover:scale-110" />
            <span className="sr-only">Add Trade</span>
            {/* Tooltip */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-background border px-3 py-2 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap text-sm z-50 dashboard-header-tooltip" style={{ background: '#fff' }}>
              <span className="dashboard-header-tooltip-text" style={{ color: '#222', fontWeight: 500 }}>Add Trade</span>
            </div>
          </Button>

          {/* Dialogs */}
          <AddTradeDialog isOpen={isAddTradeOpen} onClose={() => setIsAddTradeOpen(false)} />
          <TopDownAnalysisDialog isOpen={isTopDownAnalysisOpen} onClose={() => setIsTopDownAnalysisOpen(false)} />
          
          {/* Social Forum Button */}
          <Button
            onClick={() => router.push('/social-forum')}
            className={`h-12 w-12 rounded-full transition-all hover:scale-105 p-0 relative group ${theme === 'light' ? 'bg-[#222] hover:bg-[#222]' : 'bg-white hover:bg-white'}`}
          >
            <MessagesSquare className="h-6 w-6 text-blue-500 transition-transform group-hover:scale-110" />
            <span className="sr-only">Social Forum</span>
            {/* Tooltip */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-background border px-3 py-2 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap text-sm z-50 dashboard-header-tooltip" style={{ background: '#fff' }}>
              <span className="dashboard-header-tooltip-text" style={{ color: '#222', fontWeight: 500 }}>Social Forum</span>
            </div>
          </Button>
          
          {/* Traders Button and Dropdown */}
          <div className="relative" ref={tradersDropdownRef}>
            <Button
              onClick={() => setTradersDropdownOpen(!tradersDropdownOpen)}
              className={`h-12 w-12 rounded-full transition-all hover:scale-105 p-0 relative group ${theme === 'light' ? 'bg-[#222] hover:bg-[#222]' : 'bg-white hover:bg-white'}`}
            >
              <Users className="h-6 w-6 text-purple-500 transition-transform group-hover:scale-110" />
              <span className="sr-only">Traders</span>
              {/* Tooltip */}
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-background border px-3 py-2 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap text-sm z-50 dashboard-header-tooltip" style={{ background: '#fff' }}>
                <span className="dashboard-header-tooltip-text" style={{ color: '#222', fontWeight: 500 }}>Traders</span>
              </div>
            </Button>

            {/* Traders Dropdown */}
            {tradersDropdownOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="p-3 border-b">
                  <h3 className="text-lg font-semibold mb-2">Traders</h3>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search traders..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <Tabs defaultValue="online" value={activeTraderTab} onValueChange={setActiveTraderTab}>
                  <div className="px-3 pt-2">
                    <TabsList className="w-full">
                      <TabsTrigger value="online" className="flex-1">Online</TabsTrigger>
                      <TabsTrigger value="all" className="flex-1">All Traders</TabsTrigger>
                      <TabsTrigger value="friends" className="flex-1">Friends</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="online" className="mt-0">
                    <div className="max-h-80 overflow-y-auto p-2">
                      {isLoading ? (
                        <div className="flex justify-center items-center h-32">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : filteredTraders.filter(trader => trader.is_online).length > 0 ? (
                        filteredTraders.filter(trader => trader.is_online).map(trader => (
                          <div key={trader.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md min-h-[60px]">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="relative flex-shrink-0">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={trader.avatar_url || undefined} alt={trader.username || "Trader"} />
                                  <AvatarFallback className="text-xs">{getInitials(trader.username)}</AvatarFallback>
                                </Avatar>
                                <div className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background ${trader.is_online ? 'bg-green-500' : 'bg-gray-400'}`} title={trader.is_online ? 'Online' : 'Offline'}></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="text-sm font-medium truncate">{trader.username}</p>
                                  {trader.medal_type && (
                                    <span className="flex items-center flex-shrink-0" style={{ transform: 'scale(0.6)', transformOrigin: 'left center' }}>
                                      <MedalIcon medalType={trader.medal_type} size="sm" showTooltip={false} />
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{trader.trader_type || 'Trader'}</p>
                              </div>
                            </div>
                            {/* Friendship Action Buttons */}
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              {(() => {
                                if (!currentUser || currentUser.id === trader.id) return null;
                                const friendship = friendshipStatuses.get(trader.id);

                                // Case 1: Current user has blocked this trader
                                if (friendship?.status === 'BLOCKED' && friendship.action_user_id === currentUser.id) {
                                  return <Button variant="outline" size="sm" onClick={() => handleUnblockUser(trader.id)} className="text-xs px-2 py-1 h-6 text-destructive border-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive" title="Unblock user"><UserX className="h-3 w-3" /></Button>;
                                }
                                // Case 2: This trader has blocked the current user
                                if (friendship?.status === 'BLOCKED' && friendship.action_user_id === trader.id) {
                                  return <Button variant="ghost" size="sm" disabled className="text-xs px-2 py-1 h-6 text-muted-foreground" title="Blocked by this user"><UserX className="h-3 w-3" /></Button>;
                                }
                                // Case 3: Pending request sent BY current user
                                if (friendship?.status === 'PENDING' && friendship.action_user_id === currentUser.id) {
                                  return (
                                    <React.Fragment>
                                      <span className="relative group">
                                        <Button variant="ghost" size="sm" disabled className="text-xs px-2 py-1 h-6" title="Friend request sent">
                                          <Clock className="h-4 w-4 text-blue-500" />
                                        </Button>
                                        <span className="absolute z-10 left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Friend request sent</span>
                                      </span>
                                      <span className="relative group">
                                        <Button variant="outline" size="sm" onClick={() => handleCancelFriendRequest(trader.id)} className="text-xs px-2 py-1 h-6 text-orange-600 border-orange-600 hover:text-orange-700 hover:bg-orange-50" title="Cancel friend request">
                                          <UserX className="h-4 w-4" />
                                        </Button>
                                        <span className="absolute z-10 left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Cancel request</span>
                                      </span>
                                      <span className="relative group">
                                        <Button variant="destructive" size="sm" onClick={() => handleBlockUser(trader.id)} className="text-xs px-2 py-1 h-6" title="Block user">
                                          <UserX className="h-4 w-4" />
                                        </Button>
                                        <span className="absolute z-10 left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Block user</span>
                                      </span>
                                    </React.Fragment>
                                  );
                                }
                                // Case 4: Pending request sent TO current user (they need to accept/decline)
                                if (friendship?.status === 'PENDING' && friendship.action_user_id === trader.id) {
                                  return (
                                    <React.Fragment>
                                      <Button variant="default" size="sm" onClick={() => handleAcceptFriendRequest(trader.id)} className="text-xs px-2 py-1 h-6 bg-green-500 hover:bg-green-600 text-white" title="Accept friend request"><UserCheck className="h-3 w-3" /></Button>
                                      <Button variant="outline" size="sm" onClick={() => handleDeclineFriendRequest(trader.id)} className="text-xs px-2 py-1 h-6 text-destructive border-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive" title="Decline friend request"><UserX className="h-3 w-3" /></Button>
                                    </React.Fragment>
                                  );
                                }
                                // Case 5: Already friends
                                if (friendship?.status === 'ACCEPTED') {
                                  return (
                                    <React.Fragment>
                                      <Button variant="ghost" size="sm" disabled className="text-xs px-2 py-1 h-6 text-green-500" title="Already friends"><UserCheck className="h-3 w-3" /></Button>
                                      <Button variant="outline" size="sm" onClick={() => handleRemoveFriend(trader.id)} className="text-xs px-2 py-1 h-6 text-destructive border-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive" title="Remove friend"><UserMinus className="h-3 w-3" /></Button>
                                      <Button variant="destructive" size="sm" onClick={() => handleBlockUser(trader.id)} className="text-xs px-2 py-1 h-6" title="Block user"><UserX className="h-3 w-3" /></Button>
                                    </React.Fragment>
                                  );
                                }
                                // Case 6: No existing relationship, or a previously declined one (allowing new actions)
                                // Show 'Add Friend' and 'Block' button
                                return (
                                  <React.Fragment>
                                    <Button variant="outline" size="sm" onClick={() => handleSendFriendRequest(trader.id)} className="text-xs px-2 py-1 h-6" title="Send friend request"><UserPlus className="h-3 w-3" /></Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleBlockUser(trader.id)} className="text-xs px-2 py-1 h-6" title="Block user"><UserX className="h-3 w-3" /></Button>
                                  </React.Fragment>
                                );
                              })()}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          {searchQuery ? 'No traders found matching your search.' : 'No online traders at the moment.'}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="all" className="mt-0">
                    <div className="max-h-80 overflow-y-auto p-2">
                      {isLoading ? (
                        <div className="flex justify-center items-center h-32">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : filteredTraders.length > 0 ? (
                        filteredTraders.map(trader => (
                          <div key={trader.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md min-h-[60px]">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="relative flex-shrink-0">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={trader.avatar_url || undefined} alt={trader.username || "Trader"} />
                                  <AvatarFallback className="text-xs">{getInitials(trader.username)}</AvatarFallback>
                                </Avatar>
                                <div className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background ${trader.is_online ? 'bg-green-500' : 'bg-gray-400'}`} title={trader.is_online ? 'Online' : 'Offline'}></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="text-sm font-medium truncate">{trader.username}</p>
                                  {trader.medal_type && (
                                    <span className="flex items-center flex-shrink-0" style={{ transform: 'scale(0.6)', transformOrigin: 'left center' }}>
                                      <MedalIcon medalType={trader.medal_type} size="sm" showTooltip={false} />
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{trader.trader_type || 'Trader'}</p>
                              </div>
                            </div>
                            {/* Friendship Action Buttons */}
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              {(() => {
                                if (!currentUser || currentUser.id === trader.id) return null;
                                const friendship = friendshipStatuses.get(trader.id);

                                // Case 1: Current user has blocked this trader
                                if (friendship?.status === 'BLOCKED' && friendship.action_user_id === currentUser.id) {
                                  return <Button variant="outline" size="sm" onClick={() => handleUnblockUser(trader.id)} className="text-xs px-2 py-1 h-6 text-destructive border-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive" title="Unblock user"><UserX className="h-3 w-3" /></Button>;
                                }
                                // Case 2: This trader has blocked the current user
                                if (friendship?.status === 'BLOCKED' && friendship.action_user_id === trader.id) {
                                  return <Button variant="ghost" size="sm" disabled className="text-xs px-2 py-1 h-6 text-muted-foreground" title="Blocked by this user"><UserX className="h-3 w-3" /></Button>;
                                }
                                // Case 3: Pending request sent BY current user
                                if (friendship?.status === 'PENDING' && friendship.action_user_id === currentUser.id) {
                                  return (
                                    <React.Fragment>
                                      <span className="relative group">
                                        <Button variant="ghost" size="sm" disabled className="text-xs px-2 py-1 h-6" title="Friend request sent">
                                          <Clock className="h-4 w-4 text-blue-500" />
                                        </Button>
                                        <span className="absolute z-10 left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Friend request sent</span>
                                      </span>
                                      <span className="relative group">
                                        <Button variant="outline" size="sm" onClick={() => handleCancelFriendRequest(trader.id)} className="text-xs px-2 py-1 h-6 text-orange-600 border-orange-600 hover:text-orange-700 hover:bg-orange-50" title="Cancel friend request">
                                          <UserX className="h-4 w-4" />
                                        </Button>
                                        <span className="absolute z-10 left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Cancel request</span>
                                      </span>
                                      <span className="relative group">
                                        <Button variant="destructive" size="sm" onClick={() => handleBlockUser(trader.id)} className="text-xs px-2 py-1 h-6" title="Block user">
                                          <UserX className="h-4 w-4" />
                                        </Button>
                                        <span className="absolute z-10 left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Block user</span>
                                      </span>
                                    </React.Fragment>
                                  );
                                }
                                // Case 4: Pending request sent TO current user (they need to accept/decline)
                                if (friendship?.status === 'PENDING' && friendship.action_user_id === trader.id) {
                                  return (
                                    <React.Fragment>
                                      <Button variant="default" size="sm" onClick={() => handleAcceptFriendRequest(trader.id)} className="text-xs px-2 py-1 h-6 bg-green-500 hover:bg-green-600 text-white" title="Accept friend request"><UserCheck className="h-3 w-3" /></Button>
                                      <Button variant="outline" size="sm" onClick={() => handleDeclineFriendRequest(trader.id)} className="text-xs px-2 py-1 h-6 text-destructive border-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive" title="Decline friend request"><UserX className="h-3 w-3" /></Button>
                                    </React.Fragment>
                                  );
                                }
                                // Case 5: Already friends
                                if (friendship?.status === 'ACCEPTED') {
                                  return (
                                    <React.Fragment>
                                      <Button variant="ghost" size="sm" disabled className="text-xs px-2 py-1 h-6 text-green-500" title="Already friends"><UserCheck className="h-3 w-3" /></Button>
                                      <Button variant="outline" size="sm" onClick={() => handleRemoveFriend(trader.id)} className="text-xs px-2 py-1 h-6 text-destructive border-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive" title="Remove friend"><UserMinus className="h-3 w-3" /></Button>
                                      <Button variant="destructive" size="sm" onClick={() => handleBlockUser(trader.id)} className="text-xs px-2 py-1 h-6" title="Block user"><UserX className="h-3 w-3" /></Button>
                                    </React.Fragment>
                                  );
                                }
                                // Case 6: No existing relationship, or a previously declined one (allowing new actions)
                                // Show 'Add Friend' and 'Block' button
                                return (
                                  <React.Fragment>
                                    <Button variant="outline" size="sm" onClick={() => handleSendFriendRequest(trader.id)} className="text-xs px-2 py-1 h-6" title="Send friend request"><UserPlus className="h-3 w-3" /></Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleBlockUser(trader.id)} className="text-xs px-2 py-1 h-6" title="Block user"><UserX className="h-3 w-3" /></Button>
                                  </React.Fragment>
                                );
                              })()}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          {searchQuery ? 'No traders found matching your search.' : 'No traders available.'}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="friends" className="mt-0">
                    <div className="p-2">
                      <Tabs defaultValue="myFriends" value={activeTradersSubTab} onValueChange={setActiveTradersSubTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-2">
                          <TabsTrigger value="myFriends">My Friends ({friendsList.length})</TabsTrigger>
                          <TabsTrigger value="requests">Requests ({incomingRequests.length}) <Mail className={`ml-2 h-4 w-4 ${incomingRequests.length > 0 ? 'text-orange-500 animate-pulse' : ''}`} /></TabsTrigger>
                        </TabsList>
                        <TabsContent value="myFriends">
                          <div className="max-h-80 overflow-y-auto space-y-2">
                            {isFriendshipDataLoading ? (
                              <div className="flex justify-center items-center h-24">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                              </div>
                            ) : friendsList.length > 0 ? (
                              friendsList.map(friend => (
                                <div key={friend.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md min-h-[60px]">
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                      <AvatarImage src={friend.avatar_url || undefined} alt={friend.username || "Friend"} />
                                      <AvatarFallback className="text-xs">{getInitials(friend.username)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{friend.username}</p>
                                      <p className="text-xs text-muted-foreground truncate">{friend.trader_type || 'Trader'}</p>
                                    </div>
                                  </div>
                                  <Button variant="outline" size="sm" onClick={() => handleRemoveFriend(friend.id)} className="text-xs px-2 py-1 h-6 text-destructive border-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive flex-shrink-0" title="Remove friend"><UserX className="h-3 w-3" /></Button>
                                </div>
                              ))
                            ) : (
                              <p className="text-center text-sm text-muted-foreground py-4">You have no friends yet.</p>
                            )}
                          </div>
                        </TabsContent>
                        <TabsContent value="requests">
                          <div className="max-h-80 overflow-y-auto space-y-2">
                            {isFriendshipDataLoading ? (
                              <div className="flex justify-center items-center h-24">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                              </div>
                            ) : incomingRequests.length > 0 ? (
                              incomingRequests.map(request => (
                                <div key={request.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md min-h-[60px]">
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                      <AvatarImage src={request.sender_profile?.avatar_url || undefined} alt={request.sender_profile?.username || "User"} />
                                      <AvatarFallback className="text-xs">{getInitials(request.sender_profile?.username)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{request.sender_profile?.username || 'Unknown User'}</p>
                                      <p className="text-xs text-muted-foreground truncate">Wants to be your friend.</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1 flex-shrink-0">
                                    <Button variant="default" size="sm" onClick={() => handleAcceptFriendRequest(request.user1_id)} className="text-xs px-2 py-1 h-6 bg-green-500 hover:bg-green-600 text-white" title="Accept friend request"><UserCheck className="h-3 w-3" /></Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDeclineFriendRequest(request.user1_id)} className="text-xs px-2 py-1 h-6 text-destructive border-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive" title="Decline friend request"><UserX className="h-3 w-3" /></Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-center text-sm text-muted-foreground py-4">No pending friend requests.</p>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="p-3 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => router.push('/traders')}
                  >
                    View All Traders
                  </Button>
                </div>
              </div>
            )}
          </div>

          {(
            <div className="relative group" ref={userMenuRef}>
              <div className="flex items-center space-x-1">
                {medalType && (
                  <div className="relative h-12 w-12 flex items-center justify-center">
                    <MedalIcon medalType={medalType} size="md" />
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  className="relative h-14 w-14 rounded-full p-0 ml-4 mr-2 overflow-visible"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="relative h-14 w-14">
                    <Avatar className="h-14 w-14 relative z-10 ring-2 ring-white ring-offset-2 ring-offset-background shadow-lg">
                      <AvatarImage src={currentUser?.avatar_url || undefined} alt={currentUser?.username || 'User avatar'} className="object-cover object-center" />
                      <AvatarFallback>{getInitials(currentUser?.username ?? undefined)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border border-background z-20"
                         style={{ backgroundColor: isOnline ? '#22c55e' : '#9ca3af' }}
                         title={isOnline ? 'Online' : 'Offline'}
                    ></div>
                  </div>
                </Button>
              </div>
              
              {/* Hover Menu - Desktop */}
              <div className="absolute right-0 top-full mt-2 w-60 bg-popover border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 md:block hidden">
                <div className="p-3 bg-card border-b">
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 flex-shrink-0">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={currentUser?.avatar_url || undefined} alt={currentUser?.username || 'User avatar'} className="object-cover object-center" />
                        <AvatarFallback className="bg-muted text-muted-foreground text-2xl">{getInitials(currentUser?.username ?? undefined)}</AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-background"
                           style={{ backgroundColor: isOnline ? '#22c55e' : '#9ca3af' }}
                           title={isOnline ? 'Online' : 'Offline'}
                      ></div>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <div className="flex items-center min-w-0">
                        <h3 className="text-lg font-semibold text-foreground leading-none truncate flex-1">{currentUser?.username}</h3>
                        {medalType && (
                          <span className="ml-2 flex items-center" style={{ transform: 'scale(0.8)', transformOrigin: 'left center' }}>
                            <MedalIcon medalType={medalType} size="sm" showTooltip={false} />
                          </span>
                        )}
                      </div>
                      <div className="mt-2 pl-6">
                        <div>
                          {currentUser?.trader_status && (
                            <p className="text-xs text-muted-foreground truncate">{currentUser.trader_status}</p>
                          )}
                          {currentUser?.trader_type && (
                            <p className="text-xs text-muted-foreground truncate">{currentUser.trader_type}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border" />
                <div className="flex flex-col py-2">
                  <Button asChild variant="ghost" className="justify-start w-full px-4 py-2">
                    <Link href="/profile" className="flex items-center w-full">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start w-full px-4 py-2">
                    <Link href="/top-down-analysis" className="flex items-center w-full">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      <span>Top Down Analysis</span>
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start w-full px-4 py-2">
                    <Link href="/trade-records" className="flex items-center w-full">
                      <ListOrdered className="mr-2 h-4 w-4" />
                      <span>Trade Records</span>
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start w-full px-4 py-2">
                    <Link href="/shared-trades" className="flex items-center w-full">
                      <Share2 className="mr-2 h-4 w-4" />
                      <span>Shared Trades</span>
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start w-full px-4 py-2">
                    <Link href="/settings" className="flex items-center w-full" onClick={() => setUserMenuOpen(false)}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start w-full px-4 py-2">
                    <Link href="/support" className="flex items-center w-full" onClick={() => { setUserMenuOpen(false); try { sessionStorage.setItem('fromPage', '/dashboard'); } catch {} }}>
                      <LifeBuoy className="mr-2 h-4 w-4" />
                      <span>Support</span>
                    </Link>
                  </Button>
                </div>
                <div className="border-t border-border" />
                <Button
                  onClick={handleLogout}
                  className="text-red-500 focus:text-red-500 justify-start w-full px-4 py-2"
                  variant="ghost"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </Button>
              </div>

              {/* Mobile Menu - Click/Tap */}
              <div className={`absolute right-0 top-full mt-2 w-60 bg-popover border border-border rounded-md shadow-lg transition-all duration-200 z-50 md:hidden ${userMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                <div className="p-3 bg-card border-b">
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 flex-shrink-0">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={currentUser?.avatar_url || undefined} alt={currentUser?.username || 'User avatar'} className="object-cover object-center" />
                        <AvatarFallback className="bg-muted text-muted-foreground text-2xl">{getInitials(currentUser?.username ?? undefined)}</AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-background"
                           style={{ backgroundColor: isOnline ? '#22c55e' : '#9ca3af' }}
                           title={isOnline ? 'Online' : 'Offline'}
                      ></div>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <div className="flex items-center min-w-0">
                        <h3 className="text-lg font-semibold text-foreground leading-none truncate flex-1">{currentUser?.username}</h3>
                        {medalType && (
                          <span className="ml-2 flex items-center" style={{ transform: 'scale(0.8)', transformOrigin: 'left center' }}>
                            <MedalIcon medalType={medalType} size="sm" showTooltip={false} />
                          </span>
                        )}
                      </div>
                      <div className="mt-2 pl-6">
                        <div>
                          {currentUser?.trader_status && (
                            <p className="text-xs text-muted-foreground truncate">{currentUser.trader_status}</p>
                          )}
                          {currentUser?.trader_type && (
                            <p className="text-xs text-muted-foreground truncate">{currentUser.trader_type}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border" />
                <div className="flex flex-col py-2">
                  <Button asChild variant="ghost" className="justify-start w-full px-4 py-2">
                    <Link href="/profile" className="flex items-center w-full" onClick={() => setUserMenuOpen(false)}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start w-full px-4 py-2">
                    <Link href="/top-down-analysis" className="flex items-center w-full" onClick={() => setUserMenuOpen(false)}>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      <span>Top Down Analysis</span>
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start w-full px-4 py-2">
                    <Link href="/trade-records" className="flex items-center w-full" onClick={() => setUserMenuOpen(false)}>
                      <ListOrdered className="mr-2 h-4 w-4" />
                      <span>Trade Records</span>
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start w-full px-4 py-2">
                    <Link href="/shared-trades" className="flex items-center w-full" onClick={() => setUserMenuOpen(false)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      <span>Shared Trades</span>
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start w-full px-4 py-2">
                    <Link href="/settings" className="flex items-center w-full" onClick={() => setUserMenuOpen(false)}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start w-full px-4 py-2">
                    <Link href="/support" className="flex items-center w-full" onClick={() => { setUserMenuOpen(false); try { sessionStorage.setItem('fromPage', '/dashboard'); } catch {} }}>
                      <LifeBuoy className="mr-2 h-4 w-4" />
                      <span>Support</span>
                    </Link>
                  </Button>
                </div>
                <div className="border-t border-border" />
                <Button
                  onClick={() => {
                    handleLogout();
                    setUserMenuOpen(false);
                  }}
                  className="text-red-500 focus:text-red-500 justify-start w-full px-4 py-2"
                  variant="ghost"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      

    </header>
  );
};

export default DashboardHeader;

<style jsx global>{`
  html[data-theme='light'] .dashboard-header-tooltip, 
  html[data-theme='light'] .dashboard-header-tooltip-text {
    color: #222 !important;
    background: #fff !important;
    border-color: #e5e7eb !important;
  }
`}</style>
