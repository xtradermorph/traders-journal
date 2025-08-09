import { create } from 'zustand';

interface ChatState {
  isChatOpen: boolean;
  activeConversation: any | null; // Using any for now to fix the build
  openChat: (isOpen: boolean) => void;
  setActiveConversation: (conversation: any | null) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  isChatOpen: false,
  activeConversation: null,
  openChat: (isOpen) => set({ isChatOpen: isOpen }),
  setActiveConversation: (conversation) => {
    // If conversation is null, just set it
    if (!conversation) {
      set({ activeConversation: null });
      return;
    }
    
    // For now, just set the conversation directly
    // The ChatWidget will handle checking for existing conversations
    set({ activeConversation: conversation });
  },
  resetChat: () => set({ isChatOpen: false, activeConversation: null }),
})); 