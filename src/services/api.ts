import {
  User,
  Conversation,
  Message,
  DailyChallenge,
  SystemConfig,
  LeaderboardUser,
  ConversationStarter,
  AdminAuditLog,
  AdminPaymentSettings,
} from '../types.ts';

const TOKEN_KEY = 'chatkaro_session_token';

export const api = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },

  clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || '';
    const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    const res = await fetch(fullUrl, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }
    return data as T;
  },

  // --------------------------------------------------
  // Passwordless Authentication & Session Restoration
  // --------------------------------------------------
  async enterProfile(data: {
    name: string;
    country: string;
    countryCode: string;
    dialCode: string;
    phone: string;
  }): Promise<{ user: User; token: string; isReturning: boolean; message: string }> {
    const res = await this.request<{ user: User; token: string; isReturning: boolean; message: string }>(
      '/api/auth/enter',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    this.setToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User; config: SystemConfig }> {
    return this.request('/api/auth/me');
  },

  async updateProfile(data: { displayName?: string; bio?: string; avatar?: string }): Promise<{ user: User }> {
    return this.request('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async switchUser(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request('/api/auth/switch-user', { method: 'POST' });
    } catch {
      // ignore
    }
    this.clearToken();
    return { success: true, message: 'Switched user' };
  },

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    this.clearToken();
  },

  // Heartbeat Presence
  async sendHeartbeat(status: 'online' | 'away'): Promise<{ success: boolean; status: string }> {
    return this.request('/api/users/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  // --------------------------------------------------
  // Users & Discovery
  // --------------------------------------------------
  async getUsers(): Promise<{ users: Array<User & { isOnline: boolean }> }> {
    return this.request('/api/users');
  },

  async getAvailableUsers(): Promise<{ users: Array<User & { isOnline: boolean }> }> {
    return this.getUsers();
  },

  async blockUser(targetUserId: string): Promise<{ success: boolean; message: string }> {
    return this.request('/api/user/block', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  },

  async reportUser(targetUserId: string, reason: string, details: string): Promise<{ success: boolean; message: string }> {
    return this.request('/api/user/report', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, reason, details }),
    });
  },

  // --------------------------------------------------
  // Conversations & Real-Time Chat
  // --------------------------------------------------
  async getConversations(): Promise<{ conversations: Conversation[] }> {
    return this.request('/api/conversations');
  },

  async startConversation(targetUserId: string): Promise<{ conversation: Conversation }> {
    return this.request('/api/conversations/start', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  },

  async respondChatRequest(
    conversationId: string,
    action: 'accept' | 'decline' | 'block'
  ): Promise<{ success: boolean; conversation?: Conversation }> {
    return this.request(`/api/conversations/${conversationId}/respond-request`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  async getMessages(conversationId: string, page = 1, limit = 40): Promise<{
    messages: Message[];
    total: number;
    page: number;
    hasMore: boolean;
  }> {
    return this.request(`/api/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
  },

  async sendMessage(
    conversationId: string,
    text: string,
    replyTo?: { id: string; text: string; senderName: string }
  ): Promise<{
    message: Message;
    validChatCount: number;
    streakDays: number;
    longestStreak: number;
    chattedToday: boolean;
    isValidChat: boolean;
    spamReason?: string;
    milestoneUnlocked?: boolean;
    xpEarned: number;
    userLevel: number;
  }> {
    return this.request(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, replyTo }),
    });
  },

  async sendTyping(conversationId: string, isTyping: boolean): Promise<{ success: boolean }> {
    return this.request(`/api/conversations/${conversationId}/typing`, {
      method: 'POST',
      body: JSON.stringify({ isTyping }),
    });
  },

  async markConversationRead(conversationId: string): Promise<{ success: boolean }> {
    return this.request(`/api/conversations/${conversationId}/read`, {
      method: 'POST',
    });
  },

  async reactToMessage(
    messageId: string,
    conversationId: string,
    emoji: string
  ): Promise<{ success: boolean; reactions: Record<string, string[]> }> {
    return this.request(`/api/messages/${messageId}/react`, {
      method: 'POST',
      body: JSON.stringify({ conversationId, emoji }),
    });
  },

  async deleteMessage(messageId: string, conversationId: string): Promise<{ success: boolean }> {
    return this.request(`/api/messages/${messageId}`, {
      method: 'DELETE',
      body: JSON.stringify({ conversationId }),
    });
  },

  // Starters
  async getRandomStarter(): Promise<{ starter: ConversationStarter; all: ConversationStarter[] }> {
    return this.request('/api/starters/random');
  },

  // Challenges & Leaderboard
  async getChallenges(): Promise<{ challenges: DailyChallenge[] }> {
    return this.request('/api/challenges/daily');
  },

  async getLeaderboard(period = 'all_time'): Promise<{ leaderboard: LeaderboardUser[] }> {
    return this.request(`/api/leaderboard?period=${encodeURIComponent(period)}`);
  },

  // Rewards & Wallet
  async claimReward(): Promise<{ success: boolean; user: User; transaction: any; message: string }> {
    return this.request('/api/rewards/claim', {
      method: 'POST',
    });
  },

  async savePayoutDetails(data: {
    method: 'jazzcash' | 'easypaisa';
    accountHolderName: string;
    mobileNumber: string;
  }): Promise<{ success: boolean; message: string; payoutDetails: any }> {
    return this.request('/api/wallet/payout-details', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPayoutDetails(): Promise<{ payoutDetails: any }> {
    return this.request('/api/wallet/payout-details');
  },

  async requestReward(method?: 'jazzcash' | 'easypaisa'): Promise<{
    success: boolean;
    message: string;
    request: any;
    user: User;
  }> {
    return this.request('/api/wallet/request-reward', {
      method: 'POST',
      body: JSON.stringify({ method }),
    });
  },

  async getRewardRequests(): Promise<{ requests: any[] }> {
    return this.request('/api/wallet/reward-requests');
  },

  async withdrawReward(amount: number, upiId: string): Promise<{ success: boolean; message: string; user?: User }> {
    return this.request('/api/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ upiId, amount }),
    });
  },

  async withdrawWallet(upiId: string): Promise<{ success: boolean; user: User; message: string }> {
    return this.request('/api/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ upiId }),
    });
  },

  // --------------------------------------------------
  // Admin Endpoints
  // --------------------------------------------------
  async adminLogin(username: string, password: string): Promise<{ token: string; user: User; message: string }> {
    const res = await this.request<{ token: string; user: User; message: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(res.token);
    return res;
  },

  async adminChangePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request('/api/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async adminLogoutAllSessions(): Promise<{ success: boolean; message: string }> {
    return this.request('/api/admin/logout-all-sessions', {
      method: 'POST',
    });
  },

  async getAdminStats(): Promise<any> {
    return this.request('/api/admin/stats');
  },

  async getAdminUsers(search?: string): Promise<{ users: User[] }> {
    const q = search ? `?q=${encodeURIComponent(search)}` : '';
    return this.request(`/api/admin/users${q}`);
  },

  async takeAdminUserAction(userId: string, action: 'ban' | 'unban' | 'suspend' | 'delete', reason?: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/admin/users/${userId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    });
  },

  async updateAdminConfig(config: Partial<SystemConfig>): Promise<{ success: boolean; config: SystemConfig }> {
    return this.request('/api/admin/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async respondAdminReport(reportId: string, action: 'resolve' | 'dismiss' | 'ban_reported'): Promise<{ success: boolean }> {
    return this.request(`/api/admin/reports/${reportId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  async broadcastAnnouncement(text: string): Promise<{ success: boolean; announcement: string }> {
    return this.request('/api/admin/announcement', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async getAdminAuditLogs(): Promise<{ auditLogs: AdminAuditLog[] }> {
    return this.request('/api/admin/audit-logs');
  },

  async getAdminRewardRequests(): Promise<{ requests: any[] }> {
    return this.request('/api/admin/reward-requests');
  },

  async actionAdminRewardRequest(
    id: string,
    action: 'approve' | 'reject' | 'mark_paid' | 'cancel',
    data?: { transactionReference?: string; rejectionReason?: string }
  ): Promise<{ success: boolean; message: string; request: any }> {
    return this.request(`/api/admin/reward-requests/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, ...data }),
    });
  },

  async updateAdminPaymentSettings(settings: Partial<AdminPaymentSettings>): Promise<{ success: boolean; paymentSettings: AdminPaymentSettings }> {
    return this.request('/api/admin/payment-settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  // --------------------------------------------------
  // Dev Testing Helpers
  // --------------------------------------------------
  async devSetChats(count: number): Promise<{ success: boolean; user: User }> {
    return this.request('/api/dev/set-chats', {
      method: 'POST',
      body: JSON.stringify({ count }),
    });
  },

  async devSetStreak(
    streakDays: number,
    includeToday: boolean = true
  ): Promise<{
    success: boolean;
    streakDays: number;
    longestStreak: number;
    chattedToday: boolean;
    validMessageDates: string[];
    user: User;
  }> {
    const res = await this.request<{
      success: boolean;
      streakDays: number;
      longestStreak: number;
      chattedToday: boolean;
      validMessageDates: string[];
    }>('/api/dev/set-streak', {
      method: 'POST',
      body: JSON.stringify({ streakDays, includeToday }),
    });
    const me = await this.getMe();
    return {
      ...res,
      user: me.user,
    };
  },

  // --------------------------------------------------
  // SSE Real-Time Stream
  // --------------------------------------------------
  subscribeSSE(
    onMessage: (event: { type: string; data: any }) => void
  ): () => void {
    const token = this.getToken();
    const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || '';
    const url = `${baseUrl}/api/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const eventSource = new EventSource(url);

    const eventTypes = [
      'new_message',
      'typing',
      'message_read',
      'reaction_updated',
      'message_deleted',
      'conversation_started',
      'chat_request',
      'chat_request_response',
      'presence_update',
      'chat_progress',
      'milestone_unlocked',
      'reward_claimed',
      'reward_request_created',
      'reward_request_updated',
      'announcement',
      'config_updated',
    ];

    eventTypes.forEach((type) => {
      eventSource.addEventListener(type, (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          onMessage({ type, data: parsed });
        } catch {
          // ignore
        }
      });
    });

    return () => {
      eventSource.close();
    };
  },
};
