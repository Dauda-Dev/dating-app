import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';
import { AdminState, AdminUserAction } from '../../types';

const initialState: AdminState = {
  reports: [],
  currentReport: null,
  users: [],
  pagination: null,
  isLoading: false,
  error: null,
};

export const fetchAdminReports = createAsyncThunk(
  'admin/fetchReports',
  async ({ status, page }: { status?: string; page?: number } = {}, { rejectWithValue }) => {
    try {
      return await apiClient.getAdminReports(status, page);
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.error ?? 'Failed to load reports');
    }
  }
);

export const fetchAdminReportDetail = createAsyncThunk(
  'admin/fetchReportDetail',
  async (reportId: string, { rejectWithValue }) => {
    try {
      return await apiClient.getAdminReportDetail(reportId);
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.error ?? 'Failed to load report');
    }
  }
);

export const reviewAdminReport = createAsyncThunk(
  'admin/reviewReport',
  async (
    { reportId, status, adminNote }: { reportId: string; status: string; adminNote?: string },
    { rejectWithValue }
  ) => {
    try {
      return await apiClient.reviewAdminReport(reportId, status, adminNote);
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.error ?? 'Failed to update report');
    }
  }
);

export const updateAdminUserStatus = createAsyncThunk(
  'admin/updateUserStatus',
  async (
    { userId, action }: { userId: string; action: AdminUserAction },
    { rejectWithValue }
  ) => {
    try {
      return await apiClient.updateUserStatus(userId, action);
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.error ?? 'Failed to update user status');
    }
  }
);

export const fetchAdminUsers = createAsyncThunk(
  'admin/fetchUsers',
  async (
    { filter, search, page }: { filter?: string; search?: string; page?: number } = {},
    { rejectWithValue }
  ) => {
    try {
      return await apiClient.getAdminUsers(filter, search, page);
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.error ?? 'Failed to load users');
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearAdminError(state) {
      state.error = null;
    },
    clearCurrentReport(state) {
      state.currentReport = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch reports
    builder.addCase(fetchAdminReports.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchAdminReports.fulfilled, (state, action) => {
      state.isLoading = false;
      state.reports = action.payload.reports;
      state.pagination = action.payload.pagination;
    });
    builder.addCase(fetchAdminReports.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch report detail
    builder.addCase(fetchAdminReportDetail.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchAdminReportDetail.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentReport = action.payload.report;
    });
    builder.addCase(fetchAdminReportDetail.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Review report
    builder.addCase(reviewAdminReport.fulfilled, (state, action) => {
      const updated = action.payload.report;
      const idx = state.reports.findIndex((r) => r.id === updated.id);
      if (idx >= 0) state.reports[idx] = updated;
      if (state.currentReport?.id === updated.id) state.currentReport = updated;
    });

    // Update user status
    builder.addCase(updateAdminUserStatus.fulfilled, (state, action) => {
      const { userId, isActive, isSuspended, suspendedUntil } = action.payload;
      const idx = state.users.findIndex((u) => u.id === userId);
      if (idx >= 0) {
        state.users[idx].isActive = isActive;
        state.users[idx].isSuspended = isSuspended;
        state.users[idx].suspendedUntil = suspendedUntil;
      }
    });

    // Fetch users
    builder.addCase(fetchAdminUsers.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchAdminUsers.fulfilled, (state, action) => {
      state.isLoading = false;
      state.users = action.payload.users;
      state.pagination = action.payload.pagination;
    });
    builder.addCase(fetchAdminUsers.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearAdminError, clearCurrentReport } = adminSlice.actions;
export default adminSlice.reducer;
