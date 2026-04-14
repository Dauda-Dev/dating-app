import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../constants';
import { DiscoveryFilters } from '../types';

const API_BASE_URL = 'https://dating-app-xgvv.onrender.com/api'; // Android emulator → localhost
// For physical device, replace with your machine's LAN IP e.g. http://192.168.x.x:5000/api

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private _refreshing: Promise<string | null> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    this.client.interceptors.request.use(async (config) => {
      if (!this.token) {
        this.token = await AsyncStorage.getItem('token');
      }
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config;
        // On 401, attempt a silent token refresh exactly once per request
        if (error.response?.status === 401 && !originalRequest._retried) {
          originalRequest._retried = true;
          try {
            const newToken = await this._silentRefresh();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch {
            // Refresh failed — let the 401 propagate so Redux can sign the user out
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /** Exchange the stored refreshToken for a new access token.
   *  Concurrent calls share a single in-flight request.
   *  IMPORTANT: Only clears tokens on definitive auth rejection (401/403).
   *  Network errors, timeouts, and server errors are treated as transient —
   *  tokens are preserved so the user stays logged in on the next app open. */
  private async _silentRefresh(): Promise<string | null> {
    if (this._refreshing) return this._refreshing;
    this._refreshing = (async () => {
      try {
        const storedRefresh = await AsyncStorage.getItem('refreshToken');
        if (!storedRefresh) return null;
        const r = await axios.post(
          `${API_BASE_URL}${API_ENDPOINTS.REFRESH}`,
          { refreshToken: storedRefresh },
          { timeout: 10000 },
        );
        const { token, refreshToken: newRefresh } = r.data;
        await this.setToken(token);
        if (newRefresh) await AsyncStorage.setItem('refreshToken', newRefresh);
        return token as string;
      } catch (err: any) {
        const status = err?.response?.status;
        // Only wipe tokens if the server explicitly says the refresh token is invalid.
        // Network timeouts (no response) or 5xx errors are transient — keep tokens.
        if (status === 401 || status === 403) {
          await this.clearToken();
        }
        return null;
      } finally {
        this._refreshing = null;
      }
    })();
    return this._refreshing;
  }

  async setToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem('token', token);
  }

  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('cachedUser');
  }

  async getStoredToken(): Promise<string | null> {
    if (!this.token) this.token = await AsyncStorage.getItem('token');
    return this.token;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    const r = await this.client.post(API_ENDPOINTS.LOGIN, { email, password });
    return r.data;
  }

  async signup(data: any) {
    const r = await this.client.post(API_ENDPOINTS.SIGNUP, data);
    return r.data;
  }

  async logout() {
    const r = await this.client.post(API_ENDPOINTS.LOGOUT);
    await this.clearToken();
    return r.data;
  }

  async getMe() {
    const r = await this.client.get(API_ENDPOINTS.ME);
    return r.data;
  }

  async verifyEmail(token: string) {
    const r = await this.client.post(API_ENDPOINTS.VERIFY_EMAIL, { token });
    return r.data;
  }

  async verifyEmailOtp(email: string, code: string) {
    const r = await this.client.post(API_ENDPOINTS.VERIFY_EMAIL_OTP, { email, code });
    return r.data;
  }

  async resendVerification(email: string) {
    const r = await this.client.post(API_ENDPOINTS.RESEND_VERIFICATION, { email });
    return r.data;
  }

  async forgotPassword(email: string) {
    const r = await this.client.post(API_ENDPOINTS.FORGOT_PASSWORD, { email });
    return r.data;
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const r = await this.client.post(API_ENDPOINTS.RESET_PASSWORD, { email, code, newPassword });
    return r.data;
  }

  // ── Profile ───────────────────────────────────────────────────────────────
  async updateProfile(data: any) {
    const r = await this.client.put(API_ENDPOINTS.UPDATE_PROFILE, data);
    return r.data;
  }

  async uploadProfilePicture(uri: string) {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('photo', { uri, name: filename, type } as any);
    const r = await this.client.post(API_ENDPOINTS.UPLOAD_PHOTO, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data;
  }

  async uploadGalleryPhoto(uri: string) {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('photo', { uri, name: filename, type } as any);
    const r = await this.client.post('/users/gallery-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data;
  }

  async deleteGalleryPhoto(photoUrl: string) {
    const r = await this.client.delete('/users/gallery-photo', { data: { photoUrl } });
    return r.data;
  }

  // ── Discovery ─────────────────────────────────────────────────────────────
  async getEligibleUsers(
    limit = 10,
    offset = 0,
    filters?: Partial<DiscoveryFilters>,
    location?: { lat: number; lon: number },
  ) {
    const params: Record<string, any> = { limit, offset };
    if (location?.lat !== undefined) params.lat = location.lat;
    if (location?.lon !== undefined) params.lon = location.lon;
    if (filters && !filters.showGlobal) {
      if (filters.maxDistance) params.maxDistance = filters.maxDistance;
    }
    if (filters?.ageMin) params.ageMin = filters.ageMin;
    if (filters?.ageMax) params.ageMax = filters.ageMax;
    const r = await this.client.get(API_ENDPOINTS.ELIGIBLE_USERS, { params });
    return r.data;
  }

  async likeUser(userId: string, likeType: 'like' | 'super_like' | 'reject') {
    const r = await this.client.post(API_ENDPOINTS.LIKE_USER, { toUserId: userId, likeType });
    return r.data;
  }

  async getLikedMe(limit = 20, offset = 0) {
    const r = await this.client.get(API_ENDPOINTS.LIKED_ME, { params: { limit, offset } });
    return r.data;
  }

  async getLikeQuota() {
    const r = await this.client.get(API_ENDPOINTS.LIKE_QUOTA);
    return r.data;
  }

  async undoLastSwipe() {
    const r = await this.client.post(API_ENDPOINTS.UNDO_SWIPE);
    return r.data;
  }

  // ── Matches ───────────────────────────────────────────────────────────────
  async getMatches(limit = 20, offset = 0) {
    const r = await this.client.get(API_ENDPOINTS.MY_MATCHES, { params: { limit, offset } });
    return r.data;
  }

  async getMatchDetails(matchId: string) {
    const r = await this.client.get(`${API_ENDPOINTS.MATCH_DETAILS}/${matchId}`);
    return r.data;
  }

  async rejectMatch(matchId: string) {
    const r = await this.client.post(API_ENDPOINTS.REJECT_MATCH, { matchId });
    return r.data;
  }

  // ── Video ─────────────────────────────────────────────────────────────────
  async initializeVideoCall(matchId: string) {
    const r = await this.client.post(API_ENDPOINTS.INITIALIZE_VIDEO, { matchId });
    return r.data;
  }

  async completeVideoSession(sessionId: string, durationSeconds: number) {
    const r = await this.client.post(`/video/sessions/${sessionId}/complete`, { durationSeconds });
    return r.data;
  }

  // ── Dates ─────────────────────────────────────────────────────────────────
  async proposeDate(matchId: string, data: any) {
    const r = await this.client.post(API_ENDPOINTS.PROPOSE_DATE, { matchId, ...data });
    return r.data;
  }

  async acceptDate(matchId: string) {
    const r = await this.client.post(API_ENDPOINTS.ACCEPT_DATE, { matchId });
    return r.data;
  }

  async completeDate(matchId: string) {
    const r = await this.client.post(API_ENDPOINTS.COMPLETE_DATE, { matchId });
    return r.data;
  }

  // ── Steals ────────────────────────────────────────────────────────────────
  async requestSteal(targetUserId: string, message?: string) {
    const r = await this.client.post(API_ENDPOINTS.REQUEST_STEAL, { targetUserId, message });
    return r.data;
  }

  async getPendingSteals() {
    const r = await this.client.get(API_ENDPOINTS.PENDING_STEALS);
    return r.data;
  }

  async getSentSteals() {
    const r = await this.client.get(API_ENDPOINTS.SENT_STEALS);
    return r.data;
  }

  async acceptSteal(stealId: string) {
    const r = await this.client.post(`${API_ENDPOINTS.ACCEPT_STEAL}/${stealId}/accept`);
    return r.data;
  }

  async rejectSteal(stealId: string) {
    const r = await this.client.post(`${API_ENDPOINTS.REJECT_STEAL}/${stealId}/reject`);
    return r.data;
  }

  async cancelSteal(stealId: string) {
    const r = await this.client.delete(`${API_ENDPOINTS.CANCEL_STEAL}/${stealId}/cancel`);
    return r.data;
  }

  // ── Payments ──────────────────────────────────────────────────────────────
  async getSubscriptionPlans() {
    const r = await this.client.get(API_ENDPOINTS.PAYMENT_PLANS);
    return r.data;
  }

  async initializePayment(tier: string) {
    const r = await this.client.post(API_ENDPOINTS.PAYMENT_INITIALIZE, { tier });
    return r.data;
  }

  async verifyPayment(reference: string) {
    const r = await this.client.get(`${API_ENDPOINTS.PAYMENT_VERIFY}/${reference}`);
    return r.data;
  }

  async googleMobileAuth(idToken: string) {
    const r = await this.client.post(API_ENDPOINTS.GOOGLE_MOBILE_AUTH, { idToken });
    return r.data;
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  async registerPushToken(pushToken: string) {
    const r = await this.client.put('/users/push-token', { pushToken });
    return r.data;
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  async getChatMessages(matchId: string, before?: string) {
    const params: Record<string, string> = {};
    if (before) params.before = before;
    const r = await this.client.get(`/chat/${matchId}/messages`, { params });
    return r.data;
  }

  async getChatUnreadCounts() {
    const r = await this.client.get('/chat/unread-counts');
    return r.data;
  }

  // ── Reports ───────────────────────────────────────────────────────────────
  async submitReport(payload: {
    reportedUserId: string;
    reason: string;
    matchId?: string;
    details?: string;
  }) {
    const r = await this.client.post('/reports', payload);
    return r.data;
  }

  async getMyReports() {
    const r = await this.client.get('/reports/my');
    return r.data;
  }

  // ── Admin ─────────────────────────────────────────────────────────────────
  async getAdminReports(status?: string, page = 1) {
    const params: Record<string, string | number> = { page };
    if (status) params.status = status;
    const r = await this.client.get('/admin/reports', { params });
    return r.data;
  }

  async getAdminReportDetail(reportId: string) {
    const r = await this.client.get(`/admin/reports/${reportId}`);
    return r.data;
  }

  async reviewAdminReport(reportId: string, status: string, adminNote?: string) {
    const r = await this.client.patch(`/admin/reports/${reportId}`, { status, adminNote });
    return r.data;
  }

  async getAdminUsers(filter?: string, search?: string, page = 1) {
    const params: Record<string, string | number> = { page };
    if (filter) params.filter = filter;
    if (search) params.search = search;
    const r = await this.client.get('/admin/users', { params });
    return r.data;
  }

  async updateUserStatus(userId: string, action: string) {
    const r = await this.client.patch(`/admin/users/${userId}/status`, { action });
    return r.data;
  }
}

export const apiClient = new ApiClient();
