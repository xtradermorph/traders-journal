import { create } from 'zustand';

interface ChatState {
  isChatOpen: boolean;
  activeConversation: Record<string, unknown> | null; // Using Record for now, will be replaced with a proper type
  openChat: (isOpen: boolean) => void;
  setActiveConversation: (conversation: Record<string, unknown> | null) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isChatOpen: false,
  activeConversation: null,
  openChat: (isOpen) => set({ isChatOpen: isOpen }),
  setActiveConversation: (conversation) => set({ activeConversation: conversation }),
  resetChat: () => set({ isChatOpen: false, activeConversation: null }),
})); 