import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';
import { DiscoveryState, DiscoveryUser, DiscoveryFilters } from '../../types';

const DEFAULT_FILTERS: DiscoveryFilters = {
  maxDistance: 50,
  ageMin: 18,
  ageMax: 60,
  showGlobal: false,
};

const initialState: DiscoveryState & {
  lastRemovedUser: DiscoveryUser | null;
  filters: DiscoveryFilters;
  userLocation: { lat: number; lon: number } | null;
} = {
  users: [],
  currentIndex: 0,
  isLoading: false,
  error: null,
  hasMore: true,
  lastRemovedUser: null,
  filters: DEFAULT_FILTERS,
  userLocation: null,
};

export const fetchEligibleUsers = createAsyncThunk(
  'discovery/fetchEligible',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const { filters, userLocation } = state.discovery as typeof initialState;
      const response = await apiClient.getEligibleUsers(
        10,
        0,
        filters.showGlobal ? { ...filters, maxDistance: 0 } : filters,
        userLocation ?? undefined,
      );
      return response.users || response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch users');
    }
  }
);

export const likeUser = createAsyncThunk(
  'discovery/like',
  async (targetUserId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.likeUser(targetUserId, 'like');
      return { targetUserId, result: response };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to like user');
    }
  }
);

export const superLikeUser = createAsyncThunk(
  'discovery/superLike',
  async (targetUserId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.likeUser(targetUserId, 'super_like');
      return { targetUserId, result: response };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to super-like user');
    }
  }
);

export const passUser = createAsyncThunk(
  'discovery/pass',
  async (targetUserId: string, { rejectWithValue }) => {
    try {
      await apiClient.likeUser(targetUserId, 'reject');
      return targetUserId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to pass user');
    }
  }
);

export const undoSwipe = createAsyncThunk(
  'discovery/undo',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.undoLastSwipe();
      return response.revertedUserId as string;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Nothing to undo');
    }
  }
);

const discoverySlice = createSlice({
  name: 'discovery',
  initialState,
  reducers: {
    resetDiscovery: (state) => {
      state.users = [];
      state.currentIndex = 0;
      state.error = null;
      state.lastRemovedUser = null;
    },
    incrementIndex: (state) => {
      state.currentIndex += 1;
    },
    removeUserFromDeck: (state, action: { payload: string }) => {
      const removed = state.users.find((u) => u.id === action.payload);
      state.lastRemovedUser = removed ?? null;
      state.users = state.users.filter((u) => u.id !== action.payload);
    },
    setDiscoveryFilters: (state, action: PayloadAction<DiscoveryFilters>) => {
      state.filters = action.payload;
      // Clear deck so next fetchEligibleUsers uses new filters
      state.users = [];
      state.currentIndex = 0;
    },
    setUserLocation: (state, action: PayloadAction<{ lat: number; lon: number } | null>) => {
      state.userLocation = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEligibleUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEligibleUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload;
        state.currentIndex = 0;
        state.lastRemovedUser = null;
      })
      .addCase(fetchEligibleUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(likeUser.fulfilled, (state, action) => {
        state.users = state.users.filter((u) => u.id !== action.payload.targetUserId);
      })
      .addCase(likeUser.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(superLikeUser.fulfilled, (state, action) => {
        state.users = state.users.filter((u) => u.id !== action.payload.targetUserId);
      })
      .addCase(superLikeUser.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(passUser.fulfilled, (state, action) => {
        state.users = state.users.filter((u) => u.id !== action.payload);
      })
      .addCase(undoSwipe.fulfilled, (state) => {
        if (state.lastRemovedUser) {
          state.users = [state.lastRemovedUser, ...state.users];
          state.lastRemovedUser = null;
        }
      })
      .addCase(undoSwipe.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  resetDiscovery,
  incrementIndex,
  removeUserFromDeck,
  setDiscoveryFilters,
  setUserLocation,
} = discoverySlice.actions;
export default discoverySlice.reducer;
