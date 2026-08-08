export interface UserApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  createdAt: number;
  lastUsedAt?: number;
}

export type UserTier = 'free' | 'pro' | 'premium' | 'vip';

export interface PricingSettings {
  // Account Subscriptions (Monthly, Yearly, Discount %)
  pro: number;
  proYearly?: number;
  proDiscount?: number;

  premium: number;
  premiumYearly?: number;
  premiumDiscount?: number;

  vip: number;
  vipYearly?: number;
  vipDiscount?: number;

  // Separate Developer API Key Pricing (Per Month, Per Year, Discount %)
  apiKeyMonthly?: number;
  apiKeyYearly?: number;
  apiKeyDiscount?: number;
}

export interface SystemAPIKeys {
  groqApiKey?: string;
  groqApiKeys?: string[];
  cohereApiKey?: string;
  cohereApiKeys?: string[];
  bazaarLinkApiKey?: string;
  bazaarLinkApiKeys?: string[];
}

export interface AIBrainSettings {
  globalPrompt: string;
  freePrompt: string;
  proPrompt: string;
  premiumPrompt: string;
  vipPrompt: string;

  freeLimit: number;
  proLimit: number;
  premiumLimit: number;
  vipLimit: number;

  freeMaxTokens: number;
  proMaxTokens: number;
  premiumMaxTokens: number;
  vipMaxTokens: number;
}


export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  tier: UserTier;
  messageCount: number;
  lastMessageDate: string; // "YYYY-MM-DD"
  isAdmin: boolean;
  isSupportStaff?: boolean;
  isBanned?: boolean;
  isVerified?: boolean;
}

export interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  senderName: string;
  targetTier?: 'all' | UserTier;
  createdAt: number;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'model';
  text: string;
  createdAt: number;
}

export interface SupportMessage {
  id: string;
  senderId: string; // uid of user or 'admin'
  isAdmin: boolean;
  text: string;
  createdAt: number;
}

export interface SupportChat {
  id: string; // same as userId
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadAdmin: number;
  unreadUser: number;
}
