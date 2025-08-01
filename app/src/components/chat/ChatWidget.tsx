"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useUserProfile } from "../UserProfileContext";
import { supabase } from "@/lib/supabase";
import { MessageSquare, ChevronDown, ChevronRight, Search as SearchIcon, PinIcon, VolumeXIcon, Volume2Icon, Trash2Icon, LogOutIcon, Edit2Icon, UsersIcon, SendHorizontal, ArrowUpRight } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Skeleton } from "../ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useChatStore } from "@/lib/store/chatStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, parseISO } from 'date-fns';
import { getFriends } from '../../../lib/friendsUtils';

// Define types for conversations
// These might need to be expanded based on your actual data structure
type Profile = {
  id: string;
  username: string;
  avatar_url: string;
};

type Conversation = {
  group_id: string;
  is_direct: boolean;
  name: string; // Group name or other user's name
  members: { profile: Profile }[];
  last_message: string;
  last_message_at: string;
  unread_count: number;
  is_pinned: boolean;
  is_muted: boolean;
  creator_id: string;
  avatar_url?: string;
};

// Helper to group messages by sender and date
function groupMessages(messages: any[]) {
  const groups: any[] = [];
  let lastSender: string | null = null;
  let lastDate: string | null = null;
  let currentGroup: any = null;
  messages.forEach((msg) => {
    const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (msg.sender_id !== lastSender || msgDate !== lastDate) {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = { sender_id: msg.sender_id, date: msgDate, messages: [msg], profiles: msg.profiles };
      lastSender = msg.sender_id;
      lastDate = msgDate;
    } else {
      currentGroup.messages.push(msg);
    }
  });
  if (currentGroup) groups.push(currentGroup);
  return groups;
}

// Helper to robustly extract username and avatar
function getUsername(msg: any) {
  return msg.profiles?.username || (Array.isArray(msg.profiles) && msg.profiles[0]?.username) || msg.username || 'Unknown';
}
function getAvatar(msg: any) {
  return msg.profiles?.avatar_url || (Array.isArray(msg.profiles) && msg.profiles[0]?.avatar_url) || msg.avatar_url || '';
}

// ChatListItem component for both direct and group chats
function ChatListItem({ conversation, onClick, onPin, onUnpin, onMute, onUnmute, onDelete, onLeave, isMobile, openMenuId, setOpenMenuId, currentUserId, publicUsers, creatorId, onEditName, onDeleteGroup, editingGroupId, editingGroupName, setEditingGroupId, setEditingGroupName, editingGroupLoading, onSaveEditName, setShowDeleteConfirm, setShowLeaveConfirm, setShowDeleteGroupConfirm, setPendingAction, setEditingGroupAvatar, setShowGroupEditModal }: {
  conversation: Conversation;
  onClick: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onMute: () => void;
  onUnmute: () => void;
  onDelete?: () => void;
  onLeave?: () => void;
  isMobile: boolean;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  currentUserId: string;
  publicUsers: Profile[];
  creatorId: string;
  onEditName: (groupId: string, newName: string) => void;
  onDeleteGroup: (groupId: string) => void;
  editingGroupId: string | null;
  editingGroupName: string;
  setEditingGroupId: (id: string | null) => void;
  setEditingGroupName: (name: string) => void;
  editingGroupLoading: boolean;
  onSaveEditName: (groupId: string, newName: string) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  setShowLeaveConfirm: (show: boolean) => void;
  setShowDeleteGroupConfirm: (show: boolean) => void;
  setPendingAction: (action: any) => void;
  setEditingGroupAvatar: (avatar: string) => void;
  setShowGroupEditModal: (show: boolean) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // For direct chats, get the other participant's profile robustly
  let displayName = conversation.name;
  let displayAvatar = undefined;
  if (conversation.is_direct) {
    let other = conversation.members.find(m => m.profile && m.profile.id !== currentUserId);
    if (!other && conversation.members.length > 0) {
      // Fallback: just use the first member
      other = conversation.members[0];
    }
    if (other && other.profile) {
      displayName = other.profile.username || 'Unknown';
      displayAvatar = other.profile.avatar_url || undefined;
    } else {
      displayName = 'Unknown';
      displayAvatar = undefined;
    }
  } else {
    // For group chats, use group name and custom avatar if available
    displayAvatar = conversation.avatar_url || undefined;
  }
  // Robust click-away handler for menu
  useEffect(() => {
    if (!openMenuId || openMenuId !== conversation.group_id) return;
    function handleClick(e: MouseEvent) {
      if (
        (menuRef.current && menuRef.current.contains(e.target as Node)) ||
        (buttonRef.current && buttonRef.current.contains(e.target as Node))
      ) {
        return;
      }
      setOpenMenuId(null);
      buttonRef.current?.blur(); // Remove focus from button
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
        buttonRef.current?.blur();
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [openMenuId, conversation.group_id, setOpenMenuId]);
  return (
    <div className="relative group flex items-center p-2 rounded-lg hover:bg-muted cursor-pointer">
      <div className="flex items-center flex-1 min-w-0" onClick={onClick}>
        <Avatar className="h-8 w-8 mr-2">
          <AvatarImage src={displayAvatar} />
          <AvatarFallback>
            {!conversation.is_direct && conversation.avatar_url ? (
              <span className="text-lg">{conversation.avatar_url}</span>
            ) : (
              displayName?.charAt(0).toUpperCase()
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          {editingGroupId === conversation.group_id ? (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <input
                className="border border-zinc-300 bg-zinc-100 text-black rounded px-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-primary"
                value={editingGroupName}
                onChange={e => setEditingGroupName(e.target.value)}
                disabled={editingGroupLoading}
                maxLength={20}
                autoFocus
                onClick={e => e.stopPropagation()}
              />
              <button
                className="text-primary font-semibold px-1 py-1 rounded hover:bg-primary/10 disabled:opacity-50 text-xs"
                onClick={e => { e.stopPropagation(); onSaveEditName(conversation.group_id, editingGroupName); }}
                disabled={editingGroupLoading || !editingGroupName.trim() || editingGroupName.length > 20}
                tabIndex={0}
                title="Save"
              >
                OK
              </button>
              <button
                className="text-zinc-400 px-1 py-1 rounded hover:bg-zinc-200 text-xs"
                onClick={e => { e.stopPropagation(); setEditingGroupId(null); }}
                disabled={editingGroupLoading}
                tabIndex={0}
                title="Cancel"
              >
                ✕
              </button>
            </div>
          ) : (
            <p className="font-semibold truncate flex items-center gap-1">
              {displayName}
              {conversation.is_pinned && <PinIcon className="w-4 h-4 text-yellow-500" />}
              {conversation.is_muted && <VolumeXIcon className="w-4 h-4 text-zinc-400" />}
            </p>
          )}
          <p className="text-xs text-muted-foreground truncate">{conversation.last_message}</p>
        </div>
        {/* Unread badge */}
        {!conversation.is_muted && conversation.unread_count > 0 && (
          <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
            {conversation.unread_count}
          </span>
        )}
      </div>
      {/* Desktop: More icon - always visible, menu appears to the left as a horizontal row */}
      {!isMobile && (
        <div className="relative ml-2 flex items-center">
          <button
            ref={buttonRef}
            className={`opacity-80 group-hover:opacity-100 transition rounded-full p-1 focus:outline-none ${openMenuId === conversation.group_id ? 'bg-zinc-200' : 'hover:bg-zinc-200'}`}
            onClick={e => {
              e.stopPropagation();
              if (openMenuId === conversation.group_id) {
                setOpenMenuId(null);
                buttonRef.current?.blur();
              } else {
                setOpenMenuId(conversation.group_id);
              }
            }}
            aria-expanded={openMenuId === conversation.group_id}
            aria-haspopup="true"
            tabIndex={0}
          >
            <span className="sr-only">More</span>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>
          </button>
          {openMenuId === conversation.group_id && (
            <div
              ref={menuRef}
              className="absolute right-full top-1/2 -translate-y-1/2 flex flex-row gap-2 bg-background rounded shadow px-2 py-1 z-[99999] border min-w-[120px] animate-slide-left"
              style={{ zIndex: 99999 }}
            >
              {/* Pin/Unpin */}
              <Tooltip>
                <TooltipTrigger asChild>
                  {conversation.is_pinned ? (
                    <button className="text-yellow-600 hover:bg-yellow-100 rounded p-1 transition" onClick={e => { e.stopPropagation(); onUnpin(); setOpenMenuId(null); }}>
                      <PinIcon className="w-5 h-5" />
                    </button>
                  ) : (
                    <button className="text-yellow-600 hover:bg-yellow-100 rounded p-1 transition" onClick={e => { e.stopPropagation(); onPin(); setOpenMenuId(null); }}>
                      <PinIcon className="w-5 h-5" />
                    </button>
                  )}
                </TooltipTrigger>
                <TooltipContent className="z-[999999] bg-background text-foreground border shadow" side="top">Pin</TooltipContent>
              </Tooltip>
              {/* Mute/Unmute */}
              <Tooltip>
                <TooltipTrigger asChild>
                  {conversation.is_muted ? (
                    <button className="text-zinc-500 hover:bg-zinc-100 rounded p-1 transition" onClick={e => { e.stopPropagation(); onUnmute(); setOpenMenuId(null); }}>
                      <Volume2Icon className="w-5 h-5" />
                    </button>
                  ) : (
                    <button className="text-zinc-500 hover:bg-zinc-100 rounded p-1 transition" onClick={e => { e.stopPropagation(); onMute(); setOpenMenuId(null); }}>
                      <VolumeXIcon className="w-5 h-5" />
                    </button>
                  )}
                </TooltipTrigger>
                <TooltipContent className="z-[999999] bg-background text-foreground border shadow" side="top">Mute</TooltipContent>
              </Tooltip>
              {/* Delete/Leave options */}
              {conversation.is_direct ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-red-600 hover:bg-red-100 rounded p-1 transition" onClick={e => { 
                      e.stopPropagation(); 
                      setOpenMenuId(null);
                      setPendingAction({ type: 'delete', groupId: conversation.group_id, conversationName: conversation.name, isDirect: true });
                      setShowDeleteConfirm(true);
                    }}>
                      <Trash2Icon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="z-[999999] bg-background text-foreground border shadow" side="top">Delete</TooltipContent>
                </Tooltip>
              ) : (
                currentUserId !== creatorId && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-red-600 hover:bg-red-100 rounded p-1 transition" onClick={e => { 
                        e.stopPropagation(); 
                        setOpenMenuId(null);
                        setPendingAction({ type: 'leave', groupId: conversation.group_id, conversationName: conversation.name, isDirect: false });
                        setShowLeaveConfirm(true);
                      }}>
                        <LogOutIcon className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="z-[999999] bg-background text-foreground border shadow" side="top">Leave Group</TooltipContent>
                  </Tooltip>
                )
              )}
              {/* Only show Delete Group and Edit Name for group chats and creator */}
              {!conversation.is_direct && currentUserId === conversation.creator_id && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-zinc-500 hover:bg-zinc-100 rounded p-1 transition" onClick={e => { 
                        e.stopPropagation(); 
                        setOpenMenuId(null);
                        setPendingAction({ type: 'deleteGroup', groupId: conversation.group_id, conversationName: conversation.name, isDirect: false });
                        setShowDeleteGroupConfirm(true);
                      }}>
                        <Trash2Icon className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="z-[999999] bg-background text-foreground border shadow" side="top">Delete Group</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-zinc-500 hover:bg-zinc-100 rounded p-1 transition" onClick={e => { 
                        e.stopPropagation(); 
                        setEditingGroupId(conversation.group_id); 
                        setEditingGroupName(conversation.name); 
                        setEditingGroupAvatar(conversation.avatar_url || "");
                        setShowGroupEditModal(true);
                        setOpenMenuId(null); 
                      }}>
                        <Edit2Icon className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="z-[999999] bg-background text-foreground border shadow" side="top">Edit</TooltipContent>
                  </Tooltip>
                </>
              )}

            </div>
          )}
        </div>
      )}
      {/* Actions (slide in on mobile) */}
      {isMobile && (
        <div ref={menuRef} className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2 bg-background rounded shadow px-2 py-1 z-10 border">
          {conversation.is_pinned ? (
            <button className="text-yellow-600 hover:bg-yellow-100 rounded px-2 py-1 transition" onClick={e => { e.stopPropagation(); onUnpin(); setOpenMenuId(null); }}>Unpin</button>
          ) : (
            <button className="text-yellow-600 hover:bg-yellow-100 rounded px-2 py-1 transition" onClick={e => { e.stopPropagation(); onPin(); setOpenMenuId(null); }}>Pin</button>
          )}
          {conversation.is_muted ? (
            <button className="text-zinc-500 hover:bg-zinc-100 rounded px-2 py-1 transition" onClick={e => { e.stopPropagation(); onUnmute(); setOpenMenuId(null); }}>Unmute</button>
          ) : (
            <button className="text-zinc-500 hover:bg-zinc-100 rounded px-2 py-1 transition" onClick={e => { e.stopPropagation(); onMute(); setOpenMenuId(null); }}>Mute</button>
          )}
          {/* Delete/Leave options */}
          {conversation.is_direct ? (
            <button className="text-red-600 hover:bg-red-100 rounded px-2 py-1 transition" onClick={e => { 
              e.stopPropagation(); 
              setOpenMenuId(null);
              setPendingAction({ type: 'delete', groupId: conversation.group_id, conversationName: conversation.name, isDirect: true });
              setShowDeleteConfirm(true);
            }}>Delete</button>
          ) : (
            currentUserId !== conversation.creator_id && (
              <button className="text-red-600 hover:bg-red-100 rounded px-2 py-1 transition" onClick={e => { 
                e.stopPropagation(); 
                setOpenMenuId(null);
                setPendingAction({ type: 'leave', groupId: conversation.group_id, conversationName: conversation.name, isDirect: false });
                setShowLeaveConfirm(true);
              }}>Leave Group</button>
            )
          )}
          {!conversation.is_direct && currentUserId === conversation.creator_id && (
            <>
              <button className="text-zinc-500 hover:bg-zinc-100 rounded px-2 py-1 transition" onClick={e => { 
                e.stopPropagation(); 
                setOpenMenuId(null);
                setPendingAction({ type: 'deleteGroup', groupId: conversation.group_id, conversationName: conversation.name, isDirect: false });
                setShowDeleteGroupConfirm(true);
              }}>Delete Group</button>
              <button className="text-zinc-500 hover:bg-zinc-100 rounded px-2 py-1 transition" onClick={e => { 
                e.stopPropagation(); 
                setEditingGroupId(conversation.group_id); 
                setEditingGroupName(conversation.name); 
                setEditingGroupAvatar(conversation.avatar_url || "");
                setShowGroupEditModal(true);
                setOpenMenuId(null); 
              }}>Edit Name</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Helper to detect mobile
function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Mobi|Android/i.test(window.navigator.userAgent);
}

const ChatWidget = () => {
  const { profile: currentUser, loading } = useUserProfile();
  const { 
    isChatOpen, 
    activeConversation, 
    openChat, 
    setActiveConversation,
    resetChat
  } = useChatStore();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const chatWidgetRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [recentOpen, setRecentOpen] = useState(true);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [publicOpen, setPublicOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [publicUsers, setPublicUsers] = useState<Profile[]>([]);
  const [groupChats, setGroupChats] = useState<Conversation[]>([]);
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
  const MAX_DRAG_OFFSET = 240; // px, or adjust as needed for your chat width

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
      setFriends(data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setFriendsLoading(false);
    }
  }, [currentUser]);

  // Fetch friends when user changes
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

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

  const handleOpen = () => openChat(true);
  const handleClose = () => openChat(false);

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

  // Click-away handler for pinned menu
  useEffect(() => {
    if (!pinnedMenuId) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Element;
      if (!target.closest('[data-pinned-menu]')) {
        setPinnedMenuId(null);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPinnedMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [pinnedMenuId]);

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
            .select("id", { count: "exact", head: true })
            .eq("group_id", groupId)
            .neq("sender_id", currentUser.id);
          if (lastReadAt) {
            query = query.gt("created_at", lastReadAt);
          }
          const { count } = await query;
          unreadCounts[groupId] = count || 0;
        })
      );

      // Fetch members for each group separately to avoid RLS recursion
      const processedConversations = (await Promise.all(
        (groupMembers as any[]).map(async ({ chat_groups, group_id, last_read_at, is_pinned, is_muted, avatar_url }) => {
          if (!chat_groups) return null;
          
          // Fetch members for this group separately
          const { data: groupMembersData } = await supabase
            .from("chat_group_members")
            .select(`
              user_id,
              profiles ( id, username, avatar_url )
            `)
            .eq("group_id", group_id);
          
          // Deduplicate members by user_id to prevent repeated users
          const uniqueMembers = (groupMembersData || [])
            .filter((m: any) => m.profiles) // Filter out any null profiles
            .reduce((acc: any[], m: any) => {
              // Check if we already have this user_id
              const exists = acc.some(existing => existing.profile.id === m.profiles.id);
              if (!exists) {
                acc.push({ profile: m.profiles });
              }
              return acc;
            }, []);
          
          let members = uniqueMembers;
          
          if (chat_groups.is_direct && members.length < 2 && publicUsers) {
            const missingUser = publicUsers.find(u => !members.some(m => m.profile.id === u.id));
            if (missingUser) {
              members.push({ profile: missingUser });
            }
          }
          
          return {
            group_id: chat_groups.id,
            is_direct: chat_groups.is_direct,
            name: chat_groups.is_direct 
              ? members.find(m => m.profile.id !== currentUser.id)?.profile?.username || 'Unknown'
              : chat_groups.name,
            members,
            last_message: "No messages yet...",
            last_message_at: new Date().toISOString(),
            unread_count: unreadCounts[group_id] || 0,
            is_pinned: !!is_pinned,
            is_muted: !!is_muted,
            creator_id: chat_groups.creator_id,
            avatar_url: chat_groups.avatar_url,
          };
        })
      )).filter(Boolean) as Conversation[];
      
      const validConversations = processedConversations.filter((c): c is Conversation => c !== null);
      const uniqueConversations = Array.from(new Map(validConversations.map(c => [c.group_id, c])).values());
      
      // Debug: Log conversations with avatars
      const conversationsWithAvatars = uniqueConversations.filter(c => c.avatar_url);
      if (conversationsWithAvatars.length > 0) {
        console.log('Conversations with avatars:', conversationsWithAvatars.map(c => ({
          name: c.name,
          avatar_url: c.avatar_url,
          is_direct: c.is_direct
        })));
      }
      
      setConversations(uniqueConversations);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setLoadError('Failed to load conversations.');
      console.error('Error fetching conversations:', error);
    }
  }, [currentUser, publicUsers, publicUsersLoaded]);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

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

  // Fetch invitations when user changes - moved here to be right after fetchPendingInvitations
  useEffect(() => {
    if (currentUser) {
      fetchPendingInvitations();
    }
  }, [currentUser, fetchPendingInvitations]);
  
  // Automatic refresh for notifications (every 30 seconds)
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const refreshNotifications = () => {
      fetchConversations();
      fetchPendingInvitations();
    };
    
    // Initial refresh
    refreshNotifications();
    
    // Set up polling every 30 seconds
    const interval = setInterval(refreshNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [currentUser, fetchConversations, fetchPendingInvitations]);

  // Real-time listener for all user conversations (for notifications and list updates)
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel("user_conversations")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          // A new message was inserted anywhere.
          // Check if the user is a member of the group this message belongs to.
          const isMember = conversations.some(
            (c) => c.group_id === payload.new.group_id
          );
          if (isMember) {
            // In a real app, you'd update the specific conversation.
            // For simplicity and reliability, we'll just refetch the whole list.
            // This ensures last message and unread counts are updated.
            // This could be optimized later with a DB function.
            fetchConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, conversations, fetchConversations]);

  // Extract fetchMessages so it can be reused
  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    if (!activeConversation) {
      setMessages([]);
      return;
    }
    
    // Don't fetch messages for temporary conversations
    const isTempConversation = activeConversation.group_id.startsWith('temp_');
    if (isTempConversation) {
      setMessages([]);
      setIsLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from("chat_messages")
      .select(`
        id,
        content,
        created_at,
        sender_id,
        profiles:sender_id (
          username,
          avatar_url
        )
      `)
      .eq("group_id", activeConversation.group_id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    } else {
      setMessages(data || []);
    }
    setIsLoading(false);
  }, [activeConversation, supabase]);

  // Fetch messages for the active conversation
  useEffect(() => {
    // Clear messages and optimistic messages when switching conversations
    setMessages([]);
    setOptimisticMessages([]);
    
    fetchMessages();
    if (!activeConversation) return;
    
    // Don't set up real-time listener for temporary conversations
    const isTempConversation = activeConversation.group_id.startsWith('temp_');
    if (isTempConversation) return;
    
    // Set up real-time listener for this specific conversation
    const channel = supabase
      .channel(`chat_${activeConversation.group_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `group_id=eq.${activeConversation.group_id}`,
        },
        (payload) => {
          const newMessage = payload.new as any;
          setMessages((prevMessages) => [...prevMessages, newMessage]);
          
          // Remove optimistic message if this real message matches it
          setOptimisticMessages((prevOptimistic) => 
            prevOptimistic.filter(optMsg => {
              // Check if this optimistic message matches the real message
              // We compare content, sender, and approximate time (within 5 seconds)
              const timeDiff = Math.abs(new Date(newMessage.created_at).getTime() - new Date(optMsg.created_at).getTime());
              return !(optMsg.content === newMessage.content && 
                      optMsg.sender_id === newMessage.sender_id && 
                      timeDiff < 5000);
            })
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation, fetchMessages, supabase]);

  // Fetch all users except current user for both Public Users and Invite Users
  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .neq("id", currentUser.id)
        .order("username", { ascending: true });
      if (!error && data) {
        setPublicUsers(data);
        setPublicUsersLoaded(true);
      }
    };
    fetchUsers();
  }, [currentUser]);

  // Separate group chats from direct chats
  useEffect(() => {
    setGroupChats(conversations.filter(c => !c.is_direct));
  }, [conversations]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, optimisticMessages, isChatOpen, activeConversation]);

  // Reset invite modal when it closes
  useEffect(() => {
    if (!showInviteModal) {
      setInviteSelectedUserIds([]);
    }
  }, [showInviteModal]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation || !currentUser || isSendingMessage) return;
    
    setIsSendingMessage(true);
    const content = messageInput.trim();
    setMessageInput("");
    
    // Check if this is a temporary conversation (new chat)
    const isTempConversation = activeConversation.group_id.startsWith('temp_');
    
    let actualGroupId = activeConversation.group_id;
    
    // If it's a temporary conversation, create the actual chat first
    if (isTempConversation) {
      const recipientId = activeConversation.group_id.replace('temp_', '');
      const { data, error } = await supabase.rpc('create_or_get_direct_chat', {
        recipient_id_param: recipientId
      });
      if (error || !data || data.length === 0) {
        toast({ title: 'Error', description: 'Failed to create chat', variant: 'destructive' });
        return;
      }
      actualGroupId = data[0].group_id;
      
      // Clear the temporary conversation
      setTempConversation(null);
      
      // Refresh conversations to include the new chat and update active conversation
      await fetchConversations();
      
      // Find the newly created conversation and set it as active
      const newConversation = conversations.find(conv => conv.group_id === actualGroupId);
      if (newConversation) {
        setActiveConversation(newConversation);
      }
    }
    
    const optimisticId = Math.random();
    const optimisticMsg = {
      id: optimisticId,
      sender_id: currentUser.id,
      content: content,
      created_at: new Date().toISOString(),
      profiles: {
        username: currentUser.username,
        avatar_url: currentUser.avatar_url,
      },
      status: 'sending' as const,
    };
    setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    const { error } = await supabase.from("chat_messages").insert({
      group_id: actualGroupId,
      sender_id: currentUser.id,
      content: content,
    });
    if (error) {
      setOptimisticMessages((prev) => prev.map(m => m.id === optimisticId ? { ...m, status: 'failed' } : m));
      setIsSendingMessage(false);
    } else {
      // Mark optimistic message as sent successfully
      setOptimisticMessages((prev) => prev.map(m => m.id === optimisticId ? { ...m, status: 'sent' } : m));
      
      // Refresh conversations to update last message and unread count immediately
      fetchConversations();
      
      // Keep optimistic message visible and let real-time listener handle the replacement
      // The optimistic message will be removed when the real message comes through the real-time listener
    }
    
    setIsSendingMessage(false);
  };

  const handleHeaderClose = () => {
    // Clear temporary conversation if it exists
    if (tempConversation) {
      setTempConversation(null);
    }
    setActiveConversation(null); // Clear active conversation first
    // If you want the main panel to close too, call handleClose()
    // handleClose(); 
  };

  // Update last_read_at when opening a conversation
  useEffect(() => {
    if (!activeConversation || !currentUser) return;
    
    // Don't update last_read_at for temporary conversations
    const isTempConversation = activeConversation.group_id.startsWith('temp_');
    if (isTempConversation) return;
    
    const updateLastRead = async () => {
      await supabase
        .from("chat_group_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("user_id", currentUser.id)
        .eq("group_id", activeConversation.group_id);
      // Optionally, refetch conversations to update unread counts
      fetchConversations();
    };
    updateLastRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation]);

  // Group name input validation
  const handleGroupNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGroupName(value);
    if (value.length > 20) {
      setGroupNameError('Group name must be 20 characters or less');
    } else {
      setGroupNameError(null);
    }
  };

  // Group creation handler
  const handleCreateGroup = async () => {
    if (!groupName.trim() || !currentUser || groupName.length > 20) return;
    setCreatingGroup(true);
    setGroupNameError(null);
    try {
      // 1. Create group
      const { data: group, error: groupError } = await supabase
        .from("chat_groups")
        .insert({ name: groupName.trim(), is_direct: false, creator_id: currentUser.id })
        .select()
        .single();
      if (groupError || !group) throw groupError || new Error("Failed to create group");
      // 2. Add members (always add self, others if selected)
      const memberIds = Array.from(new Set([currentUser.id, ...selectedUserIds]));
      const { error: memberError } = await supabase
        .from("chat_group_members")
        .insert(memberIds.map(user_id => ({ group_id: group.id, user_id })));
      if (memberError) throw memberError;
      setShowGroupModal(false);
      setGroupName("");
      setSelectedUserIds([]);
      fetchConversations();
      toast({ title: 'Group Created', description: `Group "${group.name}" created successfully!`, variant: 'default' });
    } catch (e: any) {
      setGroupNameError(e?.message || 'Failed to create group');
      toast({ title: 'Error', description: e?.message || 'Failed to create group', variant: 'destructive' });
    } finally {
      setCreatingGroup(false);
    }
  };

  // Reset group name and selected users when dialog closes
  useEffect(() => {
    if (!showGroupModal) {
      setGroupName("");
      setSelectedUserIds([]);
      setGroupNameError(null);
    }
  }, [showGroupModal]);

  // Reset chat open state and active conversation on tab focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetChat(); // Fully reset chat state
        setIsLoading(false);
        fetchConversations();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resetChat, fetchConversations]);

  // Helper for drag events
  function handleDragStart(e: React.MouseEvent | React.TouchEvent, id: string) {
    dragState.current = {
      id,
      startX: 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX,
      currentX: 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX,
      dragging: true,
      lastOffset: 0,
    };
    setDraggedId(id);
    setDragOffset(0);
  }
  function handleDragMove(e: React.MouseEvent | React.TouchEvent) {
    if (!dragState.current.dragging) return;
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    dragState.current.currentX = x;
    let offset = dragState.current.startX - x;
    if (offset < 0) offset = 0;
    if (offset > MAX_DRAG_OFFSET) offset = MAX_DRAG_OFFSET;
    setDragOffset(offset);
  }
  function handleDragEnd(id: string) {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    setDraggedId(null);
    setDragOffset(0);
  }
  function handleClick(id: string) {
    setRevealedMessageId(revealedMessageId === id ? null : id);
  }

  // Defensive: ensure loading state is never stuck if user/profile is missing or after fetches
  useEffect(() => {
    if (!currentUser && !loading) {
      setIsLoading(false);
    }
  }, [currentUser, loading]);

  // Defensive: always set isLoading to false after fetchConversations
  useEffect(() => {
    if (!isLoading && !loading) return;
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // fallback after 3s
    return () => clearTimeout(timeout);
  }, [isLoading, loading]);

  // Spinner bug: add loading timeout fallback
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setIsLoading(false);
        setLoadError('Loading timed out. Please try again.');
      }, 8000);
      setLoadingTimeout(timeout);
    } else if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
    return () => {
      if (loadingTimeout) clearTimeout(loadingTimeout);
    };
  }, [isLoading]);

  // Early return if no authenticated user - don't show any chat widget
  if (!currentUser) {
    return null;
  }

  // Early return if still loading
  if (loading) {
    return null;
  }

  // Early return if there's a hard error (after 5 seconds of no user)
  if (hardError) {
    return null;
  }

  // Early return if there's a load error
  if (loadError) {
    return null;
  }

  // 1. Implement robust handleDelete and handleLeave functions
  const handleDelete = async (groupId: string) => {
    // Remove user from chat_group_members
    await supabase.from('chat_group_members').delete().eq('group_id', groupId).eq('user_id', currentUser.id);
    // Delete all messages and group if direct chat and no members left
    const conversation = conversations.find(c => c.group_id === groupId);
    if (conversation?.is_direct) {
      const { data: remainingMembers } = await supabase
        .from('chat_group_members')
        .select('user_id')
        .eq('group_id', groupId);
      if (!remainingMembers || remainingMembers.length === 0) {
        await supabase.from('chat_messages').delete().eq('group_id', groupId);
        await supabase.from('chat_groups').delete().eq('id', groupId);
      }
    }
    setConversations(prev => prev.filter(c => c.group_id !== groupId));
    if (activeConversation && activeConversation.group_id === groupId) {
      setActiveConversation(null);
    }
    toast({ title: 'Success', description: 'Chat deleted successfully', variant: 'default' });
  };
  const handleLeave = async (groupId: string) => {
    // Remove user from chat_group_members
    const { error } = await supabase.from('chat_group_members').delete().eq('group_id', groupId).eq('user_id', currentUser.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to leave group', variant: 'destructive' });
      return;
    }
    setConversations(prev => prev.filter(c => c.group_id !== groupId));
    if (activeConversation && activeConversation.group_id === groupId) {
      setActiveConversation(null);
    }
    toast({ title: 'Success', description: 'You have left the group', variant: 'default' });
  };
  // 2. Ensure handlePin and handleMute always reflect backend state
  const handlePin = async (groupId: string, pin: boolean) => {
    console.log('Pin handler called for', groupId, 'pin:', pin);
    // Optimistically update UI
    setConversations(prev => {
      const updated = prev.map(c => c.group_id === groupId ? { ...c, is_pinned: pin } : c);
      // Re-sort: pinned at top
      return [
        ...updated.filter(c => c.is_pinned),
        ...updated.filter(c => !c.is_pinned && c.is_direct),
        ...updated.filter(c => !c.is_pinned && !c.is_direct)
      ];
    });
    const { error } = await supabase.from('chat_group_members').update({ is_pinned: pin }).eq('group_id', groupId).eq('user_id', currentUser.id);
    if (error) {
      setConversations(prev => prev.map(c => c.group_id === groupId ? { ...c, is_pinned: !pin } : c));
      toast({ title: 'Error', description: 'Failed to update pin state', variant: 'destructive' });
    } else {
      fetchConversations();
    }
  };
  const handleMute = async (groupId: string, mute: boolean) => {
    await supabase.from('chat_group_members').update({ is_muted: mute }).eq('group_id', groupId).eq('user_id', currentUser.id);
    fetchConversations();
  };

  // 3. Pass creator_id to ChatListItem and show 'Delete Group' and 'Edit Name' for group creators
  const handleDeleteGroup = async (groupId: string) => {
    // Delete all messages, members, and the group
    await supabase.from('chat_messages').delete().eq('group_id', groupId);
    await supabase.from('chat_group_members').delete().eq('group_id', groupId);
    await supabase.from('chat_groups').delete().eq('id', groupId);
    setConversations(prev => prev.filter(c => c.group_id !== groupId));
    if (activeConversation && activeConversation.group_id === groupId) {
      setActiveConversation(null);
    }
    toast({ title: 'Success', description: 'Group deleted successfully', variant: 'default' });
  };
  const handleEditGroupName = async (groupId: string, newName: string) => {
    await supabase.from('chat_groups').update({ name: newName }).eq('id', groupId);
    fetchConversations();
  };

  const handleSaveEditName = async (groupId: string, newName: string) => {
    setEditingGroupLoading(true);
    try {
      await supabase.from('chat_groups').update({ name: newName }).eq('id', groupId);
      setEditingGroupId(null);
      fetchConversations();
    } finally {
      setEditingGroupLoading(false);
    }
  };

  // Confirmation action handlers
  const executeDelete = async () => {
    if (!pendingAction) return;
    
    try {
      const { groupId, isDirect } = pendingAction;
      
      // Remove user from chat_group_members
      await supabase.from('chat_group_members').delete().eq('group_id', groupId).eq('user_id', currentUser.id);
      
      // If it's a direct chat, check if there are any other members
      if (isDirect) {
        const { data: remainingMembers } = await supabase
          .from('chat_group_members')
          .select('user_id')
          .eq('group_id', groupId);
        
        // If no members left, delete the entire chat and all messages
        if (!remainingMembers || remainingMembers.length === 0) {
          await supabase.from('chat_messages').delete().eq('group_id', groupId);
          await supabase.from('chat_groups').delete().eq('id', groupId);
        }
      }
      
      // Update UI immediately
      setConversations(prev => prev.filter(c => c.group_id !== groupId));
      
      // If this was the active conversation, clear it
      if (activeConversation && activeConversation.group_id === groupId) {
        setActiveConversation(null);
      }
      
      toast({ title: 'Success', description: 'Chat deleted successfully', variant: 'default' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete chat', variant: 'destructive' });
    } finally {
      setShowDeleteConfirm(false);
      setPendingAction(null);
    }
  };

  const executeLeave = async () => {
    if (!pendingAction) return;
    
    try {
      const { groupId } = pendingAction;
      
      // Remove user from chat_group_members
      const { error } = await supabase.from('chat_group_members').delete().eq('group_id', groupId).eq('user_id', currentUser.id);
      
      if (error) {
        toast({ title: 'Error', description: 'Failed to leave group', variant: 'destructive' });
        return;
      }
      
      // Update UI immediately
      setConversations(prev => prev.filter(c => c.group_id !== groupId));
      
      // If this was the active conversation, clear it
      if (activeConversation && activeConversation.group_id === groupId) {
        setActiveConversation(null);
      }
      
      toast({ title: 'Success', description: 'You have left the group', variant: 'default' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to leave group', variant: 'destructive' });
    } finally {
      setShowLeaveConfirm(false);
      setPendingAction(null);
    }
  };

  const executeDeleteGroup = async () => {
    if (!pendingAction) return;
    
    try {
      const { groupId } = pendingAction;
      
      // Delete the entire group and all related data
      await supabase.from('chat_messages').delete().eq('group_id', groupId);
      await supabase.from('chat_group_members').delete().eq('group_id', groupId);
      await supabase.from('chat_groups').delete().eq('id', groupId);
      
      // Update UI immediately
      setConversations(prev => prev.filter(c => c.group_id !== groupId));
      
      // If this was the active conversation, clear it
      if (activeConversation && activeConversation.group_id === groupId) {
        setActiveConversation(null);
      }
      
      toast({ title: 'Success', description: 'Group deleted successfully', variant: 'default' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete group', variant: 'destructive' });
    } finally {
      setShowDeleteGroupConfirm(false);
      setPendingAction(null);
    }
  };

  // Invite users to group functionality - creates invitations instead of direct add
  const handleInviteUsers = async () => {
    if (!activeConversation || !currentUser || inviteSelectedUserIds.length === 0) return;
    setInvitingUsers(true);
    try {
      // Create invitations for selected users
      const { error } = await supabase
        .from("chat_group_invitations")
        .insert(inviteSelectedUserIds.map(invitee_id => ({ 
          group_id: activeConversation.group_id, 
          inviter_id: currentUser.id,
          invitee_id: invitee_id,
          status: 'pending'
        })));
      
      if (error) throw error;
      
      setShowInviteModal(false);
      setInviteSelectedUserIds([]);
      toast({ 
        title: 'Invitations Sent', 
        description: `${inviteSelectedUserIds.length} invitation(s) sent!`, 
        variant: 'default' 
      });
    } catch (e: any) {
      toast({ 
        title: 'Error', 
        description: e?.message || 'Failed to send invitations', 
        variant: 'destructive' 
      });
    } finally {
      setInvitingUsers(false);
    }
  };

  // Handle accepting an invitation
  const handleAcceptInvitation = async (invitationId: string, groupId: string) => {
    try {
      // Add user to group
      const { error: memberError } = await supabase
        .from('chat_group_members')
        .insert({ group_id: groupId, user_id: currentUser.id });
      
      if (memberError) throw memberError;

      // Update invitation status
      const { error: inviteError } = await supabase
        .from('chat_group_invitations')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', invitationId);
      
      if (inviteError) throw inviteError;

      // Refresh data
      fetchPendingInvitations();
      fetchConversations();
      
      // Close the invitations modal
      setShowInvitationsModal(false);
      
      // Force refresh the active conversation if it's the same group
      if (activeConversation && activeConversation.group_id === groupId) {
        // Refetch the conversation data to update members
        const { data: groupData } = await supabase
          .from("chat_group_members")
          .select(`
            group_id,
            chat_groups (
              id,
              name,
              is_direct,
              creator_id,
              chat_group_members (
                user_id,
                profiles ( id, username, avatar_url )
              )
            )
          `)
          .eq("user_id", currentUser.id)
          .eq("group_id", groupId)
          .single();
        
        if (groupData?.chat_groups) {
          const chatGroup = groupData.chat_groups as any;
          const updatedConversation = {
            ...activeConversation,
            members: chatGroup.chat_group_members.map((m: any) => ({ profile: m.profiles })).filter((m: any) => m.profile),
            creator_id: chatGroup.creator_id,
          };
          setActiveConversation(updatedConversation);
        }
      }
      
      toast({ 
        title: 'Invitation Accepted', 
        description: 'You have joined the group!', 
        variant: 'default' 
      });
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to accept invitation', 
        variant: 'destructive' 
      });
    }
  };

  // Handle declining an invitation
  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('chat_group_invitations')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', invitationId);
      
      if (error) throw error;

      fetchPendingInvitations();
      
      // Close the invitations modal
      setShowInvitationsModal(false);
      
      toast({ 
        title: 'Invitation Declined', 
        description: 'Invitation has been declined.', 
        variant: 'default' 
      });
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to decline invitation', 
        variant: 'destructive' 
      });
    }
  };

  // Handle clicking on a friend to start a chat
  const handleFriendClick = async (friend: Profile) => {
    // Check if a direct chat already exists between these users
    const existingConversation = conversations.find(conv => 
      conv.is_direct && 
      conv.members.some(m => m.profile.id === friend.id) &&
      conv.members.some(m => m.profile.id === currentUser.id)
    );
    
    if (existingConversation) {
      // If direct chat exists, just open it
      setActiveConversation(existingConversation);
      return;
    }
    
    // Set temporary conversation for immediate UI feedback
    // This will only be created in the database when the first message is sent
    const tempConversation = {
      group_id: `temp_${friend.id}`,
      name: friend.username,
      is_direct: true,
      members: [
        { profile: currentUser },
        { profile: friend }
      ],
      last_message: "No messages yet...",
      last_message_at: new Date().toISOString(),
      unread_count: 0,
      is_pinned: false,
      is_muted: false,
      creator_id: currentUser.id,
    };
    
    setTempConversation(tempConversation);
    setActiveConversation(tempConversation);
  };

  // 4. Render chat list: pinned at top, then direct, then group chats, with separator
  const pinned = conversations.filter(c => c.is_pinned);
  const direct = conversations.filter(c => !c.is_pinned && c.is_direct);
  const group = conversations.filter(c => !c.is_pinned && !c.is_direct);

  // Handle inviting users to a direct chat
  const handleInviteToChat = async () => {
    if (!activeConversation || !currentUser || inviteToChatSelectedUserIds.length === 0) return;
    
    setInvitingToChat(true);
    try {
      // Add selected users to the chat group
      const { error } = await supabase
        .from("chat_group_members")
        .insert(inviteToChatSelectedUserIds.map(user_id => ({ 
          group_id: activeConversation.group_id, 
          user_id: user_id
        })));
      
      if (error) throw error;
      
      setShowInviteToChatModal(false);
      setInviteToChatSelectedUserIds([]);
      setInviteToChatSearchQuery("");
      
      // Refresh conversations to update the active conversation
      await fetchConversations();
      
      // Update the active conversation with new members
      const updatedConversation = conversations.find(conv => conv.group_id === activeConversation.group_id);
      if (updatedConversation) {
        setActiveConversation(updatedConversation);
      }
      
      toast({ 
        title: 'Users Added', 
        description: `${inviteToChatSelectedUserIds.length} user(s) added to the chat!`, 
        variant: 'default' 
      });
    } catch (e: any) {
      toast({ 
        title: 'Error', 
        description: e?.message || 'Failed to add users to chat', 
        variant: 'destructive' 
      });
    } finally {
      setInvitingToChat(false);
    }
  };

  // Filter users for invite to chat modal
  const getFilteredUsersForInvite = () => {
    if (!publicUsers) return [];
    
    const query = inviteToChatSearchQuery.toLowerCase();
    const currentMemberIds = activeConversation?.members.map((m: any) => m.profile.id) || [];
    
    return publicUsers.filter(user => 
      !currentMemberIds.includes(user.id) && // Not already in the chat
      (query === "" || user.username.toLowerCase().includes(query))
    );
  };

  // Group avatar options (Facebook Messenger style) - Expanded with more options
  const groupAvatarOptions = [
    // Basic colors
    { emoji: "🔴", color: "#FF4444" },
    { emoji: "🟠", color: "#FF8800" },
    { emoji: "🟡", color: "#FFCC00" },
    { emoji: "🟢", color: "#44FF44" },
    { emoji: "🔵", color: "#4444FF" },
    { emoji: "🟣", color: "#8844FF" },
    { emoji: "⚫", color: "#000000" },
    { emoji: "⚪", color: "#FFFFFF" },
    { emoji: "🟤", color: "#8B4513" },
    { emoji: "🟥", color: "#FF0000" },
    { emoji: "🟧", color: "#FF6600" },
    { emoji: "🟨", color: "#FFCC00" },
    { emoji: "🟩", color: "#00FF00" },
    { emoji: "🟦", color: "#0066FF" },
    { emoji: "🟪", color: "#6600FF" },
    { emoji: "⬛", color: "#333333" },
    { emoji: "⬜", color: "#CCCCCC" },
    { emoji: "🟫", color: "#996633" },
    // Smiley faces
    { emoji: "😀", color: "#FFD700" },
    { emoji: "😃", color: "#FFD700" },
    { emoji: "😄", color: "#FFD700" },
    { emoji: "😁", color: "#FFD700" },
    { emoji: "😆", color: "#FFD700" },
    { emoji: "😅", color: "#FFD700" },
    { emoji: "😂", color: "#FFD700" },
    { emoji: "🤣", color: "#FFD700" },
    { emoji: "😊", color: "#FFD700" },
    { emoji: "😇", color: "#FFD700" },
    { emoji: "🙂", color: "#FFD700" },
    { emoji: "🙃", color: "#FFD700" },
    { emoji: "😉", color: "#FFD700" },
    { emoji: "😌", color: "#FFD700" },
    { emoji: "😍", color: "#FFD700" },
    { emoji: "🥰", color: "#FFD700" },
    { emoji: "😘", color: "#FFD700" },
    { emoji: "😗", color: "#FFD700" },
    { emoji: "😙", color: "#FFD700" },
    { emoji: "😚", color: "#FFD700" },
    { emoji: "😋", color: "#FFD700" },
    { emoji: "😛", color: "#FFD700" },
    { emoji: "😝", color: "#FFD700" },
    { emoji: "😜", color: "#FFD700" },
    { emoji: "🤪", color: "#FFD700" },
    { emoji: "🤨", color: "#FFD700" },
    { emoji: "🧐", color: "#FFD700" },
    { emoji: "🤓", color: "#FFD700" },
    { emoji: "��", color: "#FFD700" },
    { emoji: "🤩", color: "#FFD700" },
    { emoji: "🥳", color: "#FFD700" },
    { emoji: "😏", color: "#FFD700" },
    { emoji: "😒", color: "#FFD700" },
    { emoji: "😞", color: "#FFD700" },
    { emoji: "😔", color: "#FFD700" },
    { emoji: "😟", color: "#FFD700" },
    { emoji: "😕", color: "#FFD700" },
    { emoji: "🙁", color: "#FFD700" },
    { emoji: "☹️", color: "#FFD700" },
    { emoji: "😣", color: "#FFD700" },
    { emoji: "😖", color: "#FFD700" },
    { emoji: "😫", color: "#FFD700" },
    { emoji: "😩", color: "#FFD700" },
    { emoji: "🥺", color: "#FFD700" },
    { emoji: "😢", color: "#FFD700" },
    { emoji: "😭", color: "#FFD700" },
    { emoji: "😤", color: "#FFD700" },
    { emoji: "😠", color: "#FFD700" },
    { emoji: "😡", color: "#FFD700" },
    { emoji: "🤬", color: "#FFD700" },
    { emoji: "🤯", color: "#FFD700" },
    { emoji: "😳", color: "#FFD700" },
    { emoji: "🥵", color: "#FFD700" },
    { emoji: "🥶", color: "#FFD700" },
    { emoji: "😱", color: "#FFD700" },
    { emoji: "😨", color: "#FFD700" },
    { emoji: "😰", color: "#FFD700" },
    { emoji: "😥", color: "#FFD700" },
    { emoji: "😓", color: "#FFD700" },
    { emoji: "🤗", color: "#FFD700" },
    { emoji: "🤔", color: "#FFD700" },
    { emoji: "🤭", color: "#FFD700" },
    { emoji: "🤫", color: "#FFD700" },
    { emoji: "🤥", color: "#FFD700" },
    { emoji: "😶", color: "#FFD700" },
    { emoji: "😐", color: "#FFD700" },
    { emoji: "😑", color: "#FFD700" },
    { emoji: "😯", color: "#FFD700" },
    { emoji: "😦", color: "#FFD700" },
    { emoji: "😧", color: "#FFD700" },
    { emoji: "😮", color: "#FFD700" },
    { emoji: "😲", color: "#FFD700" },
    { emoji: "🥱", color: "#FFD700" },
    { emoji: "😴", color: "#FFD700" },
    { emoji: "🤤", color: "#FFD700" },
    { emoji: "😪", color: "#FFD700" },
    { emoji: "😵", color: "#FFD700" },
    { emoji: "🤐", color: "#FFD700" },
    { emoji: "🥴", color: "#FFD700" },
    { emoji: "🤢", color: "#FFD700" },
    { emoji: "🤮", color: "#FFD700" },
    { emoji: "🤧", color: "#FFD700" },
    { emoji: "😷", color: "#FFD700" },
    { emoji: "🤒", color: "#FFD700" },
    { emoji: "🤕", color: "#FFD700" },
    // Thumbs and gestures
    { emoji: "👍", color: "#4CAF50" },
    { emoji: "👎", color: "#F44336" },
    { emoji: "👌", color: "#4CAF50" },
    { emoji: "✌️", color: "#FFC107" },
    { emoji: "🤞", color: "#FFC107" },
    { emoji: "🤟", color: "#FFC107" },
    { emoji: "🤘", color: "#FFC107" },
    { emoji: "🤙", color: "#FFC107" },
    { emoji: "👈", color: "#FFC107" },
    { emoji: "👉", color: "#FFC107" },
    { emoji: "👆", color: "#FFC107" },
    { emoji: "🖕", color: "#FFC107" },
    { emoji: "👇", color: "#FFC107" },
    { emoji: "☝️", color: "#FFC107" },
    { emoji: "👋", color: "#FFC107" },
    { emoji: "🤚", color: "#FFC107" },
    { emoji: "🖐️", color: "#FFC107" },
    { emoji: "✋", color: "#FFC107" },
    { emoji: "🖖", color: "#FFC107" },
    { emoji: "👌", color: "#FFC107" },
    { emoji: "🤌", color: "#FFC107" },
    { emoji: "🤏", color: "#FFC107" },
    { emoji: "✌️", color: "#FFC107" },
    { emoji: "🤞", color: "#FFC107" },
    { emoji: "🤟", color: "#FFC107" },
    { emoji: "🤘", color: "#FFC107" },
    { emoji: "🤙", color: "#FFC107" },
    { emoji: "👈", color: "#FFC107" },
    { emoji: "👉", color: "#FFC107" },
    { emoji: "👆", color: "#FFC107" },
    { emoji: "🖕", color: "#FFC107" },
    { emoji: "👇", color: "#FFC107" },
    { emoji: "☝️", color: "#FFC107" },
    // Objects and symbols
    { emoji: "❤️", color: "#E91E63" },
    { emoji: "🧡", color: "#FF9800" },
    { emoji: "💛", color: "#FFC107" },
    { emoji: "💚", color: "#4CAF50" },
    { emoji: "💙", color: "#2196F3" },
    { emoji: "💜", color: "#9C27B0" },
    { emoji: "🖤", color: "#212121" },
    { emoji: "🤍", color: "#FAFAFA" },
    { emoji: "🤎", color: "#795548" },
    { emoji: "💔", color: "#E91E63" },
    { emoji: "❣️", color: "#E91E63" },
    { emoji: "💕", color: "#E91E63" },
    { emoji: "💞", color: "#E91E63" },
    { emoji: "💓", color: "#E91E63" },
    { emoji: "💗", color: "#E91E63" },
    { emoji: "💖", color: "#E91E63" },
    { emoji: "💘", color: "#E91E63" },
    { emoji: "💝", color: "#E91E63" },
    { emoji: "💟", color: "#E91E63" },
    { emoji: "☮️", color: "#4CAF50" },
    { emoji: "✝️", color: "#FFC107" },
    { emoji: "☪️", color: "#4CAF50" },
    { emoji: "🕉️", color: "#FF9800" },
    { emoji: "☸️", color: "#FFC107" },
    { emoji: "✡️", color: "#FFC107" },
    { emoji: "🔯", color: "#9C27B0" },
    { emoji: "🕎", color: "#FF9800" },
    { emoji: "☯️", color: "#000000" },
    { emoji: "☦️", color: "#FFC107" },
    { emoji: "🛐", color: "#4CAF50" },
    { emoji: "⛎", color: "#9C27B0" },
    { emoji: "♈", color: "#FF9800" },
    { emoji: "♉", color: "#4CAF50" },
    { emoji: "♊", color: "#FFC107" },
    { emoji: "♋", color: "#2196F3" },
    { emoji: "♌", color: "#FF9800" },
    { emoji: "♍", color: "#9C27B0" },
    { emoji: "♎", color: "#E91E63" },
    { emoji: "♏", color: "#795548" },
    { emoji: "♐", color: "#4CAF50" },
    { emoji: "♑", color: "#212121" },
    { emoji: "♒", color: "#2196F3" },
    { emoji: "♓", color: "#9C27B0" },
    // Flags and countries
    { emoji: "🏁", color: "#F44336" },
    { emoji: "🚩", color: "#F44336" },
    { emoji: "🎌", color: "#F44336" },
    { emoji: "🏴", color: "#212121" },
    { emoji: "🏳️", color: "#FAFAFA" },
    { emoji: "🏳️‍🌈", color: "#FF9800" },
    { emoji: "🏴‍☠️", color: "#212121" },
    { emoji: "🇦🇫", color: "#4CAF50" },
    { emoji: "🇦🇽", color: "#2196F3" },
    { emoji: "🇦🇱", color: "#E91E63" },
    { emoji: "🇩🇿", color: "#4CAF50" },
    { emoji: "🇦🇸", color: "#2196F3" },
    { emoji: "🇦🇩", color: "#FFC107" },
    { emoji: "🇦🇷", color: "#2196F3" },
    { emoji: "🇦🇲", color: "#F44336" },
    { emoji: "🇦🇼", color: "#FF9800" },
    { emoji: "🇦🇺", color: "#2196F3" },
    { emoji: "🇦🇹", color: "#F44336" },
    { emoji: "🇦🇿", color: "#4CAF50" },
    { emoji: "🇧🇸", color: "#4CAF50" },
    { emoji: "🇧🇭", color: "#F44336" },
    { emoji: "🇧🇩", color: "#4CAF50" },
    { emoji: "🇧🇧", color: "#2196F3" },
    { emoji: "🇧🇾", color: "#F44336" },
    { emoji: "🇧🇪", color: "#FFC107" },
    { emoji: "🇧🇿", color: "#4CAF50" },
    { emoji: "🇧🇯", color: "#4CAF50" },
    { emoji: "🇧🇲", color: "#F44336" },
    { emoji: "🇧🇹", color: "#FF9800" },
    { emoji: "🇧🇴", color: "#4CAF50" },
    { emoji: "🇧🇦", color: "#2196F3" },
    { emoji: "🇧🇼", color: "#4CAF50" },
    { emoji: "🇧🇷", color: "#4CAF50" },
    { emoji: "🇮🇴", color: "#2196F3" },
    { emoji: "🇻🇬", color: "#2196F3" },
    { emoji: "🇧🇳", color: "#F44336" },
    { emoji: "🇧🇬", color: "#4CAF50" },
    { emoji: "🇧🇫", color: "#FF9800" },
    { emoji: "🇧🇮", color: "#F44336" },
    { emoji: "🇰🇭", color: "#F44336" },
    { emoji: "🇨🇲", color: "#4CAF50" },
    { emoji: "🇨🇦", color: "#F44336" },
    { emoji: "🇮🇨", color: "#FFC107" },
    { emoji: "🇨🇻", color: "#4CAF50" },
    { emoji: "🇧🇶", color: "#FFC107" },
    { emoji: "🇰🇾", color: "#FFC107" },
    { emoji: "🇨🇫", color: "#4CAF50" },
    { emoji: "🇹🇩", color: "#F44336" },
    { emoji: "🇨🇱", color: "#F44336" },
    { emoji: "🇨🇳", color: "#F44336" },
    { emoji: "🇨🇽", color: "#FFC107" },
    { emoji: "🇨🇨", color: "#FFC107" },
    { emoji: "🇨🇴", color: "#F44336" },
    { emoji: "🇰🇲", color: "#4CAF50" },
    { emoji: "🇨🇬", color: "#4CAF50" },
    { emoji: "🇨🇩", color: "#4CAF50" },
    { emoji: "🇨🇰", color: "#FFC107" },
    { emoji: "🇨🇷", color: "#F44336" },
    { emoji: "🇨🇮", color: "#FF9800" },
    { emoji: "🇭🇷", color: "#F44336" },
    { emoji: "🇨🇺", color: "#F44336" },
    { emoji: "🇨🇼", color: "#FFC107" },
    { emoji: "🇨🇾", color: "#FFC107" },
    { emoji: "🇨🇿", color: "#F44336" },
    { emoji: "🇩🇰", color: "#F44336" },
    { emoji: "🇩🇯", color: "#4CAF50" },
    { emoji: "🇩🇴", color: "#F44336" },
    { emoji: "🇪🇨", color: "#F44336" },
    { emoji: "🇪🇬", color: "#F44336" },
    { emoji: "🇸🇻", color: "#2196F3" },
    { emoji: "🇬🇶", color: "#4CAF50" },
    { emoji: "🇪🇷", color: "#4CAF50" },
    { emoji: "🇪🇪", color: "#2196F3" },
    { emoji: "🇪🇹", color: "#4CAF50" },
    { emoji: "🇫🇰", color: "#2196F3" },
    { emoji: "🇫🇴", color: "#2196F3" },
    { emoji: "🇫🇯", color: "#4CAF50" },
    { emoji: "🇫🇮", color: "#2196F3" },
    { emoji: "🇫🇷", color: "#2196F3" },
    { emoji: "🇬🇫", color: "#2196F3" },
    { emoji: "🇵🇫", color: "#2196F3" },
    { emoji: "🇹🇫", color: "#2196F3" },
    { emoji: "🇬🇦", color: "#4CAF50" },
    { emoji: "🇬🇲", color: "#4CAF50" },
    { emoji: "🇬🇪", color: "#F44336" },
    { emoji: "🇩🇪", color: "#F44336" },
    { emoji: "🇬🇭", color: "#FF9800" },
    { emoji: "🇬🇮", color: "#2196F3" },
    { emoji: "🇬🇷", color: "#2196F3" },
    { emoji: "🇬🇱", color: "#2196F3" },
    { emoji: "🇬🇩", color: "#4CAF50" },
    { emoji: "🇬🇵", color: "#2196F3" },
    { emoji: "🇬🇺", color: "#2196F3" },
    { emoji: "🇬🇹", color: "#4CAF50" },
    { emoji: "🇬🇬", color: "#2196F3" },
    { emoji: "🇬🇳", color: "#4CAF50" },
    { emoji: "🇬🇼", color: "#4CAF50" },
    { emoji: "🇬🇾", color: "#4CAF50" },
    { emoji: "🇭🇹", color: "#F44336" },
    { emoji: "🇭🇲", color: "#2196F3" },
    { emoji: "🇭🇳", color: "#2196F3" },
    { emoji: "🇭🇰", color: "#F44336" },
    { emoji: "🇭🇺", color: "#F44336" },
    { emoji: "🇮🇸", color: "#2196F3" },
    { emoji: "🇮🇳", color: "#FF9800" },
    { emoji: "🇮🇩", color: "#F44336" },
    { emoji: "🇮🇷", color: "#4CAF50" },
    { emoji: "🇮🇶", color: "#4CAF50" },
    { emoji: "🇮🇪", color: "#4CAF50" },
    { emoji: "🇮🇲", color: "#2196F3" },
    { emoji: "��🇱", color: "#2196F3" },
    { emoji: "🇮🇹", color: "#4CAF50" },
    { emoji: "🇯🇲", color: "#FF9800" },
    { emoji: "🇯🇵", color: "#F44336" },
    { emoji: "🇯🇪", color: "#2196F3" },
    { emoji: "🇯🇴", color: "#4CAF50" },
    { emoji: "🇰🇿", color: "#4CAF50" },
    { emoji: "🇰🇪", color: "#4CAF50" },
    { emoji: "🇰🇮", color: "#FFC107" },
    { emoji: "🇰🇼", color: "#4CAF50" },
    { emoji: "🇰🇬", color: "#F44336" },
    { emoji: "🇱🇦", color: "#F44336" },
    { emoji: "🇱🇻", color: "#F44336" },
    { emoji: "🇱🇧", color: "#F44336" },
    { emoji: "🇱🇸", color: "#4CAF50" },
    { emoji: "🇱🇷", color: "#4CAF50" },
    { emoji: "🇱🇾", color: "#4CAF50" },
    { emoji: "🇱🇮", color: "#F44336" },
    { emoji: "🇱🇹", color: "#F44336" },
    { emoji: "🇱🇺", color: "#2196F3" },
    { emoji: "🇲🇴", color: "#F44336" },
    { emoji: "🇲🇰", color: "#FF9800" },
    { emoji: "🇲🇬", color: "#4CAF50" },
    { emoji: "🇲🇼", color: "#4CAF50" },
    { emoji: "🇲🇾", color: "#F44336" },
    { emoji: "🇲🇻", color: "#4CAF50" },
    { emoji: "🇲🇱", color: "#4CAF50" },
    { emoji: "🇲🇹", color: "#F44336" },
    { emoji: "🇲🇭", color: "#2196F3" },
    { emoji: "🇲🇶", color: "#2196F3" },
    { emoji: "🇲🇷", color: "#4CAF50" },
    { emoji: "🇲🇺", color: "#4CAF50" },
    { emoji: "🇾🇹", color: "#2196F3" },
    { emoji: "🇲🇽", color: "#F44336" },
    { emoji: "🇫🇲", color: "#2196F3" },
    { emoji: "🇲🇩", color: "#F44336" },
    { emoji: "🇲🇩", color: "#F44336" },
    { emoji: "🇲🇨", color: "#2196F3" },
    { emoji: "🇲🇳", color: "#F44336" },
    { emoji: "🇲🇪", color: "#FF9800" },
    { emoji: "🇲🇸", color: "#2196F3" },
    { emoji: "🇲🇦", color: "#4CAF50" },
    { emoji: "🇲🇿", color: "#4CAF50" },
    { emoji: "🇲🇲", color: "#F44336" },
    { emoji: "🇳🇦", color: "#FF9800" },
    { emoji: "🇳🇷", color: "#FFC107" },
    { emoji: "🇳🇵", color: "#F44336" },
    { emoji: "🇳🇱", color: "#FFC107" },
    { emoji: "🇳🇨", color: "#2196F3" },
    { emoji: "🇳🇿", color: "#2196F3" },
    { emoji: "🇳🇮", color: "#2196F3" },
    { emoji: "🇳🇪", color: "#4CAF50" },
    { emoji: "🇳🇬", color: "#4CAF50" },
    { emoji: "🇳🇺", color: "#FFC107" },
    { emoji: "🇳🇫", color: "#2196F3" },
    { emoji: "🇰🇵", color: "#F44336" },
    { emoji: "🇲🇰", color: "#FF9800" },
    { emoji: "🇲🇵", color: "#2196F3" },
    { emoji: "🇳🇴", color: "#F44336" },
    { emoji: "🇴🇲", color: "#4CAF50" },
    { emoji: "🇵🇰", color: "#4CAF50" },
    { emoji: "🇵🇼", color: "#FFC107" },
    { emoji: "🇵🇸", color: "#4CAF50" },
    { emoji: "🇵🇦", color: "#2196F3" },
    { emoji: "🇵🇬", color: "#FFC107" },
    { emoji: "🇵🇾", color: "#F44336" },
    { emoji: "🇵🇪", color: "#F44336" },
    { emoji: "🇵🇭", color: "#F44336" },
    { emoji: "🇵🇳", color: "#FFC107" },
    { emoji: "🇵🇱", color: "#F44336" },
    { emoji: "🇵🇹", color: "#F44336" },
    { emoji: "🇵🇷", color: "#2196F3" },
    { emoji: "🇶🇦", color: "#4CAF50" },
    { emoji: "🇷🇪", color: "#2196F3" },
    { emoji: "🇷🇴", color: "#F44336" },
    { emoji: "🇷🇺", color: "#F44336" },
    { emoji: "🇷🇼", color: "#4CAF50" },
    { emoji: "🇧🇱", color: "#2196F3" },
    { emoji: "🇸🇭", color: "#2196F3" },
    { emoji: "🇰🇳", color: "#2196F3" },
    { emoji: "🇱🇨", color: "#2196F3" },
    { emoji: "🇲🇫", color: "#2196F3" },
    { emoji: "🇵🇲", color: "#2196F3" },
    { emoji: "🇻🇨", color: "#2196F3" },
    { emoji: "🇼🇸", color: "#FFC107" },
    { emoji: "🇸🇲", color: "#2196F3" },
    { emoji: "🇸🇹", color: "#4CAF50" },
    { emoji: "🇸🇦", color: "#4CAF50" },
    { emoji: "🇸🇳", color: "#4CAF50" },
    { emoji: "🇷🇸", color: "#F44336" },
    { emoji: "🇸🇨", color: "#4CAF50" },
    { emoji: "🇸🇱", color: "#4CAF50" },
    { emoji: "🇸🇬", color: "#F44336" },
    { emoji: "🇸🇽", color: "#2196F3" },
    { emoji: "🇸🇰", color: "#F44336" },
    { emoji: "🇸🇮", color: "#F44336" },
    { emoji: "🇸🇧", color: "#4CAF50" },
    { emoji: "🇸🇴", color: "#4CAF50" },
    { emoji: "🇿🇦", color: "#FF9800" },
    { emoji: "🇬🇸", color: "#2196F3" },
    { emoji: "🇰🇷", color: "#F44336" },
    { emoji: "🇸🇸", color: "#F44336" },
    { emoji: "🇪🇸", color: "#F44336" },
    { emoji: "🇱🇰", color: "#FF9800" },
    { emoji: "🇸🇩", color: "#4CAF50" },
    { emoji: "🇸🇷", color: "#4CAF50" },
    { emoji: "🇸🇿", color: "#4CAF50" },
    { emoji: "🇸🇪", color: "#F44336" },
    { emoji: "🇨🇭", color: "#F44336" },
    { emoji: "🇸🇾", color: "#F44336" },
    { emoji: "🇹🇼", color: "#F44336" },
    { emoji: "🇹🇯", color: "#F44336" },
    { emoji: "🇹🇿", color: "#4CAF50" },
    { emoji: "🇹🇭", color: "#F44336" },
    { emoji: "🇹🇱", color: "#F44336" },
    { emoji: "🇹🇬", color: "#4CAF50" },
    { emoji: "🇹🇰", color: "#FFC107" },
    { emoji: "🇹🇴", color: "#F44336" },
    { emoji: "🇹🇹", color: "#4CAF50" },
    { emoji: "🇹🇳", color: "#4CAF50" },
    { emoji: "🇹🇷", color: "#F44336" },
    { emoji: "🇹🇲", color: "#4CAF50" },
    { emoji: "🇹🇨", color: "#2196F3" },
    { emoji: "🇹🇻", color: "#FFC107" },
    { emoji: "🇺🇬", color: "#4CAF50" },
    { emoji: "🇺🇦", color: "#F44336" },
    { emoji: "🇦🇪", color: "#4CAF50" },
    { emoji: "🇬🇧", color: "#2196F3" },
    { emoji: "🇺🇸", color: "#2196F3" },
    { emoji: "🇺🇾", color: "#2196F3" },
    { emoji: "🇺🇿", color: "#4CAF50" },
    { emoji: "🇻🇺", color: "#2196F3" },
    { emoji: "🇻🇪", color: "#F44336" },
    { emoji: "🇻🇳", color: "#F44336" },
    { emoji: "🇻🇬", color: "#2196F3" },
    { emoji: "🇻🇮", color: "#2196F3" },
    { emoji: "🇼🇫", color: "#2196F3" },
    { emoji: "🇪🇭", color: "#4CAF50" },
    { emoji: "🇾🇪", color: "#F44336" },
    { emoji: "🇿🇲", color: "#4CAF50" },
    { emoji: "🇿🇼", color: "#4CAF50" },
  ];

  // Handle saving group edit (both name and avatar)
  const handleSaveGroupEdit = async () => {
    if (!editingGroupId || !currentUser) {
      console.log('Missing editingGroupId or currentUser:', { editingGroupId, currentUser: !!currentUser });
      return;
    }
    
    console.log('Saving group edit:', { editingGroupId, editingGroupName, editingGroupAvatar });
    
    setEditingGroupLoading(true);
    setEditingGroupAvatarLoading(true);
    
    try {
      const updates: any = {};
      
      // Always update name if provided
      if (editingGroupName && editingGroupName.trim()) {
        updates.name = editingGroupName.trim();
      }
      
      // Always update avatar if selected
      if (editingGroupAvatar) {
        updates.avatar_url = editingGroupAvatar;
      }
      
      console.log('Updates to apply:', updates);
      
      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('chat_groups')
          .update(updates)
          .eq('id', editingGroupId);
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        console.log('Group updated successfully');
      } else {
        console.log('No changes to apply');
      }
      
      setShowGroupEditModal(false);
      setEditingGroupId(null);
      setEditingGroupName("");
      setEditingGroupAvatar("");
      fetchConversations();
      
      toast({ 
        title: 'Group Updated', 
        description: 'Group settings have been updated successfully!', 
        variant: 'default' 
      });
    } catch (error: any) {
      console.error('Error saving group edit:', error);
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to update group', 
        variant: 'destructive' 
      });
    } finally {
      setEditingGroupLoading(false);
      setEditingGroupAvatarLoading(false);
    }
  };

  return (
    <div
      ref={chatWidgetRef}
      className="fixed z-50 bottom-20 right-4 sm:bottom-8 sm:right-8"
      style={{ pointerEvents: "auto" }}
    >
      {/* Floating Chat Button */}
      <button
        className="bg-zinc-700 border border-zinc-500 text-white rounded-full shadow-lg p-3 flex items-center justify-center hover:bg-zinc-800 transition-all focus:outline-none focus:ring-2 focus:ring-primary relative"
        aria-label="Open chat"
        style={{ width: 52, height: 52 }}
        onClick={handleOpen}
      >
        <MessageSquare className="w-7 h-7" />
        {/* Notification Badge */}
        {(totalUnreadCount > 0 || pendingInvitations.length > 0) && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 font-semibold shadow-lg">
            {totalUnreadCount + pendingInvitations.length > 99 ? '99+' : totalUnreadCount + pendingInvitations.length}
          </span>
        )}
      </button>

      {/* Chat Drawer */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 sm:bg-transparent sm:relative sm:inset-auto sm:z-auto">
          <div className="absolute bottom-0 right-0 w-full h-full sm:w-96 sm:h-[600px] sm:bottom-auto sm:right-auto bg-white dark:bg-gray-900 rounded-t-lg sm:rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            {/* Mobile close button overlay */}
            <div className="absolute top-4 right-4 sm:hidden z-10">
              <button
                onClick={handleClose}
                className="w-8 h-8 bg-gray-800/80 text-white rounded-full flex items-center justify-center backdrop-blur-sm"
              >
                ×
              </button>
            </div>
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white shadow-lg">
            {activeConversation ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button className="text-gray-300 hover:text-white transition-colors" onClick={() => setActiveConversation(null)}>
                  &larr; <span className="sr-only">Back</span>
                </button>
                {/* Avatar for chats - group avatar for group chats, other user avatar for direct chats */}
                {!activeConversation.is_direct && activeConversation.avatar_url ? (
                  <Avatar className="h-8 w-8 border-2 border-background bg-blue-500">
                    <AvatarFallback>
                      <span className="text-lg">{activeConversation.avatar_url}</span>
                    </AvatarFallback>
                  </Avatar>
                ) : activeConversation.is_direct && (
                  (() => {
                    const other = activeConversation.members.find((m: any) => m.profile && m.profile.id !== currentUser?.id);
                    return (
                      <Avatar className="h-8 w-8 border-2 border-background">
                        <AvatarImage src={other?.profile?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                          {other?.profile?.username?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })()
                )}
                <span className="text-lg font-semibold truncate">
                  {activeConversation.name}
                </span>
                {/* Invite button for direct chats with 2+ users or group chats */}
                {(activeConversation.is_direct && activeConversation.members.length >= 2) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="ml-2 p-1 text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => setShowInviteToChatModal(true)}
                          aria-label="Add users to chat"
                        >
                          <UsersIcon className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="z-50 bg-background text-foreground border shadow">Add Users</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {/* Invite button for group chats */}
                {!activeConversation.is_direct && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="ml-2 p-1 text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => setShowInviteModal(true)}
                          aria-label="Invite users"
                        >
                          <UsersIcon className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="z-50 bg-background text-foreground border shadow">Invite Users</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-white">Messenger</span>
                {/* Invitation notifications */}
                {pendingInvitations.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="relative p-1 text-gray-300 hover:text-white transition-colors"
                          onClick={() => setShowInvitationsModal(true)}
                          aria-label="View invitations"
                        >
                          <UsersIcon className="w-4 h-4" />
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                            {pendingInvitations.length}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="z-50 bg-background text-foreground border shadow">
                        {pendingInvitations.length} pending invitation(s)
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={handleClose} className="text-gray-300 hover:text-white hover:bg-white/10">
              <span className="sr-only">Close</span>
              &times;
            </Button>
          </div>
          {/* Group members section - only for group chats or direct chats with 3+ users */}
          {activeConversation && ((!activeConversation.is_direct) || (activeConversation.is_direct && activeConversation.members.length > 2)) && (
            <div className="px-4 py-2 border-b bg-muted/30">
              <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                {activeConversation.members.map((member: any) => (
                  <TooltipProvider key={member.profile.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-shrink-0">
                          <Avatar className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={member.profile.avatar_url} />
                            <AvatarFallback>{member.profile.username.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="z-50 bg-background text-foreground border shadow">
                        {member.profile.username}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          )}
          {/* Friends Section - only show when not in a conversation */}
          {!activeConversation && friends.length > 0 && (
            <div className="px-4 pt-3 pb-2 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg mx-2 mb-2">
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Friends</div>
              <div className="flex items-center gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                {friends.map((friend) => (
                  <TooltipProvider key={friend.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="flex flex-col items-center gap-1 focus:outline-none hover:opacity-80 transition-opacity"
                          onClick={() => handleFriendClick(friend)}
                          aria-label={`Chat with ${friend.username}`}
                        >
                          <Avatar className="h-10 w-10 border-2 border-blue-200 dark:border-blue-800">
                            <AvatarImage src={friend.avatar_url} />
                            <AvatarFallback>{friend.username?.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-blue-700 dark:text-blue-300 font-medium truncate max-w-[60px] text-center">
                            {friend.username}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="z-[99999] bg-background text-foreground border shadow">
                        Chat with {friend.username}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          )}
          {/* Create Group button - only show when not in a conversation */}
          {!activeConversation && (
            <div className="px-4 pt-3 pb-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="flex items-center gap-1 px-3 py-1 border border-primary text-primary rounded-md bg-background hover:bg-primary/10 transition text-xs shadow-sm"
                      onClick={() => setShowGroupModal(true)}
                      aria-label="Create Group"
                    >
                      <UsersIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Create Group</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="z-50 bg-background text-foreground border shadow">Create Group</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          {/* Main content area with collapsible sections */}
          {!activeConversation && (
            <TooltipProvider>
              <div className="flex-1 divide-y divide-border overflow-y-auto overflow-x-visible" style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'visible' }}>
                {/* Pinned chats at top, with label and bg-yellow-50 */}
                {pinned.length > 0 && (
                  <>
                    <div className="px-4 py-1 text-xs font-bold text-yellow-700">Pinned</div>
                    <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: 'thin', overflow: 'visible' }}>
                      {pinned.map(convo => {
                        let avatarUrl = undefined;
                        let fallback = '';
                        if (convo.is_direct) {
                          // Find the other participant
                          const other = convo.members.find(m => m.profile && m.profile.id !== currentUser.id);
                          avatarUrl = other?.profile?.avatar_url;
                          fallback = other?.profile?.username?.charAt(0).toUpperCase() || '?';
                        } else {
                          // For group chats, use group avatar if available, else fallback
                          avatarUrl = convo.avatar_url || undefined;
                          fallback = convo.avatar_url || convo.name?.charAt(0).toUpperCase() || 'G';
                        }
                        return (
                          <div key={convo.group_id} className="relative" style={{ overflow: 'visible' }}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className="focus:outline-none"
                                    onClick={() => setActiveConversation(convo)}
                                    aria-label={convo.name}
                                  >
                                    <Avatar className="h-9 w-9 border-2 border-orange-400">
                                      <AvatarImage src={avatarUrl} />
                                      <AvatarFallback>
                                        {!convo.is_direct && convo.avatar_url ? (
                                          <span className="text-lg">{convo.avatar_url}</span>
                                        ) : (
                                          fallback
                                        )}
                                      </AvatarFallback>
                                    </Avatar>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="z-[99999] bg-background text-foreground border shadow">{convo.name}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {/* Three dots menu for pinned chats */}
                            <button
                              data-pinned-menu
                              className="absolute -bottom-2 -right-2 w-4 h-4 text-zinc-600 hover:text-zinc-800 transition-colors z-10"
                              style={{ zIndex: 10 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (pinnedMenuId === convo.group_id) {
                                  setPinnedMenuId(null);
                                } else {
                                  setPinnedMenuId(convo.group_id);
                                }
                              }}
                              aria-label="More options"
                            >
                              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                                <circle cx="5" cy="12" r="2" fill="currentColor"/>
                                <circle cx="12" cy="12" r="2" fill="currentColor"/>
                                <circle cx="19" cy="12" r="2" fill="currentColor"/>
                              </svg>
                            </button>
                            
                            {/* Menu dropdown */}
                            {pinnedMenuId === convo.group_id && (
                              <div data-pinned-menu className="absolute bottom-full right-0 mb-2 bg-background border rounded shadow-lg z-[99999] p-1 flex gap-1" style={{ zIndex: 99999, overflow: 'visible' }}>
                                {/* Unpin */}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button 
                                        data-pinned-menu
                                        className="text-yellow-600 hover:bg-yellow-100 rounded p-1 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePin(convo.group_id, false);
                                          setPinnedMenuId(null);
                                        }}
                                      >
                                        <PinIcon className="w-4 h-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="z-[999999] bg-background text-foreground border shadow" side="top">Unpin</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                {/* Mute/Unmute */}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button 
                                        data-pinned-menu
                                        className="text-zinc-500 hover:bg-zinc-100 rounded p-1 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (convo.is_muted) {
                                            handleMute(convo.group_id, false);
                                          } else {
                                            handleMute(convo.group_id, true);
                                          }
                                          setPinnedMenuId(null);
                                        }}
                                      >
                                        {convo.is_muted ? (
                                          <Volume2Icon className="w-4 h-4" />
                                        ) : (
                                          <VolumeXIcon className="w-4 h-4" />
                                        )}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="z-[999999] bg-background text-foreground border shadow" side="top">
                                      {convo.is_muted ? 'Unmute' : 'Mute'}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                {/* Delete/Leave/Group Delete - use confirmation dialog */}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button 
                                        data-pinned-menu
                                        className="text-red-600 hover:bg-red-100 rounded p-1 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPinnedMenuId(null);
                                          if (convo.is_direct) {
                                            setPendingAction({ type: 'delete', groupId: convo.group_id, conversationName: convo.name, isDirect: true });
                                            setShowDeleteConfirm(true);
                                          } else if (currentUser.id === convo.creator_id) {
                                            setPendingAction({ type: 'deleteGroup', groupId: convo.group_id, conversationName: convo.name, isDirect: false });
                                            setShowDeleteGroupConfirm(true);
                                          } else {
                                            setPendingAction({ type: 'leave', groupId: convo.group_id, conversationName: convo.name, isDirect: false });
                                            setShowLeaveConfirm(true);
                                          }
                                        }}
                                      >
                                        <Trash2Icon className="w-4 h-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="z-[999999] bg-background text-foreground border shadow" side="top">
                                      {convo.is_direct ? 'Delete' : currentUser.id === convo.creator_id ? 'Delete Group' : 'Leave Group'}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Knight Rider style separator */}
                    <div className="relative my-2 mx-2 h-1">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full rounded-full bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-md animate-knight-rider" style={{ height: '1.25px' }} />
                      </div>
                    </div>
                  </>
                )}
                {/* Direct chats */}
                {direct.length > 0 && pinned.length > 0 && <div className="h-2" />}
                {direct.length > 0 && <div className="px-4 py-1 text-xs text-muted-foreground font-semibold">Chats</div>}
                {direct.map(convo => (
                  <ChatListItem
                    key={convo.group_id}
                    conversation={convo}
                    onClick={() => setActiveConversation(convo)}
                    onPin={() => handlePin(convo.group_id, true)}
                    onUnpin={() => handlePin(convo.group_id, false)}
                    onMute={() => handleMute(convo.group_id, true)}
                    onUnmute={() => handleMute(convo.group_id, false)}
                    onDelete={() => handleDelete(convo.group_id)}
                    onLeave={() => handleLeave(convo.group_id)}
                    isMobile={isMobileDevice()}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    currentUserId={currentUser.id}
                    publicUsers={publicUsers}
                    creatorId={convo.creator_id}
                    onEditName={handleEditGroupName}
                    onDeleteGroup={handleDeleteGroup}
                    editingGroupId={editingGroupId}
                    editingGroupName={editingGroupName}
                    setEditingGroupId={setEditingGroupId}
                    setEditingGroupName={setEditingGroupName}
                    editingGroupLoading={editingGroupLoading}
                    onSaveEditName={handleSaveEditName}
                    setShowDeleteConfirm={setShowDeleteConfirm}
                    setShowLeaveConfirm={setShowLeaveConfirm}
                    setShowDeleteGroupConfirm={setShowDeleteGroupConfirm}
                    setPendingAction={setPendingAction}
                    setEditingGroupAvatar={setEditingGroupAvatar}
                    setShowGroupEditModal={setShowGroupEditModal}
                  />
                ))}
                {/* Separator for group chats */}
                {group.length > 0 && <div className="px-4 py-1 text-xs text-muted-foreground font-semibold">Group Chats</div>}
                {group.map(convo => (
                  <ChatListItem
                    key={convo.group_id}
                    conversation={convo}
                    onClick={() => setActiveConversation(convo)}
                    onPin={() => handlePin(convo.group_id, true)}
                    onUnpin={() => handlePin(convo.group_id, false)}
                    onMute={() => handleMute(convo.group_id, true)}
                    onUnmute={() => handleMute(convo.group_id, false)}
                    onDelete={() => handleDelete(convo.group_id)}
                    onLeave={() => handleLeave(convo.group_id)}
                    isMobile={isMobileDevice()}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    currentUserId={currentUser.id}
                    publicUsers={publicUsers}
                    creatorId={convo.creator_id}
                    onEditName={handleEditGroupName}
                    onDeleteGroup={handleDeleteGroup}
                    editingGroupId={editingGroupId}
                    editingGroupName={editingGroupName}
                    setEditingGroupId={setEditingGroupId}
                    setEditingGroupName={setEditingGroupName}
                    editingGroupLoading={editingGroupLoading}
                    onSaveEditName={handleSaveEditName}
                    setShowDeleteConfirm={setShowDeleteConfirm}
                    setShowLeaveConfirm={setShowLeaveConfirm}
                    setShowDeleteGroupConfirm={setShowDeleteGroupConfirm}
                    setPendingAction={setPendingAction}
                    setEditingGroupAvatar={setEditingGroupAvatar}
                    setShowGroupEditModal={setShowGroupEditModal}
                  />
                ))}

                {/* Public Users Section */}
                <div>
                  <button
                    className="w-full flex items-center justify-between px-4 py-2 text-left font-semibold hover:bg-muted transition"
                    onClick={() => setPublicOpen(o => !o)}
                  >
                    <span>Public Users</span>
                    {publicOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {publicOpen && (
                    <div className="px-2 pb-2">
                      <div className="flex items-center mb-2">
                        <SearchIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Input
                          className="flex-1"
                          placeholder="Search users..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {publicUsers.length === 0 ? (
                          <div className="text-muted-foreground text-center py-4">No users found.</div>
                        ) : (
                          publicUsers
                            .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center p-2 rounded-lg hover:bg-muted cursor-pointer"
                              onClick={async () => {
                                // Check if a direct chat already exists between these users
                                const existingConversation = conversations.find(conv => 
                                  conv.is_direct && 
                                  conv.members.some(m => m.profile.id === user.id) &&
                                  conv.members.some(m => m.profile.id === currentUser.id)
                                );
                                
                                if (existingConversation) {
                                  // If direct chat exists, just open it
                                  setActiveConversation(existingConversation);
                                  return;
                                }
                                
                                // Set temporary conversation for immediate UI feedback
                                // This will only be created in the database when the first message is sent
                                const tempConversation = {
                                  group_id: `temp_${user.id}`,
                                  name: user.username,
                                  is_direct: true,
                                  members: [
                                    { profile: currentUser },
                                    { profile: user }
                                  ],
                                  last_message: "No messages yet...",
                                  last_message_at: new Date().toISOString(),
                                  unread_count: 0,
                                  is_pinned: false,
                                  is_muted: false,
                                  creator_id: currentUser.id,
                                };
                                
                                setTempConversation(tempConversation);
                                setActiveConversation(tempConversation);
                              }}
                            >
                              <Avatar className="h-8 w-8 mr-2">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 overflow-hidden">
                                <p className="font-semibold truncate">{user.username}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TooltipProvider>
          )}

          {/* Messages Section */}
          {activeConversation && (
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 text-xs">
              {(() => {
                const allMessages = [...messages, ...optimisticMessages];
                if (allMessages.length === 0) {
                  return <div className="text-muted-foreground text-center py-4">No messages yet.</div>;
                }
                // Group messages by day and consecutive sender
                let lastDate: string | null = null;
                let lastSender: string | null = null;
                let groupKey = 0;
                const groups: any[] = [];
                let currentGroup: any = null;
                allMessages.forEach((msg, idx) => {
                  const msgDate = new Date(msg.created_at).toDateString();
                  const senderChanged = lastSender !== msg.sender_id;
                  const dateChanged = lastDate !== msgDate;
                  if (dateChanged || senderChanged) {
                    if (currentGroup) groups.push(currentGroup);
                    currentGroup = {
                      sender_id: msg.sender_id,
                      username: msg.profiles?.username || "Unknown",
                      avatarUrl: msg.profiles?.avatar_url || "/default-avatar.png",
                      isOwn: msg.sender_id === currentUser.id,
                      date: msgDate,
                      messages: [],
                      groupKey: groupKey++,
                      showDate: dateChanged,
                      dateString: msgDate,
                    };
                  }
                  currentGroup.messages.push(msg);
                  lastSender = msg.sender_id;
                  lastDate = msgDate;
                });
                if (currentGroup) groups.push(currentGroup);

                return groups.map((group, groupIdx) => (
                  <React.Fragment key={group.groupKey}>
                    {group.showDate && (
                      <div className="w-full flex justify-center my-3">
                        <span className="text-xs text-white font-semibold bg-transparent px-2 rounded select-none">
                          {group.dateString}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${group.isOwn ? 'justify-end' : 'justify-start'} items-start gap-2 mb-4`}> 
                      {!group.isOwn && (
                        <div className="flex flex-col items-center mr-1">
                          <img
                            src={group.avatarUrl}
                            alt={group.username}
                            className="w-7 h-7 rounded-full object-cover border mb-1"
                          />
                          <span className="text-[11px] text-gray-400 font-medium mt-0.5 mb-1 text-center">
                            {group.username}
                          </span>
                        </div>
                      )}
                      <div className={`flex flex-col gap-1 ${group.isOwn ? 'items-end' : 'items-start'} w-full`}>
                        {group.messages.map((message: any, idx: number) => {
                          const isDragging = draggedId === message.id;
                          // Drag handlers
                          const dragHandlers = {
                            onMouseDown: (e: React.MouseEvent) => handleDragStart(e, message.id),
                            onMouseMove: (e: React.MouseEvent) => handleDragMove(e),
                            onMouseUp: () => handleDragEnd(message.id),
                            onMouseLeave: () => handleDragEnd(message.id),
                            onTouchStart: (e: React.TouchEvent) => handleDragStart(e, message.id),
                            onTouchMove: (e: React.TouchEvent) => handleDragMove(e),
                            onTouchEnd: () => handleDragEnd(message.id),
                          };
                          // Calculate slide offset
                          let offset = 0;
                          if (isDragging) {
                            offset = dragOffset;
                          }
                          return (
                            <div
                              key={message.id}
                              className={`relative group rounded-2xl px-3 py-1.5 text-sm break-words max-w-[70%] ${
                                group.isOwn
                                  ? 'bg-blue-50 text-blue-900 dark:bg-blue-900 dark:text-white ml-auto'
                                  : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 mr-auto'
                              } shadow-none select-none`}
                              style={{
                                marginBottom: idx === group.messages.length - 1 ? 0 : 2,
                                transform: offset ? `translateX(-${offset}px)` : undefined,
                                userSelect: isDragging ? 'none' : 'auto',
                                cursor: 'default',
                                transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                              }}
                              {...dragHandlers}
                            >
                              {message.content}
                              {/* Timestamp reveal, only during drag and offset > 10px */}
                              <span
                                className={`absolute left-full top-1/2 -translate-y-1/2 ml-2 text-xs text-gray-400 bg-transparent px-2 py-1 rounded transition-opacity duration-200 ${
                                  (isDragging && offset > 10) ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                }`}
                                style={{ minWidth: 80 }}
                              >
                                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </React.Fragment>
                ));
              })()}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Message Input - Conditionally rendered */}
          {activeConversation && (
            <div className="flex items-center p-4 border-t">
              <Input
                placeholder="Type your message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!messageInput.trim()} 
                className="ml-2 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white p-2 h-10 w-10 rounded-xl shadow-lg border border-purple-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:border-white/20 focus:ring-2 focus:ring-purple-500"
                size="icon"
              >
                <ArrowUpRight className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Group Creation Modal */}
      <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
        <DialogContent className="sm:max-w-[400px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-purple-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Create Group Chat</DialogTitle>
            <DialogDescription className="text-gray-300">Enter a group name and select users to invite.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Group Name"
              value={groupName}
              onChange={handleGroupNameChange}
              maxLength={20}
              disabled={creatingGroup}
              className="bg-slate-800 border-purple-700 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{groupName.length}/20</span>
              {groupNameError && <span className="text-red-400">{groupNameError}</span>}
            </div>
            <div>
              <div className="mb-1 font-medium text-sm text-white">Invite Users</div>
              <div className="max-h-40 overflow-y-auto border border-purple-700 rounded p-2 bg-slate-800">
                {publicUsers.length === 0 ? (
                  <div className="text-gray-400 text-center py-2">No users found.</div>
                ) : (
                  publicUsers.map(user => (
                    <label key={user.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-700 rounded px-1">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedUserIds(ids => [...ids, user.id]);
                          } else {
                            setSelectedUserIds(ids => ids.filter(id => id !== user.id));
                          }
                        }}
                        disabled={creatingGroup}
                        className="text-purple-500 focus:ring-purple-500"
                      />
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-gray-200">{user.username}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <Button 
              onClick={handleCreateGroup} 
              disabled={creatingGroup || !groupName.trim() || groupName.length > 20} 
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0"
            >
              {creatingGroup ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Users Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-[400px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-purple-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Invite Users to Group</DialogTitle>
            <DialogDescription className="text-gray-300">Select users to invite to "{activeConversation?.name}".</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="mb-1 font-medium text-sm text-white">Select Users to Invite</div>
              <div className="max-h-40 overflow-y-auto border border-purple-700 rounded p-2 bg-slate-800">
                {publicUsers.length === 0 ? (
                  <div className="text-gray-400 text-center py-2">No users found.</div>
                ) : (
                  publicUsers
                    .filter(user => 
                      !activeConversation?.members.some((member: any) => member.profile.id === user.id) &&
                      !pendingInvitations.some(inv => inv.invitee_id === user.id && inv.group_id === activeConversation?.group_id)
                    )
                    .map(user => (
                      <label key={user.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-700 rounded px-1">
                        <input
                          type="checkbox"
                          checked={inviteSelectedUserIds.includes(user.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setInviteSelectedUserIds(ids => [...ids, user.id]);
                            } else {
                              setInviteSelectedUserIds(ids => ids.filter(id => id !== user.id));
                            }
                          }}
                          disabled={invitingUsers}
                          className="text-purple-500 focus:ring-purple-500"
                        />
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                            {user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-gray-200">{user.username}</span>
                      </label>
                    ))
                )}
              </div>
            </div>
            <Button 
              onClick={handleInviteUsers} 
              disabled={invitingUsers || inviteSelectedUserIds.length === 0} 
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0"
            >
              {invitingUsers ? 'Inviting...' : `Invite ${inviteSelectedUserIds.length} User(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Invitations Modal */}
      <Dialog open={showInvitationsModal} onOpenChange={setShowInvitationsModal}>
        <DialogContent className="sm:max-w-[400px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-purple-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Group Invitations</DialogTitle>
            <DialogDescription className="text-gray-300">You have {pendingInvitations.length} pending invitation(s).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {pendingInvitations.length === 0 ? (
              <div className="text-gray-400 text-center py-4">No pending invitations.</div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-3 border border-purple-700 rounded-lg bg-slate-800">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={invitation.profiles?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                          {invitation.profiles?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm text-white">{invitation.profiles?.username}</p>
                        <p className="text-xs text-gray-400">
                          invited you to "{invitation.chat_groups?.name}"
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcceptInvitation(invitation.id, invitation.group_id)}
                        className="text-xs px-2 py-1 border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineInvitation(invitation.id)}
                        className="text-xs px-2 py-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Chat Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-purple-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Chat</DialogTitle>
            <DialogDescription className="text-gray-300">
              {pendingAction?.isDirect 
                ? `Are you sure you want to delete your conversation with "${pendingAction?.conversationName}"? This action cannot be undone.`
                : `Are you sure you want to delete "${pendingAction?.conversationName}"? This action cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setShowDeleteConfirm(false); setPendingAction(null); }}
              className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={executeDelete}
              className="bg-red-600 hover:bg-red-700 border-0"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Group Confirmation Modal */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent className="sm:max-w-[400px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-purple-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Leave Group</DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to leave "{pendingAction?.conversationName}"? You will no longer be able to see messages from this group.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setShowLeaveConfirm(false); setPendingAction(null); }}
              className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={executeLeave}
              className="bg-red-600 hover:bg-red-700 border-0"
            >
              Leave Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation Modal */}
      <Dialog open={showDeleteGroupConfirm} onOpenChange={setShowDeleteGroupConfirm}>
        <DialogContent className="sm:max-w-[400px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-purple-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Group</DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to delete "{pendingAction?.conversationName}"? This will permanently delete the group and all its messages. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setShowDeleteGroupConfirm(false); setPendingAction(null); }}
              className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={executeDeleteGroup}
              className="bg-red-600 hover:bg-red-700 border-0"
            >
              Delete Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Users to Direct Chat Modal */}
      <Dialog open={showInviteToChatModal} onOpenChange={setShowInviteToChatModal}>
        <DialogContent className="sm:max-w-[400px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-purple-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Add Users to Chat</DialogTitle>
            <DialogDescription className="text-gray-300">Select users to add to this conversation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="mb-1 font-medium text-sm text-white">Select Users to Add</div>
              <div className="max-h-40 overflow-y-auto border border-purple-700 rounded p-2 bg-slate-800">
                {getFilteredUsersForInvite().length === 0 ? (
                  <div className="text-gray-400 text-center py-2">No users found.</div>
                ) : (
                  getFilteredUsersForInvite().map(user => (
                    <label key={user.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-700 rounded px-1">
                      <input
                        type="checkbox"
                        checked={inviteToChatSelectedUserIds.includes(user.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setInviteToChatSelectedUserIds(ids => [...ids, user.id]);
                          } else {
                            setInviteToChatSelectedUserIds(ids => ids.filter(id => id !== user.id));
                          }
                        }}
                        disabled={invitingToChat}
                        className="text-purple-500 focus:ring-purple-500"
                      />
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-gray-200">{user.username}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <Button 
              onClick={handleInviteToChat} 
              disabled={invitingToChat || inviteToChatSelectedUserIds.length === 0} 
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0"
            >
              {invitingToChat ? 'Adding...' : `Add ${inviteToChatSelectedUserIds.length} User(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Edit Modal */}
      <Dialog open={showGroupEditModal} onOpenChange={setShowGroupEditModal}>
        <DialogContent className="sm:max-w-[400px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-purple-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Group</DialogTitle>
            <DialogDescription className="text-gray-300">Update the group name and avatar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Group Name */}
            <div>
              <label className="text-sm font-medium mb-2 block text-white">Group Name</label>
              <Input
                placeholder="Enter group name"
                value={editingGroupName}
                onChange={e => setEditingGroupName(e.target.value)}
                maxLength={20}
                disabled={editingGroupLoading}
                className="bg-slate-800 border-purple-700 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{editingGroupName.length}/20</span>
              </div>
            </div>
            
            {/* Group Avatar */}
            <div>
              <label className="text-sm font-medium mb-2 block text-white">Group Avatar</label>
              <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto border border-purple-700 rounded p-2 bg-slate-800">
                {groupAvatarOptions.map((option, index) => (
                  <button
                    key={index}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                      editingGroupAvatar === option.emoji 
                        ? 'border-purple-400 scale-110 shadow-lg' 
                        : 'border-purple-600 hover:border-purple-400'
                    }`}
                    onClick={() => setEditingGroupAvatar(option.emoji)}
                    disabled={editingGroupLoading}
                    style={{ backgroundColor: option.color }}
                  >
                    {option.emoji}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowGroupEditModal(false);
                  setEditingGroupId(null);
                  setEditingGroupName("");
                  setEditingGroupAvatar("");
                }}
                disabled={editingGroupLoading}
                className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  console.log('Save Changes clicked!');
                  console.log('Current state:', { 
                    editingGroupId, 
                    editingGroupName, 
                    editingGroupAvatar, 
                    editingGroupLoading 
                  });
                  handleSaveGroupEdit();
                }}
                disabled={editingGroupLoading || !editingGroupName.trim() || editingGroupName.length > 20}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0"
              >
                {editingGroupLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatWidget; 