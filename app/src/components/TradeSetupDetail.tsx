"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TradeSetup } from '../types';
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, MessageCircle, Share2, Flag, Eye, EyeOff, Calendar, Clock, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// Types
interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user: {
    username: string;
    avatar_url?: string;
    user_presence: {
      status: string;
      last_seen_at: string;
    } | null;
  };
}

interface TradeSetupDetailProps {
  id: string;
}

const TradeSetupDetail: React.FC<TradeSetupDetailProps> = ({ id }) => {
  const [tradeSetup, setTradeSetup] = useState<TradeSetup | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [user_id, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const toastRef = React.useRef(toast);
  const router = useRouter();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };

    fetchCurrentUser();
  }, []);
  
  // Handle browser history for back button
  useEffect(() => {
    // This ensures the browser history is properly maintained
    const handlePopState = () => {
      // When user clicks back button, ensure it goes to social forum
      if (window.location.pathname.includes('/social-forum/')) {
        router.push('/social-forum');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [router]);

  useEffect(() => {
    const fetchTradeSetup = async () => {
      setIsLoading(true);
      try {
        // Fetch trade setup from Supabase
        const { data, error } = await supabase
          .from('trade_setups')
          .select(`
            *,
            user:profiles(username, avatar_url),
            tags:trade_setup_tags(tag)
          `)
          .eq('id', id)
          .single();

        if (error) {
          throw error;
        }

        setTradeSetup(data);
        
        // Fetch comments from Supabase
        const { data: commentsData, error: commentsError } = await supabase
          .from('trade_setup_comments')
          .select(`
            *,
            user:profiles(username, avatar_url, user_presence(status, last_seen_at))
          `)
          .eq('trade_setup_id', id)
          .order('created_at', { ascending: true });

        if (commentsError) {
          console.error("Error fetching comments:", commentsError);
        } else {
          setComments(commentsData || []);
        }
      } catch (error) {
        console.error("Error fetching trade setup:", error);
        toastRef.current({
          id: 'fetch-trade-setup-error',
          title: "Error",
          description: "Failed to load trade setup. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchTradeSetup();
    }
  }, [id]);

  const handleLike = async () => {
    if (!user_id || !tradeSetup) {
      toastRef.current({
        id: 'like-trade-setup-error',
        title: "Authentication Required",
        description: "Please sign in to like trade setups.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Check if user has already liked this setup
      const { data: existingLike, error: likeCheckError } = await supabase
        .from('trade_setup_likes')
        .select('*')
        .eq('trade_setup_id', tradeSetup.id)
        .eq('user_id', user_id)
        .single();
      
      if (likeCheckError && likeCheckError.code !== 'PGRST116') {
        // PGRST116 is the error code for "no rows returned" which is expected if user hasn't liked
        throw likeCheckError;
      }
      
      if (existingLike) {
        // User already liked this setup, remove the like
        const { error: deleteError } = await supabase
          .from('trade_setup_likes')
          .delete()
          .eq('trade_setup_id', tradeSetup.id)
          .eq('user_id', user_id);
        
        if (deleteError) throw deleteError;
        
        // Update the likes count in the trade_setups table
        const { error: updateError } = await supabase
          .from('trade_setups')
          .update({ likes_count: supabase.rpc('decrement_count', { row_id: tradeSetup.id }) })
          .eq('id', tradeSetup.id);
        
        if (updateError) throw updateError;
        
        // Update local state
        setTradeSetup({
          ...tradeSetup,
          likes_count: (tradeSetup.likes_count || 0) - 1
        });
        
        toastRef.current({
          id: 'unlike-trade-setup-success',
          title: "Success",
          description: "You unliked this trade setup.",
          variant: "default"
        });
      } else {
        // User hasn't liked this setup yet, add a like
        const { error: insertError } = await supabase
          .from('trade_setup_likes')
          .insert({
            trade_setup_id: tradeSetup.id,
            user_id: user_id,
            created_at: new Date().toISOString()
          });
        
        if (insertError) throw insertError;
        
        // Update the likes count in the trade_setups table
        const { error: updateError } = await supabase
          .from('trade_setups')
          .update({ likes_count: supabase.rpc('increment_count', { row_id: tradeSetup.id }) })
          .eq('id', tradeSetup.id);
        
        if (updateError) throw updateError;
        
        // Update local state
        setTradeSetup({
          ...tradeSetup,
          likes_count: (tradeSetup.likes_count || 0) + 1
        });
        
        toastRef.current({
          id: 'like-trade-setup-success',
          title: "Success",
          description: "You liked this trade setup!",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error liking trade setup:', error);
      toastRef.current({
        id: 'like-trade-setup-error',
        title: "Error",
        description: "Failed to like trade setup. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleShare = () => {
    // Create a shareable URL
    const shareUrl = `${window.location.origin}/social-forum/${id}`;
    
    // Try to use the Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: tradeSetup?.title || 'Trade Setup',
        text: `Check out this trade setup: ${tradeSetup?.title || 'Trade Setup'}`,
        url: shareUrl,
      }).catch(error => {
        console.error('Error sharing:', error);
        // Fallback to clipboard copy
        copyToClipboard(shareUrl);
      });
    } else {
      // Fallback to clipboard copy
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toastRef.current({
        id: Math.random().toString(36).substring(2, 9),
        title: "Link copied",
        description: "Trade setup link copied to clipboard!",
        variant: "default",
      });
    }).catch(err => {
      console.error('Failed to copy:', err);
      toastRef.current({
        id: Math.random().toString(36).substring(2, 9),
        title: "Error",
        description: "Failed to copy link. Please try again.",
        variant: "destructive",
      });
    });
  };

  const handleReport = async () => {
    if (!user_id || !tradeSetup) {
      toastRef.current({
        id: 'report-trade-setup-error',
        title: "Authentication Required",
        description: "Please sign in to report trade setups.",
        variant: "destructive"
      });
      return;
    }
    
    if (confirm('Are you sure you want to report this trade setup?')) {
      try {
        // Create a report in Supabase
        const { error } = await supabase
          .from('reports')
          .insert({
            reported_item_id: tradeSetup.id,
            reported_item_type: 'trade_setup',
            reporter_id: user_id,
            reason: 'inappropriate_content',
            status: 'pending',
            created_at: new Date().toISOString()
          });
          
        if (error) throw error;
        
        toastRef.current({
          id: 'report-trade-setup-success',
          title: "Report Submitted",
          description: "Thank you for your report. Our team will review this content.",
          variant: "default",
        });
      } catch (error) {
        console.error('Error reporting trade setup:', error);
        toastRef.current({
          id: 'report-trade-setup-error',
          title: "Error",
          description: "Failed to submit report. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !user_id || !tradeSetup) return;
    setIsSubmittingComment(true);
    try {
      // Add the comment to Supabase
      const { data, error } = await supabase
        .from('trade_setup_comments')
        .insert({
          trade_setup_id: tradeSetup.id,
          user_id: user_id,
          content: commentText.trim(),
          created_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      // Get the user profile for the new comment
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user_id)
        .single();

      if (userError) throw userError;

      // Check if data exists and has at least one element
      if (!data || data.length === 0) {
        throw new Error('No data returned from comment insertion');
      }
      
      // Create the new comment object
      const newComment: Comment = {
        id: data[0].id,
        user_id: user_id,
        content: commentText.trim(),
        created_at: new Date().toISOString(),
        user: {
          username: userData.username,
          avatar_url: userData.avatar_url,
          user_presence: null
        }
      };

      setComments([...comments, newComment]);
      setCommentText("");
      
      // Update comment count in Supabase
      const { error: updateError } = await supabase
        .from('trade_setups')
        .update({
          comments_count: (tradeSetup.comments_count || 0) + 1
        })
        .eq('id', tradeSetup.id);

      if (updateError) throw updateError;

      // Update local state
      if (tradeSetup) {
        setTradeSetup({
          ...tradeSetup,
          comments_count: (tradeSetup.comments_count || 0) + 1
        });
      }
      
      toastRef.current({
        id: 'comment-added-success',
        title: "Comment Added",
        description: "Your comment has been posted successfully.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      toastRef.current({
        id: 'comment-added-error',
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-16 w-full rounded-md" />
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-16 w-full rounded-md" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tradeSetup) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <h3 className="text-xl font-medium mb-2">Trade Setup Not Found</h3>
          <p className="text-muted-foreground text-center mb-4">
            The trade setup you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Button asChild>
            <Link href="/social-forum">Back to Social Forum</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2">
              <Avatar className="h-12 w-12 border border-border">
                <AvatarImage src={tradeSetup.user?.avatar_url || undefined} alt={tradeSetup.user?.username || 'User'} />
                <AvatarFallback>{tradeSetup.user?.username?.substring(0, 2).toUpperCase() || 'US'}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{tradeSetup.title}</CardTitle>
                <CardDescription className="flex items-center">
                  <span className="text-sm">{tradeSetup.user?.username || 'User'}</span>
                  <span className="mx-2 text-xs">•</span>
                  <span className="text-xs flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(tradeSetup.created_at)}
                  </span>
                </CardDescription>
              </div>
            </div>
            <Badge variant={tradeSetup.is_public ? "default" : "outline"} className="flex items-center space-x-1">
              {tradeSetup.is_public ? (
                <>
                  <Eye className="h-3 w-3" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3" />
                  <span>Private</span>
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="mt-2">
            <p className="text-foreground whitespace-pre-line">{tradeSetup.description}</p>
          </div>
          
          <div className="flex flex-wrap gap-2 my-2">
            {(tradeSetup.tags || []).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          
          {tradeSetup.image_url && (
            <div className="my-4 border rounded-lg overflow-hidden">
              <Image 
                src={tradeSetup.image_url} 
                alt="Chart" 
                width={800}
                height={400}
                className="w-full object-contain max-h-96"
                onError={(e) => {
                  // Fallback for demo purposes
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/800x400?text=Chart+Image+Placeholder";
                }}
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2 text-muted-foreground" />
                  Trade Details
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Pair</span>
                    <span className="text-sm font-medium">{tradeSetup.pair}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Timeframe</span>
                    <span className="text-sm font-medium">{tradeSetup.timeframe}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Entry Price</span>
                    <span className="text-sm font-medium">{tradeSetup.entry_price}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Stop Loss</span>
                    <span className="text-sm font-medium">{tradeSetup.stop_loss}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Take Profit</span>
                    <span className="text-sm font-medium">{tradeSetup.take_profit}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Risk:Reward</span>
                    <span className="text-sm font-medium">{(tradeSetup.risk_reward_ratio || 0).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  Trade Status
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Current Price</span>
                    <span className="text-sm font-medium">1.0870</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Profit/Loss</span>
                    <span className="text-sm font-medium text-green-500">+5 pips</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
                      {tradeSetup.is_public ? "Public" : "Private"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Updated</span>
                    <span className="text-xs text-muted-foreground">10 minutes ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
        
        <Separator />
        
        <CardFooter className="flex justify-between py-3">
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleLike}>
              <ThumbsUp className="h-4 w-4 mr-1" />
              <span>{tradeSetup.likes_count || 0}</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <MessageCircle className="h-4 w-4 mr-1" />
              <span>{comments.length}</span>
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" />
              <span>Share</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleReport}>
              <Flag className="h-4 w-4 mr-1" />
              <span>Report</span>
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Discussion ({comments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex space-x-4">
              <Avatar className="h-10 w-10 border border-border relative">
                <AvatarImage src={comment.user.avatar_url} alt={comment.user.username} />
                <AvatarFallback>{comment.user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                {comment.user.user_presence && (
                  <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${comment.user.user_presence.status === 'ONLINE' && (Date.now() - new Date(comment.user.user_presence.last_seen_at).getTime() < 15 * 60 * 1000) ? 'bg-green-500' : 'bg-gray-400'}`} title={comment.user.user_presence.status === 'ONLINE' ? 'Online' : 'Offline'}></span>
                )}
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <span className="font-medium text-sm">{comment.user.username}</span>
                  <span className="mx-2 text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm">{comment.content}</p>
                </div>
              </div>
            </div>
          ))}
          
          <div className="pt-4">
            <div className="flex space-x-4">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={user_id ? "https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser" : undefined} alt="Your avatar" />
                <AvatarFallback>YO</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder={user_id ? "Add your comment..." : "Please sign in to comment"}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={!user_id || isSubmittingComment}
                  className="min-h-24"
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSubmitComment}
                    disabled={!user_id || !commentText.trim() || isSubmittingComment}
                  >
                    {isSubmittingComment ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradeSetupDetail;
