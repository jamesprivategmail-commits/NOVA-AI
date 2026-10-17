import { Chat, Message } from '../../models/types';

const CHATS_CACHE_KEY = 'void_ai_offline_chats_cache';
const MSGS_CACHE_KEY_PREFIX = 'void_ai_offline_msgs_';
const PENDING_QUEUE_KEY = 'void_ai_offline_pending_queue';

export interface PendingQueueItem {
  id: string;
  chatId: string;
  text: string;
  timestamp: number;
}

export const offlineCache = {
  saveChats(chats: Chat[]): void {
    try {
      localStorage.setItem(CHATS_CACHE_KEY, JSON.stringify(chats.slice(0, 30)));
    } catch (_) {}
  },

  loadChats(): Chat[] {
    try {
      const raw = localStorage.getItem(CHATS_CACHE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  },

  saveMessages(chatId: string, messages: Message[]): void {
    try {
      localStorage.setItem(`${MSGS_CACHE_KEY_PREFIX}${chatId}`, JSON.stringify(messages.slice(-50)));
    } catch (_) {}
  },

  loadMessages(chatId: string): Message[] {
    try {
      const raw = localStorage.getItem(`${MSGS_CACHE_KEY_PREFIX}${chatId}`);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  },

  queueMessage(chatId: string, text: string): PendingQueueItem {
    const item: PendingQueueItem = {
      id: 'pending-' + Date.now(),
      chatId,
      text,
      timestamp: Date.now(),
    };
    try {
      const existing: PendingQueueItem[] = JSON.parse(localStorage.getItem(PENDING_QUEUE_KEY) || '[]');
      existing.push(item);
      localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(existing));
    } catch (_) {}
    return item;
  },

  getPendingQueue(): PendingQueueItem[] {
    try {
      return JSON.parse(localStorage.getItem(PENDING_QUEUE_KEY) || '[]');
    } catch (_) {
      return [];
    }
  },

  removePendingItem(id: string): void {
    try {
      const existing: PendingQueueItem[] = JSON.parse(localStorage.getItem(PENDING_QUEUE_KEY) || '[]');
      const filtered = existing.filter(i => i.id !== id);
      localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(filtered));
    } catch (_) {}
  }
};
