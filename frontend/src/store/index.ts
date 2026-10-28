import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice';
import conversations from './slices/conversationsSlice';
import knowledge from './slices/knowledgeSlice';
import ui from './slices/uiSlice';

export const store = configureStore({
  reducer: { auth, conversations, knowledge, ui },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
