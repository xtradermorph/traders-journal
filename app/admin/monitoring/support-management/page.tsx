"use client"

import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Search, RefreshCw, Eye, Clock, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';

// Type for support requests
interface SupportRequest {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  // Additional fields from join with profiles
  username?: string;
}

const SupportManagementPage = () => {
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(30);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // Fetch support requests
  const { data: supportRequests, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['supportRequests'],
    queryFn: async () => {
      try {
        console.log('Fetching support requests...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error('No session found');
          throw new Error('Not authenticated - Please log in');
        }
        
        console.log('User authenticated:', session.user.id);
        
        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
          
        if (profileError) {
          console.error('Profile fetch error:', profileError);
          throw new Error('Failed to verify user role');
        }
        
        console.log('Profile fetched successfully:', profile);
        console.log('User role:', profile?.role, 'Type:', typeof profile?.role);
        
        if (profile?.role.toLowerCase() !== 'admin') {
          console.error('User is not admin:', profile?.role);
          throw new Error('Not authorized - Admin access required');
        }
        
        console.log('User is admin, fetching support requests...');
        
        // Fetch all support requests
        const { data, error } = await supabase
          .from('support_requests')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Support requests fetch error:', error);
          throw new Error(`Database error: ${error.message}`);
        }
        
        console.log('Support requests fetched successfully:', data?.length || 0, 'requests');
        
        // For requests with user_id, fetch their usernames
        const requestsWithUsernames = await Promise.all(
          data.map(async (request) => {
            if (request.user_id) {
              try {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('username')
                  .eq('id', request.user_id)
                  .single();
                  
                return {
                  ...request,
                  username: profileData?.username || 'Unknown User'
                };
              } catch (err) {
                console.error('Error fetching profile for user_id:', request.user_id, err);
                return {
                  ...request,
                  username: 'Unknown User'
                };
              }
            } else {
              // No user_id (guest submission)
              return {
                ...request,
                username: 'Guest User'
              };
            }
          })
        );
        
        console.log('Support requests with usernames processed successfully');
        return requestsWithUsernames;
      } catch (error) {
        console.error('Support requests query error:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: (failureCount, error) => {
      // Don't retry on authentication/authorization errors
      if (error.message.includes('Not authenticated') || error.message.includes('Not authorized')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Update request status
  const updateRequestStatus = async (id: string, status: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('support_requests')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('Status updated', {
        description: `Request status changed to ${status.replace('_', ' ')}`
      });
      
      // Update the selected request if it's open
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest({
          ...selectedRequest,
          status: status as any,
          updated_at: new Date().toISOString()
        });
      }
      
      // Refetch the data
      refetch();
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error('Error', {
        description: 'Failed to update request status'
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle delete request confirmation
  const handleDeleteConfirmation = (id: string) => {
    console.log('Setting up delete for request ID:', id);
    setRequestToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Execute delete request using direct SQL query
  const executeDelete = async (id: string) => {
    if (!id) {
      console.error('No request ID provided for deletion');
      return;
    }
    
    console.log('Executing delete for request ID:', id);
    setIsDeleting(true);
    
    try {
      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      // Use RPC call to delete the request directly
      const { error } = await supabase.rpc('delete_support_request', {
        request_id: id
      });
      
      if (error) {
        console.error('Delete RPC error:', error);
        throw error;
      }
      
      toast.success('Request deleted', {
        description: 'The support request has been permanently deleted'
      });
      
      // Close dialogs if open
      setDeleteDialogOpen(false);
      if (selectedRequest?.id === id) {
        setViewDialogOpen(false);
      }
      
      // Refetch the data after a short delay
      setTimeout(() => {
        refetch();
      }, 500);
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Error', {
        description: 'Failed to delete the support request'
      });
    } finally {
      setIsDeleting(false);
      setRequestToDelete(null);
    }
  };

  // Filter and search support requests
  const filteredRequests = supportRequests
    ? supportRequests.filter(request => {
        // Filter by status
        if (statusFilter !== 'all' && request.status !== statusFilter) {
          return false;
        }
        
        // Search by name, email, subject, or message
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            (request.name && request.name.toLowerCase().includes(query)) ||
            (request.email && request.email.toLowerCase().includes(query)) ||
            (request.subject && request.subject.toLowerCase().includes(query)) ||
            (request.message && request.message.toLowerCase().includes(query)) ||
            (request.username && request.username.toLowerCase().includes(query))
          );
        }
        
        return true;
      })
    : [];

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">New</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">In Progress</Badge>;
      case 'resolved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Resolved</Badge>;
      case 'closed':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // View request details
  const viewRequest = (request: SupportRequest) => {
    setSelectedRequest(request);
    setViewDialogOpen(true);
  };
  
  // Check if a request has replies
  const checkHasReplies = async (requestId: string) => {
    try {
      const { data, error, count } = await supabase
        .from('support_replies')
        .select('*', { count: 'exact' })
        .eq('support_request_id', requestId)
        .limit(1);
        
      return count && count > 0;
    } catch (error) {
      console.error('Error checking for replies:', error);
      return false;
    }
  };

  return (
    <div ref={mainScrollRef}>
      <div className="grid gap-6 mt-0">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Support Requests</CardTitle>
              <CardDescription>
                View and manage support requests from users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search requests..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="rounded-md border">
                {supportRequests && (
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium">Total: {supportRequests?.length || 0} requests | Filtered: {filteredRequests?.length || 0} requests</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCleanupDialogOpen(true)}
                      className="text-xs"
                    >
                      Cleanup Old Requests
                    </Button>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10">
                          <div className="flex justify-center items-center">
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Loading support requests...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : isError ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10">
                          <div className="text-destructive">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                            <p className="font-medium">Error loading support requests</p>
                            {error && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {error.message}
                              </p>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => refetch()}
                              className="mt-3"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Try Again
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : !supportRequests || supportRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          No support requests found in database.
                        </TableCell>
                      </TableRow>
                    ) : filteredRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          No support requests match your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            {format(new Date(request.created_at), 'MMM d, yyyy')}
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(request.created_at), 'h:mm a')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{request.name}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {request.email}
                            </div>
                            {request.username && (
                              <div className="text-xs text-muted-foreground mt-1">
                                @{request.username}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{request.subject}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => viewRequest(request)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteConfirmation(request.id)}
                                className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                title="Delete request"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* View Request Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Support Request Details</DialogTitle>
            <DialogDescription>
              View and manage the support request
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">From</h3>
                  <p className="font-medium">{selectedRequest.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.email}</p>
                  {selectedRequest.username && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Username: {selectedRequest.username}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Date</h3>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.created_at), 'MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedRequest.created_at), 'h:mm a')}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Subject</h3>
                <p className="font-medium">{selectedRequest.subject}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Message</h3>
                <div className="p-4 border rounded-md bg-muted/50 whitespace-pre-wrap">
                  {selectedRequest.message}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Status</h3>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant={selectedRequest.status === 'new' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateRequestStatus(selectedRequest.id, 'new')}
                    disabled={updatingStatus || selectedRequest.status === 'new'}
                  >
                    <AlertCircle className="mr-1 h-4 w-4" />
                    New
                  </Button>
                  <Button 
                    variant={selectedRequest.status === 'in_progress' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateRequestStatus(selectedRequest.id, 'in_progress')}
                    disabled={updatingStatus || selectedRequest.status === 'in_progress'}
                  >
                    <Clock className="mr-1 h-4 w-4" />
                    In Progress
                  </Button>
                  <Button 
                    variant={selectedRequest.status === 'resolved' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateRequestStatus(selectedRequest.id, 'resolved')}
                    disabled={updatingStatus || selectedRequest.status === 'resolved'}
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Resolved
                  </Button>
                  <Button 
                    variant={selectedRequest.status === 'closed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateRequestStatus(selectedRequest.id, 'closed')}
                    disabled={updatingStatus || selectedRequest.status === 'closed'}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Closed
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-between items-center">
            <Button 
              variant="destructive" 
              onClick={() => {
                if (selectedRequest) {
                  handleDeleteConfirmation(selectedRequest.id);
                }
              }}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Request
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
              <Button 
                variant="default"
                disabled={!selectedRequest}
                onClick={() => {
                  if (selectedRequest) {
                    setReplySubject(`Re: ${selectedRequest.subject}`);
                    setReplyMessage('');
                    setReplyDialogOpen(true);
                  }
                }}
              >
                <Mail className="mr-2 h-4 w-4" />
                Reply to Request
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Support Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this support request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (requestToDelete) {
                  executeDelete(requestToDelete);
                }
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Reply to Support Request</DialogTitle>
            <DialogDescription>
              Send a reply to the user's support request
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <Label>To</Label>
                  <div className="p-2 border rounded-md bg-muted/50">
                    {selectedRequest.name} &lt;{selectedRequest.email}&gt;
                  </div>
                </div>
                
                <div className="flex flex-col gap-1">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    placeholder="Enter subject"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Enter your reply message"
                    rows={10}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)} disabled={sendingReply}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedRequest) return;
                
                setSendingReply(true);
                try {
                  // Call the API to send the email
                  const response = await fetch('/api/support/reply', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      requestId: selectedRequest.id,
                      to: selectedRequest.email,
                      subject: replySubject,
                      message: replyMessage,
                    }),
                  });
                  
                  if (!response.ok) {
                    throw new Error('Failed to send reply');
                  }
                  
                  // Update the request status to in_progress if it's new
                  if (selectedRequest.status === 'new') {
                    await updateRequestStatus(selectedRequest.id, 'in_progress');
                  }
                  
                  toast.success('Reply sent', {
                    description: `Your reply has been sent to ${selectedRequest.name}`
                  });
                  
                  setReplyDialogOpen(false);
                } catch (error) {
                  console.error('Error sending reply:', error);
                  toast.error('Error', {
                    description: 'Failed to send reply. Please try again.'
                  });
                } finally {
                  setSendingReply(false);
                }
              }}
              disabled={!replyMessage.trim() || !replySubject.trim() || sendingReply}
            >
              {sendingReply ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Reply
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cleanup Dialog */}
      <Dialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cleanup Old Support Requests</DialogTitle>
            <DialogDescription>
              Automatically delete resolved and closed support requests older than the specified number of days.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="days">Days (Older Than)</Label>
              <Input
                id="days"
                type="number"
                min="1"
                max="365"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(parseInt(e.target.value) || 30)}
              />
              <p className="text-sm text-muted-foreground">
                Support requests with status &quot;resolved&quot; or &quot;closed&quot; that haven&apos;t been updated in {cleanupDays} days will be permanently deleted.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCleanupDialogOpen(false)} disabled={isCleaningUp}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setIsCleaningUp(true);
                try {
                  const response = await fetch('/api/support/cleanup', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      olderThanDays: cleanupDays,
                      status: ['resolved', 'closed']
                    }),
                  });
                  
                  const data = await response.json();
                  
                  if (!response.ok) {
                    throw new Error(data.error || 'Failed to clean up support requests');
                  }
                  
                  toast.success('Cleanup completed', {
                    description: `${data.deletedCount || 0} old support requests have been deleted`
                  });
                  
                  setCleanupDialogOpen(false);
                  refetch(); // Refresh the support requests list
                } catch (error) {
                  console.error('Error cleaning up support requests:', error);
                  toast.error('Error', {
                    description: 'Failed to clean up support requests'
                  });
                } finally {
                  setIsCleaningUp(false);
                }
              }}
              disabled={isCleaningUp}
            >
              {isCleaningUp ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Cleaning...
                </>
              ) : (
                'Delete Old Requests'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportManagementPage;