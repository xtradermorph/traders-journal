"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '../src/components/UserProfileContext';
import { useMessageStore } from '../src/lib/store/messageStore';
import { useToast } from '../src/hooks/use-toast';
import { PageHeader } from '../src/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../src/components/ui/avatar';
import { Badge } from '../src/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Search, 
  X, 
  Paperclip, 
  Image as ImageIcon,
  FileText,
  MoreVertical,
  Trash2,
  User,
  ArrowLeft,
  Download,
  Eye,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../src/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../src/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../src/components/ui/alert-dialog';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  file_url?: string;
  file_name?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

interface Conversation {
  id: string;
  user_id: string;
  other_user_id: string;
  other_user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  last_message?: Message;
  unread_count: number;
  updated_at: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const { profile: currentUser } = useUserProfile();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    isSending,
    setConversations,
    setCurrentConversation,
    setMessages,
    addMessage,
    setLoading,
    setSending,
    markConversationAsRead,
    refreshUnreadCount
  } = useMessageStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConversationList, setShowConversationList] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch conversations on mount
  useEffect(() => {
    if (currentUser) {
      fetchConversations();
    }
  }, [currentUser]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/messages?action=conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      
      const data = await response.json();
      setConversations(data.conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/messages?action=messages&conversationId=${conversationId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      
      const data = await response.json();
      setMessages(data.messages);
      
      // Set current conversation and mark as read
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setCurrentConversation(conversation);
        // Mark conversation as read
        await markConversationAsRead(conversationId, currentUser.id);
        // Refresh unread count
        refreshUnreadCount();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    fetchMessages(conversation.id);
    setShowConversationList(false);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() && !selectedFile) return;
    if (!currentConversation || !currentUser) return;
    
    setSending(true);
    try {
      let fileUrl = '';
      let fileName = '';
      let messageType: 'text' | 'image' | 'file' = 'text';
      
      // Handle file upload if selected
      if (selectedFile) {
        // For now, we'll just use the file name as content
        // In a real implementation, you'd upload to Supabase Storage
        fileName = selectedFile.name;
        messageType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
        fileUrl = URL.createObjectURL(selectedFile); // Temporary URL
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: currentConversation.other_user_id,
          content: messageInput.trim() || (selectedFile ? '' : ''),
          message_type: messageType,
          file_url: fileUrl,
          file_name: fileName
        })
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      const data = await response.json();
      addMessage(data.message);
      setMessageInput('');
      setSelectedFile(null);
      
      // Refresh conversations to update last message
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a file smaller than 10MB',
          variant: 'destructive'
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteConversation = async () => {
    if (!currentConversation) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/messages/delete-conversation?conversationId=${currentConversation.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete conversation');
      
      toast({
        title: 'Success',
        description: 'Conversation deleted successfully',
      });
      
      // Clear current conversation and refresh list
      setCurrentConversation(null);
      setMessages([]);
      fetchConversations();
      setShowConversationList(true);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleFileDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else if (diffInHours < 168) { // 7 days
      return format(date, 'EEE');
    } else {
      return format(date, 'MMM d');
    }
  };

  return (
    <>
      <PageHeader title="Messages" showBackButton backUrl="/dashboard" />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto p-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            
            {/* Conversations List */}
            <Card className={`lg:col-span-1 ${showConversationList ? 'block' : 'hidden lg:block'} bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg`}>
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="text-lg font-semibold">Conversations</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/90 dark:bg-slate-700/90 border-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center text-slate-600 dark:text-slate-400">Loading...</div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-4 text-center text-slate-600 dark:text-slate-400">
                      {searchQuery ? 'No conversations found' : 'No conversations yet'}
                    </div>
                  ) : (
                    filteredConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => handleConversationSelect(conversation)}
                        className={`p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-all duration-200 border-l-4 ${
                          currentConversation?.id === conversation.id 
                            ? 'bg-blue-100 dark:bg-slate-700 border-blue-500' 
                            : 'border-transparent'
                        }`}
                      >
                                                 <div className="flex items-center space-x-3">
                           <Avatar className="h-12 w-12 ring-2 ring-blue-200 dark:ring-slate-600">
                             <AvatarImage src={conversation.other_user.avatar_url} />
                             <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
                               <User className="h-6 w-6" />
                             </AvatarFallback>
                           </Avatar>
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center justify-between">
                               <div className="flex items-center space-x-2">
                                 <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                   {conversation.other_user.username}
                                 </p>
                                 <DropdownMenu>
                                   <DropdownMenuTrigger asChild>
                                     <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                       <MoreVertical className="h-3 w-3" />
                                     </Button>
                                   </DropdownMenuTrigger>
                                   <DropdownMenuContent align="start" className="w-48">
                                     <DropdownMenuItem onClick={() => {
                                       setCurrentConversation(conversation);
                                       setShowDeleteDialog(true);
                                     }} className="text-red-600 focus:text-red-600">
                                       <Trash2 className="h-4 w-4 mr-2" />
                                       Delete Conversation
                                     </DropdownMenuItem>
                                   </DropdownMenuContent>
                                 </DropdownMenu>
                               </div>
                               {conversation.last_message && (
                                 <span className="text-xs text-slate-500 dark:text-slate-400">
                                   {formatMessageTime(conversation.last_message.created_at)}
                                 </span>
                               )}
                             </div>
                             
                           </div>
                           {conversation.unread_count > 0 && (
                             <Badge className="h-6 w-6 p-0 text-xs bg-red-500 hover:bg-red-600 text-white">
                               {conversation.unread_count}
                             </Badge>
                           )}
                         </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Messages Area */}
            <Card className={`lg:col-span-2 ${!showConversationList ? 'block' : 'hidden lg:block'} bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg`}>
              {currentConversation ? (
                <>
                  <CardHeader className="pb-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowConversationList(true)}
                          className="lg:hidden text-white hover:bg-white/20"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Avatar className="h-10 w-10 ring-2 ring-white/20">
                          <AvatarImage src={currentConversation.other_user.avatar_url} />
                          <AvatarFallback className="bg-white/20 text-white">
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-white">{currentConversation.other_user.username}</h3>
                        </div>
                      </div>
                                             <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => {
                           setCurrentConversation(null);
                           setMessages([]);
                           setShowConversationList(true);
                         }}
                         className="text-white hover:bg-white/20"
                       >
                         <X className="h-4 w-4" />
                       </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="flex flex-col h-[calc(100vh-350px)]">
                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl p-4 shadow-sm ${
                                message.sender_id === currentUser?.id
                                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                                  : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
                              }`}
                            >
                              {message.message_type === 'image' && message.file_url && (
                                <div className="mb-3">
                                  <img
                                    src={message.file_url}
                                    alt="Shared image"
                                    className="max-w-full rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(message.file_url, '_blank')}
                                  />
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs opacity-70">{message.file_name}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleFileDownload(message.file_url!, message.file_name!)}
                                      className="h-6 w-6 p-0 text-white/70 hover:text-white"
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                              {message.message_type === 'file' && message.file_name && (
                                <div className="flex items-center space-x-3 mb-3 p-3 bg-white/10 dark:bg-slate-600/20 rounded-lg">
                                  <FileText className="h-5 w-5" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{message.file_name}</p>
                                    <p className="text-xs opacity-70">File attachment</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleFileDownload(message.file_url!, message.file_name!)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                              {message.content && message.content.trim() && (
                                <p className="text-sm leading-relaxed">{message.content}</p>
                              )}
                              <p className="text-xs opacity-70 mt-2 text-right">
                                {formatMessageTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Message Input */}
                      <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
                        {selectedFile && (
                          <div className="flex items-center space-x-3 mb-3 p-3 bg-blue-50 dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-slate-600">
                            {selectedFile.type.startsWith('image/') ? (
                              <ImageIcon className="h-5 w-5 text-blue-600" />
                            ) : (
                              <FileText className="h-5 w-5 text-blue-600" />
                            )}
                            <span className="text-sm flex-1 truncate text-slate-700 dark:text-slate-300">{selectedFile.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={removeSelectedFile}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <div className="flex items-center space-x-3">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="h-10 w-10 p-0 text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700"
                                >
                                  <Paperclip className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Attach file</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Input
                            placeholder="Type a message..."
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={isSending || (!messageInput.trim() && !selectedFile)}
                            size="sm"
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileSelect}
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                        />
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">Select a conversation</h3>
                    <p className="text-slate-600 dark:text-slate-400">Choose a conversation to start messaging</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Conversation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>Delete Conversation</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone and will remove all messages between you and {currentConversation?.other_user.username}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
