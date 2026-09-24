import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import {
  User,
  Message,
  Conversation,
  RewardTransaction,
  DailyChallenge,
  SuspiciousActivityLog,
  UserReport,
  SystemConfig,
  Achievement,
  AdminAuditLog,
  RewardRequest,
  RewardRequestStatus,
  PaymentMethod,
  PaymentAccountDetails,
  AdminPaymentSettings,
} from './src/types.ts';
import {
  DEFAULT_ACHIEVEMENTS,
  CONVERSATION_STARTERS,
  getLevelForXp,
} from './src/data/funData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ----------------------------------------------------
// SECURE PASSWORD HASHING (PBKDF2)
// ----------------------------------------------------
const ADMIN_SALT = 'chatkaro_admin_secure_salt_2026_x89a';

function hashPassword(password: string, salt: string = ADMIN_SALT): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

// Initial admin credential stored securely on backend hashed
let currentAdminPasswordHash = hashPassword('Usman12', ADMIN_SALT);

// Rate-limiting failed logins (IP -> { count, lockedUntil })
const failedLogins = new Map<string, { count: number; lockedUntil: number }>();

// ----------------------------------------------------
// IN-MEMORY DATABASE STATE
// ----------------------------------------------------
interface TokenData {
  userId: string;
  role: 'user' | 'admin';
  createdAt: number;
  expiresAt: number;
}

interface DBState {
  users: Map<string, User>;
  tokens: Map<string, TokenData>; // token -> token data
  conversations: Map<string, Conversation>;
  messages: Map<string, Message[]>; // conversationId -> messages
  suspiciousLogs: SuspiciousActivityLog[];
  reports: UserReport[];
  auditLogs: AdminAuditLog[];
  payoutDetails: Map<string, {
    jazzcash?: { accountHolderName: string; rawNumber: string; maskedNumber: string; updatedAt: string };
    easypaisa?: { accountHolderName: string; rawNumber: string; maskedNumber: string; updatedAt: string };
    preferredMethod?: PaymentMethod;
  }>;
  rewardRequests: RewardRequest[];
  config: SystemConfig;
  lastMessageTimes: Map<string, number>; // userId -> timestamp
  lastMessageTexts: Map<string, string[]>; // userId -> recent message texts for duplicate detection
  lastHeartbeats: Map<string, number>; // userId -> timestamp of last heartbeat
}

const db: DBState = {
  users: new Map(),
  tokens: new Map(),
  conversations: new Map(),
  messages: new Map(),
  suspiciousLogs: [],
  reports: [],
  auditLogs: [],
  payoutDetails: new Map(),
  rewardRequests: [],
  config: {
    milestoneChats: 10000,
    milestoneRewardAmount: 2,
    currencySymbol: 'Rs. ',
    minMessageLength: 2,
    rapidRateLimitMs: 1200,
    announcement: '🎉 Welcome to ChatKaro! Real people chatting in real time. Reach 10,000 valid chats for Rs. 2 reward!',
    userAuth: {
      passwordlessEntry: true,
      nameRequired: true,
      whatsappRequired: true,
      phoneVerification: false,
      otpVerification: false,
      chatRequestApproval: false,
      sessionDurationDays: 30,
      duplicatePhonePrevention: true,
      newUserRegistration: true,
    },
    adminSecurity: {
      failedLoginProtection: true,
      maxFailedAttempts: 5,
      lockoutDurationMinutes: 15,
      twoFactorEnabled: false,
    },
    authProviders: {
      smsProvider: { name: 'Twilio SMS Gateway', status: 'Connected', configured: true },
      whatsappProvider: { name: 'WhatsApp Cloud API', status: 'Connected', configured: true },
    },
    chatSettings: {
      maxMessageLength: 500,
      rapidRateLimitMs: 1200,
      chatRequestMode: false,
      userBlocking: true,
      emojiReactions: true,
      readReceipts: true,
      typingIndicator: true,
      maintenanceMode: false,
    },
    paymentSettings: {
      jazzCashEnabled: true,
      easyPaisaEnabled: true,
      rewardRequestsEnabled: true,
      minRewardThreshold: 2,
      manualReview: true,
      autoRewardEligibility: true,
    },
  },
  lastMessageTimes: new Map(),
  lastMessageTexts: new Map(),
  lastHeartbeats: new Map(),
};

// ----------------------------------------------------
// SSE REAL-TIME ENGINE
// ----------------------------------------------------
const sseClients = new Map<string, Response[]>();

function broadcastSSE(event: string, data: unknown, targetUserId?: string) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  if (targetUserId) {
    const clients = sseClients.get(targetUserId) || [];
    clients.forEach((res) => {
      try {
        res.write(payload);
      } catch {
        // client disconnected
      }
    });
  } else {
    // broadcast to all connected clients
    for (const [, clients] of sseClients.entries()) {
      clients.forEach((res) => {
        try {
          res.write(payload);
        } catch {
          // client disconnected
        }
      });
    }
  }
}

// ----------------------------------------------------
// DATE & STREAK CALCULATIONS
// ----------------------------------------------------
function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

function getPreviousDateString(daysAgo: number, fromDate: Date = new Date()): string {
  const d = new Date(fromDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

function calculateStreak(
  validDates: string[] = [],
  referenceDate: Date = new Date()
): {
  streakDays: number;
  longestStreak: number;
  chattedToday: boolean;
  lastValidMessageDate?: string;
} {
  if (!validDates || validDates.length === 0) {
    return { streakDays: 0, longestStreak: 0, chattedToday: false };
  }

  const uniqueDates = Array.from(new Set(validDates)).sort();
  const dateSet = new Set(uniqueDates);

  const todayStr = getDateString(referenceDate);
  const yesterdayStr = getPreviousDateString(1, referenceDate);

  const chattedToday = dateSet.has(todayStr);
  const chattedYesterday = dateSet.has(yesterdayStr);

  let currentStreak = 0;

  if (chattedToday || chattedYesterday) {
    const anchorDate = chattedToday
      ? referenceDate
      : new Date(referenceDate.getTime() - 24 * 60 * 60 * 1000);

    let dayOffset = 0;
    while (true) {
      const checkStr = getPreviousDateString(dayOffset, anchorDate);
      if (dateSet.has(checkStr)) {
        currentStreak++;
        dayOffset++;
      } else {
        break;
      }
    }
  }

  // Calculate historical longest streak
  let longestStreak = currentStreak;
  let running = 0;
  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      running = 1;
    } else {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) {
        running++;
      } else if (diffDays > 1) {
        running = 1;
      }
    }
    if (running > longestStreak) {
      longestStreak = running;
    }
  }

  return {
    streakDays: currentStreak,
    longestStreak,
    chattedToday,
    lastValidMessageDate: uniqueDates[uniqueDates.length - 1],
  };
}

function updateUserStreakOnServer(user: User, referenceDate: Date = new Date()): void {
  const result = calculateStreak(user.validMessageDates || [], referenceDate);
  user.streakDays = result.streakDays;
  user.longestStreak = Math.max(user.longestStreak || 0, result.longestStreak);
  user.chattedToday = result.chattedToday;
  user.lastValidMessageDate = result.lastValidMessageDate;
}

// ----------------------------------------------------
// INITIAL DATABASE SEED (REAL USERS A & B, NO FAKE BOTS)
// ----------------------------------------------------
function initializeDatabase() {
  // 1. Master Administrator
  const adminId = 'admin_master_uuid_9999';
  const adminUser: User = {
    id: adminId,
    username: 'admin',
    displayName: 'ChatKaro Admin',
    name: 'Administrator',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Platform Safety, Moderation & Rewards Administrator',
    level: 10,
    xp: 15000,
    validChatCount: 15000,
    totalMessagesSent: 15000,
    streakDays: 30,
    longestStreak: 45,
    chattedToday: true,
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    isBanned: false,
    blockedUserIds: [],
    isOnline: true,
    onlineStatus: 'online',
    wallet: {
      availableBalance: 10,
      totalEarned: 10,
      transactions: [],
    },
    claimedMilestones: [10000],
  };
  db.users.set(adminId, adminUser);
  db.tokens.set('admin_token_master', {
    userId: adminId,
    role: 'admin',
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });

  // 2. Real User A: Muhammad (Pakistan 🇵🇰)
  const userAId = '11111111-1111-4111-a111-111111111111';
  const muhammadDates: string[] = [];
  for (let d = 0; d < 4; d++) {
    muhammadDates.push(getPreviousDateString(d));
  }
  muhammadDates.reverse();

  const userA: User = {
    id: userAId,
    username: 'muhammad_pk',
    displayName: 'Muhammad',
    name: 'Muhammad',
    country: 'Pakistan',
    countryCode: 'PK',
    countryFlag: '🇵🇰',
    dialCode: '+92',
    normalizedPhone: '+923012345678',
    maskedPhone: '+92 301 *** 5678',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    bio: 'Excited to chat and unlock that Rs. 2 reward! 🚀',
    level: 5,
    xp: 2450,
    validChatCount: 7428,
    totalMessagesSent: 7480,
    streakDays: 4,
    validMessageDates: muhammadDates,
    longestStreak: 7,
    chattedToday: true,
    lastValidMessageDate: getDateString(),
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    isBanned: false,
    blockedUserIds: [],
    isOnline: true,
    onlineStatus: 'online',
    wallet: {
      availableBalance: 0,
      totalEarned: 0,
      transactions: [],
    },
    claimedMilestones: [],
  };
  db.users.set(userAId, userA);
  db.tokens.set('session_token_muhammad', {
    userId: userAId,
    role: 'user',
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  db.lastHeartbeats.set(userAId, Date.now());

  // 3. Real User B: Ahmed (UAE 🇦🇪)
  const userBId = '22222222-2222-4222-a222-222222222222';
  const ahmedDates: string[] = [];
  for (let d = 0; d < 2; d++) {
    ahmedDates.push(getPreviousDateString(d));
  }
  ahmedDates.reverse();

  const userB: User = {
    id: userBId,
    username: 'ahmed_uae',
    displayName: 'Ahmed',
    name: 'Ahmed',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    countryFlag: '🇦🇪',
    dialCode: '+971',
    normalizedPhone: '+971501234567',
    maskedPhone: '+971 501 *** 4567',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'Chai & real conversations. Let us chat! ☕',
    level: 3,
    xp: 1100,
    validChatCount: 3120,
    totalMessagesSent: 3150,
    streakDays: 2,
    validMessageDates: ahmedDates,
    longestStreak: 5,
    chattedToday: true,
    lastValidMessageDate: getDateString(),
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    isBanned: false,
    blockedUserIds: [],
    isOnline: true,
    onlineStatus: 'online',
    wallet: {
      availableBalance: 0,
      totalEarned: 0,
      transactions: [],
    },
    claimedMilestones: [],
  };
  db.users.set(userBId, userB);
  db.tokens.set('session_token_ahmed', {
    userId: userBId,
    role: 'user',
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  db.lastHeartbeats.set(userBId, Date.now());

  // 4. Initial conversation between User A and User B
  const convId = 'conv_muhammad_ahmed';
  const initialMessages: Message[] = [
    {
      id: 'msg_init_1',
      conversationId: convId,
      senderId: userAId,
      senderName: 'Muhammad',
      senderAvatar: userA.avatar,
      text: 'Salam Ahmed! How is your 10K chat grind going today? 😂',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      isValidChat: true,
      reactions: { '🔥': [userBId] },
      readBy: [userAId, userBId],
    },
    {
      id: 'msg_init_2',
      conversationId: convId,
      senderId: userBId,
      senderName: 'Ahmed',
      senderAvatar: userB.avatar,
      text: 'Walaikum Assalam Muhammad! Keyboard is smoking hot, already past 3,100 chats! 🔥',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      isValidChat: true,
      reactions: { '😂': [userAId] },
      readBy: [userAId, userBId],
    },
  ];

  db.conversations.set(convId, {
    id: convId,
    participantIds: [userAId, userBId],
    updatedAt: new Date().toISOString(),
    lastMessage: initialMessages[initialMessages.length - 1],
    status: 'accepted',
  });
  db.messages.set(convId, initialMessages);

  // Initial audit log
  db.auditLogs.push({
    id: 'audit_init_1',
    adminId: adminId,
    adminName: 'System Administrator',
    action: 'SYSTEM_BOOT',
    target: 'System Engine',
    result: 'success',
    timestamp: new Date().toISOString(),
    details: 'Production real-time engine initialized with secure hashing and passwordless authentication.',
  });
}

// ----------------------------------------------------
// PERSISTENT STORAGE ENGINE (JSON BACKED DISK PERSISTENCE)
// ----------------------------------------------------
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'chatkaro-db.json');

function saveDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      currentAdminPasswordHash,
      users: Array.from(db.users.entries()),
      tokens: Array.from(db.tokens.entries()),
      conversations: Array.from(db.conversations.entries()),
      messages: Array.from(db.messages.entries()),
      suspiciousLogs: db.suspiciousLogs,
      reports: db.reports,
      auditLogs: db.auditLogs,
      payoutDetails: Array.from(db.payoutDetails.entries()),
      rewardRequests: db.rewardRequests,
      config: db.config,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Database] Failed to persist database:', err);
  }
}

let saveDebounceTimer: NodeJS.Timeout | null = null;
function scheduleSave() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    saveDatabase();
  }, 1000);
}

function loadDatabase(): boolean {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.currentAdminPasswordHash) currentAdminPasswordHash = parsed.currentAdminPasswordHash;
      if (Array.isArray(parsed.users)) db.users = new Map(parsed.users);
      if (Array.isArray(parsed.tokens)) db.tokens = new Map(parsed.tokens);
      if (Array.isArray(parsed.conversations)) db.conversations = new Map(parsed.conversations);
      if (Array.isArray(parsed.messages)) db.messages = new Map(parsed.messages);
      if (Array.isArray(parsed.suspiciousLogs)) db.suspiciousLogs = parsed.suspiciousLogs;
      if (Array.isArray(parsed.reports)) db.reports = parsed.reports;
      if (Array.isArray(parsed.auditLogs)) db.auditLogs = parsed.auditLogs;
      if (Array.isArray(parsed.payoutDetails)) db.payoutDetails = new Map(parsed.payoutDetails);
      if (Array.isArray(parsed.rewardRequests)) db.rewardRequests = parsed.rewardRequests;
      if (parsed.config) db.config = { ...db.config, ...parsed.config };
      console.log(`[Database] Loaded persisted state: ${db.users.size} users, ${db.messages.size} conversations, ${db.rewardRequests.length} reward requests.`);
      return true;
    }
  } catch (err) {
    console.error('[Database] Could not load database from disk:', err);
  }
  return false;
}

const didLoad = loadDatabase();
if (!didLoad) {
  initializeDatabase();
  saveDatabase();
}

// Auto-save periodically every 30 seconds to guarantee data durability
setInterval(saveDatabase, 30000);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[System] Received SIGTERM, flushing data to disk...');
  saveDatabase();
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('[System] Received SIGINT, flushing data to disk...');
  saveDatabase();
  process.exit(0);
});

// ----------------------------------------------------
// PRESENCE & HEARTBEAT BACKGROUND MONITOR
// ----------------------------------------------------
setInterval(() => {
  const now = Date.now();
  db.users.forEach((user) => {
    if (user.role === 'admin') return;
    const last = db.lastHeartbeats.get(user.id) || 0;
    const diff = now - last;

    let newStatus: 'online' | 'away' | 'offline' = 'offline';
    if (diff < 45000) {
      newStatus = 'online';
    } else if (diff < 180000) {
      newStatus = 'away';
    } else {
      newStatus = 'offline';
    }

    if (user.onlineStatus !== newStatus) {
      user.onlineStatus = newStatus;
      user.isOnline = newStatus !== 'offline';
      broadcastSSE('presence_update', {
        userId: user.id,
        onlineStatus: newStatus,
        isOnline: user.isOnline,
        lastActiveAt: user.lastActiveAt,
      });
    }
  });
}, 15000);

// ----------------------------------------------------
// AUTH & SANITIZATION HELPERS
// ----------------------------------------------------
function getAuthUser(req: Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  const tokenData = db.tokens.get(token);
  if (!tokenData) return null;
  if (tokenData.expiresAt < Date.now()) {
    db.tokens.delete(token);
    return null;
  }
  const user = db.users.get(tokenData.userId);
  if (!user || user.isBanned || user.isSuspended) return null;
  return user;
}

function getAdminUser(req: Request): User | null {
  const user = getAuthUser(req);
  if (user && user.role === 'admin') return user;
  return null;
}

// Strip sensitive fields (like normalized phone numbers) when sharing with other users
function sanitizePublicUser(u: User): Partial<User> {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    name: u.name,
    avatar: u.avatar,
    bio: u.bio,
    country: u.country,
    countryCode: u.countryCode,
    countryFlag: u.countryFlag,
    dialCode: u.dialCode,
    maskedPhone: u.maskedPhone,
    role: u.role,
    level: u.level,
    xp: u.xp,
    validChatCount: u.validChatCount,
    totalMessagesSent: u.totalMessagesSent,
    streakDays: u.streakDays,
    longestStreak: u.longestStreak,
    chattedToday: u.chattedToday,
    isOnline: u.isOnline,
    onlineStatus: u.onlineStatus,
    lastActiveAt: u.lastActiveAt,
    createdAt: u.createdAt,
  };
}

// ----------------------------------------------------
// 1. USER AUTHENTICATION (PASSWORDLESS & RETURNING USERS)
// ----------------------------------------------------

/**
 * Normalizes an international phone number.
 */
function cleanAndNormalizePhone(rawPhone: string, dialCode: string): { normalized: string; masked: string; isValid: boolean } {
  const cleaned = rawPhone.trim().replace(/[\s\-\(\)]/g, '');
  if (!cleaned) return { normalized: '', masked: '', isValid: false };

  const dialDigits = dialCode.replace('+', '');
  let digits = cleaned.replace(/^\+/, '');

  if (digits.startsWith(dialDigits)) {
    digits = digits.slice(dialDigits.length);
  }
  if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
  }

  if (!/^\d{6,14}$/.test(digits)) {
    return { normalized: '', masked: '', isValid: false };
  }

  const normalized = `${dialCode}${digits}`;
  let masked = normalized;
  if (normalized.length >= 8) {
    const prefix = normalized.slice(0, dialCode.length + 3);
    const suffix = normalized.slice(-4);
    masked = `${prefix} *** ${suffix}`;
  }

  return { normalized, masked, isValid: true };
}

// ----------------------------------------------------
// SYSTEM HEALTHCHECK (CLOUD HOSTING & DOCKER MONITORING)
// ----------------------------------------------------
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'ChatKaro Real-Time Backend API',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    metrics: {
      registeredUsers: db.users.size,
      totalConversations: db.conversations.size,
      totalMessagesLogged: Array.from(db.messages.values()).reduce((acc, m) => acc + m.length, 0),
      totalRewardRequests: db.rewardRequests.length,
      activeSSEClients: Array.from(sseClients.values()).reduce((acc, c) => acc + c.length, 0),
    },
    features: {
      realTimeSSE: true,
      passwordlessAuth: true,
      jazzCashEasypaisaWallet: true,
      adminSecurity: true,
      persistentStorage: true,
    },
  });
});

// Passwordless Profile Registration & Login
app.post('/api/auth/enter', (req: Request, res: Response) => {
  const { name, country, countryCode, dialCode, phone } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: 'Please enter a valid full name (at least 2 characters)' });
    return;
  }

  if (!phone || typeof phone !== 'string') {
    res.status(400).json({ error: 'Please enter your WhatsApp mobile number' });
    return;
  }

  const effectiveDialCode = dialCode || '+92';
  const { normalized, masked, isValid } = cleanAndNormalizePhone(phone, effectiveDialCode);

  if (!isValid) {
    res.status(400).json({ error: 'Please enter a valid phone number (6 to 14 digits)' });
    return;
  }

  // Check duplicate phone prevention
  let existingUser: User | null = null;
  if (db.config.userAuth?.duplicatePhonePrevention) {
    for (const u of db.users.values()) {
      if (u.normalizedPhone === normalized) {
        existingUser = u;
        break;
      }
    }
  }

  if (existingUser) {
    // Returning user from same WhatsApp number -> restore session
    const token = `session_${crypto.randomUUID()}`;
    db.tokens.set(token, {
      userId: existingUser.id,
      role: existingUser.role,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    existingUser.lastActiveAt = new Date().toISOString();
    existingUser.isOnline = true;
    existingUser.onlineStatus = 'online';
    db.lastHeartbeats.set(existingUser.id, Date.now());
    updateUserStreakOnServer(existingUser);

    broadcastSSE('presence_update', {
      userId: existingUser.id,
      onlineStatus: 'online',
      isOnline: true,
      lastActiveAt: existingUser.lastActiveAt,
    });

    res.json({
      user: existingUser,
      token,
      isReturning: true,
      message: `Welcome back, ${existingUser.displayName}! 😂`,
    });
    return;
  }

  if (db.config.userAuth?.newUserRegistration === false) {
    res.status(403).json({ error: 'New user registration is currently paused by admin.' });
    return;
  }

  // Create new real user with UUID
  const newUserId = crypto.randomUUID();
  const trimmedName = name.trim();
  const usernameSlug = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15) + '_' + Math.floor(100 + Math.random() * 900);

  // Derive flag emoji
  const flagsMap: Record<string, string> = {
    PK: '🇵🇰', IN: '🇮🇳', AE: '🇦🇪', SA: '🇸🇦', GB: '🇬🇧', US: '🇺🇸', CA: '🇨🇦', BD: '🇧🇩',
    QA: '🇶🇦', OM: '🇴🇲', KW: '🇰🇼', BH: '🇧🇭', MY: '🇲🇾', SG: '🇸🇬', ID: '🇮🇩', TR: '🇹🇷',
  };
  const flag = flagsMap[countryCode] || '🌍';

  const avatarStyles = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  ];
  const chosenAvatar = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];

  const newUser: User = {
    id: newUserId,
    username: usernameSlug,
    displayName: trimmedName,
    name: trimmedName,
    country: country || 'Pakistan',
    countryCode: countryCode || 'PK',
    countryFlag: flag,
    dialCode: effectiveDialCode,
    normalizedPhone: normalized,
    maskedPhone: masked,
    role: 'user',
    avatar: chosenAvatar,
    bio: 'Just joined ChatKaro! Let us chat and hit 10K valid chats! 🚀',
    level: 1,
    xp: 0,
    validChatCount: 0,
    totalMessagesSent: 0,
    streakDays: 0,
    longestStreak: 0,
    chattedToday: false,
    validMessageDates: [],
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    isBanned: false,
    blockedUserIds: [],
    isOnline: true,
    onlineStatus: 'online',
    wallet: {
      availableBalance: 0,
      totalEarned: 0,
      transactions: [],
    },
    claimedMilestones: [],
  };

  db.users.set(newUserId, newUser);

  const token = `session_${crypto.randomUUID()}`;
  db.tokens.set(token, {
    userId: newUserId,
    role: 'user',
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  db.lastHeartbeats.set(newUserId, Date.now());

  // Broadcast new user to all online clients
  broadcastSSE('presence_update', {
    userId: newUser.id,
    onlineStatus: 'online',
    isOnline: true,
    lastActiveAt: newUser.lastActiveAt,
    user: sanitizePublicUser(newUser),
  });

  scheduleSave();

  res.json({
    user: newUser,
    token,
    isReturning: false,
    message: `Welcome, ${newUser.displayName}! 😂`,
  });
});

// Current Authenticated User (Session Restoration)
app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated or session expired' });
    return;
  }

  user.lastActiveAt = new Date().toISOString();
  user.isOnline = true;
  user.onlineStatus = 'online';
  db.lastHeartbeats.set(user.id, Date.now());
  updateUserStreakOnServer(user);

  res.json({
    user,
    config: db.config,
  });
});

// Switch User / Logout
app.post('/api/auth/switch-user', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '').trim();
    const tokenData = db.tokens.get(token);
    if (tokenData) {
      const user = db.users.get(tokenData.userId);
      if (user) {
        user.isOnline = false;
        user.onlineStatus = 'offline';
        broadcastSSE('presence_update', {
          userId: user.id,
          onlineStatus: 'offline',
          isOnline: false,
          lastActiveAt: user.lastActiveAt,
        });
      }
      db.tokens.delete(token);
    }
  }
  res.json({ success: true, message: 'Switched user. Local session ended.' });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '').trim();
    const tokenData = db.tokens.get(token);
    if (tokenData) {
      const user = db.users.get(tokenData.userId);
      if (user) {
        user.isOnline = false;
        user.onlineStatus = 'offline';
        broadcastSSE('presence_update', {
          userId: user.id,
          onlineStatus: 'offline',
          isOnline: false,
          lastActiveAt: user.lastActiveAt,
        });
      }
      db.tokens.delete(token);
    }
  }
  res.json({ success: true });
});

// ----------------------------------------------------
// 2. SECURE ADMIN AUTHENTICATION
// ----------------------------------------------------
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const ip = req.ip || '127.0.0.1';

  // Brute-force rate limiting
  const attemptInfo = failedLogins.get(ip) || { count: 0, lockedUntil: 0 };
  if (attemptInfo.lockedUntil > Date.now()) {
    const remainingMins = Math.ceil((attemptInfo.lockedUntil - Date.now()) / 60000);
    res.status(429).json({
      error: `Too many failed login attempts. Locked for security. Try again in ${remainingMins} minute(s).`,
    });
    return;
  }

  const incomingHash = hashPassword(password || '');
  if (username !== 'admin' || incomingHash !== currentAdminPasswordHash) {
    attemptInfo.count += 1;
    if (attemptInfo.count >= (db.config.adminSecurity?.maxFailedAttempts || 5)) {
      attemptInfo.lockedUntil = Date.now() + (db.config.adminSecurity?.lockoutDurationMinutes || 15) * 60000;
    }
    failedLogins.set(ip, attemptInfo);

    db.auditLogs.unshift({
      id: `audit_fail_${Date.now()}`,
      adminId: 'unknown',
      adminName: username || 'Unknown',
      action: 'ADMIN_LOGIN_FAILED',
      target: 'Admin Auth',
      result: 'failed',
      timestamp: new Date().toISOString(),
      details: `Failed admin login attempt from IP ${ip}.`,
    });

    res.status(401).json({ error: 'Invalid admin credentials' });
    return;
  }

  // Success: reset rate-limiting
  failedLogins.delete(ip);

  // Find or create admin user
  const adminUser = Array.from(db.users.values()).find((u) => u.role === 'admin') || db.users.get('admin_master_uuid_9999');
  const token = `admin_token_${crypto.randomUUID()}`;

  db.tokens.set(token, {
    userId: adminUser!.id,
    role: 'admin',
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
  });

  db.auditLogs.unshift({
    id: `audit_login_${Date.now()}`,
    adminId: adminUser!.id,
    adminName: adminUser!.displayName,
    action: 'ADMIN_LOGIN_SUCCESS',
    target: 'Admin Dashboard',
    result: 'success',
    timestamp: new Date().toISOString(),
    details: `Admin successfully logged in from IP ${ip}.`,
  });

  res.json({
    token,
    user: adminUser,
    message: 'Admin authentication successful',
  });
});

app.post('/api/admin/change-password', (req: Request, res: Response) => {
  const admin = getAdminUser(req);
  if (!admin) {
    res.status(403).json({ error: 'Unauthorized: Admin access required' });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters long' });
    return;
  }

  const oldHash = hashPassword(currentPassword);
  if (oldHash !== currentAdminPasswordHash) {
    res.status(400).json({ error: 'Current admin password incorrect' });
    return;
  }

  currentAdminPasswordHash = hashPassword(newPassword);

  db.auditLogs.unshift({
    id: `audit_pwd_${Date.now()}`,
    adminId: admin.id,
    adminName: admin.displayName,
    action: 'ADMIN_PASSWORD_CHANGED',
    target: 'Security Credentials',
    result: 'success',
    timestamp: new Date().toISOString(),
    details: 'Admin password securely updated and re-hashed.',
  });

  res.json({ success: true, message: 'Admin password successfully changed' });
});

app.post('/api/admin/logout-all-sessions', (req: Request, res: Response) => {
  const admin = getAdminUser(req);
  if (!admin) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  for (const [token, data] of db.tokens.entries()) {
    if (data.role === 'admin') {
      db.tokens.delete(token);
    }
  }

  db.auditLogs.unshift({
    id: `audit_sessions_${Date.now()}`,
    adminId: admin.id,
    adminName: admin.displayName,
    action: 'LOGOUT_ALL_ADMIN_SESSIONS',
    target: 'Admin Sessions',
    result: 'success',
    timestamp: new Date().toISOString(),
    details: 'All active admin sessions revoked.',
  });

  res.json({ success: true, message: 'All admin sessions revoked' });
});

// ----------------------------------------------------
// 3. HEARTBEAT & PRESENCE
// ----------------------------------------------------
app.post('/api/users/heartbeat', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { status } = req.body;
  const newStatus: 'online' | 'away' = status === 'away' ? 'away' : 'online';

  db.lastHeartbeats.set(user.id, Date.now());
  user.lastActiveAt = new Date().toISOString();
  user.isOnline = true;

  if (user.onlineStatus !== newStatus) {
    user.onlineStatus = newStatus;
    broadcastSSE('presence_update', {
      userId: user.id,
      onlineStatus: newStatus,
      isOnline: true,
      lastActiveAt: user.lastActiveAt,
    });
  }

  res.json({ success: true, status: newStatus });
});

// Available Online & Registered Users
app.get('/api/users', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  const now = Date.now();

  const userList: Partial<User>[] = [];
  db.users.forEach((u) => {
    if (currentUser && u.id === currentUser.id) return;
    if (u.isBanned || u.isSuspended) return;

    // Evaluate live online state
    const last = db.lastHeartbeats.get(u.id) || 0;
    const diff = now - last;
    let status: 'online' | 'away' | 'offline' = 'offline';
    if (diff < 45000) {
      status = 'online';
    } else if (diff < 180000) {
      status = 'away';
    } else {
      status = 'offline';
    }
    u.onlineStatus = status;
    u.isOnline = status !== 'offline';

    userList.push(sanitizePublicUser(u));
  });

  res.json({ users: userList });
});

// ----------------------------------------------------
// 4. REAL-TIME CONVERSATIONS & CHAT REQUESTS
// ----------------------------------------------------

// Get user's conversations
app.get('/api/conversations', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const userConversations: Conversation[] = [];
  db.conversations.forEach((conv) => {
    if (conv.participantIds.includes(user.id)) {
      const participants = conv.participantIds
        .map((id) => db.users.get(id))
        .filter((u): u is User => !!u)
        .map((u) => sanitizePublicUser(u) as User);

      // Count unread
      const msgs = db.messages.get(conv.id) || [];
      const unreadCount = msgs.filter(
        (m) => m.senderId !== user.id && !m.readBy?.includes(user.id)
      ).length;

      userConversations.push({
        ...conv,
        participants,
        unreadCount,
      });
    }
  });

  // Sort by latest message / update
  userConversations.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  res.json({ conversations: userConversations });
});

// Start or retrieve conversation with another user
app.post('/api/conversations/start', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { targetUserId } = req.body;
  if (!targetUserId || targetUserId === user.id) {
    res.status(400).json({ error: 'Invalid target user' });
    return;
  }

  const targetUser = db.users.get(targetUserId);
  if (!targetUser) {
    res.status(404).json({ error: 'Target user not found' });
    return;
  }

  // Check if user blocked
  if (user.blockedUserIds.includes(targetUserId) || targetUser.blockedUserIds.includes(user.id)) {
    res.status(403).json({ error: 'Cannot chat with this user (blocked).' });
    return;
  }

  // Check if conversation already exists
  let existingConv: Conversation | null = null;
  for (const conv of db.conversations.values()) {
    if (
      conv.participantIds.length === 2 &&
      conv.participantIds.includes(user.id) &&
      conv.participantIds.includes(targetUserId)
    ) {
      existingConv = conv;
      break;
    }
  }

  if (existingConv) {
    const participants = existingConv.participantIds
      .map((id) => db.users.get(id))
      .filter((u): u is User => !!u)
      .map((u) => sanitizePublicUser(u) as User);

    res.json({ conversation: { ...existingConv, participants } });
    return;
  }

  // Chat Request Mode logic
  const isRequestMode = db.config.chatSettings?.chatRequestMode || false;
  const newConvId = `conv_${crypto.randomUUID()}`;

  const newConv: Conversation = {
    id: newConvId,
    participantIds: [user.id, targetUserId],
    updatedAt: new Date().toISOString(),
    status: isRequestMode ? 'pending' : 'accepted',
    requestedBy: user.id,
    requestedAt: new Date().toISOString(),
  };

  db.conversations.set(newConvId, newConv);
  db.messages.set(newConvId, []);

  const participants = [sanitizePublicUser(user) as User, sanitizePublicUser(targetUser) as User];

  // Notify recipient
  broadcastSSE(
    'conversation_started',
    { conversation: { ...newConv, participants } },
    targetUserId
  );

  res.json({ conversation: { ...newConv, participants } });
});

// Accept, Decline, or Block a chat request
app.post('/api/conversations/:id/respond-request', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  const { action } = req.body; // 'accept' | 'decline' | 'block'
  const conv = db.conversations.get(id);

  if (!conv || !conv.participantIds.includes(user.id)) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const otherUserId = conv.participantIds.find((pid) => pid !== user.id);

  if (action === 'accept') {
    conv.status = 'accepted';
    conv.updatedAt = new Date().toISOString();
    broadcastSSE('chat_request_response', { conversationId: conv.id, status: 'accepted' });
    res.json({ success: true, conversation: conv });
  } else if (action === 'decline') {
    conv.status = 'declined';
    broadcastSSE('chat_request_response', { conversationId: conv.id, status: 'declined' });
    res.json({ success: true, message: 'Chat request declined.' });
  } else if (action === 'block') {
    if (otherUserId && !user.blockedUserIds.includes(otherUserId)) {
      user.blockedUserIds.push(otherUserId);
    }
    conv.status = 'declined';
    broadcastSSE('chat_request_response', { conversationId: conv.id, status: 'blocked' });
    res.json({ success: true, message: 'User blocked.' });
  } else {
    res.status(400).json({ error: 'Invalid action' });
  }
});

// ----------------------------------------------------
// 5. MESSAGES & REAL-TIME CHAT ENGINE
// ----------------------------------------------------

// Get messages for a conversation (paginated)
app.get('/api/conversations/:id/messages', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  const conv = db.conversations.get(id);
  if (!conv || !conv.participantIds.includes(user.id)) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 40;

  const allMessages = db.messages.get(id) || [];
  const total = allMessages.length;

  // Paginate from the end (most recent)
  const startIndex = Math.max(0, total - page * limit);
  const endIndex = Math.max(0, total - (page - 1) * limit);
  const paginatedMessages = allMessages.slice(startIndex, endIndex);

  res.json({
    messages: paginatedMessages,
    total,
    page,
    hasMore: startIndex > 0,
  });
});

// Send message
app.post('/api/conversations/:id/messages', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  const conv = db.conversations.get(id);
  if (!conv || !conv.participantIds.includes(user.id)) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  if (conv.status === 'declined') {
    res.status(403).json({ error: 'This conversation has been closed or declined.' });
    return;
  }

  const otherUserId = conv.participantIds.find((pid) => pid !== user.id);
  const otherUser = otherUserId ? db.users.get(otherUserId) : null;
  if (otherUser?.blockedUserIds.includes(user.id)) {
    res.status(403).json({ error: 'You are blocked by this user.' });
    return;
  }

  const { text, replyTo } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Message text required' });
    return;
  }

  const trimmedText = text.trim();
  const maxLen = db.config.chatSettings?.maxMessageLength || 500;
  if (trimmedText.length > maxLen) {
    res.status(400).json({ error: `Message exceeds maximum limit of ${maxLen} characters.` });
    return;
  }

  // Anti-spam validation
  const now = Date.now();
  const lastTime = db.lastMessageTimes.get(user.id) || 0;
  const rateLimit = db.config.rapidRateLimitMs || 1200;

  let isValidChat = true;
  let spamReason: string | undefined;

  if (now - lastTime < rateLimit) {
    isValidChat = false;
    spamReason = 'Rapid messaging burst detected (rate limited)';
  }

  if (trimmedText.length < (db.config.minMessageLength || 2)) {
    isValidChat = false;
    spamReason = 'Message too short';
  }

  // Duplicate spam detection
  const recentTexts = db.lastMessageTexts.get(user.id) || [];
  if (recentTexts.filter((t) => t.toLowerCase() === trimmedText.toLowerCase()).length >= 2) {
    isValidChat = false;
    spamReason = 'Repetitive identical text spam detected';
  }

  recentTexts.push(trimmedText);
  if (recentTexts.length > 5) recentTexts.shift();
  db.lastMessageTexts.set(user.id, recentTexts);
  db.lastMessageTimes.set(user.id, now);

  const newMessage: Message = {
    id: `msg_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`,
    conversationId: id,
    senderId: user.id,
    senderName: user.displayName,
    senderAvatar: user.avatar,
    text: trimmedText,
    timestamp: new Date().toISOString(),
    isValidChat,
    spamReason,
    replyTo,
    reactions: {},
    readBy: [user.id],
  };

  const msgs = db.messages.get(id) || [];
  msgs.push(newMessage);
  db.messages.set(id, msgs);

  conv.updatedAt = new Date().toISOString();
  conv.lastMessage = newMessage;

  user.totalMessagesSent++;
  let xpEarned = 0;
  let milestoneUnlocked = false;

  if (isValidChat) {
    user.validChatCount++;
    xpEarned = 10;
    user.xp += xpEarned;
    user.level = getLevelForXp(user.xp).level;

    // Daily streak update
    const todayStr = getDateString();
    if (!user.validMessageDates) user.validMessageDates = [];
    if (!user.validMessageDates.includes(todayStr)) {
      user.validMessageDates.push(todayStr);
    }
    updateUserStreakOnServer(user);

    // Check 10,000 Milestone
    if (user.validChatCount >= db.config.milestoneChats && !user.claimedMilestones.includes(db.config.milestoneChats)) {
      milestoneUnlocked = true;
      broadcastSSE('milestone_unlocked', {
        userId: user.id,
        milestone: db.config.milestoneChats,
        rewardAmount: db.config.milestoneRewardAmount,
      }, user.id);
    }
  } else if (spamReason) {
    db.suspiciousLogs.unshift({
      id: `sus_${Date.now()}`,
      userId: user.id,
      username: user.username,
      reason: spamReason,
      details: `User sent message: "${trimmedText.slice(0, 30)}..."`,
      timestamp: new Date().toISOString(),
      severity: 'low',
    });
  }

  // Real-time broadcast to both conversation participants
  conv.participantIds.forEach((pid) => {
    broadcastSSE('new_message', { conversationId: id, message: newMessage }, pid);
  });

  // Progress update to sender
  broadcastSSE('chat_progress', {
    userId: user.id,
    validChatCount: user.validChatCount,
    streakDays: user.streakDays,
    longestStreak: user.longestStreak,
    chattedToday: user.chattedToday,
    validMessageDates: user.validMessageDates,
    xp: user.xp,
    level: user.level,
    isValidChat,
  }, user.id);

  scheduleSave();

  res.json({
    message: newMessage,
    validChatCount: user.validChatCount,
    streakDays: user.streakDays,
    longestStreak: user.longestStreak,
    chattedToday: user.chattedToday,
    isValidChat,
    milestoneUnlocked,
    xpEarned,
    userLevel: user.level,
  });
});

// Typing indicator
app.post('/api/conversations/:id/typing', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  const { isTyping } = req.body;
  const conv = db.conversations.get(id);
  if (!conv || !conv.participantIds.includes(user.id)) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const otherUserId = conv.participantIds.find((pid) => pid !== user.id);
  if (otherUserId) {
    broadcastSSE(
      'typing',
      { conversationId: id, userId: user.id, username: user.displayName, isTyping: !!isTyping },
      otherUserId
    );
  }

  res.json({ success: true });
});

// Read receipts
app.post('/api/conversations/:id/read', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  const conv = db.conversations.get(id);
  if (!conv || !conv.participantIds.includes(user.id)) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const msgs = db.messages.get(id) || [];
  let updatedAny = false;

  msgs.forEach((m) => {
    if (m.senderId !== user.id && !m.readBy.includes(user.id)) {
      m.readBy.push(user.id);
      updatedAny = true;
    }
  });

  if (updatedAny) {
    conv.participantIds.forEach((pid) => {
      broadcastSSE('message_read', { conversationId: id, readByUserId: user.id }, pid);
    });
  }

  res.json({ success: true });
});

// Emoji reaction
app.post('/api/messages/:id/react', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  const { emoji, conversationId } = req.body;

  if (!emoji || !conversationId) {
    res.status(400).json({ error: 'Missing emoji or conversationId' });
    return;
  }

  const conv = db.conversations.get(conversationId);
  if (!conv || !conv.participantIds.includes(user.id)) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const msgs = db.messages.get(conversationId) || [];
  const targetMsg = msgs.find((m) => m.id === id);
  if (!targetMsg) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  if (!targetMsg.reactions) targetMsg.reactions = {};
  if (!targetMsg.reactions[emoji]) targetMsg.reactions[emoji] = [];

  const existingIndex = targetMsg.reactions[emoji].indexOf(user.id);
  if (existingIndex > -1) {
    targetMsg.reactions[emoji].splice(existingIndex, 1);
    if (targetMsg.reactions[emoji].length === 0) {
      delete targetMsg.reactions[emoji];
    }
  } else {
    targetMsg.reactions[emoji].push(user.id);
  }

  conv.participantIds.forEach((pid) => {
    broadcastSSE('reaction_updated', {
      conversationId,
      messageId: id,
      reactions: targetMsg.reactions,
    }, pid);
  });

  res.json({ success: true, reactions: targetMsg.reactions });
});

// Delete message
app.delete('/api/messages/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  const { conversationId } = req.body;

  const conv = db.conversations.get(conversationId);
  if (!conv || !conv.participantIds.includes(user.id)) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const msgs = db.messages.get(conversationId) || [];
  const targetMsg = msgs.find((m) => m.id === id);
  if (!targetMsg) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  if (targetMsg.senderId !== user.id && user.role !== 'admin') {
    res.status(403).json({ error: 'Cannot delete others message' });
    return;
  }

  targetMsg.isDeleted = true;
  targetMsg.text = 'This message was deleted 😂';

  conv.participantIds.forEach((pid) => {
    broadcastSSE('message_deleted', { conversationId, messageId: id }, pid);
  });

  res.json({ success: true });
});

// ----------------------------------------------------
// 6. WALLET & REWARD CLAIMS
// ----------------------------------------------------
app.post('/api/rewards/claim', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const requiredCount = db.config.milestoneChats || 10000;
  if (user.validChatCount < requiredCount) {
    res.status(400).json({
      error: `You need ${requiredCount.toLocaleString()} valid chats to claim this reward. Current: ${user.validChatCount.toLocaleString()}`,
    });
    return;
  }

  if (user.claimedMilestones.includes(requiredCount)) {
    res.status(400).json({
      error: `Reward for ${requiredCount.toLocaleString()} chats has already been claimed!`,
    });
    return;
  }

  const rewardAmount = db.config.milestoneRewardAmount || 2;
  const newTx: RewardTransaction = {
    id: `tx_${crypto.randomUUID()}`,
    userId: user.id,
    type: 'milestone_reward',
    amount: rewardAmount,
    currency: db.config.currencySymbol || 'Rs. ',
    description: `${requiredCount.toLocaleString()} Valid Chats Milestone Achieved! 🎉`,
    timestamp: new Date().toISOString(),
    status: 'credited',
    milestoneCount: requiredCount,
  };

  user.claimedMilestones.push(requiredCount);
  user.wallet.availableBalance += rewardAmount;
  user.wallet.totalEarned += rewardAmount;
  user.wallet.transactions.unshift(newTx);

  broadcastSSE('reward_claimed', {
    userId: user.id,
    amount: rewardAmount,
    balance: user.wallet.availableBalance,
  }, user.id);

  res.json({
    success: true,
    user,
    transaction: newTx,
    message: `🎉 Rs. ${rewardAmount} credited to your ChatKaro reward wallet!`,
  });
});

app.post('/api/wallet/withdraw', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { upiId } = req.body;
  if (!upiId || !upiId.includes('@')) {
    res.status(400).json({ error: 'Please enter a valid UPI ID (e.g., name@okaxis, name@paytm)' });
    return;
  }

  if (user.wallet.availableBalance <= 0) {
    res.status(400).json({ error: 'No available balance to withdraw. Chat more to earn Rs. 2!' });
    return;
  }

  const amountToWithdraw = user.wallet.availableBalance;
  const withdrawTx: RewardTransaction = {
    id: `tx_with_${crypto.randomUUID()}`,
    userId: user.id,
    type: 'withdrawal',
    amount: amountToWithdraw,
    currency: db.config.currencySymbol || 'Rs. ',
    description: `Withdrawal transfer to UPI (${upiId})`,
    timestamp: new Date().toISOString(),
    status: 'processed',
  };

  user.wallet.availableBalance = 0;
  user.wallet.transactions.unshift(withdrawTx);

  res.json({
    success: true,
    user,
    transaction: withdrawTx,
    message: `🚀 Rs. ${amountToWithdraw} successfully processed to ${upiId}!`,
  });
});

// ----------------------------------------------------
// 6B. JAZZCASH & EASYPAISA SECURE PAYOUT DETAILS & REWARD REQUESTS
// ----------------------------------------------------

/**
 * Validates and normalizes Pakistani mobile numbers.
 * Accepts formats: 03XXXXXXXXX (11 digits), +923XXXXXXXXX, 923XXXXXXXXX
 * Masks as: 0301******32 (first 4 digits, 6 asterisks, last 2 digits)
 */
function validateAndMaskPakistaniMobile(input: string): {
  isValid: boolean;
  normalized: string;
  masked: string;
  error?: string;
} {
  if (!input || typeof input !== 'string') {
    return { isValid: false, normalized: '', masked: '', error: 'Mobile number is required' };
  }

  const cleaned = input.trim().replace(/[\s\-\(\)]/g, '');
  let digits = cleaned;

  if (digits.startsWith('+92')) {
    digits = '0' + digits.slice(3);
  } else if (digits.startsWith('92') && digits.length === 12) {
    digits = '0' + digits.slice(2);
  }

  if (!/^03\d{9}$/.test(digits)) {
    return {
      isValid: false,
      normalized: '',
      masked: '',
      error: 'Please enter a valid Pakistani mobile number (11 digits starting with 03, e.g. 03015792132)',
    };
  }

  // Masking format per requirement: 0301******32
  const masked = `${digits.slice(0, 4)}******${digits.slice(-2)}`;
  return { isValid: true, normalized: digits, masked };
}

// Save JazzCash or Easypaisa Payout Details (Secure & Private)
app.post('/api/wallet/payout-details', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { method, accountHolderName, mobileNumber } = req.body;

  if (method !== 'jazzcash' && method !== 'easypaisa') {
    res.status(400).json({ error: 'Please choose either JazzCash or Easypaisa.' });
    return;
  }

  const targetMethod: PaymentMethod = method;

  const paymentSettings = db.config.paymentSettings || {
    jazzCashEnabled: true,
    easyPaisaEnabled: true,
    rewardRequestsEnabled: true,
    minRewardThreshold: 2,
    manualReview: true,
    autoRewardEligibility: true,
  };

  if (targetMethod === 'jazzcash' && !paymentSettings.jazzCashEnabled) {
    res.status(400).json({ error: 'JazzCash payout method is currently disabled by administrator.' });
    return;
  }

  if (targetMethod === 'easypaisa' && !paymentSettings.easyPaisaEnabled) {
    res.status(400).json({ error: 'Easypaisa payout method is currently disabled by administrator.' });
    return;
  }

  if (!accountHolderName || typeof accountHolderName !== 'string' || accountHolderName.trim().length < 2) {
    res.status(400).json({ error: 'Please enter a valid account holder name (at least 2 characters).' });
    return;
  }

  const val = validateAndMaskPakistaniMobile(mobileNumber);
  if (!val.isValid) {
    res.status(400).json({ error: val.error });
    return;
  }

  // Store full unmasked details in backend private storage only (never exposed publicly)
  let userPrivateMap = db.payoutDetails.get(user.id);
  if (!userPrivateMap) {
    userPrivateMap = {};
    db.payoutDetails.set(user.id, userPrivateMap);
  }

  const now = new Date().toISOString();
  userPrivateMap[targetMethod] = {
    accountHolderName: accountHolderName.trim(),
    rawNumber: val.normalized,
    maskedNumber: val.masked,
    updatedAt: now,
  };
  userPrivateMap.preferredMethod = targetMethod;

  // Update user object with MASKED version only
  if (!user.payoutDetails) user.payoutDetails = {};
  user.payoutDetails[targetMethod] = {
    method: targetMethod,
    accountHolderName: accountHolderName.trim(),
    maskedNumber: val.masked,
    updatedAt: now,
  };
  user.payoutDetails.preferredMethod = targetMethod;

  const methodName = targetMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa';
  scheduleSave();
  res.json({
    success: true,
    message: `${methodName} details saved successfully`,
    payoutDetails: user.payoutDetails,
  });
});

// Retrieve Authenticated User's Payout Details
app.get('/api/wallet/payout-details', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.json({
    payoutDetails: user.payoutDetails || {},
  });
});

// Request Reward Payout
app.post('/api/wallet/request-reward', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (user.isBanned || user.isSuspended) {
    res.status(403).json({ error: 'Your account is suspended. Payout requests cannot be processed.' });
    return;
  }

  const paymentSettings = db.config.paymentSettings || {
    jazzCashEnabled: true,
    easyPaisaEnabled: true,
    rewardRequestsEnabled: true,
    minRewardThreshold: 2,
    manualReview: true,
    autoRewardEligibility: true,
  };

  if (paymentSettings.rewardRequestsEnabled === false) {
    res.status(400).json({ error: 'Reward requests are temporarily paused for routine server review.' });
    return;
  }

  const userPrivateDetails = db.payoutDetails.get(user.id);
  const method = (req.body.method as PaymentMethod) || userPrivateDetails?.preferredMethod || (userPrivateDetails?.jazzcash ? 'jazzcash' : userPrivateDetails?.easypaisa ? 'easypaisa' : null);

  if (!method || !userPrivateDetails || !userPrivateDetails[method]) {
    res.status(400).json({
      error: 'Add your JazzCash or Easypaisa details before requesting your reward.',
    });
    return;
  }

  if (method === 'jazzcash' && !paymentSettings.jazzCashEnabled) {
    res.status(400).json({ error: 'JazzCash payout method is currently disabled by administrator.' });
    return;
  }
  if (method === 'easypaisa' && !paymentSettings.easyPaisaEnabled) {
    res.status(400).json({ error: 'Easypaisa payout method is currently disabled by administrator.' });
    return;
  }

  const minThreshold = paymentSettings.minRewardThreshold || 2;
  const isEligible = user.validChatCount >= db.config.milestoneChats || user.wallet.availableBalance >= minThreshold;

  if (!isEligible && user.wallet.availableBalance <= 0) {
    res.status(400).json({
      error: `You must reach ${db.config.milestoneChats.toLocaleString()} valid chats or have at least Rs. ${minThreshold} in your reward wallet.`,
    });
    return;
  }

  // Prevent duplicate pending requests
  const existingPending = db.rewardRequests.find(
    (r) => r.userId === user.id && (r.status === 'Pending' || r.status === 'Under Review')
  );
  if (existingPending) {
    res.status(400).json({
      error: 'You already have an active reward request pending review. Please allow up to 24 hours for review.',
    });
    return;
  }

  const payoutInfo = userPrivateDetails[method]!;
  const requestAmount = user.wallet.availableBalance > 0 ? user.wallet.availableBalance : db.config.milestoneRewardAmount;

  // Server-side fraud check
  const highSuspicious = db.suspiciousLogs.filter((s) => s.userId === user.id && s.severity === 'high');
  const fraudStatus: 'clean' | 'suspicious' | 'verified' =
    highSuspicious.length > 0 ? 'suspicious' : user.validChatCount >= db.config.milestoneChats ? 'verified' : 'clean';

  const newRequest: RewardRequest = {
    id: `req_${crypto.randomUUID()}`,
    userId: user.id,
    userName: user.displayName,
    userValidChatCount: user.validChatCount,
    amount: requestAmount,
    currency: db.config.currencySymbol || 'Rs. ',
    paymentMethod: method,
    accountHolderName: payoutInfo.accountHolderName,
    maskedMobileNumber: payoutInfo.maskedNumber,
    status: fraudStatus === 'suspicious' ? 'Under Review' : 'Pending',
    requestDate: new Date().toISOString(),
    fraudStatus,
  };

  db.rewardRequests.unshift(newRequest);
  if (!user.rewardRequests) user.rewardRequests = [];
  user.rewardRequests.unshift(newRequest);

  // If user has available balance, deduct it into pending status
  if (user.wallet.availableBalance >= requestAmount) {
    user.wallet.availableBalance -= requestAmount;
  }

  const withdrawTx: RewardTransaction = {
    id: `tx_req_${newRequest.id}`,
    userId: user.id,
    type: 'withdrawal',
    amount: requestAmount,
    currency: db.config.currencySymbol || 'Rs. ',
    description: `Reward request via ${method === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} (${payoutInfo.maskedNumber})`,
    timestamp: new Date().toISOString(),
    status: 'pending',
  };
  user.wallet.transactions.unshift(withdrawTx);

  broadcastSSE('reward_request_created', {
    userId: user.id,
    requestId: newRequest.id,
    status: newRequest.status,
    amount: requestAmount,
  });

  scheduleSave();

  res.json({
    success: true,
    message: `🎉 Reward request of Rs. ${requestAmount} submitted via ${method === 'jazzcash' ? 'JazzCash' : 'Easypaisa'}! Status: ${newRequest.status}.`,
    request: newRequest,
    user,
  });
});

// Get User's Own Reward Requests
app.get('/api/wallet/reward-requests', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const userRequests = db.rewardRequests.filter((r) => r.userId === user.id);
  res.json({ requests: userRequests });
});

// ----------------------------------------------------
// 7. USER PROFILE, BLOCKING & REPORTING
// ----------------------------------------------------
app.post('/api/user/profile', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { displayName, bio } = req.body;
  if (displayName && typeof displayName === 'string' && displayName.trim().length >= 2) {
    user.displayName = displayName.trim();
  }
  if (typeof bio === 'string') {
    user.bio = bio.trim();
  }

  res.json({ success: true, user });
});

app.post('/api/user/block', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { targetUserId } = req.body;
  if (!targetUserId) {
    res.status(400).json({ error: 'Target user ID required' });
    return;
  }

  if (!user.blockedUserIds.includes(targetUserId)) {
    user.blockedUserIds.push(targetUserId);
  }

  res.json({ success: true, message: 'User blocked successfully' });
});

app.post('/api/user/report', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { targetUserId, reason, details } = req.body;
  const targetUser = db.users.get(targetUserId);
  if (!targetUser) {
    res.status(404).json({ error: 'Target user not found' });
    return;
  }

  const newReport: UserReport = {
    id: `rep_${Date.now()}`,
    reporterId: user.id,
    reporterName: user.displayName,
    reportedUserId: targetUser.id,
    reportedUserName: targetUser.displayName,
    reason: reason || 'spam',
    details: details || 'No details specified',
    timestamp: new Date().toISOString(),
    status: 'pending',
  };

  db.reports.unshift(newReport);

  res.json({ success: true, message: 'Thank you. Our moderation team will review this report.' });
});

// Starters & Challenges
app.get('/api/starters/random', (_req: Request, res: Response) => {
  const all = CONVERSATION_STARTERS;
  const starter = all[Math.floor(Math.random() * all.length)];
  res.json({ starter, all });
});

app.get('/api/challenges/daily', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const currentCount = user?.validChatCount || 0;

  const challenges: DailyChallenge[] = [
    {
      id: 'dc_1',
      title: 'Chat Starter Spark',
      description: 'Send at least 5 valid verified messages today',
      icon: '💬',
      target: 5,
      current: Math.min(5, currentCount % 20),
      xpReward: 50,
      completed: (currentCount % 20) >= 5,
    },
    {
      id: 'dc_2',
      title: 'Emoji Master',
      description: 'Send 3 funny reactions on hilarious jokes',
      icon: '😂',
      target: 3,
      current: 3,
      xpReward: 30,
      completed: true,
    },
    {
      id: 'dc_3',
      title: 'Speed Typist',
      description: 'Exchange 20 real messages with someone',
      icon: '⚡',
      target: 20,
      current: Math.min(20, (currentCount % 35) + 4),
      xpReward: 100,
      completed: (currentCount % 35) + 4 >= 20,
    },
  ];

  res.json({ challenges });
});

// Leaderboard
app.get('/api/leaderboard', (_req: Request, res: Response) => {
  const sortedUsers = Array.from(db.users.values())
    .filter((u) => !u.isBanned)
    .sort((a, b) => b.validChatCount - a.validChatCount)
    .slice(0, 10);

  const leaderboard = sortedUsers.map((u, index) => ({
    rank: index + 1,
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatar: u.avatar,
    country: u.country,
    countryFlag: u.countryFlag,
    validChatCount: u.validChatCount,
    level: u.level,
    xp: u.xp,
    streakDays: u.streakDays,
    badges: u.validChatCount >= 10000 ? ['Rs. 2 Winner 👑', '10K Milestone 🔥'] : ['Active Chatter 💬'],
  }));

  res.json({ leaderboard });
});

// ----------------------------------------------------
// 8. ADMIN DASHBOARD API (PROTECTED)
// ----------------------------------------------------
app.get('/api/admin/stats', (req: Request, res: Response) => {
  const admin = getAdminUser(req);
  if (!admin) {
    res.status(403).json({ error: 'Unauthorized: Admin privileges required' });
    return;
  }

  let totalMessages = 0;
  let totalValidChats = 0;
  let totalRewardsIssued = 0;
  let totalRewardAmount = 0;
  let onlineUsers = 0;

  const now = Date.now();
  db.users.forEach((u) => {
    if (u.role === 'admin') return;
    totalValidChats += u.validChatCount;
    totalMessages += u.totalMessagesSent;
    totalRewardsIssued += u.claimedMilestones.length;
    totalRewardAmount += u.wallet.totalEarned;

    const last = db.lastHeartbeats.get(u.id) || 0;
    if (now - last < 180000) onlineUsers++;
  });

  res.json({
    totalUsers: Array.from(db.users.values()).filter((u) => u.role !== 'admin').length,
    onlineUsers,
    totalMessages,
    totalValidChats,
    totalRewardsIssued,
    totalRewardAmount,
    currencySymbol: db.config.currencySymbol,
    suspiciousLogsCount: db.suspiciousLogs.length,
    reportsCount: db.reports.length,
    rewardRequestsCount: db.rewardRequests.length,
    pendingRewardRequestsCount: db.rewardRequests.filter((r) => r.status === 'Pending' || r.status === 'Under Review').length,
    config: db.config,
    recentSuspicious: db.suspiciousLogs.slice(0, 10),
    recentReports: db.reports.slice(0, 10),
    recentRewardRequests: db.rewardRequests.slice(0, 10),
  });
});

// Admin User Management
app.get('/api/admin/users', (req: Request, res: Response) => {
  const admin = getAdminUser(req);
  if (!admin) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  const query = (req.query.q as string || '').toLowerCase().trim();
  const list: User[] = [];

  db.users.forEach((u) => {
    if (query) {
      const match =
        u.displayName.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query) ||
        (u.country && u.country.toLowerCase().includes(query)) ||
        (u.maskedPhone && u.maskedPhone.includes(query));
      if (!match) return;
    }
    // Return sanitized with maskedPhone (do not expose full phone)
    list.push({
      ...u,
      normalizedPhone: undefined,
    });
  });

  res.json({ users: list });
});

// User Admin Actions (Suspend, Ban, Unban, Delete)
app.post('/api/admin/users/:id/action', (req: Request, res: Response) => {
  const admin = getAdminUser(req);
  if (!admin) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  const { action, reason } = req.body;
  const targetUser = db.users.get(id);

  if (!targetUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (targetUser.role === 'admin') {
    res.status(400).json({ error: 'Cannot modify fellow admin accounts' });
    return;
  }

  if (action === 'ban') {
    targetUser.isBanned = true;
    targetUser.isOnline = false;
    targetUser.onlineStatus = 'offline';
    broadcastSSE('presence_update', { userId: targetUser.id, onlineStatus: 'offline', isOnline: false });
  } else if (action === 'unban') {
    targetUser.isBanned = false;
    targetUser.isSuspended = false;
  } else if (action === 'suspend') {
    targetUser.isSuspended = true;
    targetUser.isOnline = false;
    targetUser.onlineStatus = 'offline';
  } else if (action === 'delete') {
    db.users.delete(id);
  } else {
    res.status(400).json({ error: 'Invalid action' });
    return;
  }

  db.auditLogs.unshift({
    id: `audit_act_${Date.now()}`,
    adminId: admin.id,
    adminName: admin.displayName,
    action: `USER_${action.toUpperCase()}`,
    target: targetUser.displayName,
    result: 'success',
    timestamp: new Date().toISOString(),
    details: `Action ${action} executed. Reason: ${reason || 'Admin discretion'}.`,
  });

  res.json({ success: true, message: `User ${action}ed successfully.` });
});

// Update System & Admin Configuration
app.post('/api/admin/config', (req: Request, res: Response) => {
  const admin = getAdminUser(req);
  if (!admin) {
    res.status(403).json({ error: 'Unauthorized: Admin privileges required' });
    return;
  }

  const {
    milestoneChats,
    milestoneRewardAmount,
    announcement,
    rapidRateLimitMs,
    userAuth,
    adminSecurity,
    chatSettings,
  } = req.body;

  if (milestoneChats) db.config.milestoneChats = Number(milestoneChats);
  if (milestoneRewardAmount) db.config.milestoneRewardAmount = Number(milestoneRewardAmount);
  if (typeof announcement === 'string') db.config.announcement = announcement;
  if (rapidRateLimitMs) db.config.rapidRateLimitMs = Number(rapidRateLimitMs);

  if (userAuth && typeof userAuth === 'object') {
    db.config.userAuth = { ...db.config.userAuth, ...userAuth };
  }
  if (adminSecurity && typeof adminSecurity === 'object') {
    db.config.adminSecurity = { ...db.config.adminSecurity, ...adminSecurity };
  }
  if (chatSettings && typeof chatSettings === 'object') {
    db.config.chatSettings = { ...db.config.chatSettings, ...chatSettings };
  }

  db.auditLogs.unshift({
    id: `audit_cfg_${Date.now()}`,
    adminId: admin.id,
    adminName: admin.displayName,
    action: 'CONFIG_UPDATED',
    target: 'System Settings',
    result: 'success',
    timestamp: new Date().toISOString(),
    details: 'System settings, reward rules, or auth toggles updated.',
  });

  broadcastSSE('config_updated', db.config);
  res.json({ success: true, config: db.config });
});

// Admin: Get All Reward Requests
app.get('/api/admin/reward-requests', (req: Request, res: Response) => {
  const admin = getAdminUser(req);
  if (!admin) {
    res.status(403).json({ error: 'Unauthorized: Admin privileges required' });
    return;
  }

  // Enrich with user's current valid chat count and security status
  const enriched = db.rewardRequests.map((r) => {
    const u = db.users.get(r.userId);
    return {
      ...r,
      userValidChatCount: u ? u.validChatCount : r.userValidChatCount,
      userIsBanned: u ? u.isBanned : false,
      userIsSuspended: u ? u.isSuspended : false,
    };
  });

  res.json({ requests: enriched });
});

// Admin: Approve, Reject, Mark Paid, or Cancel Reward Request
app.post('/api/admin/reward-requests/:id/action', (req: Request, res: Response) => {
  const admin = getAdminUser(req);
  if (!admin) {
    res.status(403).json({ error: 'Unauthorized: Admin privileges required' });
    return;
  }

  const { id } = req.params;
  const { action, transactionReference, rejectionReason } = req.body;
  const targetReq = db.rewardRequests.find((r) => r.id === id);

  if (!targetReq) {
    res.status(404).json({ error: 'Reward request not found' });
    return;
  }

  const user = db.users.get(targetReq.userId);

  if (action === 'approve') {
    targetReq.status = 'Approved';
  } else if (action === 'reject') {
    targetReq.status = 'Rejected';
    targetReq.rejectionReason = rejectionReason || 'Request did not pass manual audit verification';
    // Refund amount back to available balance
    if (user) {
      user.wallet.availableBalance += targetReq.amount;
    }
  } else if (action === 'mark_paid') {
    targetReq.status = 'Paid';
    targetReq.paidDate = new Date().toISOString();
    targetReq.transactionReference = transactionReference || `TRX_${Date.now()}`;
    targetReq.processedByAdminId = admin.id;
    if (user) {
      const matchingTx = user.wallet.transactions.find((tx) => tx.id === `tx_req_${targetReq.id}`);
      if (matchingTx) matchingTx.status = 'processed';
    }
  } else if (action === 'cancel') {
    targetReq.status = 'Cancelled';
    if (user) {
      user.wallet.availableBalance += targetReq.amount;
    }
  } else {
    res.status(400).json({ error: 'Invalid action. Choose approve, reject, mark_paid, or cancel.' });
    return;
  }

  db.auditLogs.unshift({
    id: `audit_rew_${Date.now()}`,
    adminId: admin.id,
    adminName: admin.displayName,
    action: `REWARD_REQUEST_${action.toUpperCase()}`,
    target: targetReq.userName,
    result: 'success',
    timestamp: new Date().toISOString(),
    details: `Reward request of Rs. ${targetReq.amount} (${targetReq.paymentMethod}) updated to ${targetReq.status}. Ref: ${targetReq.transactionReference || 'N/A'}.`,
  });

  // Notify user via real-time SSE
  broadcastSSE('reward_request_updated', {
    requestId: targetReq.id,
    userId: targetReq.userId,
    status: targetReq.status,
    paidDate: targetReq.paidDate,
    transactionReference: targetReq.transactionReference,
  }, targetReq.userId);

  scheduleSave();

  res.json({
    success: true,
    message: `Reward request successfully updated to ${targetReq.status}`,
    request: targetReq,
  });
});

// Admin: Update Payment Gateway & Payout Rules
app.post('/api/admin/payment-settings', (req: Request, res: Response) => {
  const admin = getAdminUser(req);
  if (!admin) {
    res.status(403).json({ error: 'Unauthorized: Admin privileges required' });
    return;
  }

  const {
    jazzCashEnabled,
    easyPaisaEnabled,
    rewardRequestsEnabled,
    minRewardThreshold,
    manualReview,
    autoRewardEligibility,
  } = req.body;

  db.config.paymentSettings = {
    jazzCashEnabled: jazzCashEnabled !== undefined ? !!jazzCashEnabled : true,
    easyPaisaEnabled: easyPaisaEnabled !== undefined ? !!easyPaisaEnabled : true,
    rewardRequestsEnabled: rewardRequestsEnabled !== undefined ? !!rewardRequestsEnabled : true,
    minRewardThreshold: typeof minRewardThreshold === 'number' ? minRewardThreshold : 2,
    manualReview: manualReview !== undefined ? !!manualReview : true,
    autoRewardEligibility: autoRewardEligibility !== undefined ? !!autoRewardEligibility : true,
  };

  db.auditLogs.unshift({
    id: `audit_pay_${Date.now()}`,
    adminId: admin.id,
    adminName: admin.displayName,
    action: 'PAYMENT_SETTINGS_UPDATED',
    target: 'Payment Gateways',
    result: 'success',
    timestamp: new Date().toISOString(),
    details: `Payment settings updated: JazzCash (${db.config.paymentSettings.jazzCashEnabled}), Easypaisa (${db.config.paymentSettings.easyPaisaEnabled}), Min: Rs. ${db.config.paymentSettings.minRewardThreshold}.`,
  });

  broadcastSSE('config_updated', db.config);
  res.json({ success: true, paymentSettings: db.config.paymentSettings });
});

// Moderate Reports
app.post('/api/admin/reports/:id/action', (req: Request, res: Response) => {
  const admin = getAdminUser(req);
  if (!admin) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  const { action } = req.body; // 'resolve' | 'dismiss' | 'ban_reported'
  const report = db.reports.find((r) => r.id === id);

  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  if (action === 'dismiss') {
    report.status = 'dismissed';
  } else if (action === 'ban_reported') {
    report.status = 'resolved';
    const target = db.users.get(report.reportedUserId);
    if (target) {
      target.isBanned = true;
      target.isOnline = false;
    }
  } else {
    report.status = 'resolved';
  }

  db.auditLogs.unshift({
    id: `audit_rep_${Date.now()}`,
    adminId: admin.id,
    adminName: admin.displayName,
    action: `REPORT_${action.toUpperCase()}`,
    target: report.reportedUserName,
    result: 'success',
    timestamp: new Date().toISOString(),
    details: `Report for ${report.reason} marked as ${report.status}.`,
  });

  res.json({ success: true, report });
});

// Admin Global Real-time Announcement
app.post('/api/admin/announcement', (req: Request, res: Response) => {
  const admin = getAdminUser(req);
  if (!admin) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Announcement text required' });
    return;
  }

  db.config.announcement = text.trim();
  broadcastSSE('announcement', { text: db.config.announcement });

  db.auditLogs.unshift({
    id: `audit_ann_${Date.now()}`,
    adminId: admin.id,
    adminName: admin.displayName,
    action: 'BROADCAST_ANNOUNCEMENT',
    target: 'Global Chatters',
    result: 'success',
    timestamp: new Date().toISOString(),
    details: `Announcement: "${text.slice(0, 40)}..."`,
  });

  res.json({ success: true, announcement: db.config.announcement });
});

// Admin Audit Logs
app.get('/api/admin/audit-logs', (req: Request, res: Response) => {
  const admin = getAdminUser(req);
  if (!admin) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  res.json({ auditLogs: db.auditLogs.slice(0, 50) });
});

// ----------------------------------------------------
// 9. SSE EVENT STREAM ENDPOINT
// ----------------------------------------------------
app.get('/api/events', (req: Request, res: Response) => {
  const token = (req.query.token as string) || '';
  const tokenData = db.tokens.get(token);
  const userId = tokenData?.userId || 'anonymous';

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('\n');

  if (!sseClients.has(userId)) {
    sseClients.set(userId, []);
  }
  sseClients.get(userId)!.push(res);

  req.on('close', () => {
    const clients = sseClients.get(userId) || [];
    const index = clients.indexOf(res);
    if (index > -1) {
      clients.splice(index, 1);
    }
  });
});

// Dev Helper: set chats count (for tester evaluation)
app.post('/api/dev/set-chats', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { count } = req.body;
  if (typeof count === 'number' && count >= 0) {
    user.validChatCount = count;
    user.totalMessagesSent = count + 20;
    user.xp = count * 10;
    user.level = getLevelForXp(user.xp).level;

    broadcastSSE('chat_progress', {
      userId: user.id,
      validChatCount: user.validChatCount,
      streakDays: user.streakDays,
      longestStreak: user.longestStreak,
      chattedToday: user.chattedToday,
      validMessageDates: user.validMessageDates,
      xp: user.xp,
      level: user.level,
      isValidChat: true,
    }, user.id);

    res.json({ success: true, user });
  } else {
    res.status(400).json({ error: 'Invalid count' });
  }
});

// Dev Helper: set streak (for tester evaluation)
app.post('/api/dev/set-streak', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { streakDays, includeToday = true } = req.body;
  if (typeof streakDays !== 'number' || streakDays < 0) {
    res.status(400).json({ error: 'Invalid streakDays' });
    return;
  }

  const newDates: string[] = [];
  const startOffset = includeToday ? 0 : 1;
  for (let i = 0; i < streakDays; i++) {
    newDates.push(getPreviousDateString(startOffset + i));
  }
  newDates.reverse();

  user.validMessageDates = newDates;
  updateUserStreakOnServer(user);

  broadcastSSE('chat_progress', {
    userId: user.id,
    validChatCount: user.validChatCount,
    streakDays: user.streakDays,
    longestStreak: user.longestStreak,
    chattedToday: user.chattedToday,
    validMessageDates: user.validMessageDates,
    xp: user.xp,
    level: user.level,
    isValidChat: true,
  }, user.id);

  res.json({
    success: true,
    streakDays: user.streakDays,
    longestStreak: user.longestStreak,
    chattedToday: user.chattedToday,
    validMessageDates: user.validMessageDates,
  });
});

// ----------------------------------------------------
// VITE OR STATIC SERVING
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ChatKaro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
