import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../services/apiClient';
import { AuthState, User } from '../../types';

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  needsOnboarding: false,
};

const computeNeedsOnboarding = (user: any): boolean => {
  if (!user) return false;
  const profile = user.profile;
  const hasBio = !!(profile?.bio && profile.bio.trim().length > 0);
  const hasHobbies = !!(profile?.hobbies && profile.hobbies.length >= 1);
  const hasPhoto = !!(user.profilePhoto);
  return !(hasBio || hasHobbies || hasPhoto);
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.login(email, password);
      await apiClient.setToken(response.token);
      await AsyncStorage.setItem('refreshToken', response.refreshToken);
      // Cache user so restoreAuth can repopulate state instantly on next launch
      if (response.user) await AsyncStorage.setItem('cachedUser', JSON.stringify(response.user));
      return response;
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.error || error.response?.data?.message || 'Login failed';
      if (status === 403) {
        return rejectWithValue({ type: 'EMAIL_NOT_VERIFIED', email, message });
      }
      return rejectWithValue(message);
    }
  }
);

export const signup = createAsyncThunk(
  'auth/signup',
  async (data: any, { rejectWithValue }) => {
    try {
      const { confirmPassword, ...signupData } = data;
      const response = await apiClient.signup(signupData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || 'Signup failed');
    }
  }
);

export const getMe = createAsyncThunk(
  'auth/getMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getMe();
      return response;
    } catch (error: any) {
      const status = error.response?.status ?? 0;
      const message = error.response?.data?.message || 'Failed to fetch user';
      // Pass the numeric status so the reducer can do an exact check.
      // Never pass a string containing "401" for non-401 errors.
      // NOTE: by the time this catch runs, the response interceptor has already
      // attempted a token refresh + retry. A 401 here means the refresh also
      // failed, so it is safe to sign the user out.
      return rejectWithValue({ status, message });
    }
  }
);

export const restoreAuth = createAsyncThunk(
  'auth/restore',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!token) return null;
      await apiClient.setToken(token);
      // Also restore the cached user object so screens work instantly
      const cachedUser = await AsyncStorage.getItem('cachedUser');
      const user = cachedUser ? JSON.parse(cachedUser) : null;
      return { token, refreshToken, user };
    } catch {
      return rejectWithValue('Failed to restore auth');
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try { await apiClient.logout(); } catch (_) {}
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('refreshToken');
  await AsyncStorage.removeItem('cachedUser');
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await apiClient.updateProfile(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
    }
  }
);

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (idToken: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.googleMobileAuth(idToken);
      await apiClient.setToken(response.token);
      await AsyncStorage.setItem('refreshToken', response.refreshToken);
      if (response.user) await AsyncStorage.setItem('cachedUser', JSON.stringify(response.user));
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || 'Google sign-in failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    setNeedsOnboarding: (state, action: PayloadAction<boolean>) => {
      state.needsOnboarding = action.payload;
    },
    markOnboardingDone: (state) => {
      state.needsOnboarding = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.needsOnboarding = computeNeedsOnboarding(action.payload.user);
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as any;
        state.error = typeof payload === 'string' ? payload : payload?.message || 'Login failed';
      })

      .addCase(signup.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(signup.fulfilled, (state) => { state.isLoading = false; })
      .addCase(signup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(getMe.fulfilled, (state, action) => {
        const user = action.payload?.user || action.payload;
        state.user = user;
        state.isAuthenticated = true;
        // Keep the cached copy fresh for next cold launch
        AsyncStorage.setItem('cachedUser', JSON.stringify(user)).catch(() => {});
        // Only compute needsOnboarding if it hasn't been resolved yet.
        // Never flip it back to true once the user is in the main app.
        if (state.needsOnboarding) {
          state.needsOnboarding = computeNeedsOnboarding(user);
        }
      })
      .addCase(getMe.rejected, (state, action) => {
        // Only log out on an exact HTTP 401. Network errors, timeouts, and
        // server errors (5xx) must NOT clear the session — the user has a
        // valid token; we just can't reach the server right now.
        // NOTE: by the time this runs the response interceptor has already
        // attempted a silent token refresh + retry. A 401 here means the
        // refresh also failed.
        // However, if we still have a refreshToken in state, treat this as a
        // transient failure (e.g. Render cold-start) and keep the user in the
        // app — the next request will re-attempt the refresh.
        const payload = action.payload as { status: number; message: string } | undefined;
        if (payload?.status === 401 && !state.refreshToken) {
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
        }
        // Otherwise keep isAuthenticated = true so the user stays in the app
      })

      .addCase(restoreAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.isAuthenticated = true;
          // Restore cached user so screens render immediately without waiting for getMe
          if (action.payload.user) {
            state.user = action.payload.user;
          }
        }
      })

      .addCase(logoutUser.fulfilled, (state) => {
        Object.assign(state, initialState);
      })

      .addCase(googleLogin.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.needsOnboarding = computeNeedsOnboarding(action.payload.user);
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(updateProfile.fulfilled, (state, action) => {
        const updated = action.payload?.user || action.payload;
        if (updated && state.user) {
          state.user = { ...state.user, ...updated };
        }
        state.needsOnboarding = false;
      });
  },
});

export const { clearError, setNeedsOnboarding, markOnboardingDone } = authSlice.actions;
export default authSlice.reducer;
