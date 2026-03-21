import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_ENDPOINTS } from '../constants';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired - clear auth state
          this.clearToken();
          localStorage.removeItem('refreshToken');
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post(API_ENDPOINTS.LOGIN, { email, password });
    return response.data;
  }

  async signup(data: any) {
    const response = await this.client.post(API_ENDPOINTS.SIGNUP, data);
    return response.data;
  }

  async logout() {
    const response = await this.client.post(API_ENDPOINTS.LOGOUT);
    this.clearToken();
    return response.data;
  }

  async refreshToken(refreshToken: string) {
    const response = await this.client.post(API_ENDPOINTS.REFRESH, { refreshToken });
    return response.data;
  }

  async getMe() {
    const response = await this.client.get(API_ENDPOINTS.ME);
    return response.data;
  }

  async verifyEmail(token: string) {
    const response = await this.client.post(API_ENDPOINTS.VERIFY_EMAIL, { token });
    return response.data;
  }

  async resendVerification(email: string) {
    const response = await this.client.post('/auth/resend-verification', { email });
    return response.data;
  }

  async forgotPassword(email: string) {
    const response = await this.client.post(API_ENDPOINTS.FORGOT_PASSWORD, { email });
    return response.data;
  }

  async resetPassword(token: string, password: string) {
    const response = await this.client.post(API_ENDPOINTS.RESET_PASSWORD, { token, password });
    return response.data;
  }

  // User/Profile endpoints
  async updateProfile(data: any) {
    const response = await this.client.put(API_ENDPOINTS.UPDATE_PROFILE, data);
    return response.data;
  }

  async uploadProfilePicture(file: File) {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await this.client.post(API_ENDPOINTS.UPLOAD_PHOTO, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async uploadGalleryPhoto(file: File) {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await this.client.post('/users/gallery-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async deleteGalleryPhoto(photoUrl: string) {
    const response = await this.client.delete('/users/gallery-photo', {
      data: { photoUrl },
    });
    return response.data;
  }

  async deletePhoto(photoUrl: string) {
    const response = await this.client.delete(`${API_ENDPOINTS.DELETE_PHOTO}/${encodeURIComponent(photoUrl)}`);
    return response.data;
  }

  // Discovery endpoints
  async getEligibleUsers(limit = 10, offset = 0) {
    const response = await this.client.get(API_ENDPOINTS.ELIGIBLE_USERS, {
      params: { limit, offset },
    });
    return response.data;
  }

  async likeUser(userId: string, likeType: 'like' | 'super_like' | 'reject') {
    const response = await this.client.post(API_ENDPOINTS.LIKE_USER, { toUserId: userId, likeType });
    return response.data;
  }

  async getUserById(userId: string) {
    const response = await this.client.get(`${API_ENDPOINTS.GET_USER}/${userId}`);
    return response.data;
  }

  // Match endpoints
  async getMatches(limit = 20, offset = 0) {
    const response = await this.client.get(API_ENDPOINTS.MY_MATCHES, {
      params: { limit, offset },
    });
    return response.data;
  }

  async getMatchDetails(matchId: string) {
    const response = await this.client.get(`${API_ENDPOINTS.MATCH_DETAILS}/${matchId}`);
    return response.data;
  }

  async unmatch(matchId: string) {
    const response = await this.client.delete(`${API_ENDPOINTS.UNMATCH}/${matchId}`);
    return response.data;
  }

  async rejectMatch(matchId: string) {
    const response = await this.client.post(API_ENDPOINTS.REJECT_MATCH, { matchId });
    return response.data;
  }

  // Video endpoints
  async initializeVideoCall(matchId: string) {
    const response = await this.client.post(API_ENDPOINTS.INITIALIZE_VIDEO, { matchId });
    return response.data;
  }

  async completeVideoSession(sessionId: string, durationSeconds: number) {
    const response = await this.client.post(
      `/video/sessions/${sessionId}/complete`,
      { durationSeconds }
    );
    return response.data;
  }

  async getVideoSessionStatus(sessionId: string) {
    const response = await this.client.get(`${API_ENDPOINTS.VIDEO_STATUS}/${sessionId}`);
    return response.data;
  }

  // Date endpoints
  async proposeDate(matchId: string, data: any) {
    const response = await this.client.post(API_ENDPOINTS.PROPOSE_DATE, { matchId, ...data });
    return response.data;
  }

  async acceptDate(dateId: string) {
    const response = await this.client.post(API_ENDPOINTS.ACCEPT_DATE, { dateId });
    return response.data;
  }

  async completeDate(dateId: string, rating: number, feedback?: string) {
    const response = await this.client.post(API_ENDPOINTS.COMPLETE_DATE, { dateId, rating, feedback });
    return response.data;
  }

  // Steal endpoints
  async requestSteal(targetUserId: string, message?: string) {
    const response = await this.client.post(API_ENDPOINTS.REQUEST_STEAL, { targetUserId, message });
    return response.data;
  }

  async acceptSteal(requestId: string) {
    const response = await this.client.post(`${API_ENDPOINTS.ACCEPT_STEAL}/${requestId}/accept`);
    return response.data;
  }

  async rejectSteal(requestId: string) {
    const response = await this.client.post(`${API_ENDPOINTS.REJECT_STEAL}/${requestId}/reject`);
    return response.data;
  }

  async getPendingSteals() {
    const response = await this.client.get(API_ENDPOINTS.PENDING_STEALS);
    return response.data;
  }
}

export const apiClient = new ApiClient();
