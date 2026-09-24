export type UserRole = 'user' | 'admin';

export interface User {
  id: string; // Secure UUID (e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  username: string;
  displayName: string;
  name?: string; // Full name
  email?: string;
  avatar: string;
  bio?: string;
  country?: string; // e.g. Pakistan
  countryCode?: string; // e.g. PK
  countryFlag?: string; // e.g. 🇵🇰
  dialCode?: string; // e.g. +92
  normalizedPhone?: string; // e.g. +923012345678 (private, never shown publicly)
  maskedPhone?: string; // e.g. +92 301 *** 5678 (for admin or account view)
  role: UserRole;
  level: number;
  xp: number;
  validChatCount: number;
  totalMessagesSent: number;
  streakDays: number;
  validMessageDates?: string[];
  lastValidMessageDate?: string;
  longestStreak?: number;
  chattedToday?: boolean;
  lastActiveAt: string;
  createdAt: string;
  isBanned: boolean;
  isSuspended?: boolean;
  blockedUserIds: string[];
  isOnline?: boolean;
  onlineStatus?: 'online' | 'away' | 'offline';
  wallet: {
    availableBalance: number;
    totalEarned: number;
    transactions: RewardTransaction[];
  };
  payoutDetails?: {
    jazzcash?: PaymentAccountDetails;
    easypaisa?: PaymentAccountDetails;
    preferredMethod?: PaymentMethod;
  };
  rewardRequests?: RewardRequest[];
  claimedMilestones: number[]; // e.g. [10000]
}

export type PaymentMethod = 'jazzcash' | 'easypaisa';

export interface PaymentAccountDetails {
  method: PaymentMethod;
  accountHolderName: string;
  maskedNumber: string; // e.g. "0301******32"
  updatedAt: string;
}

export type RewardRequestStatus = 'Pending' | 'Under Review' | 'Approved' | 'Paid' | 'Rejected' | 'Cancelled';

export interface RewardRequest {
  id: string;
  userId: string;
  userName: string;
  userValidChatCount: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  accountHolderName: string;
  maskedMobileNumber: string;
  status: RewardRequestStatus;
  requestDate: string;
  paidDate?: string;
  transactionReference?: string;
  processedByAdminId?: string;
  rejectionReason?: string;
  fraudStatus: 'clean' | 'suspicious' | 'verified';
}

export interface AdminPaymentSettings {
  jazzCashEnabled: boolean;
  easyPaisaEnabled: boolean;
  rewardRequestsEnabled: boolean;
  minRewardThreshold: number;
  manualReview: boolean;
  autoRewardEligibility: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  icon: string;
  description: string;
  requirementType: 'chats' | 'streak' | 'daily' | 'starter' | 'reward';
  targetCount: number;
  unlocked: boolean;
  unlockedAt?: string;
  xpReward: number;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
}

export interface MessageReaction {
  emoji: string;
  users: string[]; // usernames or user IDs
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isValidChat: boolean;
  spamReason?: string;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  reactions: Record<string, string[]>; // emoji => array of userIds
  isDeleted?: boolean;
  readBy: string[];
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants?: User[];
  updatedAt: string;
  lastMessage?: Message;
  unreadCount?: number;
  status?: 'pending' | 'accepted' | 'declined';
  requestedBy?: string;
  requestedAt?: string;
}

export interface RewardTransaction {
  id: string;
  userId: string;
  type: 'milestone_reward' | 'withdrawal' | 'bonus';
  amount: number;
  currency: string;
  description: string;
  timestamp: string;
  status: 'credited' | 'processed' | 'pending';
  milestoneCount?: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  icon?: string;
  type: 'reply' | 'streak' | 'achievement' | 'reward' | 'warning' | 'system';
  timestamp: string;
  read: boolean;
}

export interface SuspiciousActivityLog {
  id: string;
  userId: string;
  username: string;
  reason: string;
  details: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
}

export interface UserReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: 'spam' | 'harassment' | 'fake_account' | 'inappropriate' | 'scam';
  details: string;
  timestamp: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface UserAuthSettings {
  passwordlessEntry: boolean;
  nameRequired: boolean;
  whatsappRequired: boolean;
  phoneVerification: boolean;
  otpVerification: boolean;
  chatRequestApproval: boolean;
  sessionDurationDays: number;
  duplicatePhonePrevention: boolean;
  newUserRegistration: boolean;
}

export interface AdminSecuritySettings {
  failedLoginProtection: boolean;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  twoFactorEnabled: boolean;
}

export interface AuthProviderInfo {
  smsProvider: { name: string; status: 'Connected' | 'Not Connected'; configured: boolean };
  whatsappProvider: { name: string; status: 'Connected' | 'Not Connected'; configured: boolean };
}

export interface ChatSettings {
  maxMessageLength: number;
  rapidRateLimitMs: number;
  chatRequestMode: boolean;
  userBlocking: boolean;
  emojiReactions: boolean;
  readReceipts: boolean;
  typingIndicator: boolean;
  maintenanceMode: boolean;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  target?: string;
  result: 'success' | 'failed';
  timestamp: string;
  details: string;
}

export interface SystemConfig {
  milestoneChats: number;
  milestoneRewardAmount: number;
  currencySymbol: string;
  minMessageLength: number;
  rapidRateLimitMs: number;
  announcement: string;
  userAuth?: UserAuthSettings;
  adminSecurity?: AdminSecuritySettings;
  authProviders?: AuthProviderInfo;
  chatSettings?: ChatSettings;
  paymentSettings?: AdminPaymentSettings;
}

export interface LeaderboardUser {
  rank: number;
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  country?: string;
  countryFlag?: string;
  validChatCount: number;
  level: number;
  xp: number;
  streakDays: number;
  badges: string[];
}

export interface ConversationStarter {
  id: string;
  text: string;
  category: 'funny' | 'weird' | 'deep' | 'would-you-rather';
}

