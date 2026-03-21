import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';
import { StealState } from '../../types';

const initialState: StealState = {
  incomingRequests: [],
  isLoading: false,
  error: null,
};

export const fetchPendingSteals = createAsyncThunk(
  'steals/fetchPending',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getPendingSteals();
      return response.steals || response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch steal requests');
    }
  }
);

export const requestSteal = createAsyncThunk(
  'steals/request',
  async ({ targetUserId, message }: { targetUserId: string; message?: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.requestSteal(targetUserId, message);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send steal request');
    }
  }
);

const stealSlice = createSlice({
  name: 'steals',
  initialState,
  reducers: {
    clearStealError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPendingSteals.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchPendingSteals.fulfilled, (state, action) => {
        state.isLoading = false;
        state.incomingRequests = action.payload;
      })
      .addCase(fetchPendingSteals.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(requestSteal.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(requestSteal.fulfilled, (state) => { state.isLoading = false; })
      .addCase(requestSteal.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearStealError } = stealSlice.actions;
export default stealSlice.reducer;
