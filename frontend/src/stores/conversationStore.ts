import { create } from 'zustand';
import { conversationsApi } from '../api';
import { toast } from './toastStore';
import type { ConversationSummary } from '../types';

interface ConversationState {
  conversations: ConversationSummary[];
  loading: boolean;
  activeId: number | null;
  newChatKey: number;
  load: () => Promise<void>;
  setActive: (id: number | null) => void;
  startNewChat: () => void;
  upsert: (conversation: Partial<ConversationSummary> & { id: number }) => void;
  rename: (id: number, title: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  loading: false,
  activeId: null,
  newChatKey: 0,

  load: async () => {
    set({ loading: true });
    try {
      const conversations = await conversationsApi.list();
      set({ conversations, loading: false });
    } catch (error) {
      set({ loading: false });
      toast(error instanceof Error ? error.message : '会话列表加载失败', 'error');
    }
  },

  setActive: (activeId) => set({ activeId }),

  startNewChat: () => set((state) => ({ activeId: null, newChatKey: state.newChatKey + 1 })),

  upsert: (conversation) =>
    set((state) => {
      const existing = state.conversations.find((item) => item.id === conversation.id);
      if (!existing) {
        return { conversations: [conversation as ConversationSummary, ...state.conversations] };
      }
      const merged = { ...existing, ...conversation };
      return {
        conversations: [
          merged,
          ...state.conversations.filter((item) => item.id !== conversation.id),
        ],
      };
    }),

  rename: async (id, title) => {
    const updated = await conversationsApi.rename(id, title);
    get().upsert(updated);
    toast('会话已重命名', 'success');
  },

  remove: async (id) => {
    await conversationsApi.remove(id);
    set((state) => ({
      conversations: state.conversations.filter((item) => item.id !== id),
      activeId: state.activeId === id ? null : state.activeId,
    }));
    toast('会话已删除', 'success');
  },
}));
