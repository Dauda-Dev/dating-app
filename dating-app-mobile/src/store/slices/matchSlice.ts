import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';
import { MatchState } from '../../types';

const initialState: MatchState = {
  matches: [],
  currentMatch: null,
  isLoading: false,
  error: null,
};

export const fetchMatches = createAsyncThunk(
  'matches/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getMatches();
      return response.matches || response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch matches');
    }
  }
);

export const fetchMatchDetails = createAsyncThunk(
  'matches/fetchDetails',
  async (matchId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.getMatchDetails(matchId);
      return response.match || response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch match details');
    }
  }
);

export const initializeVideoCall = createAsyncThunk(
  'matches/initializeVideo',
  async (matchId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.initializeVideoCall(matchId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to initialize video call');
    }
  }
);

// Alias — User B joining an already-initialized session
export const joinVideoCall = initializeVideoCall;

export const completeVideoSession = createAsyncThunk(
  'matches/completeVideo',
  async ({ sessionId, durationSeconds }: { sessionId: string; durationSeconds: number }, { rejectWithValue }) => {
    try {
      const response = await apiClient.completeVideoSession(sessionId, durationSeconds);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to complete video session');
    }
  }
);

export const proposeDate = createAsyncThunk(
  'matches/proposeDate',
  async ({ matchId, data }: { matchId: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await apiClient.proposeDate(matchId, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to propose date');
    }
  }
);

export const acceptDate = createAsyncThunk(
  'matches/acceptDate',
  async (matchId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.acceptDate(matchId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept date');
    }
  }
);

export const rejectMatch = createAsyncThunk(
  'matches/reject',
  async (matchId: string, { rejectWithValue }) => {
    try {
      await apiClient.rejectMatch(matchId);
      return matchId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject match');
    }
  }
);

export const completeDate = createAsyncThunk(
  'matches/completeDate',
  async (matchId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.completeDate(matchId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark date as complete');
    }
  }
);

const matchSlice = createSlice({
  name: 'matches',
  initialState,
  reducers: {
    clearMatchError: (state) => { state.error = null; },
    clearCurrentMatch: (state) => { state.currentMatch = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMatches.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchMatches.fulfilled, (state, action) => {
        state.isLoading = false;
        state.matches = action.payload;
      })
      .addCase(fetchMatches.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchMatchDetails.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchMatchDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentMatch = action.payload;
        const idx = state.matches.findIndex((m) => m.id === action.payload.id);
        if (idx !== -1) state.matches[idx] = action.payload;
      })
      .addCase(fetchMatchDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(initializeVideoCall.fulfilled, (state, action) => {
        if (state.currentMatch && action.payload?.session) {
          state.currentMatch.videoSession = action.payload.session;
        }
      })

      .addCase(completeVideoSession.fulfilled, (state, action) => {
        if (state.currentMatch && action.payload?.match) {
          state.currentMatch = { ...state.currentMatch, ...action.payload.match };
        }
        if (state.currentMatch) {
          state.currentMatch.status = 'video_call_completed';
        }
      })

      .addCase(proposeDate.fulfilled, (state, action) => {
        if (state.currentMatch && action.payload?.match) {
          state.currentMatch = { ...state.currentMatch, ...action.payload.match };
        }
      })

      .addCase(acceptDate.fulfilled, (state, action) => {
        if (state.currentMatch && action.payload?.match) {
          const updated = { ...state.currentMatch, ...action.payload.match, status: 'date_accepted' as const };
          state.currentMatch = updated;
        }
      })

      .addCase(rejectMatch.fulfilled, (state, action) => {
        const matchId = action.payload;
        state.matches = state.matches.filter((m) => m.id !== matchId);
        if (state.currentMatch?.id === matchId) state.currentMatch = null;
      })

      .addCase(completeDate.fulfilled, (state) => {
        if (state.currentMatch) {
          state.currentMatch.status = 'post_date_open';
        }
      });
  },
});

export const { clearMatchError, clearCurrentMatch } = matchSlice.actions;
export default matchSlice.reducer;
