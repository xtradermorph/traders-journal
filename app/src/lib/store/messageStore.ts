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
  
  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, isRead: boolean) => void;
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
  resetMessages: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  
  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => {
    const { messages, conversations } = get();
    set({ 
      messages: [...messages, message],
      conversations: conversations.map(conv => {
        if (conv.id === message.sender_id || conv.id === message.receiver_id) {
          return { ...conv, last_message: message, updated_at: message.created_at };
        }
        return conv;
      })
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
  setLoading: (loading) => set({ isLoading: loading }),
  setSending: (sending) => set({ isSending: sending }),
  resetMessages: () => set({ 
    conversations: [], 
    currentConversation: null, 
    messages: [], 
    isLoading: false, 
    isSending: false 
  }),
}));
