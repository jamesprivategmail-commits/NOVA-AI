export type UserTier = 'free' | 'pro' | 'premium' | 'vip';

export interface PricingSettings {
  premium: number;
  pro: number;
  vip: number;
}

export interface SystemAPIKeys {
  groqApiKey?: string;
  groqApiKeys?: string[];
  cohereApiKey?: string;
  cohereApiKeys?: string[];
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
  isBanned?: boolean;
  isVerified?: boolean;
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
