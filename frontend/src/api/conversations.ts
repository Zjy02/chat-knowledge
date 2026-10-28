import { request } from './client';
import type { ConversationDetail, ConversationSummary } from '../types';

export const conversationsApi = {
  list: () => request<ConversationSummary[]>('/conversations'),
  detail: (id: number) => request<ConversationDetail>(`/conversations/${id}`),
  rename: (id: number, title: string) =>
    request<ConversationSummary>(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),
  remove: (id: number) =>
    request<void>(`/conversations/${id}`, {
      method: 'DELETE',
    }),
};
