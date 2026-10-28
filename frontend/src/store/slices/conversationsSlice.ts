import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { conversationsApi } from '../../api';
import { ApiError } from '../../api/client';
import type { ConversationSummary } from '../../types';
import { logout } from './authSlice';
import { notify } from '../notify';

interface ConversationsState {
  items: ConversationSummary[];
  loading: boolean;
  activeId: number | null;
  newChatKey: number;
}

const initialState: ConversationsState = {
  items: [],
  loading: false,
  activeId: null,
  newChatKey: 0,
};

export const loadConversations = createAsyncThunk<
  ConversationSummary[],
  void,
  { rejectValue: string }
>('conversations/load', async (_, { rejectWithValue }) => {
  try {
    return await conversationsApi.list();
  } catch (error) {
    const message = error instanceof ApiError ? error.message : '会话列表加载失败';
    notify.error(message);
    return rejectWithValue(message);
  }
});

export const renameConversation = createAsyncThunk<
  ConversationSummary,
  { id: number; title: string },
  { rejectValue: string }
>('conversations/rename', async ({ id, title }, { rejectWithValue }) => {
  try {
    const data = await conversationsApi.rename(id, title);
    notify.success('会话已重命名');
    return data;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : '重命名失败';
    notify.error(message);
    return rejectWithValue(message);
  }
});

export const removeConversation = createAsyncThunk<number, number, { rejectValue: string }>(
  'conversations/remove',
  async (id, { rejectWithValue }) => {
    try {
      await conversationsApi.remove(id);
      notify.success('会话已删除');
      return id;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : '删除失败';
      notify.error(message);
      return rejectWithValue(message);
    }
  },
);

const conversationsSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    setActive: (state, action: { payload: number | null; type: string }) => {
      state.activeId = action.payload;
    },
    startNewChat: (state) => {
      state.activeId = null;
      state.newChatKey += 1;
    },
    upsert: (
      state,
      action: { payload: Partial<ConversationSummary> & { id: number }; type: string },
    ) => {
      const index = state.items.findIndex((item) => item.id === action.payload.id);
      if (index === -1) {
        state.items.unshift(action.payload as ConversationSummary);
        return;
      }
      state.items[index] = { ...state.items[index], ...action.payload };
      const [updated] = state.items.splice(index, 1);
      state.items.unshift(updated);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadConversations.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(loadConversations.rejected, (state) => {
        state.loading = false;
      })
      .addCase(renameConversation.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(removeConversation.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        if (state.activeId === action.payload) state.activeId = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.items = [];
        state.activeId = null;
        state.loading = false;
        state.newChatKey = 0;
      });
  },
});

export const { setActive, startNewChat, upsert } = conversationsSlice.actions;
export default conversationsSlice.reducer;
