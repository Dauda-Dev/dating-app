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
  hotTakes?: string[];
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
  User1?: User;
  User2?: User;
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

export interface VideoSession {
  id: string;
  matchId: string;
  dailyRoomUrl?: string;
  roomUrl?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
}

export interface DateProposal {
  id: string;
  matchId: string;
  proposerId: string;
  proposedById?: string;
  proposedDate: string;
  location: string;
  venue: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  createdAt: string;
  rating?: number;
  feedback?: string;
}

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
  profilePicture?: string;
  photos?: string[];
  hobbies?: string[];
  interests?: string[];
  compatibilityScore?: number;
  profile?: Profile;
}

export interface StealRequest {
  id: string;
  requesterId: string;
  targetUserId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
  requester?: User;
  targetUser?: User;
}

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
  sentRequests: StealRequest[];
  isLoading: boolean;
  isSentLoading: boolean;
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
  /** messages keyed by matchId */
  messagesByMatch: Record<string, ChatMessage[]>;
  /** whether we're loading history for a given matchId */
  loadingByMatch: Record<string, boolean>;
  /** whether there are more (older) messages to load */
  hasMoreByMatch: Record<string, boolean>;
  /** unread counts keyed by matchId */
  unreadCounts: Record<string, number>;
  error: string | null;
}

// ── Report / Admin ───────────────────────────────────────────────────────────

export type ReportReason =
  | 'harassment'
  | 'fake_profile'
  | 'underage'
  | 'spam'
  | 'inappropriate_content'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

export type AdminUserAction =
  | 'suspend_7d'
  | 'suspend_30d'
  | 'suspend_permanent'
  | 'deactivate'
  | 'activate';

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  matchId?: string | null;
  reason: ReportReason;
  details?: string | null;
  status: ReportStatus;
  adminNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  reporter?: Partial<User & { profile?: Partial<Profile> }>;
  reportedUser?: Partial<User & { profile?: Partial<Profile> }>;
  reviewer?: Partial<User>;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  isSuspended: boolean;
  suspendedUntil?: string | null;
  role: 'user' | 'admin' | 'moderator';
  createdAt: string;
  profile?: Partial<Profile>;
}

export interface AdminState {
  reports: Report[];
  currentReport: Report | null;
  users: AdminUser[];
  pagination: { total: number; page: number; pages: number } | null;
  isLoading: boolean;
  error: string | null;
}

export interface TutorialStep {
  title: string;
  body: string;
  emoji: string;
}

export interface TutorialState {
  hasSeenTutorial: boolean;
  isVisible: boolean;
  currentStep: number;
  steps: TutorialStep[];
}
