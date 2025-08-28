'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, useAuth } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { calculateMedal } from '@/lib/medal-utils';
import MedalIcon from '@/components/MedalIcon';
import { 
  User, 
  Briefcase, 
  MapPin, 
  LineChart, 
  Clock, 
  Globe, 
  Target, 
  AlertCircle,
  ArrowLeft,
  X,
  UserPlus,
  UserCheck,
  UserX,
  Users,
  CircleDot,
  TrendingUp,
  Star,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { sendFriendRequest, getFriendshipStatusString, acceptFriendRequest, declineFriendRequest, cancelFriendRequest } from '../../lib/friendsUtils';

interface PublicProfileViewProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage?: (userId: string) => void;
}

export const PublicProfileView = ({ profile, isOpen, onClose, onSendMessage }: PublicProfileViewProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const { session } = useAuth();
  const [friendshipStatus, setFriendshipStatus] = useState<'NONE' | 'FRIENDS' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'BLOCKED'>('NONE');
  const [friendLoading, setFriendLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  
  // Check friendship status and online status
  useEffect(() => {
    const checkStatuses = async () => {
      if (!session?.user?.id) return;
      
      try {
        // Check friendship status
        const status = await getFriendshipStatusString(profile.id);
        setFriendshipStatus(status);
        
        // Check online status
        const { data, error } = await supabase
          .from('user_presence')
          .select('status, last_seen_at')
          .eq('user_id', profile.id)
          .single();
        
        if (!error && data) {
          setIsOnline(data.status === 'online');
          if (data.last_seen_at) {
            setLastSeen(data.last_seen_at);
          }
        }
      } catch (error) {
        console.error('Error checking statuses:', error);
      }
    };
    
    checkStatuses();
    
    // Add periodic refresh every 60 seconds
    const interval = setInterval(() => {
      checkStatuses();
    }, 60000);
    return () => clearInterval(interval);
  }, [session, profile.id]);
  
  const handleSendFriendRequest = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to add friends",
        variant: "destructive"
      });
      router.push('/login');
      return;
    }
    
    if (session.user.id === profile.id) {
      toast({
        title: "Cannot add yourself",
        description: "You cannot add yourself as a friend",
        variant: "destructive"
      });
      return;
    }
    
    setFriendLoading(true);
    
    try {
      const result = await sendFriendRequest(profile.id);
      
      if (result.data) {
        setFriendshipStatus('PENDING_SENT');
        toast({
          title: "Friend Request Sent",
          description: "Your friend request has been sent successfully.",
          variant: "default"
        });
      } else if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "There was a problem sending your friend request",
        variant: "destructive"
      });
    } finally {
      setFriendLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    setFriendLoading(true);
    
    try {
      const result = await acceptFriendRequest(profile.id);
      
      if (result.data) {
        setFriendshipStatus('FRIENDS');
        toast({
          title: "Friend Request Accepted",
          description: "You are now friends with this trader.",
          variant: "default"
        });
      } else if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: "Error",
        description: "There was a problem accepting the friend request",
        variant: "destructive"
      });
    } finally {
      setFriendLoading(false);
    }
  };

  const handleDeclineFriendRequest = async () => {
    setFriendLoading(true);
    
    try {
      const result = await declineFriendRequest(profile.id);
        
      if (result.data || !result.error) {
        setFriendshipStatus('NONE');
        toast({
          title: "Friend Request Declined",
          description: "Friend request has been declined.",
          variant: "default"
        });
      } else if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      toast({
        title: "Error",
        description: "There was a problem declining the friend request",
        variant: "destructive"
      });
    } finally {
      setFriendLoading(false);
    }
  };

  const handleCancelFriendRequest = async () => {
    setFriendLoading(true);
    
    try {
      const result = await cancelFriendRequest(profile.id);
      
      if (result.success) {
        setFriendshipStatus('NONE');
        toast({
          title: "Friend Request Cancelled",
          description: "Friend request has been cancelled.",
          variant: "default"
        });
      } else if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      toast({
        title: "Error",
        description: "There was a problem cancelling the friend request",
        variant: "destructive"
      });
    } finally {
      setFriendLoading(false);
    }
  };
  
  const renderActionButton = () => {
    if (!session?.user?.id || session.user.id === profile.id) {
      return null;
    }

    switch (friendshipStatus) {
      case 'NONE':
        return (
          <Button 
            variant="default"
            size="sm"
            onClick={handleSendFriendRequest}
            disabled={friendLoading}
            className="w-full"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Friend
          </Button>
        );
      case 'FRIENDS':
        return (
          <Button 
            variant="outline"
            size="sm"
            disabled
            className="w-full"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Friends
          </Button>
        );
      case 'PENDING_SENT':
        return (
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline"
              size="sm"
              disabled
              className="flex-1"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Request Sent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelFriendRequest}
              disabled={friendLoading}
              className="flex-1 text-orange-600 border-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              <UserX className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        );
      case 'PENDING_RECEIVED':
        return (
          <div className="flex gap-2 w-full">
            <Button
              variant="default"
              size="sm"
              onClick={handleAcceptFriendRequest}
              disabled={friendLoading}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeclineFriendRequest}
              disabled={friendLoading}
              className="flex-1 text-destructive border-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <UserX className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        );
      case 'BLOCKED':
        return (
          <Button 
            variant="outline"
            size="sm"
            disabled
            className="w-full"
          >
            <UserX className="h-4 w-4 mr-2" />
            Blocked
          </Button>
        );
      default:
        return null;
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    
    return date.toLocaleDateString(undefined, options);
  };
  
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return formatDate(dateString);
  };
  
  // Don't allow following yourself
  const isOwnProfile = session?.user?.id === profile.id;
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background rounded-lg shadow-2xl border border-border/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4 border-b border-border/50 bg-background/95 backdrop-blur-sm">
          <h2 className="text-xl font-semibold">Trader Profile</h2>
          <Button 
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
      </div>
      
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Header */}
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.username || 'User'} />
                <AvatarFallback className="text-lg">
                  {profile.username?.substring(0, 2).toUpperCase() || 'TR'}
                </AvatarFallback>
              </Avatar>
              {isOnline && (
                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background shadow-sm"></div>
              )}
            </div>
              
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-semibold truncate">{profile.username}</h3>
                  {profile.medal_type && (
                  <MedalIcon medalType={profile.medal_type} size="sm" />
                  )}
                </div>
                
              <div className="flex flex-wrap items-center gap-2 mb-3">
                  {profile.profession && (
                  <Badge variant="secondary" className="text-xs">
                    <Briefcase className="h-3 w-3 mr-1" />
                      {profile.profession}
                    </Badge>
                  )}
                  
                  {profile.trader_status && (
                  <Badge variant="secondary" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                      {profile.trader_status}
                    </Badge>
                  )}
                </div>
                
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {isOnline ? (
                    <div className="flex items-center gap-1">
                    <CircleDot className="h-3 w-3 text-green-500" />
                      <span>Online</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                    <CircleDot className="h-3 w-3 text-muted-foreground" />
                      <span>Offline</span>
                    </div>
                  )}
                  {lastSeen && (
                    <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                      <span>Last seen {formatTimeAgo(lastSeen)}</span>
                    </div>
                  )}
                </div>
              </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {renderActionButton()}
              {onSendMessage && session?.user?.id !== profile.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSendMessage(profile.id)}
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              )}
            </div>
          </div>
          
          {/* Bio Section */}
          {profile.bio && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">About</h4>
              <p className="text-sm leading-relaxed">{profile.bio}</p>
            </div>
          )}
          
          {/* Trading Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.trader_type && (
              <div className="p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <LineChart className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-sm">Trader Type</h4>
                </div>
                      <p className="text-sm text-muted-foreground">{profile.trader_type}</p>
                  </div>
                )}
                
                {profile.years_experience && (
              <div className="p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-sm">Experience</h4>
                </div>
                      <p className="text-sm text-muted-foreground">{profile.years_experience} years</p>
                  </div>
                )}
                
                {profile.trading_frequency && (
              <div className="p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-sm">Trading Frequency</h4>
                </div>
                      <p className="text-sm text-muted-foreground">{profile.trading_frequency}</p>
                  </div>
                )}
                
                {profile.markets && (
              <div className="p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-sm">Markets</h4>
                </div>
                      <p className="text-sm text-muted-foreground">{profile.markets}</p>
                  </div>
                )}
                
                {profile.trading_goal && (
              <div className="p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-sm">Trading Goal</h4>
                </div>
                      <p className="text-sm text-muted-foreground">{profile.trading_goal}</p>
                  </div>
                )}
                
                {profile.trading_challenges && (
              <div className="p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-sm">Trading Challenges</h4>
                </div>
                      <p className="text-sm text-muted-foreground">{profile.trading_challenges}</p>
                  </div>
                )}
              </div>
          
          {/* Trading Statistics */}
          <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/10">
            <h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wide">Trading Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Win Rate</span>
                </div>
                <span className="text-lg font-bold">{profile.win_rate ? `${profile.win_rate}%` : 'N/A'}</span>
                </div>
                
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <LineChart className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total Trades</span>
                </div>
                <span className="text-lg font-bold">{profile.total_trades || 'N/A'}</span>
                </div>
                
                {profile.performance_rank && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Rank</span>
                  </div>
                  <span className="text-lg font-bold">#{profile.performance_rank}</span>
                  </div>
                )}
                
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Member Since</span>
                </div>
                <span className="text-lg font-bold">{formatDate(profile.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
