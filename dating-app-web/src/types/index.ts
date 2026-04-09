// User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: string;
  profilePhoto?: string;
  relationshipStatus?: string;
  isEmailVerified: boolean;
  // Legacy alias
  emailVerified?: boolean;
  subscriptionTier?: 'free' | 'premium' | 'gold';
  profileCompleted?: boolean;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt?: string;
  profile?: Profile;
}

export interface Profile {
  userId: string;
  bio?: string;
  location?: string;
  profilePicture?: string;
  photos: string[];
  hobbies: string[];
  interests: string[];
  occupation?: string;
  education?: string;
  height?: number;
  relationshipGoal?: 'casual' | 'serious' | 'friendship' | 'unsure';
  personality: PersonalityTraits;
  preferences: Preferences;
  profileComplete: boolean;
}

export interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface Preferences {
  ageMin: number;
  ageMax: number;
  maxDistance: number;
  lookingFor: 'men' | 'women' | 'everyone';
}

// Match Types
export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  status: MatchStatus;
  compatibilityScore?: number;
  matchedAt?: string;
  createdAt: string;
  lockedAt?: string;
  videoCallCompletedAt?: string;
  dateAcceptedAt?: string;
  brokenAt?: string;
  brokenReason?: string;
  lastInteractionAt?: string;
  // Sequelize association aliases returned by backend
  User1?: User;
  User2?: User;
  // Legacy aliases (may not be present)
  user?: User;
  partner?: User;
  videoSession?: VideoSession;
  videoSessions?: VideoSession[];
  dates?: DateProposal[];
}

export type MatchStatus = 
  | 'matched_locked'
  | 'video_call_completed'
  | 'date_accepted'
  | 'post_date_open'
  | 'broken';

// Video Session Types
export interface VideoSession {
  id: string;
  matchId: string;
  roomUrl: string;
  roomToken: string;
  scheduledFor?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  minimumDuration: number;
}

// Date Types
export interface DateProposal {
  id: string;
  matchId: string;
  proposerId: string;
  proposedDate: string;
  location: string;
  venue: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  createdAt: string;
  rating?: number;
  feedback?: string;
}

// Discovery Types
export interface DiscoveryUser {
  id: string;
  firstName: string;
  lastName?: string;
  age?: number;
  dateOfBirth?: string;
  gender?: string;
  bio?: string;
  location?: string;
  profilePhoto?: string;
  // Legacy alias
  profilePicture?: string;
  photos?: string[];
  hobbies?: string[];
  interests?: string[];
  compatibilityScore?: number;
  relationshipStatus?: string;
  profile?: Profile;
}

export interface Like {
  id: string;
  likerId: string;
  likedUserId: string;
  likeType: 'like' | 'super_like' | 'reject';
  createdAt: string;
}

// Steal Types
export interface StealRequest {
  id: string;
  requesterId: string;
  targetUserId: string;
  currentPartnerId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
  requester?: User;
  targetUser?: User;
}

// API Response Types
export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'non-binary';
}

export interface ProfileEditForm {
  bio?: string;
  location?: string;
  hobbies: string[];
  interests: string[];
  occupation?: string;
  education?: string;
  height?: number;
  relationshipGoal?: 'casual' | 'serious' | 'friendship' | 'unsure';
}

export interface DateProposalForm {
  proposedDate: string;
  location: string;
  venue: string;
  message?: string;
}

export interface StealRequestForm {
  targetUserId: string;
  message?: string;
}

// Redux State Types
export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  needsOnboarding: boolean;
}

export interface DiscoveryState {
  users: DiscoveryUser[];
  currentIndex: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
}

export interface MatchState {
  matches: Match[];
  currentMatch: Match | null;
  isLoading: boolean;
  error: string | null;
}

export interface StealState {
  incomingRequests: StealRequest[];
  outgoingRequests: StealRequest[];
  isLoading: boolean;
  error: string | null;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  sender?: Pick<User, 'id' | 'firstName' | 'lastName' | 'profilePhoto'>;
}

export interface ChatState {
  messagesByMatch: Record<string, ChatMessage[]>;
  loadingByMatch: Record<string, boolean>;
  hasMoreByMatch: Record<string, boolean>;
  unreadCounts: Record<string, number>;
  error: string | null;
}
