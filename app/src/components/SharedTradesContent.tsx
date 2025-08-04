"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { 
  Share2, ThumbsUp, MessageCircle, User, Search, 
  ArrowUpRight, ArrowDownRight, Trash2
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useUserProfile } from './UserProfileContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';

interface SharedTrade {
  shared_trade_id: string;
  trade_id: string;
  sharer_id: string;
  sharer_username: string;
  sharer_avatar_url?: string;
  recipient_id: string;
  recipient_username: string;
  recipient_avatar_url?: string;
  shared_at: string;
  trade_currency_pair: string;
  trade_direction: 'LONG' | 'SHORT';
  trade_entry_price: number;
  trade_exit_price?: number;
  trade_pnl?: number;
  trade_status: 'OPEN' | 'CLOSED';
  trade_date: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_friend: boolean;
  share_type: 'received' | 'sent';
}

interface SharedTradeComment {
  id: string;
  shared_trade_id: string;
  user_id: string;
  parent_id?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  user?: { username: string; avatar_url?: string };
}

const SharedTradesContent = () => {
  const { profile: currentUser } = useUserProfile();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [sharedTrades, setSharedTrades] = useState<SharedTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [tradeToRemove, setTradeToRemove] = useState<SharedTrade | null>(null);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [commentsByTrade, setCommentsByTrade] = useState<Record<string, SharedTradeComment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<Record<string, string | null>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editInput, setEditInput] = useState<Record<string, string>>({});

  // Fetch shared trades
  const fetchSharedTrades = useCallback(async () => {
    if (!currentUser?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_shared_trades_for_user', {
        p_user_id: currentUser.id
      });

      if (error) throw error;

      setSharedTrades(data || []);
    } catch (error) {
      console.error('Error fetching shared trades:', error);
      toast({
        title: "Error",
        description: "Failed to load shared trades. Please try again.",
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, toast]);

  useEffect(() => {
    fetchSharedTrades();
  }, [currentUser?.id, fetchSharedTrades]);

  // Filter trades based on active tab and search
  const filteredTrades = sharedTrades.filter(trade => {
    const matchesTab = trade.share_type === activeTab;
    const matchesSearch = searchQuery === '' || 
      trade.sharer_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trade.recipient_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trade.trade_currency_pair.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  // Handle removing a shared trade (only for received trades)
  const handleRemoveSharedTrade = async (trade: SharedTrade) => {
    if (!currentUser?.id || trade.share_type !== 'received') return;

    try {
      const { error } = await supabase
        .from('shared_trades')
        .delete()
        .eq('id', trade.shared_trade_id)
        .eq('recipient_id', currentUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shared trade removed from your list.",
        variant: 'default'
      });

      setRemoveDialogOpen(false);
      setTradeToRemove(null);
      fetchSharedTrades(); // Refresh the list
    } catch (error) {
      console.error('Error removing shared trade:', error);
      toast({
        title: "Error",
        description: "Failed to remove shared trade. Please try again.",
        variant: 'destructive'
      });
    }
  };

  // Handle like/unlike
  const handleLike = async (sharedTradeId: string) => {
    if (!currentUser?.id) return;

    try {
      const trade = sharedTrades.find(t => t.shared_trade_id === sharedTradeId);
      if (!trade) return;

      if (trade.is_liked) {
        // Unlike
        const { error } = await supabase
          .from('shared_trade_likes')
          .delete()
          .eq('shared_trade_id', sharedTradeId)
          .eq('user_id', currentUser.id);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('shared_trade_likes')
          .insert({
            shared_trade_id: sharedTradeId,
            user_id: currentUser.id
          });

        if (error) throw error;
      }

      // Update local state
      setSharedTrades(prev => prev.map(t => 
        t.shared_trade_id === sharedTradeId 
          ? { 
              ...t, 
              is_liked: !t.is_liked,
              likes_count: t.is_liked ? t.likes_count - 1 : t.likes_count + 1
            }
          : t
      ));
    } catch (error) {
      console.error('Error handling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status.",
        variant: 'destructive'
      });
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  // Format time
  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const fetchComments = async (sharedTradeId: string) => {
    setLoadingComments((prev) => ({ ...prev, [sharedTradeId]: true }));
    try {
      const { data, error } = await supabase
        .from('shared_trade_comments')
        .select('*, user:user_id(username, avatar_url)')
        .eq('shared_trade_id', sharedTradeId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setCommentsByTrade((prev) => ({ ...prev, [sharedTradeId]: data || [] }));
    } catch (error) {
      setCommentsByTrade((prev) => ({ ...prev, [sharedTradeId]: [] }));
    } finally {
      setLoadingComments((prev) => ({ ...prev, [sharedTradeId]: false }));
    }
  };

  const handleAddComment = async (sharedTradeId: string, parentId?: string | null) => {
    const content = commentInput[sharedTradeId]?.trim();
    if (!content || !currentUser?.id) return;
    try {
      const { error } = await supabase
        .from('shared_trade_comments')
        .insert({
          shared_trade_id: sharedTradeId,
          user_id: currentUser.id,
          parent_id: parentId || null,
          content,
        });
      if (error) throw error;
      setCommentInput((prev) => ({ ...prev, [sharedTradeId]: '' }));
      setReplyTo((prev) => ({ ...prev, [sharedTradeId]: null }));
      fetchComments(sharedTradeId);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add comment.', variant: 'destructive' });
    }
  };

  const handleEditComment = async (commentId: string, sharedTradeId: string) => {
    const content = editInput[commentId]?.trim();
    if (!content || !currentUser) return;
    try {
      const { error } = await supabase
        .from('shared_trade_comments')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', currentUser.id);
      if (error) throw error;
      setEditingComment(null);
      setEditInput((prev) => ({ ...prev, [commentId]: '' }));
      fetchComments(sharedTradeId);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to edit comment.', variant: 'destructive' });
    }
  };

  const handleDeleteComment = async (commentId: string, sharedTradeId: string) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from('shared_trade_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUser.id);
      if (error) throw error;
      fetchComments(sharedTradeId);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete comment.', variant: 'destructive' });
    }
  };

  const renderComments = (comments: SharedTradeComment[], parentId: string | null, sharedTradeId: string, level = 0) => {
    return comments
      .filter((c) => (c.parent_id || null) === parentId)
      .map((comment) => (
        <div key={comment.id} style={{ marginLeft: level * 24 }} className="mb-2">
          <div className="flex items-start gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={comment.user?.avatar_url || undefined} alt={comment.user?.username || 'User'} />
              <AvatarFallback>{comment.user?.username?.substring(0, 2).toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{comment.user?.username || 'User'}</span>
                <span className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString()}</span>
              </div>
              {editingComment === comment.id ? (
                <div className="flex gap-2 mt-1">
                  <Input
                    className="flex-1"
                    value={editInput[comment.id] ?? comment.content}
                    onChange={(e) => setEditInput((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditComment(comment.id, sharedTradeId); }}
                  />
                  <Button size="sm" onClick={() => handleEditComment(comment.id, sharedTradeId)}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingComment(null)}>Cancel</Button>
                </div>
              ) : (
                <div className="text-sm mb-1">{comment.content}</div>
              )}
              <div className="flex gap-2 mt-1">
                <Button variant="link" size="sm" className="px-0 text-xs" onClick={() => setReplyTo((prev) => ({ ...prev, [sharedTradeId]: comment.id }))}>Reply</Button>
                {comment.user_id === currentUser?.id && editingComment !== comment.id && (
                  <>
                    <Button variant="link" size="sm" className="px-0 text-xs" onClick={() => { setEditingComment(comment.id); setEditInput((prev) => ({ ...prev, [comment.id]: comment.content })); }}>Edit</Button>
                    <Button variant="link" size="sm" className="px-0 text-xs text-red-500" onClick={() => handleDeleteComment(comment.id, sharedTradeId)}>Delete</Button>
                  </>
                )}
              </div>
              {replyTo[sharedTradeId] === comment.id && (
                <div className="mt-2 flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Write a reply..."
                    value={commentInput[sharedTradeId] || ''}
                    onChange={(e) => setCommentInput((prev) => ({ ...prev, [sharedTradeId]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(sharedTradeId, comment.id); }}
                  />
                  <Button size="sm" onClick={() => handleAddComment(sharedTradeId, comment.id)}>Send</Button>
                </div>
              )}
            </div>
          </div>
          {renderComments(comments, comment.id, sharedTradeId, level + 1)}
        </div>
      ));
  };

  // Render shared trade row (matching Trade Records columns, with comments expandable section)
  const renderSharedTradeRow = (trade: SharedTrade, index: number) => (
    <React.Fragment key={trade.shared_trade_id}>
      <TableRow>
        {/* Shared By/With */}
        <TableCell className="font-medium">
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={
                activeTab === 'received' ? trade.sharer_avatar_url : trade.recipient_avatar_url
              } alt={
                activeTab === 'received' ? trade.sharer_username : trade.recipient_username
              } />
              <AvatarFallback>{
                (activeTab === 'received' ? trade.sharer_username : trade.recipient_username).substring(0, 2).toUpperCase()
              }</AvatarFallback>
            </Avatar>
            <span>{activeTab === 'received' ? trade.sharer_username : trade.recipient_username}</span>
          </div>
        </TableCell>
        {/* # */}
        <TableCell className="text-muted-foreground">#{index + 1}</TableCell>
        {/* Date */}
        <TableCell>{formatDate(trade.trade_date)}</TableCell>
        {/* Currency Pair */}
        <TableCell>{trade.trade_currency_pair}</TableCell>
        {/* Entry Time */}
        <TableCell>{formatTime(trade.trade_date)}</TableCell>
        {/* Exit Time */}
        <TableCell>{trade.trade_status === 'CLOSED' ? formatTime(trade.trade_date) : '-'}</TableCell>
        {/* Duration (m) */}
        <TableCell>-</TableCell>
        {/* Entry Price */}
        <TableCell>{
  trade.trade_currency_pair === 'USDJPY'
    ? (typeof trade.trade_entry_price === 'number' ? trade.trade_entry_price.toFixed(3) : '-')
    : (typeof trade.trade_entry_price === 'number' ? trade.trade_entry_price.toFixed(5) : '-')
}</TableCell>
        {/* Exit Price */}
        <TableCell>{
  trade.trade_currency_pair === 'USDJPY'
    ? (typeof trade.trade_exit_price === 'number' ? trade.trade_exit_price.toFixed(3) : '-')
    : (typeof trade.trade_exit_price === 'number' ? trade.trade_exit_price.toFixed(5) : '-')
}</TableCell>
        {/* Net Pips */}
        <TableCell>-</TableCell>
        {/* Notes */}
        <TableCell>-</TableCell>
        {/* Actions */}
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLike(trade.shared_trade_id)}
              className="h-8 w-8 p-0"
            >
              <ThumbsUp className={`h-4 w-4 ${trade.is_liked ? 'text-blue-500 fill-current' : ''}`} />
            </Button>
            <span className="text-sm text-muted-foreground">{trade.likes_count}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
              onClick={() => {
                setTradeToRemove(trade);
                setRemoveDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setExpandedComments(expandedComments === trade.shared_trade_id ? null : trade.shared_trade_id)}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="ml-1">{trade.comments_count}</span>
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {/* Expandable threaded comments section */}
      {expandedComments === trade.shared_trade_id && (
        <TableRow>
          <TableCell colSpan={12} className="bg-muted/30">
            <div className="py-4">
              <div className="mb-2 font-semibold text-sm">Comments</div>
              {loadingComments[trade.shared_trade_id] ? (
                <div className="text-muted-foreground text-xs">Loading comments...</div>
              ) : (
                <div>
                  {renderComments(commentsByTrade[trade.shared_trade_id] || [], null, trade.shared_trade_id)}
                  <div className="mt-2 flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Write a comment..."
                      value={commentInput[trade.shared_trade_id] || ''}
                      onChange={(e) => setCommentInput((prev) => ({ ...prev, [trade.shared_trade_id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(trade.shared_trade_id, null); }}
                    />
                    <Button size="sm" onClick={() => handleAddComment(trade.shared_trade_id, null)}>Send</Button>
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );

  // Render loading skeleton
  const renderSkeleton = () => (
    <>
      {Array(5).fill(0).map((_, index) => (
        <TableRow key={index}>
          <TableCell><Skeleton className="h-8 w-32" /></TableCell>
          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
          <TableCell><Skeleton className="h-6 w-12" /></TableCell>
          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="received" value={activeTab} onValueChange={(value) => setActiveTab(value as 'received' | 'sent')}>
        <div className="flex justify-between items-center">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Shared with Me
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Shared by Me
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shared trades..."
                className="pl-8 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <TabsContent value="received" className="mt-6">
          {isLoading ? (
            <Card>
              <CardHeader>
                <CardTitle>Shared Trades Received</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shared By</TableHead>
                      <TableHead>Pair</TableHead>
                      <TableHead className="text-right">Entry</TableHead>
                      <TableHead className="text-right">Exit</TableHead>
                      <TableHead className="text-right">P&L</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderSkeleton()}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : filteredTrades.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Shared Trades Received</CardTitle>
                <CardDescription>
                  Trades shared with you by other traders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shared By</TableHead>
                      <TableHead>Pair</TableHead>
                      <TableHead className="text-right">Entry</TableHead>
                      <TableHead className="text-right">Exit</TableHead>
                      <TableHead className="text-right">P&L</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrades.map(renderSharedTradeRow)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <User className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No shared trades received</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery 
                    ? "No shared trades match your search." 
                    : "No one has shared trades with you yet."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-6">
          {isLoading ? (
            <Card>
              <CardHeader>
                <CardTitle>Shared Trades Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shared With</TableHead>
                      <TableHead>Pair</TableHead>
                      <TableHead className="text-right">Entry</TableHead>
                      <TableHead className="text-right">Exit</TableHead>
                      <TableHead className="text-right">P&L</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderSkeleton()}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : filteredTrades.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Shared Trades Sent</CardTitle>
                <CardDescription>
                  Trades you've shared with other traders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shared With</TableHead>
                      <TableHead>Pair</TableHead>
                      <TableHead className="text-right">Entry</TableHead>
                      <TableHead className="text-right">Exit</TableHead>
                      <TableHead className="text-right">P&L</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrades.map(renderSharedTradeRow)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <Share2 className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No trades shared yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery 
                    ? "No shared trades match your search." 
                    : "You haven't shared any trades with other traders yet."}
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Go to Trade Records to share your trades with other traders.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SharedTradesContent; 