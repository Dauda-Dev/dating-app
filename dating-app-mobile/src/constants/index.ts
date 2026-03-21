export const COLORS = {
  primary: '#FF6B9D',
  secondary: '#4ECDC4',
  accent: '#FFD93D',
  success: '#6BCF7F',
  danger: '#FF5252',
  warning: '#FFA726',
  black: '#1A1A1A',
  darkGray: '#4A4A4A',
  gray: '#9E9E9E',
  lightGray: '#E0E0E0',
  white: '#FFFFFF',
  background: '#F8F9FA',
  gradientStart: '#FF6B9D',
  gradientEnd: '#C44569',
  online: '#6BCF7F',
  offline: '#9E9E9E',
  away: '#FFA726',
};

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
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  UPDATE_PROFILE: '/users/profile',
  UPLOAD_PHOTO: '/users/profile-picture',
  ELIGIBLE_USERS: '/discovery/eligible',
  LIKE_USER: '/discovery/like',
  GET_USER: '/discovery/user',
  MY_MATCHES: '/matches',
  MATCH_DETAILS: '/matches',
  REJECT_MATCH: '/matches/reject',
  INITIALIZE_VIDEO: '/video/initialize',
  PROPOSE_DATE: '/dates/propose',
  ACCEPT_DATE: '/dates/accept',
  COMPLETE_DATE: '/dates/complete',
  REQUEST_STEAL: '/steals/request',
  PENDING_STEALS: '/steals/pending',
};

export const VIDEO_CONFIG = {
  MIN_DURATION: 240,
  WARNING_TIME: 30,
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
