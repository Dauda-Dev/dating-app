import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';
import { AuthState, User, LoginForm, SignupForm } from '../../types';

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  needsOnboarding: false,
};

// Helper: decide if a user needs onboarding based on their profile data
const computeNeedsOnboarding = (user: any): boolean => {
  if (!user) return false;
  // If we've already flagged them as done in localStorage, never show again
  if (localStorage.getItem(`onboarding_done_${user.id}`) === 'true') return false;
  const profile = user.profile;
  const hasBio = !!(profile?.bio && profile.bio.trim().length > 0);
  const hasHobbies = !!(profile?.hobbies && profile.hobbies.length >= 1);
  const hasPhoto = !!(user.profilePhoto);
  // If any meaningful data exists, they've been through onboarding
  if (hasBio || hasHobbies || hasPhoto) {
    localStorage.setItem(`onboarding_done_${user.id}`, 'true');
    return false;
  }
  return true;
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginForm, { rejectWithValue }) => {
    try {
      const response = await apiClient.login(credentials.email, credentials.password);
      apiClient.setToken(response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || 'Login failed');
    }
  }
);

export const signup = createAsyncThunk(
  'auth/signup',
  async (data: SignupForm, { rejectWithValue }) => {
    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...signupData } = data;
      const response = await apiClient.signup(signupData);
      // Don't set token - user must verify email first
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || 'Signup failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await apiClient.logout();
      return null;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Logout failed');
    }
  }
);

export const getMe = createAsyncThunk(
  'auth/getMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getMe();
      // Backend returns { user, profile } — merge profile into user so state.auth.user.profile works
      const user = response.user || response;
      const profile = response.profile ?? user.profile ?? null;
      return { ...user, profile };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user');
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');
      
      const response = await apiClient.refreshToken(refreshToken);
      apiClient.setToken(response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Token refresh failed');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      await apiClient.forgotPassword(email);
      return { success: true };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send reset email');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }: { token: string; password: string }, { rejectWithValue }) => {
    try {
      await apiClient.resetPassword(token, password);
      return { success: true };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reset password');
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    markOnboardingDone: (state) => {
      state.needsOnboarding = false;
      if (state.user?.id) {
        localStorage.setItem(`onboarding_done_${state.user.id}`, 'true');
      }
    },
    restoreAuth: (state) => {
      const token = apiClient.getToken();
      const refreshToken = localStorage.getItem('refreshToken');
      if (token && refreshToken) {
        state.token = token;
        state.refreshToken = refreshToken;
        state.isAuthenticated = true;
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.error = null;
      state.needsOnboarding = computeNeedsOnboarding(action.payload.user);
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Signup - does NOT authenticate, user must verify email first
    builder.addCase(signup.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(signup.fulfilled, (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.error = null;
    });
    builder.addCase(signup.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    });

    // Get Me
    builder.addCase(getMe.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(getMe.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.needsOnboarding = computeNeedsOnboarding(action.payload);
    });
    builder.addCase(getMe.rejected, (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.token = null;
      state.refreshToken = null;
    });

    // Refresh Token
    builder.addCase(refreshToken.fulfilled, (state, action) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
    });
    builder.addCase(refreshToken.rejected, (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
    });
  },
});

export const { clearError, setUser, restoreAuth, markOnboardingDone } = authSlice.actions;
export default authSlice.reducer;

// Selector: returns true when the user has completed onboarding
export const selectProfileComplete = (state: { auth: typeof initialState }): boolean => {
  const user = state.auth.user as any;
  if (!user) return false;
  // Persistent flag set after onboarding completes
  if (localStorage.getItem(`onboarding_done_${user.id}`) === 'true') return true;
  const profile = user.profile;
  const hasBio = !!(profile?.bio && profile.bio.length > 0);
  const hasHobbies = !!(profile?.hobbies && profile.hobbies.length >= 1);
  const hasPhoto = !!(user.profilePhoto);
  return hasBio || hasHobbies || hasPhoto;
};
