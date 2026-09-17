import { collection, doc, setDoc, getDocs, query, where, orderBy, deleteDoc, serverTimestamp, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { Chat, Message, UserProfile, SupportChat, SupportMessage, PricingSettings, BroadcastMessage, UserTier, UserApiKey, WalletTransaction } from "../models/types";
import { v4 as uuidv4 } from "uuid";

export function listenToUserProfile(uid: string, callback: (user: UserProfile | null) => void) {
  const userRef = doc(db, "users", uid);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as UserProfile);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error("Error listening to user profile:", err);
  });
}

export async function getUserProfile(uid: string, email: string | null, displayName: string | null): Promise<UserProfile> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data() as UserProfile;
    if (data.walletBalance === undefined) {
      data.walletBalance = 0;
    }
    return data;
  }
  
  // Default new user profile
  const now = Date.now();
  const newUserProfile: UserProfile = {
    uid,
    email,
    displayName,
    tier: 'free',
    messageCount: 0,
    lastMessageDate: new Date().toISOString().split('T')[0],
    lastResetTime: now,
    isAdmin: email === 'mrnovatech4@gmail.com', // automatically make specific user admin
    isBanned: false,
    isVerified: false,
    walletBalance: 0,
    hasApiKeyAccess: false,
  };
  
  await setDoc(userRef, newUserProfile);
  return newUserProfile;
}

export async function incrementMessageCount(uid: string): Promise<UserProfile> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  
  const now = Date.now();
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  const today = new Date().toISOString().split('T')[0];
  let profile: UserProfile;

  if (!userSnap.exists()) {
    profile = {
      uid,
      email: null,
      displayName: "Guest User",
      tier: 'free',
      messageCount: 0,
      lastMessageDate: today,
      lastResetTime: now,
      isAdmin: false,
      isBanned: false,
      isVerified: false,
    };
  } else {
    profile = userSnap.data() as UserProfile;
  }
  
  let lastResetTime = profile.lastResetTime || 0;
  let newCount = profile.messageCount || 0;

  if (!lastResetTime || (now - lastResetTime >= THREE_HOURS_MS)) {
    newCount = 1; // Reset count for new 3-hour window
    lastResetTime = now;
  } else {
    newCount += 1;
  }
  
  const updatedProfile: UserProfile = {
    ...profile,
    messageCount: newCount,
    lastResetTime: lastResetTime,
    lastMessageDate: today
  };
  
  try {
    await setDoc(userRef, updatedProfile, { merge: true });
  } catch (err) {
    console.warn("Error persisting incremented message count:", err);
  }
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

export async function updateUserSupportStaff(uid: string, isSupportStaff: boolean): Promise<void> {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, { isSupportStaff }, { merge: true });
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

export async function clearAllUserChats(userId: string): Promise<void> {
  const q = query(collection(db, "chats"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  
  const deleteChatPromises = snapshot.docs.map(async (chatDoc) => {
    const chatId = chatDoc.id;
    const msgsQuery = query(collection(db, `chats/${chatId}/messages`));
    const msgsSnapshot = await getDocs(msgsQuery);
    const msgDeleteOps = msgsSnapshot.docs.map(mDoc => deleteDoc(mDoc.ref));
    await Promise.all(msgDeleteOps);
    await deleteDoc(chatDoc.ref);
  });

  await Promise.all(deleteChatPromises);
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
      unreadAdmin: isAdmin ? (chatData.unreadAdmin || 0) : (chatData.unreadAdmin || 0) + 1,
      unreadUser: isAdmin ? (chatData.unreadUser || 0) + 1 : (chatData.unreadUser || 0),
      userName: userName || chatData.userName || 'User' // ensure it's up to date
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
  const defaultPricing: PricingSettings = {
    pro: 7000,
    proYearly: 70000,
    proDiscount: 16,

    premium: 15000,
    premiumYearly: 150000,
    premiumDiscount: 16,

    vip: 30000,
    vipYearly: 300000,
    vipDiscount: 16,

    apiKeyMonthly: 20000,
    apiKeyYearly: 200000,
    apiKeyDiscount: 20
  };

  if (snap.exists()) {
    const data = snap.data();
    return {
      pro: typeof data.pro === 'number' ? data.pro : defaultPricing.pro,
      proYearly: typeof data.proYearly === 'number' ? data.proYearly : (data.pro ? data.pro * 10 : defaultPricing.proYearly),
      proDiscount: typeof data.proDiscount === 'number' ? data.proDiscount : defaultPricing.proDiscount,

      premium: typeof data.premium === 'number' ? data.premium : defaultPricing.premium,
      premiumYearly: typeof data.premiumYearly === 'number' ? data.premiumYearly : (data.premium ? data.premium * 10 : defaultPricing.premiumYearly),
      premiumDiscount: typeof data.premiumDiscount === 'number' ? data.premiumDiscount : defaultPricing.premiumDiscount,

      vip: typeof data.vip === 'number' ? data.vip : defaultPricing.vip,
      vipYearly: typeof data.vipYearly === 'number' ? data.vipYearly : (data.vip ? data.vip * 10 : defaultPricing.vipYearly),
      vipDiscount: typeof data.vipDiscount === 'number' ? data.vipDiscount : defaultPricing.vipDiscount,

      apiKeyMonthly: typeof data.apiKeyMonthly === 'number' ? data.apiKeyMonthly : defaultPricing.apiKeyMonthly,
      apiKeyYearly: typeof data.apiKeyYearly === 'number' ? data.apiKeyYearly : defaultPricing.apiKeyYearly,
      apiKeyDiscount: typeof data.apiKeyDiscount === 'number' ? data.apiKeyDiscount : defaultPricing.apiKeyDiscount,
    };
  }
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
      const data = docSnap.data();
      callback({
        pro: typeof data.pro === 'number' ? data.pro : 7000,
        proYearly: typeof data.proYearly === 'number' ? data.proYearly : 70000,
        proDiscount: typeof data.proDiscount === 'number' ? data.proDiscount : 16,

        premium: typeof data.premium === 'number' ? data.premium : 15000,
        premiumYearly: typeof data.premiumYearly === 'number' ? data.premiumYearly : 150000,
        premiumDiscount: typeof data.premiumDiscount === 'number' ? data.premiumDiscount : 16,

        vip: typeof data.vip === 'number' ? data.vip : 30000,
        vipYearly: typeof data.vipYearly === 'number' ? data.vipYearly : 300000,
        vipDiscount: typeof data.vipDiscount === 'number' ? data.vipDiscount : 16,

        apiKeyMonthly: typeof data.apiKeyMonthly === 'number' ? data.apiKeyMonthly : 20000,
        apiKeyYearly: typeof data.apiKeyYearly === 'number' ? data.apiKeyYearly : 200000,
        apiKeyDiscount: typeof data.apiKeyDiscount === 'number' ? data.apiKeyDiscount : 20,
      });
    } else {
      callback({
        pro: 7000,
        proYearly: 70000,
        proDiscount: 16,
        premium: 15000,
        premiumYearly: 150000,
        premiumDiscount: 16,
        vip: 30000,
        vipYearly: 300000,
        vipDiscount: 16,
        apiKeyMonthly: 20000,
        apiKeyYearly: 200000,
        apiKeyDiscount: 20
      });
    }
  });
}

import { AIBrainSettings } from "../models/types";

export async function getAIBrainSettings(): Promise<AIBrainSettings> {
  const docRef = doc(db, 'settings', 'brain');
  const snap = await getDoc(docRef);
  
  const defaultBrain: AIBrainSettings = {
    globalPrompt: "",
    freePrompt: "",
    proPrompt: "",
    premiumPrompt: "",
    vipPrompt: "",

    freeLimit: 5,
    proLimit: 20,
    premiumLimit: 50,
    vipLimit: 99999,

    freeMaxTokens: 512,
    proMaxTokens: 1024,
    premiumMaxTokens: 2048,
    vipMaxTokens: 4096,
  };

  if (snap.exists()) {
    const data = snap.data();
    return {
      globalPrompt: data.globalPrompt || defaultBrain.globalPrompt,
      freePrompt: data.freePrompt || defaultBrain.freePrompt,
      proPrompt: data.proPrompt || defaultBrain.proPrompt,
      premiumPrompt: data.premiumPrompt || defaultBrain.premiumPrompt,
      vipPrompt: data.vipPrompt || defaultBrain.vipPrompt,

      freeLimit: typeof data.freeLimit === 'number' ? data.freeLimit : defaultBrain.freeLimit,
      proLimit: typeof data.proLimit === 'number' ? data.proLimit : defaultBrain.proLimit,
      premiumLimit: typeof data.premiumLimit === 'number' ? data.premiumLimit : defaultBrain.premiumLimit,
      vipLimit: typeof data.vipLimit === 'number' ? data.vipLimit : defaultBrain.vipLimit,

      freeMaxTokens: typeof data.freeMaxTokens === 'number' ? data.freeMaxTokens : defaultBrain.freeMaxTokens,
      proMaxTokens: typeof data.proMaxTokens === 'number' ? data.proMaxTokens : defaultBrain.proMaxTokens,
      premiumMaxTokens: typeof data.premiumMaxTokens === 'number' ? data.premiumMaxTokens : defaultBrain.premiumMaxTokens,
      vipMaxTokens: typeof data.vipMaxTokens === 'number' ? data.vipMaxTokens : defaultBrain.vipMaxTokens,
    };
  }
  
  await setDoc(docRef, defaultBrain);
  return defaultBrain;
}

export async function updateAIBrainSettings(brain: AIBrainSettings): Promise<void> {
  const docRef = doc(db, 'settings', 'brain');
  await setDoc(docRef, brain, { merge: true });
}

export function listenToAIBrainSettings(callback: (brain: AIBrainSettings) => void) {
  const docRef = doc(db, 'settings', 'brain');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as AIBrainSettings);
    }
  });
}

import { SystemAPIKeys } from "../models/types";

export async function getSystemAPIKeys(): Promise<SystemAPIKeys> {
  const docRef = doc(db, 'settings', 'apikeys');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as SystemAPIKeys;
    let groqApiKeys: string[] = Array.isArray(data.groqApiKeys) ? data.groqApiKeys.filter(k => typeof k === 'string' && k.trim()) : [];
    if (groqApiKeys.length === 0 && data.groqApiKey && data.groqApiKey.trim()) {
      groqApiKeys = [data.groqApiKey.trim()];
    }

    let cohereApiKeys: string[] = Array.isArray(data.cohereApiKeys) ? data.cohereApiKeys.filter(k => typeof k === 'string' && k.trim()) : [];
    if (cohereApiKeys.length === 0 && data.cohereApiKey && data.cohereApiKey.trim()) {
      cohereApiKeys = [data.cohereApiKey.trim()];
    }

    let bazaarLinkApiKeys: string[] = Array.isArray(data.bazaarLinkApiKeys) ? data.bazaarLinkApiKeys.filter(k => typeof k === 'string' && k.trim()) : [];
    if (bazaarLinkApiKeys.length === 0 && data.bazaarLinkApiKey && data.bazaarLinkApiKey.trim()) {
      bazaarLinkApiKeys = [data.bazaarLinkApiKey.trim()];
    }

    return {
      groqApiKey: data.groqApiKey || (groqApiKeys[0] || ''),
      groqApiKeys,
      cohereApiKey: data.cohereApiKey || (cohereApiKeys[0] || ''),
      cohereApiKeys,
      bazaarLinkApiKey: data.bazaarLinkApiKey || (bazaarLinkApiKeys[0] || ''),
      bazaarLinkApiKeys
    };
  }
  return { groqApiKey: '', groqApiKeys: [], cohereApiKey: '', cohereApiKeys: [], bazaarLinkApiKey: '', bazaarLinkApiKeys: [] };
}

export async function updateSystemAPIKeys(keys: SystemAPIKeys): Promise<void> {
  const docRef = doc(db, 'settings', 'apikeys');
  await setDoc(docRef, keys, { merge: true });
}

export async function sendBroadcastMessage(title: string, message: string, senderName: string = "Admin", targetTier: 'all' | UserTier = 'all'): Promise<BroadcastMessage> {
  const id = uuidv4();
  const now = Date.now();
  const broadcastRef = doc(db, 'broadcasts', id);
  
  const broadcast: BroadcastMessage = {
    id,
    title,
    message,
    senderName,
    targetTier,
    createdAt: now,
  };
  
  await setDoc(broadcastRef, broadcast);
  return broadcast;
}

export function listenToBroadcasts(callback: (broadcasts: BroadcastMessage[]) => void) {
  const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const broadcasts = snapshot.docs.map(doc => doc.data() as BroadcastMessage);
    callback(broadcasts);
  }, (error) => {
    console.error("Error listening to broadcasts:", error);
  });
}

export async function deleteBroadcast(id: string): Promise<void> {
  await deleteDoc(doc(db, 'broadcasts', id));
}

// User API Keys (nvn_...)
export async function getUserApiKeys(userId: string): Promise<UserApiKey[]> {
  try {
    const q = query(collection(db, "user_api_keys"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const keys = snapshot.docs.map(doc => doc.data() as UserApiKey);
    return keys.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.error("Error fetching user API keys:", err);
    return [];
  }
}

export async function generateUserApiKey(userId: string, name: string = "Default Key"): Promise<UserApiKey> {
  const id = uuidv4();
  const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const keyString = `nvn_live_${randomHex}`;
  const now = Date.now();

  const apiKeyData: UserApiKey = {
    id,
    userId,
    name: name.trim() || "API Key",
    key: keyString,
    createdAt: now,
  };

  await setDoc(doc(db, "user_api_keys", id), apiKeyData);
  return apiKeyData;
}

export async function deleteUserApiKey(keyId: string): Promise<void> {
  await deleteDoc(doc(db, "user_api_keys", keyId));
}

export async function validateUserApiKey(apiKey: string): Promise<{ userId: string; tier: UserTier; isBanned: boolean } | null> {
  try {
    if (!apiKey || !apiKey.startsWith("nvn_")) return null;
    const q = query(collection(db, "user_api_keys"), where("key", "==", apiKey.trim()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const keyData = snapshot.docs[0].data() as UserApiKey;
    
    // Update lastUsedAt asynchronously
    setDoc(doc(db, "user_api_keys", keyData.id), { lastUsedAt: Date.now() }, { merge: true }).catch(() => {});

    // Retrieve user profile
    const userRef = doc(db, "users", keyData.userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return null;

    const uData = userSnap.data();
    return {
      userId: keyData.userId,
      tier: (uData.tier as UserTier) || 'free',
      isBanned: !!uData.isBanned
    };
  } catch (err) {
    console.error("Error validating API key:", err);
    return null;
  }
}

// WALLET SYSTEM FUNCTIONS
export async function grantUserWalletFunds(
  uid: string, 
  amount: number, 
  description: string = "Admin Grant / Wallet Funding"
): Promise<{ newBalance: number }> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  
  let currentBalance = 0;
  let userName = "User";
  let userEmail = "";

  if (userSnap.exists()) {
    const data = userSnap.data() as UserProfile;
    currentBalance = data.walletBalance || 0;
    userName = data.displayName || data.email || "User";
    userEmail = data.email || "";
  }

  const newBalance = Math.max(0, currentBalance + amount);
  await setDoc(userRef, { walletBalance: newBalance }, { merge: true });

  // Record Transaction
  const txId = uuidv4();
  const tx: WalletTransaction = {
    id: txId,
    userId: uid,
    userName,
    userEmail,
    amount,
    type: amount >= 0 ? 'admin_grant' : 'refund',
    description,
    createdAt: Date.now()
  };
  await setDoc(doc(db, "wallet_transactions", txId), tx);

  return { newBalance };
}

export async function withdrawUserWalletFunds(
  uid: string, 
  amountToWithdraw: number, 
  description: string = "Admin Security Withdrawal"
): Promise<{ newBalance: number }> {
  return grantUserWalletFunds(uid, -Math.abs(amountToWithdraw), description);
}

export async function resetUserWalletBalance(
  uid: string, 
  reason: string = "Emergency Security Freeze / Balance Reset"
): Promise<{ newBalance: number }> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  
  let currentBalance = 0;
  let userName = "User";
  let userEmail = "";

  if (userSnap.exists()) {
    const data = userSnap.data() as UserProfile;
    currentBalance = data.walletBalance || 0;
    userName = data.displayName || data.email || "User";
    userEmail = data.email || "";
  }

  await setDoc(userRef, { walletBalance: 0 }, { merge: true });

  if (currentBalance > 0) {
    const txId = uuidv4();
    const tx: WalletTransaction = {
      id: txId,
      userId: uid,
      userName,
      userEmail,
      amount: -currentBalance,
      type: 'refund',
      description: `${reason} (Reset ₦${currentBalance.toLocaleString()} to ₦0)`,
      createdAt: Date.now()
    };
    await setDoc(doc(db, "wallet_transactions", txId), tx);
  }

  return { newBalance: 0 };
}

export async function purchaseTierWithWallet(
  uid: string, 
  tier: UserTier, 
  cost: number, 
  billingCycleText: string = "Monthly Plan"
): Promise<{ success: boolean; message: string; newBalance?: number }> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return { success: false, message: "User profile not found." };
  }

  const user = userSnap.data() as UserProfile;
  const currentBalance = user.walletBalance || 0;

  if (currentBalance < cost) {
    return { 
      success: false, 
      message: `Insufficient Wallet Balance! Required: ₦${cost.toLocaleString()}, Current Balance: ₦${currentBalance.toLocaleString()}. Please ask Admin to fund your wallet.` 
    };
  }

  const newBalance = currentBalance - cost;
  await setDoc(userRef, { tier, walletBalance: newBalance }, { merge: true });

  // Record transaction
  const txId = uuidv4();
  const tx: WalletTransaction = {
    id: txId,
    userId: uid,
    userName: user.displayName || user.email || "User",
    userEmail: user.email || "",
    amount: -cost,
    type: 'subscription_purchase',
    description: `Purchased ${tier.toUpperCase()} Subscription (${billingCycleText})`,
    createdAt: Date.now()
  };
  await setDoc(doc(db, "wallet_transactions", txId), tx);

  return { success: true, message: `Successfully upgraded to ${tier.toUpperCase()} plan!`, newBalance };
}

export async function purchaseApiKeyAccessWithWallet(
  uid: string, 
  cost: number, 
  billingCycleText: string = "Monthly Suite"
): Promise<{ success: boolean; message: string; newBalance?: number }> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return { success: false, message: "User profile not found." };
  }

  const user = userSnap.data() as UserProfile;
  const currentBalance = user.walletBalance || 0;

  if (currentBalance < cost) {
    return { 
      success: false, 
      message: `Insufficient Wallet Balance! Required: ₦${cost.toLocaleString()}, Current Balance: ₦${currentBalance.toLocaleString()}. Please contact Admin to fund your wallet.` 
    };
  }

  const newBalance = currentBalance - cost;
  await setDoc(userRef, { hasApiKeyAccess: true, walletBalance: newBalance }, { merge: true });

  // Record transaction
  const txId = uuidv4();
  const tx: WalletTransaction = {
    id: txId,
    userId: uid,
    userName: user.displayName || user.email || "User",
    userEmail: user.email || "",
    amount: -cost,
    type: 'apikey_purchase',
    description: `Purchased Developer API Key Access Suite (${billingCycleText})`,
    createdAt: Date.now()
  };
  await setDoc(doc(db, "wallet_transactions", txId), tx);

  return { success: true, message: `Successfully unlocked Developer API Key Suite Access!`, newBalance };
}

export function listenToWalletTransactions(userId: string | null, callback: (txs: WalletTransaction[]) => void) {
  let q;
  if (userId) {
    q = query(collection(db, "wallet_transactions"), where("userId", "==", userId));
  } else {
    q = query(collection(db, "wallet_transactions"), orderBy("createdAt", "desc"));
  }

  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(doc => doc.data() as WalletTransaction);
    list.sort((a, b) => b.createdAt - a.createdAt);
    callback(list);
  }, (err) => {
    console.error("Error listening to wallet transactions:", err);
    callback([]);
  });
}

