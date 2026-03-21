import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';
import { MatchState, Match } from '../../types';

const initialState: MatchState = {
  matches: [],
  currentMatch: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchMatches = createAsyncThunk(
  'match/fetchAll',
  async ({ limit = 20, offset = 0 }: { limit?: number; offset?: number }, { rejectWithValue }) => {
    try {
      const response = await apiClient.getMatches(limit, offset);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch matches');
    }
  }
);

export const fetchMatchDetails = createAsyncThunk(
  'match/fetchDetails',
  async (matchId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.getMatchDetails(matchId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch match details');
    }
  }
);

export const unmatchUser = createAsyncThunk(
  'match/unmatch',
  async (matchId: string, { rejectWithValue }) => {
    try {
      await apiClient.unmatch(matchId);
      return matchId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to unmatch');
    }
  }
);

export const initializeVideoCall = createAsyncThunk(
  'match/initializeVideo',
  async (matchId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.initializeVideoCall(matchId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to initialize video call');
    }
  }
);

// Alias — User B calls this to join a call that User A already started.
// The backend's /initialize is now idempotent: returns existing session if one is pending.
export const joinVideoCall = initializeVideoCall;

export const completeVideoSession = createAsyncThunk(
  'match/completeVideo',
  async ({ sessionId, duration }: { sessionId: string; duration: number }, { rejectWithValue }) => {
    try {
      const response = await apiClient.completeVideoSession(sessionId, duration);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to complete video session');
    }
  }
);
export const proposeDate = createAsyncThunk(
  'match/proposeDate',
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
  'match/acceptDate',
  async (dateId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.acceptDate(dateId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept date');
    }
  }
);

export const completeDate = createAsyncThunk(
  'match/completeDate',
  async ({ dateId, rating, feedback }: { dateId: string; rating: number; feedback?: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.completeDate(dateId, rating, feedback);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to complete date');
    }
  }
);

export const rejectMatch = createAsyncThunk(
  'match/reject',
  async (matchId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.rejectMatch(matchId);
      return { matchId, ...response };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to break match');
    }
  }
);

// Slice
const matchSlice = createSlice({
  name: 'match',
  initialState,
  reducers: {
    setCurrentMatch: (state, action) => {
      state.currentMatch = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch matches
    builder.addCase(fetchMatches.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchMatches.fulfilled, (state, action) => {
      state.isLoading = false;
      const payload = action.payload;
      state.matches = payload.matches || payload.data || payload;
    });
    builder.addCase(fetchMatches.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch match details
    builder.addCase(fetchMatchDetails.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchMatchDetails.fulfilled, (state, action) => {
      state.isLoading = false;
      // Backend returns { match: {...} }
      const m = action.payload?.match || action.payload;
      state.currentMatch = m;
      // Also update the match in the list if present
      const idx = state.matches.findIndex(x => x.id === m?.id);
      if (idx !== -1 && m) state.matches[idx] = { ...state.matches[idx], ...m };
    });
    builder.addCase(fetchMatchDetails.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Unmatch
    builder.addCase(unmatchUser.fulfilled, (state, action) => {
      state.matches = state.matches.filter(m => m.id !== action.payload);
      if (state.currentMatch?.id === action.payload) {
        state.currentMatch = null;
      }
    });

    // Initialize video — store session on currentMatch
    builder.addCase(initializeVideoCall.fulfilled, (state, action) => {
      const session = action.payload?.session || action.payload;
      if (state.currentMatch) {
        (state.currentMatch as any).videoSession = session;
      }
    });

    // Propose date
    builder.addCase(proposeDate.fulfilled, (state, action) => {
      if (state.currentMatch) {
        state.currentMatch.dates = state.currentMatch.dates || [];
        state.currentMatch.dates.push(action.payload);
      }
    });

    // Reject / break match — remove from list
    builder.addCase(rejectMatch.fulfilled, (state, action) => {
      const { matchId } = action.payload as any;
      state.matches = state.matches.filter(m => m.id !== matchId);
      if (state.currentMatch?.id === matchId) {
        state.currentMatch = null;
      }
    });
  },
});

export const { setCurrentMatch, clearError } = matchSlice.actions;
export default matchSlice.reducer;