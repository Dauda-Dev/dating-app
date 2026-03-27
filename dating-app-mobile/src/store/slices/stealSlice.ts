import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';
import { StealState } from '../../types';

const initialState: StealState = {
  incomingRequests: [],
  sentRequests: [],
  isLoading: false,
  isSentLoading: false,
  error: null,
};

export const fetchPendingSteals = createAsyncThunk(
  'steals/fetchPending',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getPendingSteals();
      return response.steals || response.requests || response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch steal requests');
    }
  }
);

export const fetchSentSteals = createAsyncThunk(
  'steals/fetchSent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getSentSteals();
      return response.requests || response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch sent steal requests');
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

export const acceptSteal = createAsyncThunk(
  'steals/accept',
  async (stealId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.acceptSteal(stealId);
      return { stealId, ...response };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept steal request');
    }
  }
);

export const rejectSteal = createAsyncThunk(
  'steals/reject',
  async (stealId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.rejectSteal(stealId);
      return { stealId, ...response };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject steal request');
    }
  }
);

export const cancelSteal = createAsyncThunk(
  'steals/cancel',
  async (stealId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.cancelSteal(stealId);
      return { stealId, ...response };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel steal request');
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

      .addCase(fetchSentSteals.pending, (state) => { state.isSentLoading = true; })
      .addCase(fetchSentSteals.fulfilled, (state, action) => {
        state.isSentLoading = false;
        state.sentRequests = action.payload;
      })
      .addCase(fetchSentSteals.rejected, (state) => { state.isSentLoading = false; })

      .addCase(requestSteal.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(requestSteal.fulfilled, (state) => { state.isLoading = false; })
      .addCase(requestSteal.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(acceptSteal.pending, (state) => { state.isLoading = true; })
      .addCase(acceptSteal.fulfilled, (state, action) => {
        state.isLoading = false;
        state.incomingRequests = state.incomingRequests.filter((r) => r.id !== action.payload.stealId);
      })
      .addCase(acceptSteal.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(rejectSteal.pending, (state) => { state.isLoading = true; })
      .addCase(rejectSteal.fulfilled, (state, action) => {
        state.isLoading = false;
        state.incomingRequests = state.incomingRequests.filter((r) => r.id !== action.payload.stealId);
      })
      .addCase(rejectSteal.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(cancelSteal.pending, (state) => { state.isSentLoading = true; })
      .addCase(cancelSteal.fulfilled, (state, action) => {
        state.isSentLoading = false;
        state.sentRequests = state.sentRequests.filter((r) => r.id !== action.payload.stealId);
      })
      .addCase(cancelSteal.rejected, (state) => { state.isSentLoading = false; });
  },
});

export const { clearStealError } = stealSlice.actions;
export default stealSlice.reducer;
