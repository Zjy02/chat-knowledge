import { create } from 'zustand';
import { authApi } from '../api';
import { ApiError, tokenStorage } from '../api/client';
import type { User } from '../types';

const USER_KEY = 'zhiwen_user';

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'anonymous';
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: readCachedUser(),
  token: tokenStorage.get(),
  status: 'idle',
  error: null,

  // Validate the cached token on first paint so an expired session never
  // renders the authenticated shell for a frame.
  bootstrap: async () => {
    const token = tokenStorage.get();
    if (!token) {
      set({ status: 'anonymous', user: null, token: null });
      return;
    }
    set({ status: 'loading', token });
    try {
      const user = await authApi.me();
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, token, status: 'authenticated', error: null });
    } catch (error) {
      tokenStorage.clear();
      localStorage.removeItem(USER_KEY);
      set({
        user: null,
        token: null,
        status: 'anonymous',
        error: error instanceof ApiError ? error.message : '登录已过期',
      });
    }
  },

  login: async (email, password) => {
    set({ status: 'loading', error: null });
    try {
      const data = await authApi.login(email, password);
      tokenStorage.set(data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      set({ token: data.access_token, user: data.user, status: 'authenticated' });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : '登录失败，请重试';
      set({ status: 'anonymous', error: message });
      throw error;
    }
  },

  register: async (email, password, name) => {
    set({ status: 'loading', error: null });
    try {
      const data = await authApi.register(email, password, name);
      tokenStorage.set(data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      set({ token: data.access_token, user: data.user, status: 'authenticated' });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : '注册失败，请重试';
      set({ status: 'anonymous', error: message });
      throw error;
    }
  },

  logout: () => {
    tokenStorage.clear();
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, status: 'anonymous', error: null });
  },

  clearError: () => set({ error: null }),
}));
