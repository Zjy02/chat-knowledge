import { create } from 'zustand';
import { knowledgeApi } from '../api';
import type { KnowledgeStats } from '../types';

const EMPTY_STATS: KnowledgeStats = {
  document_count: 0,
  ready_count: 0,
  chunk_count: 0,
  question_count: 0,
};

interface KnowledgeState {
  stats: KnowledgeStats;
  refreshStats: () => Promise<void>;
}

export const useKnowledgeStore = create<KnowledgeState>((set) => ({
  stats: EMPTY_STATS,
  refreshStats: async () => {
    try {
      const stats = await knowledgeApi.stats();
      set({ stats });
    } catch {
      // Stats are decorative in the sidebar; do not interrupt the main flow.
    }
  },
}));
