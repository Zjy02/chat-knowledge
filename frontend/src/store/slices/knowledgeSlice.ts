import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { knowledgeApi } from '../../api';
import { ApiError } from '../../api/client';
import type { DocumentItem, KnowledgeStats } from '../../types';
import { logout } from './authSlice';
import { notify } from '../notify';

interface KnowledgeState {
  stats: KnowledgeStats;
  documents: DocumentItem[];
  loading: boolean;
  loaded: boolean;
  refreshing: boolean;
}

const EMPTY_STATS: KnowledgeStats = {
  document_count: 0,
  ready_count: 0,
  chunk_count: 0,
  question_count: 0,
};

const initialState: KnowledgeState = {
  stats: EMPTY_STATS,
  documents: [],
  loading: false,
  loaded: false,
  refreshing: false,
};

function messageOf(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export const fetchKnowledge = createAsyncThunk<
  { documents: DocumentItem[]; stats: KnowledgeStats },
  void,
  { rejectValue: string }
>('knowledge/fetch', async (_, { rejectWithValue }) => {
  try {
    const [documents, stats] = await Promise.all([knowledgeApi.documents(), knowledgeApi.stats()]);
    return { documents, stats };
  } catch (error) {
    const message = messageOf(error, '资料列表加载失败');
    notify.error(message);
    return rejectWithValue(message);
  }
});

export const fetchDocuments = createAsyncThunk<
  { documents: DocumentItem[]; stats: KnowledgeStats },
  void,
  { rejectValue: string }
>('knowledge/refreshDocuments', async (_, { rejectWithValue }) => {
  try {
    const [documents, stats] = await Promise.all([knowledgeApi.documents(), knowledgeApi.stats()]);
    return { documents, stats };
  } catch (error) {
    return rejectWithValue(messageOf(error, '资料状态刷新失败'));
  }
});

export const refreshStats = createAsyncThunk<KnowledgeStats, void>(
  'knowledge/refreshStats',
  async () => knowledgeApi.stats(),
);

export const uploadDocument = createAsyncThunk<
  { document: DocumentItem; stats: KnowledgeStats },
  File,
  { rejectValue: string }
>('knowledge/upload', async (file, { rejectWithValue }) => {
  try {
    const document = await knowledgeApi.upload(file);
    const stats = await knowledgeApi.stats();
    notify.success('已加入解析队列，完成后会自动出现在列表中');
    return { document, stats };
  } catch (error) {
    const message = messageOf(error, '上传失败');
    notify.error(message);
    return rejectWithValue(message);
  }
});

export const toggleDocument = createAsyncThunk<
  DocumentItem,
  { id: number; enabled: boolean },
  { rejectValue: string }
>('knowledge/toggle', async ({ id, enabled }, { rejectWithValue }) => {
  try {
    const document = await knowledgeApi.toggle(id, enabled);
    notify.success(enabled ? '已启用该资料' : '已停用该资料，不再参与检索');
    return document;
  } catch (error) {
    const message = messageOf(error, '操作失败');
    notify.error(message);
    return rejectWithValue(message);
  }
});

export const deleteDocument = createAsyncThunk<
  { id: number; stats: KnowledgeStats },
  number,
  { rejectValue: string }
>('knowledge/delete', async (id, { rejectWithValue }) => {
  try {
    await knowledgeApi.remove(id);
    const stats = await knowledgeApi.stats();
    notify.success('资料已删除');
    return { id, stats };
  } catch (error) {
    const message = messageOf(error, '删除失败');
    notify.error(message);
    return rejectWithValue(message);
  }
});

const knowledgeSlice = createSlice({
  name: 'knowledge',
  initialState,
  reducers: {
    resetKnowledge: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchKnowledge.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchKnowledge.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.documents = action.payload.documents;
        state.stats = action.payload.stats;
      })
      .addCase(fetchKnowledge.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchDocuments.pending, (state) => {
        state.refreshing = true;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.refreshing = false;
        state.documents = action.payload.documents;
        state.stats = action.payload.stats;
      })
      .addCase(fetchDocuments.rejected, (state) => {
        state.refreshing = false;
      })
      .addCase(refreshStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.documents.unshift(action.payload.document);
        state.stats = action.payload.stats;
      })
      .addCase(toggleDocument.fulfilled, (state, action) => {
        const index = state.documents.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) state.documents[index] = action.payload;
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.documents = state.documents.filter((item) => item.id !== action.payload.id);
        state.stats = action.payload.stats;
      })
      .addCase(logout.fulfilled, () => initialState);
  },
});

export const { resetKnowledge } = knowledgeSlice.actions;
export default knowledgeSlice.reducer;
