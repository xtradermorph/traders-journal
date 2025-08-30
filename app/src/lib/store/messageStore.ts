import { create } from 'zustand';

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

interface MessageState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  totalUnreadCount: number;
  hasUnreadMessages: boolean;
  
  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, isRead: boolean) => void;
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
  resetMessages: () => void;
  updateUnreadCount: (count: number) => void;
  markConversationAsRead: (conversationId: string) => void;
  refreshUnreadCount: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  totalUnreadCount: 0,
  hasUnreadMessages: false,
  
  setConversations: (conversations) => {
    const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);
    set({ 
      conversations,
      totalUnreadCount: totalUnread,
      hasUnreadMessages: totalUnread > 0
    });
  },
  
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => {
    const { messages, conversations } = get();
    const newMessages = [...messages, message];
    
    // Update conversations with new message
    const updatedConversations = conversations.map(conv => {
      if (conv.id === message.sender_id || conv.id === message.receiver_id) {
        const isIncomingMessage = message.receiver_id === conv.user_id;
        const newUnreadCount = isIncomingMessage ? conv.unread_count + 1 : conv.unread_count;
        
        return { 
          ...conv, 
          last_message: message, 
          updated_at: message.created_at,
          unread_count: newUnreadCount
        };
      }
      return conv;
    });
    
    const totalUnread = updatedConversations.reduce((sum, conv) => sum + conv.unread_count, 0);
    
    set({ 
      messages: newMessages,
      conversations: updatedConversations,
      totalUnreadCount: totalUnread,
      hasUnreadMessages: totalUnread > 0
    });
  },
  
  updateMessageStatus: (messageId, isRead) => {
    const { messages } = get();
    set({
      messages: messages.map(msg => 
        msg.id === messageId ? { ...msg, is_read: isRead } : msg
      )
    });
  },
  
  markConversationAsRead: (conversationId) => {
    const { conversations } = get();
    const updatedConversations = conversations.map(conv => {
      if (conv.id === conversationId) {
        return { ...conv, unread_count: 0 };
      }
      return conv;
    });
    
    const totalUnread = updatedConversations.reduce((sum, conv) => sum + conv.unread_count, 0);
    
    set({ 
      conversations: updatedConversations,
      totalUnreadCount: totalUnread,
      hasUnreadMessages: totalUnread > 0
    });
  },
  
  updateUnreadCount: (count) => {
    set({ 
      totalUnreadCount: count,
      hasUnreadMessages: count > 0
    });
  },
  
  refreshUnreadCount: async () => {
    try {
      const response = await fetch('/api/messages?action=unread-count');
      if (response.ok) {
        const data = await response.json();
        set({ 
          totalUnreadCount: data.unreadCount,
          hasUnreadMessages: data.unreadCount > 0
        });
      }
    } catch (error) {
      console.error('Error refreshing unread count:', error);
    }
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  setSending: (sending) => set({ isSending: sending }),
  
  resetMessages: () => set({ 
    conversations: [], 
    currentConversation: null, 
    messages: [], 
    isLoading: false, 
    isSending: false,
    totalUnreadCount: 0,
    hasUnreadMessages: false
  }),
}));
