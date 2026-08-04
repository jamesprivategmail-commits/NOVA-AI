import { collection, doc, setDoc, getDocs, query, where, orderBy, deleteDoc, serverTimestamp, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { Chat, Message, UserProfile, SupportChat, SupportMessage, PricingSettings } from "../models/types";
import { v4 as uuidv4 } from "uuid";

export async function getUserProfile(uid: string, email: string | null, displayName: string | null): Promise<UserProfile> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  }
  
  // Default new user profile
  const newUserProfile: UserProfile = {
    uid,
    email,
    displayName,
    tier: 'free',
    messageCount: 0,
    lastMessageDate: new Date().toISOString().split('T')[0],
    isAdmin: email === 'mrnovatech4@gmail.com', // automatically make specific user admin
    isBanned: false,
    isVerified: false,
  };
  
  await setDoc(userRef, newUserProfile);
  return newUserProfile;
}

export async function incrementMessageCount(uid: string): Promise<UserProfile> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error("User not found");
  }
  
  const profile = userSnap.data() as UserProfile;
  const today = new Date().toISOString().split('T')[0];
  
  let newCount = profile.messageCount + 1;
  
  if (profile.lastMessageDate !== today) {
    newCount = 1; // reset daily
  }
  
  const updatedProfile = {
    ...profile,
    messageCount: newCount,
    lastMessageDate: today
  };
  
  await setDoc(userRef, updatedProfile, { merge: true });
  return updatedProfile;
}

export function listenToAllUsers(callback: (users: UserProfile[]) => void) {
  const q = query(collection(db, "users"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as UserProfile));
  }, (error) => {
    console.error("Error in listenToAllUsers:", error);
  });
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const q = query(collection(db, "users"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as UserProfile);
}

export async function updateUserTier(uid: string, tier: 'free' | 'pro' | 'premium' | 'vip'): Promise<void> {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, { tier }, { merge: true });
}

export async function updateUserStatus(uid: string, isBanned: boolean): Promise<void> {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, { isBanned }, { merge: true });
}

export async function updateUserVerification(uid: string, isVerified: boolean): Promise<void> {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, { isVerified }, { merge: true });
}

export async function createChat(userId: string, title: string = "New Chat"): Promise<Chat> {
  const chatId = uuidv4();
  const now = Date.now();
  const chatRef = doc(db, "chats", chatId);
  
  const chat: Chat = {
    id: chatId,
    userId,
    title,
    createdAt: now,
    updatedAt: now,
  };
  
  await setDoc(chatRef, chat);
  return chat;
}

export async function getUserChats(userId: string): Promise<Chat[]> {
  const q = query(
    collection(db, "chats"), 
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);
  const chats = snapshot.docs.map(doc => doc.data() as Chat);
  return chats.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteChat(chatId: string): Promise<void> {
  // 1. Delete all messages
  const q = query(collection(db, `chats/${chatId}/messages`));
  const snapshot = await getDocs(q);
  const deleteOps = snapshot.docs.map(messageDoc => deleteDoc(messageDoc.ref));
  await Promise.all(deleteOps);
  
  // 2. Delete the chat itself
  await deleteDoc(doc(db, "chats", chatId));
}

export async function updateChatTitle(chatId: string, title: string): Promise<void> {
  const chatRef = doc(db, "chats", chatId);
  await setDoc(chatRef, { title, updatedAt: Date.now() }, { merge: true });
}

export async function saveMessage(chatId: string, role: 'user' | 'model', text: string): Promise<Message> {
  const messageId = uuidv4();
  const now = Date.now();
  const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
  
  const message: Message = {
    id: messageId,
    chatId,
    role,
    text,
    createdAt: now
  };
  
  await setDoc(messageRef, message);
  
  // Update chat's updatedAt
  const chatRef = doc(db, "chats", chatId);
  await setDoc(chatRef, { updatedAt: now }, { merge: true });
  
  return message;
}

export async function getChatMessages(chatId: string): Promise<Message[]> {
  const q = query(
    collection(db, `chats/${chatId}/messages`),
    orderBy("createdAt", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Message);
}

export async function deleteMessage(chatId: string, messageId: string): Promise<void> {
  await deleteDoc(doc(db, `chats/${chatId}/messages`, messageId));
}

export async function updateMessage(chatId: string, messageId: string, newText: string): Promise<void> {
  const msgRef = doc(db, `chats/${chatId}/messages`, messageId);
  await setDoc(msgRef, { text: newText }, { merge: true });
}

export async function sendSupportMessage(userId: string, userName: string, text: string, isAdmin: boolean): Promise<void> {
  const now = Date.now();
  const messageId = uuidv4();
  
  // 1. Save message
  const msgRef = doc(db, `support_chats/${userId}/messages`, messageId);
  const msg: SupportMessage = {
    id: messageId,
    senderId: isAdmin ? 'admin' : userId,
    isAdmin,
    text,
    createdAt: now
  };
  await setDoc(msgRef, msg);

  // 2. Update/Create chat meta
  const chatRef = doc(db, 'support_chats', userId);
  const chatSnap = await getDoc(chatRef);
  
  if (chatSnap.exists()) {
    const chatData = chatSnap.data() as SupportChat;
    await setDoc(chatRef, {
      lastMessage: text,
      lastMessageTime: now,
      unreadAdmin: isAdmin ? chatData.unreadAdmin : chatData.unreadAdmin + 1,
      unreadUser: isAdmin ? chatData.unreadUser + 1 : chatData.unreadUser,
      userName: userName // ensure it's up to date
    }, { merge: true });
  } else {
    const newChat: SupportChat = {
      id: userId,
      userId,
      userName,
      lastMessage: text,
      lastMessageTime: now,
      unreadAdmin: isAdmin ? 0 : 1,
      unreadUser: isAdmin ? 1 : 0
    };
    await setDoc(chatRef, newChat);
  }
}

export function listenToSupportMessages(userId: string, callback: (messages: SupportMessage[]) => void) {
  const q = query(collection(db, `support_chats/${userId}/messages`), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(d => d.data() as SupportMessage);
    callback(msgs);
  }, (error) => {
    console.error("Error in listenToSupportMessages:", error);
  });
}

export function listenToAllSupportChats(callback: (chats: SupportChat[]) => void) {
  const q = query(collection(db, 'support_chats'), orderBy('lastMessageTime', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(d => d.data() as SupportChat);
    callback(chats);
  }, (error) => {
    console.error("Error in listenToAllSupportChats:", error);
  });
}

export async function markSupportChatRead(userId: string, isAdmin: boolean) {
  const chatRef = doc(db, 'support_chats', userId);
  const updateData = isAdmin ? { unreadAdmin: 0 } : { unreadUser: 0 };
  await setDoc(chatRef, updateData, { merge: true });
}

export async function getPricingSettings(): Promise<PricingSettings> {
  const docRef = doc(db, 'settings', 'pricing');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as PricingSettings;
  }
  const defaultPricing: PricingSettings = {
    premium: 5000,
    pro: 7000,
    vip: 10000
  };
  await setDoc(docRef, defaultPricing);
  return defaultPricing;
}

export async function updatePricingSettings(settings: PricingSettings): Promise<void> {
  const docRef = doc(db, 'settings', 'pricing');
  await setDoc(docRef, settings, { merge: true });
}

export function listenToPricingSettings(callback: (settings: PricingSettings) => void) {
  const docRef = doc(db, 'settings', 'pricing');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as PricingSettings);
    }
  });
}

