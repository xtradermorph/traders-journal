import { create } from 'zustand';

interface ChatState {
  isChatOpen: boolean;
  activeConversation: any | null; // Using any for now to fix the build
  openChat: (isOpen: boolean) => void;
  setActiveConversation: (conversation: any | null) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isChatOpen: false,
  activeConversation: null,
  openChat: (isOpen) => set({ isChatOpen: isOpen }),
  setActiveConversation: (conversation) => set({ activeConversation: conversation }),
  resetChat: () => set({ isChatOpen: false, activeConversation: null }),
})); 