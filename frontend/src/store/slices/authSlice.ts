import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authApi } from '../../api';
import { ApiError, tokenStorage } from '../../api/client';
import type { AuthResponse, User } from '../../types';

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
  bootstrapped: boolean;
}

const initialState: AuthState = {
  user: readCachedUser(),
  token: tokenStorage.get(),
  status: 'idle',
  error: null,
  bootstrapped: false,
};

function persistSession(data: AuthResponse) {
  tokenStorage.set(data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export const bootstrapAuth = createAsyncThunk<{ user: User; token: string } | null>(
  'auth/bootstrap',
  async () => {
    const token = tokenStorage.get();
    if (!token) return null;
    try {
      const user = await authApi.me();
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { user, token };
    } catch {
      // A stale token must not trap the user in a broken authenticated shell.
      tokenStorage.clear();
      localStorage.removeItem(USER_KEY);
      return null;
    }
  },
);

export const login = createAsyncThunk<
  AuthResponse,
  { email: string; password: string },
  { rejectValue: string }
>('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const data = await authApi.login(email, password);
    persistSession(data);
    return data;
  } catch (error) {
    return rejectWithValue(messageOf(error, '登录失败，请重试'));
  }
});

export const register = createAsyncThunk<
  AuthResponse,
  { email: string; password: string; name: string },
  { rejectValue: string }
>('auth/register', async ({ email, password, name }, { rejectWithValue }) => {
  try {
    const data = await authApi.register(email, password, name);
    persistSession(data);
    return data;
  } catch (error) {
    return rejectWithValue(messageOf(error, '注册失败，请重试'));
  }
});

export const logout = createAsyncThunk<void>('auth/logout', async () => {
  tokenStorage.clear();
  localStorage.removeItem(USER_KEY);
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.bootstrapped = true;
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.status = 'authenticated';
        } else {
          state.user = null;
          state.token = null;
          state.status = 'anonymous';
        }
      })
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.status = 'authenticated';
        state.bootstrapped = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'anonymous';
        state.error = action.payload ?? '登录失败，请重试';
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.status = 'authenticated';
        state.bootstrapped = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'anonymous';
        state.error = action.payload ?? '注册失败，请重试';
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.status = 'anonymous';
        state.error = null;
        state.bootstrapped = true;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
