"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useUserProfile } from "../UserProfileContext";
import { supabase } from "@/lib/supabase";
import { MessageSquare, ChevronDown, ChevronRight, Search as SearchIcon, PinIcon, VolumeXIcon, Volume2Icon, Trash2Icon, LogOutIcon, Edit2Icon, UsersIcon, ArrowUpRight, Send, MoreVertical, UserPlus, Settings, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useChatStore } from "@/lib/store/chatStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getFriends } from '../../../lib/friendsUtils';

// Define types for conversations
type Profile = {
  id: string;
  username: string;
  avatar_url: string;
};

type Conversation = {
  group_id: string;
  is_direct: boolean;
  name: string;
  members: { profile: Profile }[];
  last_message: string;
  last_message_at: string;
  unread_count: number;
  is_pinned: boolean;
  is_muted: boolean;
  creator_id: string;
  avatar_url?: string;
};

const ChatWidget = () => {
  const { profile: currentUser, loading } = useUserProfile();
  const { 
    isChatOpen, 
    activeConversation, 
    openChat, 
    setActiveConversation,
    resetChat
  } = useChatStore();
  
  // Debug logging
  console.log('ChatWidget render:', { 
    currentUser: !!currentUser, 
    loading, 
    isChatOpen,
    hasActiveConversation: !!activeConversation 
  });
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupChats, setGroupChats] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const chatWidgetRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");

  const [publicOpen, setPublicOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [publicUsers, setPublicUsers] = useState<Profile[]>([]);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const { toast } = useToast();
  const [groupNameError, setGroupNameError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<{id: number, content: string, created_at: string, sender_id: string, profiles: any, status: 'sending' | 'sent' | 'failed'}[]>([]);
  const [revealedMessageId, setRevealedMessageId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const dragState = useRef<{ id: string | null; startX: number; currentX: number; dragging: boolean; lastOffset: number }>({ id: null, startX: 0, currentX: 0, dragging: false, lastOffset: 0 });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [publicUsersLoaded, setPublicUsersLoaded] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string>("");
  const [editingGroupLoading, setEditingGroupLoading] = useState(false);
  const [pinnedMenuId, setPinnedMenuId] = useState<string | null>(null);
  const [tempConversation, setTempConversation] = useState<{group_id: string, name: string, is_direct: boolean} | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSelectedUserIds, setInviteSelectedUserIds] = useState<string[]>([]);
  const [invitingUsers, setInvitingUsers] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [showInvitationsModal, setShowInvitationsModal] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // Friends section state
  const [friends, setFriends] = useState<Profile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  
  // Invite user to direct chat state
  const [showInviteToChatModal, setShowInviteToChatModal] = useState(false);
  const [inviteToChatSearchQuery, setInviteToChatSearchQuery] = useState("");
  const [inviteToChatSelectedUserIds, setInviteToChatSelectedUserIds] = useState<string[]>([]);
  const [invitingToChat, setInvitingToChat] = useState(false);
  
  // Group edit state
  const [showGroupEditModal, setShowGroupEditModal] = useState(false);
  const [editingGroupAvatar, setEditingGroupAvatar] = useState<string>("");
  const [editingGroupAvatarLoading, setEditingGroupAvatarLoading] = useState(false);
  
  // Confirmation dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'delete' | 'leave' | 'deleteGroup';
    groupId: string;
    conversationName: string;
    isDirect: boolean;
  } | null>(null);

  // Set a larger max drag offset
  const MAX_DRAG_OFFSET = 240;

  // Hard fallback: after 5s, if no user/profile, show error (never spinner)
  const [hardError, setHardError] = useState(false);
  
  // Calculate total unread count
  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((total, conv) => {
      if (!conv.is_muted && conv.unread_count > 0) {
        return total + conv.unread_count;
      }
      return total;
    }, 0);
  }, [conversations]);

  // Define fetchConversations first to avoid React error #310
  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      if (!currentUser || !publicUsersLoaded) {
        setIsLoading(false);
        return;
      }
      
      // Fetch group memberships with last_read_at, is_pinned, is_muted, and group creator_id
      const { data: groupMembers, error } = await supabase
        .from("chat_group_members")
        .select(
          `
          group_id,
          last_read_at,
          is_pinned,
          is_muted,
          chat_groups (
            id,
            name,
            is_direct,
            creator_id,
            avatar_url
          )
        `
        )
        .eq("user_id", currentUser.id);

      if (error) {
        throw error;
      }

      // For each group, fetch unread count
      const unreadCounts: Record<string, number> = {};
      await Promise.all(
        (groupMembers as any[]).map(async (member) => {
          const groupId = member.group_id;
          const lastReadAt = member.last_read_at;
          let query = supabase
            .from("chat_messages")
            .select("id", { count: "exact" })
            .eq("group_id", groupId)
            .eq("is_deleted", false);

          if (lastReadAt) {
            query = query.gt("created_at", lastReadAt);
          }

          const { count } = await query;
          unreadCounts[groupId] = count || 0;
        })
      );

      // Fetch last message for each group
      const lastMessages: Record<string, any> = {};
      await Promise.all(
        (groupMembers as any[]).map(async (member) => {
          const groupId = member.group_id;
          const { data: messages } = await supabase
            .from("chat_messages")
            .select(`
              id,
              content,
              created_at,
              sender_id,
              profiles!chat_messages_sender_id_fkey (
                id,
                username,
                avatar_url
              )
            `)
            .eq("group_id", groupId)
            .eq("is_deleted", false)
            .order("created_at", { ascending: false })
            .limit(1);

          if (messages && messages.length > 0) {
            lastMessages[groupId] = messages[0];
          }
        })
      );

      // Fetch group members for each group
      const groupMembersData: Record<string, any[]> = {};
      await Promise.all(
        (groupMembers as any[]).map(async (member) => {
          const groupId = member.group_id;
          const { data: members } = await supabase
            .from("chat_group_members")
            .select(`
              user_id,
              profiles!chat_group_members_user_id_fkey (
                id,
                username,
                avatar_url
              )
            `)
            .eq("group_id", groupId);

          if (members) {
            groupMembersData[groupId] = members;
          }
        })
      );

      // Build conversations array
      const conversationsData = (groupMembers as any[]).map((member) => {
        const group = member.chat_groups;
        const lastMessage = lastMessages[member.group_id];
        const members = groupMembersData[member.group_id] || [];

        return {
          group_id: member.group_id,
          is_direct: group.is_direct,
          name: group.name,
          members: members,
          last_message: lastMessage?.content || "",
          last_message_at: lastMessage?.created_at || "",
          unread_count: unreadCounts[member.group_id] || 0,
          is_pinned: member.is_pinned,
          is_muted: member.is_muted,
          creator_id: group.creator_id,
          avatar_url: group.avatar_url
        };
      });

      // Sort conversations: pinned first, then by last message time
      conversationsData.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime();
      });

      setConversations(conversationsData);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setLoadError("Failed to load conversations");
      setIsLoading(false);
    }
  }, [currentUser, publicUsersLoaded]);

  // Fetch friends for the current user
  const fetchFriends = useCallback(async () => {
    if (!currentUser?.id) return;
    
    setFriendsLoading(true);
    try {
      const { data, error } = await getFriends(currentUser.id);
      if (error) {
        console.error('Error fetching friends:', error);
        return;
      }
      setFriends((data as Profile[]) || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setFriendsLoading(false);
    }
  }, [currentUser]);

  // Fetch pending invitations for current user
  const fetchPendingInvitations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from('chat_group_invitations')
        .select(`
          *,
          chat_groups!inner(name, creator_id),
          profiles!inviter_id(username, avatar_url)
        `)
        .eq('invitee_id', currentUser.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      setPendingInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  }, [currentUser]);

  // Improved loading state management
  useEffect(() => {
    if (!currentUser && !loading) {
      const timeout = setTimeout(() => {
        setIsLoading(false);
      }, 1000);
      return () => clearTimeout(timeout);
    }

    if (currentUser && !loading) {
      fetchConversations();
    }
  }, [currentUser, loading, fetchConversations]);

  // Fetch friends when user changes
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Fetch invitations when user changes
  useEffect(() => {
    if (currentUser) {
      fetchPendingInvitations();
    }
  }, [currentUser, fetchPendingInvitations]);

  // Handle hard error timeout
  useEffect(() => {
    if (currentUser) {
      setHardError(false);
      return;
    }
    const timeout = setTimeout(() => {
      if (!currentUser && !loading) {
        setHardError(true);
        setIsLoading(false);
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [currentUser, loading]);

  const handleOpen = useCallback(() => openChat(true), [openChat]);
  const handleClose = useCallback(() => openChat(false), [openChat]);

  // Click-away to close logic
  useEffect(() => {
    if (!isChatOpen) return;
    function handleClick(e: MouseEvent) {
      if (chatWidgetRef.current && !chatWidgetRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isChatOpen, handleClose]);

  // Early return if no authenticated user - don't show any chat widget
  if (!currentUser) {
    console.log('ChatWidget: No current user, returning null');
    return null;
  }

  // Early return if still loading
  if (loading) {
    console.log('ChatWidget: Still loading, returning null');
    return null;
  }

  // Early return if there's a hard error (after 5 seconds of no user)
  if (hardError) {
    console.log('ChatWidget: Hard error, returning null');
    return null;
  }

  // Early return if there's a load error
  if (loadError) {
    console.log('ChatWidget: Load error, returning null');
    return null;
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110"
        aria-label="Open chat"
      >
        <MessageSquare size={24} />
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
      </button>

      {/* Chat Widget */}
      {isChatOpen && (
        <div 
          ref={chatWidgetRef}
          className="fixed bottom-20 right-4 z-50 w-80 h-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Chat
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {isLoading ? (
              <div className="text-center text-gray-500 dark:text-gray-400">
                <p>Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400">
                <p>No conversations yet.</p>
                <p className="text-sm mt-2">Start chatting with friends!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.group_id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={conversation.avatar_url} />
                      <AvatarFallback>
                        {conversation.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {conversation.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {conversation.last_message || "No messages yet"}
                      </p>
                    </div>
                    {conversation.unread_count > 0 && (
                      <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget; 