import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';
import { DiscoveryState } from '../../types';

const initialState: DiscoveryState = {
  users: [],
  currentIndex: 0,
  isLoading: false,
  error: null,
  hasMore: true,
};

export const fetchEligibleUsers = createAsyncThunk(
  'discovery/fetchEligible',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getEligibleUsers();
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

const discoverySlice = createSlice({
  name: 'discovery',
  initialState,
  reducers: {
    resetDiscovery: (state) => {
      state.users = [];
      state.currentIndex = 0;
      state.error = null;
    },
    incrementIndex: (state) => {
      state.currentIndex += 1;
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
      })
      .addCase(fetchEligibleUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(likeUser.fulfilled, (state) => {
        state.currentIndex += 1;
        if (state.currentIndex >= state.users.length) {
          state.currentIndex = 0;
          state.users = [];
        }
      })

      .addCase(passUser.fulfilled, (state) => {
        state.currentIndex += 1;
        if (state.currentIndex >= state.users.length) {
          state.currentIndex = 0;
          state.users = [];
        }
      });
  },
});

export const { resetDiscovery, incrementIndex } = discoverySlice.actions;
export default discoverySlice.reducer;
