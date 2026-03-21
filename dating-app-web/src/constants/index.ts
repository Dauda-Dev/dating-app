// Colors
export const COLORS = {
  primary: '#FF6B9D',
  secondary: '#4ECDC4',
  accent: '#FFD93D',
  success: '#6BCF7F',
  danger: '#FF5252',
  warning: '#FFA726',
  
  // Neutrals
  black: '#1A1A1A',
  darkGray: '#4A4A4A',
  gray: '#9E9E9E',
  lightGray: '#E0E0E0',
  white: '#FFFFFF',
  background: '#F8F9FA',
  
  // Gradients
  gradientStart: '#FF6B9D',
  gradientEnd: '#C44569',
  
  // Status
  online: '#6BCF7F',
  offline: '#9E9E9E',
  away: '#FFA726',
};

// Match Status Display — keys match backend ENUM values
export const MATCH_STATUS_CONFIG: Record<string, { label: string; color: string; action: string }> = {
  matched_locked: {
    label: '🔒 Locked — Schedule Video Call',
    color: '#FF6B9D',
    action: 'Start Video Call',
  },
  video_call_completed: {
    label: '📹 Video Call Done — Propose a Date',
    color: '#4ECDC4',
    action: 'Propose Date',
  },
  date_accepted: {
    label: '📅 Date Accepted',
    color: '#FFD93D',
    action: 'View Date Details',
  },
  post_date_open: {
    label: '✅ Relationship Open',
    color: '#6BCF7F',
    action: 'Continue',
  },
  broken: {
    label: '💔 Broken',
    color: '#9E9E9E',
    action: '',
  },
};

// Subscription Tiers
export const SUBSCRIPTION_TIERS = {
  free: {
    label: 'Free',
    features: ['1 match per week', 'Basic filters', 'Standard support'],
    price: 0,
  },
  premium: {
    label: 'Premium',
    features: ['3 matches per week', 'Advanced filters', 'Priority support', 'Unlimited super likes'],
    price: 9.99,
  },
  vip: {
    label: 'VIP',
    features: ['Unlimited matches', 'All filters', '24/7 VIP support', 'Boost profile', 'See who liked you'],
    price: 19.99,
  },
};

// Personality Traits
export const PERSONALITY_TRAITS = [
  {
    key: 'openness',
    label: 'Openness',
    description: 'Curious, creative, and open to new experiences',
    low: 'Practical',
    high: 'Creative',
  },
  {
    key: 'conscientiousness',
    label: 'Conscientiousness',
    description: 'Organized, responsible, and goal-oriented',
    low: 'Spontaneous',
    high: 'Organized',
  },
  {
    key: 'extraversion',
    label: 'Extraversion',
    description: 'Outgoing, energetic, and social',
    low: 'Introverted',
    high: 'Extraverted',
  },
  {
    key: 'agreeableness',
    label: 'Agreeableness',
    description: 'Friendly, compassionate, and cooperative',
    low: 'Challenging',
    high: 'Agreeable',
  },
  {
    key: 'neuroticism',
    label: 'Emotional Stability',
    description: 'Calm, confident, and emotionally stable',
    low: 'Stable',
    high: 'Sensitive',
  },
];

// Hobbies & Interests
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
  'Coffee', 'Environment', 'Social Justice', 'Entrepreneurship', 'Finance', 'Real Estate',
  'Health', 'Wellness', 'Spirituality', 'Astrology', 'Adventure', 'Volunteering',
];

// Validation Rules
export const VALIDATION_RULES = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
  },
  age: {
    min: 18,
    max: 100,
  },
  bio: {
    maxLength: 500,
  },
  message: {
    maxLength: 1000,
  },
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',
  VERIFY_EMAIL: '/auth/verify-email',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  
  // Users
  UPDATE_PROFILE: '/users/profile',
  UPLOAD_PHOTO: '/users/profile-picture',
  DELETE_PHOTO: '/users/photos',
  
  // Discovery
  ELIGIBLE_USERS: '/discovery/eligible',
  LIKE_USER: '/discovery/like',
  GET_USER: '/discovery/user',
  
  // Matches
  MY_MATCHES: '/matches',
  MATCH_DETAILS: '/matches',
  UNMATCH: '/matches',
  REJECT_MATCH: '/matches/reject',
  
  // Video
  INITIALIZE_VIDEO: '/video/initialize',
  COMPLETE_VIDEO: '/video/sessions',
  VIDEO_STATUS: '/video/sessions',
  
  // Dates
  PROPOSE_DATE: '/dates/propose',
  ACCEPT_DATE: '/dates/accept',
  COMPLETE_DATE: '/dates/complete',
  
  // Steals
  REQUEST_STEAL: '/steals/request',
  ACCEPT_STEAL: '/steals/requests',
  REJECT_STEAL: '/steals/requests',
  PENDING_STEALS: '/steals/pending',
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Your session has expired. Please login again.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_TAKEN: 'This email is already registered.',
  VALIDATION_ERROR: 'Please check your input and try again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Welcome back!',
  SIGNUP: 'Account created successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PHOTO_UPLOADED: 'Photo uploaded successfully!',
  MATCH_CREATED: "It's a match!",
  DATE_PROPOSED: 'Date proposal sent!',
  DATE_ACCEPTED: 'Date accepted!',
  STEAL_SENT: 'Steal request sent!',
};

// Feature Flags
export const FEATURES = {
  VIDEO_CALLING: true,
  DATE_PLANNING: true,
  STEAL_MECHANIC: true,
  NOTIFICATIONS: true,
  ANALYTICS: false,
};

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  DISCOVERY_LIMIT: 10,
  MATCHES_LIMIT: 20,
};

// Video Call
export const VIDEO_CONFIG = {
  MIN_DURATION: 240, // 4 minutes in seconds
  WARNING_TIME: 30, // Show warning 30 seconds before minimum
};

// Timing
export const TIMING = {
  STEAL_EXPIRY_HOURS: 48,
  TOKEN_REFRESH_THRESHOLD: 300, // 5 minutes before expiry
  POLLING_INTERVAL: 30000, // 30 seconds
};
