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
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || 'Login failed');
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
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user');
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
      return { token, refreshToken };
    } catch {
      return rejectWithValue('Failed to restore auth');
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try { await apiClient.logout(); } catch (_) {}
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('refreshToken');
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
        state.error = action.payload as string;
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
        state.needsOnboarding = computeNeedsOnboarding(user);
      })
      .addCase(getMe.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })

      .addCase(restoreAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.isAuthenticated = true;
        }
      })

      .addCase(logoutUser.fulfilled, (state) => {
        Object.assign(state, initialState);
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
