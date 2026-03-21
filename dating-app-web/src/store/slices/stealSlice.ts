import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';
import { StealState, StealRequest } from '../../types';

const initialState: StealState = {
  incomingRequests: [],
  outgoingRequests: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchPendingSteals = createAsyncThunk(
  'steal/fetchPending',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getPendingSteals();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch steal requests');
    }
  }
);

export const requestSteal = createAsyncThunk(
  'steal/request',
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
  'steal/accept',
  async (requestId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.acceptSteal(requestId);
      return { requestId, response };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept steal');
    }
  }
);

export const rejectSteal = createAsyncThunk(
  'steal/reject',
  async (requestId: string, { rejectWithValue }) => {
    try {
      await apiClient.rejectSteal(requestId);
      return requestId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject steal');
    }
  }
);

// Slice
const stealSlice = createSlice({
  name: 'steal',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch pending steals
    builder.addCase(fetchPendingSteals.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchPendingSteals.fulfilled, (state, action) => {
      state.isLoading = false;
      const data = action.payload.data || action.payload;
      state.incomingRequests = data.incoming || [];
      state.outgoingRequests = data.outgoing || [];
    });
    builder.addCase(fetchPendingSteals.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Request steal
    builder.addCase(requestSteal.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(requestSteal.fulfilled, (state, action) => {
      state.isLoading = false;
      state.outgoingRequests.push(action.payload);
    });
    builder.addCase(requestSteal.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Accept steal
    builder.addCase(acceptSteal.fulfilled, (state, action) => {
      state.incomingRequests = state.incomingRequests.filter(r => r.id !== action.payload.requestId);
    });

    // Reject steal
    builder.addCase(rejectSteal.fulfilled, (state, action) => {
      state.incomingRequests = state.incomingRequests.filter(r => r.id !== action.payload);
    });
  },
});

export const { clearError } = stealSlice.actions;
export default stealSlice.reducer;
