import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../constants';

const API_BASE_URL = 'https://dating-app-xgvv.onrender.com/api'; // Android emulator → localhost
// For physical device, replace with your machine's LAN IP e.g. http://192.168.x.x:5000/api

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

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
        if (error.response?.status === 401) {
          await this.clearToken();
        }
        return Promise.reject(error);
      }
    );
  }

  async setToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem('token', token);
  }

  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('refreshToken');
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
  async getEligibleUsers(limit = 10, offset = 0) {
    const r = await this.client.get(API_ENDPOINTS.ELIGIBLE_USERS, { params: { limit, offset } });
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
}

export const apiClient = new ApiClient();
