import { createSlice } from '@reduxjs/toolkit';

interface UiState {
  sidebarOpen: boolean;
}

const initialState: UiState = { sidebarOpen: false };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarOpen: (state, action: { payload: boolean; type: string }) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
  },
});

export const { setSidebarOpen, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;
