import { create } from 'zustand';

interface ChatState {
  isChatOpen: boolean;
  activeConversation: any; // Using 'any' for now, will be replaced with a proper type
  openChat: (isOpen: boolean) => void;
  setActiveConversation: (conversation: any) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isChatOpen: false,
  activeConversation: null,
  openChat: (isOpen) => set({ isChatOpen: isOpen }),
  setActiveConversation: (conversation) => set({ activeConversation: conversation }),
  resetChat: () => set({ isChatOpen: false, activeConversation: null }),
})); 