import { describe, expect, it } from 'vitest';
import reducer from './knowledgeSlice';
import type { DocumentItem } from '../../types';

const document: DocumentItem = {
  id: 1,
  filename: 'notes.md',
  file_type: 'md',
  file_size: 1024,
  status: 'ready',
  chunk_count: 3,
  enabled: true,
  created_at: '2026-10-28T03:34:50',
  updated_at: '2026-10-28T03:34:50',
};

describe('knowledgeSlice', () => {
  it('updates document stats and rows from a fetch result', () => {
    const state = reducer(undefined, {
      type: 'knowledge/fetch/fulfilled',
      payload: {
        documents: [document],
        stats: { document_count: 1, ready_count: 1, chunk_count: 3, question_count: 2 },
      },
    });
    expect(state.loaded).toBe(true);
    expect(state.documents).toHaveLength(1);
    expect(state.stats.chunk_count).toBe(3);
  });
});
