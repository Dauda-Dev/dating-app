import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';
import { ChatMessage, ChatState } from '../../types';

const initialState: ChatState = {
  messagesByMatch: {},
  loadingByMatch: {},
  hasMoreByMatch: {},
  unreadCounts: {},
  error: null,
};

export const loadMessages = createAsyncThunk(
  'chat/loadMessages',
  async ({ matchId, before }: { matchId: string; before?: string }, { rejectWithValue }) => {
    try {
      const data = await apiClient.getChatMessages(matchId, before);
      return { matchId, messages: data.messages as ChatMessage[], hasMore: data.hasMore as boolean };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Failed to load messages');
    }
  }
);

export const loadUnreadCounts = createAsyncThunk(
  'chat/loadUnreadCounts',
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiClient.getChatUnreadCounts();
      return data.unreadCounts as Record<string, number>;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Failed to load unread counts');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    receiveMessage(state, action: PayloadAction<ChatMessage>) {
      const { matchId } = action.payload;
      if (!state.messagesByMatch[matchId]) {
        state.messagesByMatch[matchId] = [];
      }
      const exists = state.messagesByMatch[matchId].some((m) => m.id === action.payload.id);
      if (!exists) {
        state.messagesByMatch[matchId].push(action.payload);
      }
      state.unreadCounts[matchId] = (state.unreadCounts[matchId] || 0) + 1;
    },

    clearUnread(state, action: PayloadAction<string>) {
      state.unreadCounts[action.payload] = 0;
    },

    markMessagesRead(state, action: PayloadAction<{ matchId: string; readAt: string }>) {
      const { matchId, readAt } = action.payload;
      const msgs = state.messagesByMatch[matchId];
      if (msgs) {
        msgs.forEach((m) => { if (!m.readAt) m.readAt = readAt; });
      }
    },

    removeMatchChat(state, action: PayloadAction<string>) {
      const matchId = action.payload;
      delete state.messagesByMatch[matchId];
      delete state.loadingByMatch[matchId];
      delete state.hasMoreByMatch[matchId];
      delete state.unreadCounts[matchId];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMessages.pending, (state, action) => {
        state.loadingByMatch[action.meta.arg.matchId] = true;
        state.error = null;
      })
      .addCase(loadMessages.fulfilled, (state, action) => {
        const { matchId, messages, hasMore } = action.payload;
        state.loadingByMatch[matchId] = false;
        state.hasMoreByMatch[matchId] = hasMore;
        if (action.meta.arg.before) {
          state.messagesByMatch[matchId] = [...messages, ...(state.messagesByMatch[matchId] || [])];
        } else {
          state.messagesByMatch[matchId] = messages;
        }
        state.unreadCounts[matchId] = 0;
      })
      .addCase(loadMessages.rejected, (state, action) => {
        state.loadingByMatch[action.meta.arg.matchId] = false;
        state.error = action.payload as string;
      })
      .addCase(loadUnreadCounts.fulfilled, (state, action) => {
        state.unreadCounts = action.payload;
      });
  },
});

export const { receiveMessage, clearUnread, markMessagesRead, removeMatchChat } = chatSlice.actions;
export default chatSlice.reducer;
