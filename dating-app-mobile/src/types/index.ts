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
  isLoading: boolean;
  error: string | null;
}
