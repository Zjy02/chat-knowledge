import { describe, expect, it } from 'vitest';
import reducer, { startNewChat, upsert } from './conversationsSlice';
import type { ConversationSummary } from '../../types';

const conversation: ConversationSummary = {
  id: 1,
  title: 'RAG 召回优化',
  message_count: 4,
  last_message_at: '2026-10-28T03:34:50',
  created_at: '2026-10-28T03:14:50',
  last_message: '先 RRF',
};

describe('conversationsSlice', () => {
  it('increments newChatKey and clears the active conversation', () => {
    const state = reducer(
      { items: [conversation], loading: false, activeId: 1, newChatKey: 0 },
      startNewChat(),
    );
    expect(state.activeId).toBeNull();
    expect(state.newChatKey).toBe(1);
  });

  it('upserts a conversation and moves it to the top', () => {
    const other = { ...conversation, id: 2, title: '另一个会话' };
    const state = reducer(
      { items: [other, conversation], loading: false, activeId: null, newChatKey: 0 },
      upsert({ id: 1, title: '更新后的标题' }),
    );
    expect(state.items[0].id).toBe(1);
    expect(state.items[0].title).toBe('更新后的标题');
    expect(state.items[1].id).toBe(2);
  });
});
