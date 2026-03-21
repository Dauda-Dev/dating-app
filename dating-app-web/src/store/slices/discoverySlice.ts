import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';
import { DiscoveryState, DiscoveryUser } from '../../types';

const initialState: DiscoveryState = {
  users: [],
  currentIndex: 0,
  isLoading: false,
  error: null,
  hasMore: true,
};

// Async thunks
export const fetchEligibleUsers = createAsyncThunk(
  'discovery/fetchEligible',
  async ({ limit = 10, offset = 0 }: { limit?: number; offset?: number }, { rejectWithValue }) => {
    try {
      const response = await apiClient.getEligibleUsers(limit, offset);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch users');
    }
  }
);

export const likeUser = createAsyncThunk(
  'discovery/like',
  async ({ userId, likeType }: { userId: string; likeType: 'like' | 'super_like' | 'reject' }, { rejectWithValue }) => {
    try {
      const response = await apiClient.likeUser(userId, likeType);
      return { userId, likeType, match: response.match };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to like user');
    }
  }
);

export const getUserDetails = createAsyncThunk(
  'discovery/getUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.getUserById(userId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user details');
    }
  }
);

// Slice
const discoverySlice = createSlice({
  name: 'discovery',
  initialState,
  reducers: {
    nextCard: (state) => {
      // Remove the current card from the deck so the next one slides in.
      // currentIndex stays at the same position — the array shrinks instead.
      if (state.users.length > 0) {
        state.users.splice(state.currentIndex, 1);
        // If we removed the last element, clamp index to the new last position
        if (state.currentIndex >= state.users.length && state.currentIndex > 0) {
          state.currentIndex = state.users.length - 1;
        }
      }
    },
    resetDiscovery: (state) => {
      state.users = [];
      state.currentIndex = 0;
      state.hasMore = true;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch eligible users
    builder.addCase(fetchEligibleUsers.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchEligibleUsers.fulfilled, (state, action) => {
      state.isLoading = false;
      const payload = action.payload;
      const newUsers = payload.users || payload.data || payload;
      const usersArray = Array.isArray(newUsers) ? newUsers : [];
      state.users = [...state.users, ...usersArray];
      state.hasMore = usersArray.length > 0;
    });
    builder.addCase(fetchEligibleUsers.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Like user
    builder.addCase(likeUser.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(likeUser.fulfilled, (state, action) => {
      state.isLoading = false;
      // Card advancement is handled by nextCard dispatch in DiscoveryScreen
    });
    builder.addCase(likeUser.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { nextCard, resetDiscovery, clearError } = discoverySlice.actions;
export default discoverySlice.reducer;
