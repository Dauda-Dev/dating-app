// Theme tokens — single source of truth
export { COLORS, LIGHT_COLORS, DARK_COLORS, ThemeContext, useTheme } from './theme';
export type { AppColors, } from './theme';

export const MATCH_STATUS_CONFIG: Record<string, { label: string; color: string; action: string }> = {
  matched_locked: { label: '🔒 Locked — Schedule Video Call', color: '#FF6B9D', action: 'Start Video Call' },
  video_call_completed: { label: '📹 Video Call Done — Propose a Date', color: '#4ECDC4', action: 'Propose Date' },
  date_accepted: { label: '📅 Date Accepted', color: '#FFD93D', action: 'View Date Details' },
  post_date_open: { label: '✅ Relationship Open', color: '#6BCF7F', action: 'Continue' },
  broken: { label: '💔 Broken', color: '#9E9E9E', action: '' },
};

export const API_ENDPOINTS = {
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',
  VERIFY_EMAIL: '/auth/verify-email',
  VERIFY_EMAIL_OTP: '/auth/verify-email-otp',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  UPDATE_PROFILE: '/users/profile',
  UPLOAD_PHOTO: '/users/profile-picture',
  ELIGIBLE_USERS: '/discovery/eligible',
  LIKE_USER: '/discovery/like',
  GET_USER: '/discovery/user',
  LIKED_ME: '/discovery/liked-me',
  LIKE_QUOTA: '/discovery/quota',
  UNDO_SWIPE: '/discovery/undo',
  MY_MATCHES: '/matches',
  MATCH_DETAILS: '/matches',
  REJECT_MATCH: '/matches/reject',
  INITIALIZE_VIDEO: '/video/initialize',
  PROPOSE_DATE: '/dates/propose',
  ACCEPT_DATE: '/dates/accept',
  COMPLETE_DATE: '/dates/complete',
  REQUEST_STEAL: '/steals/request',
  PENDING_STEALS: '/steals/pending',
  SENT_STEALS: '/steals/sent',
  ACCEPT_STEAL: '/steals',
  REJECT_STEAL: '/steals',
  CANCEL_STEAL: '/steals/requests',
  RESEND_VERIFICATION: '/auth/resend-verification',
  PAYMENT_PLANS: '/payments/plans',
  PAYMENT_INITIALIZE: '/payments/initialize',
  PAYMENT_VERIFY: '/payments/verify',
  PAYMENT_STORE_INITIALIZE: '/payments/store/initialize',
  PAYMENT_STORE_VALIDATE: '/payments/store/validate',
  PAYMENT_ENTITLEMENTS: '/payments/entitlements',
  NOTIFICATION_PREFERENCES: '/notifications/preferences',
  ADS_CONFIG: '/ads/config',
  ADS_EVENTS: '/ads/events',
  GOOGLE_MOBILE_AUTH: '/auth/google/mobile',
};

export const VIDEO_CONFIG = {
  MIN_DURATION: 120,
  WARNING_TIME: 20,
};

export const HOBBIES_OPTIONS = [
  'Reading', 'Writing', 'Cooking', 'Baking', 'Photography', 'Painting',
  'Drawing', 'Music', 'Dancing', 'Singing', 'Gaming', 'Sports',
  'Hiking', 'Running', 'Cycling', 'Swimming', 'Yoga', 'Gym',
  'Travel', 'Movies', 'TV Shows', 'Theater', 'Concerts', 'Museums',
  'Gardening', 'DIY', 'Crafts', 'Fashion', 'Beauty', 'Pets',
];

export const INTERESTS_OPTIONS = [
  'Technology', 'Science', 'History', 'Politics', 'Philosophy', 'Psychology',
  'Art', 'Literature', 'Film', 'Music', 'Food', 'Wine',
  'Coffee', 'Environment', 'Social Justice', 'Entrepreneurship', 'Finance',
  'Health', 'Wellness', 'Spirituality', 'Astrology', 'Adventure', 'Volunteering',
];

export const PERSONALITY_TRAITS = [
  { key: 'openness', label: 'Openness', low: 'Practical', high: 'Creative' },
  { key: 'conscientiousness', label: 'Conscientiousness', low: 'Spontaneous', high: 'Organized' },
  { key: 'extraversion', label: 'Extraversion', low: 'Introverted', high: 'Extraverted' },
  { key: 'agreeableness', label: 'Agreeableness', low: 'Challenging', high: 'Agreeable' },
  { key: 'neuroticism', label: 'Emotional Stability', low: 'Stable', high: 'Sensitive' },
];
