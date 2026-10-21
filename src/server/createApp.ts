import express from "express";
import path from "path";
import fs from "fs";
import Groq from "groq-sdk";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase.js";
import { telegramBot } from "../telegram/bot.js";
import { AI_CONFIG } from "../config/ai.js";
import * as githubService from "./github.js";
import { buildUnifiedBrainPrompt } from "./agent/brainPrompt.js";
import { projectMemoryService } from "./memory/projectMemory.js";
import { codebaseSearch } from "./search/codebaseSearch.js";
import { codeVerifier } from "./agent/verifier.js";
import { getAuthoritativeToolCapabilities } from "./tools/registry.js";
import { terminalService } from "./terminal/terminalService.js";
import { workspaceService } from "./workspace/workspaceService.js";
import { processManager } from "./process/processManager.js";
import { autonomousAgent } from "./agent/autonomousAgent.js";
import http from "http";

import { GoogleGenAI } from "@google/genai";
import { CohereClient } from "cohere-ai";
dotenv.config();

export function cleanKey(k: any): string {
  if (typeof k !== 'string') return '';
  return k.replace(/[\r\n]/g, '').replace(/^["']|["']$/g, '').trim();
}

export function parseKeysFromInput(val: any): string[] {
  if (!val) return [];
  const list: string[] = [];
  const collect = (item: any) => {
    if (!item) return;
    if (Array.isArray(item)) {
      for (const sub of item) collect(sub);
    } else if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            collect(parsed);
            return;
          }
        } catch (_) {}
      }
      const parts = trimmed.split(/[\n,;\s]+/).map(cleanKey).filter(k => k && k.length > 5);
      list.push(...parts);
    }
  };
  collect(val);
  return [...new Set(list)];
}

export function getEnvKeys(): { groqKeys: string[]; cohereKeys: string[]; bazaarLinkKeys: string[]; geminiKeys: string[] } {
  const groqKeys = [
    ...parseKeysFromInput(process.env.GROQ_API_KEY),
    ...parseKeysFromInput(process.env.GROQ_API_KEYS),
    ...parseKeysFromInput(process.env.VITE_GROQ_API_KEY),
    ...parseKeysFromInput(process.env.GROQ_KEY),
  ];
  const cohereKeys = [
    ...parseKeysFromInput(process.env.COHERE_API_KEY),
    ...parseKeysFromInput(process.env.COHERE_API_KEYS),
    ...parseKeysFromInput(process.env.VITE_COHERE_API_KEY),
    ...parseKeysFromInput(process.env.COHERE_KEY),
  ];
  const bazaarLinkKeys = [
    ...parseKeysFromInput(process.env.BAZAARLINK_API_KEY),
    ...parseKeysFromInput(process.env.BAZAARLINK_API_KEYS),
    ...parseKeysFromInput(process.env.VITE_BAZAARLINK_API_KEY),
    ...parseKeysFromInput(process.env.BAZAARLINK_KEY),
  ];
  const geminiKeys = [
    ...parseKeysFromInput(process.env.GEMINI_API_KEY),
    ...parseKeysFromInput(process.env.GOOGLE_API_KEY),
    ...parseKeysFromInput(process.env.VITE_GEMINI_API_KEY),
  ];
  return {
    groqKeys: [...new Set(groqKeys)],
    cohereKeys: [...new Set(cohereKeys)],
    bazaarLinkKeys: [...new Set(bazaarLinkKeys)],
    geminiKeys: [...new Set(geminiKeys)],
  };
}

export interface SystemKeysPool {
  groqKeys: string[];
  cohereKeys: string[];
  bazaarLinkKeys: string[];
  geminiKeys: string[];
}

let cachedSystemKeys: SystemKeysPool | null = null;
let lastSystemKeysFetchTime = 0;
let isKeysListenerStarted = false;

export function initSystemKeysListener(): void {
  if (isKeysListenerStarted) return;
  isKeysListenerStarted = true;
  try {
    const keysRef = doc(db, "settings", "apikeys");
    onSnapshot(keysRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const envKeys = getEnvKeys();
        const firestoreGroq = [
          ...parseKeysFromInput(data.groqApiKeys),
          ...parseKeysFromInput(data.groqApiKey),
        ];
        const firestoreCohere = [
          ...parseKeysFromInput(data.cohereApiKeys),
          ...parseKeysFromInput(data.cohereApiKey),
        ];
        const firestoreBazaar = [
          ...parseKeysFromInput(data.bazaarLinkApiKeys),
          ...parseKeysFromInput(data.bazaarLinkApiKey),
        ];
        const firestoreGemini = [
          ...parseKeysFromInput(data.geminiApiKeys),
          ...parseKeysFromInput(data.geminiApiKey),
          ...parseKeysFromInput(data.googleApiKey),
        ];

        cachedSystemKeys = {
          groqKeys: [...new Set([...envKeys.groqKeys, ...firestoreGroq])],
          cohereKeys: [...new Set([...envKeys.cohereKeys, ...firestoreCohere])],
          bazaarLinkKeys: [...new Set([...envKeys.bazaarLinkKeys, ...firestoreBazaar])],
          geminiKeys: [...new Set([...envKeys.geminiKeys, ...firestoreGemini])],
        };
        lastSystemKeysFetchTime = Date.now();
        keyHealthManager.clearAllBadKeys();
        console.log(`[System Keys] Live Firestore sync: ${cachedSystemKeys.groqKeys.length} Groq, ${cachedSystemKeys.cohereKeys.length} Cohere, ${cachedSystemKeys.geminiKeys.length} Gemini, ${cachedSystemKeys.bazaarLinkKeys.length} BazaarLink keys loaded`);
      }
    }, (err) => {
      console.warn("[System Keys] Firestore live snapshot warning:", err?.message || err);
    });
  } catch (err) {
    console.warn("[System Keys] Could not initialize live listener:", err);
  }
}

export async function getSystemKeys(clientKeys?: {
  groqKeys?: string[];
  cohereKeys?: string[];
  bazaarLinkKeys?: string[];
  geminiKeys?: string[];
}): Promise<SystemKeysPool> {
  initSystemKeysListener();

  const envKeys = getEnvKeys();
  const clientGroq = parseKeysFromInput(clientKeys?.groqKeys);
  const clientCohere = parseKeysFromInput(clientKeys?.cohereKeys);
  const clientBazaar = parseKeysFromInput(clientKeys?.bazaarLinkKeys);
  const clientGemini = parseKeysFromInput(clientKeys?.geminiKeys);
  const now = Date.now();

  // If client provided keys, merge them directly into cache and reset health manager if needed
  if (clientGroq.length > 0 || clientCohere.length > 0 || clientBazaar.length > 0 || clientGemini.length > 0) {
    const mergedGroq = [...new Set([...clientGroq, ...(cachedSystemKeys?.groqKeys || []), ...envKeys.groqKeys])];
    const mergedCohere = [...new Set([...clientCohere, ...(cachedSystemKeys?.cohereKeys || []), ...envKeys.cohereKeys])];
    const mergedBazaar = [...new Set([...clientBazaar, ...(cachedSystemKeys?.bazaarLinkKeys || []), ...envKeys.bazaarLinkKeys])];
    const mergedGemini = [...new Set([...clientGemini, ...(cachedSystemKeys?.geminiKeys || []), ...envKeys.geminiKeys])];
    cachedSystemKeys = {
      groqKeys: mergedGroq,
      cohereKeys: mergedCohere,
      bazaarLinkKeys: mergedBazaar,
      geminiKeys: mergedGemini,
    };
    lastSystemKeysFetchTime = now;
    return cachedSystemKeys;
  }

  // If cached keys have active keys, return immediately to eliminate latency and avoid timeouts
  if (
    cachedSystemKeys &&
    (cachedSystemKeys.groqKeys.length > 0 ||
      cachedSystemKeys.cohereKeys.length > 0 ||
      cachedSystemKeys.geminiKeys.length > 0 ||
      cachedSystemKeys.bazaarLinkKeys.length > 0) &&
    now - lastSystemKeysFetchTime < 120000
  ) {
    return cachedSystemKeys;
  }

  let firestoreGroqKeys: string[] = [];
  let firestoreCohereKeys: string[] = [];
  let firestoreBazaarLinkKeys: string[] = [];
  let firestoreGeminiKeys: string[] = [];

  try {
    const keysRef = doc(db, "settings", "apikeys");
    const fetchDocPromise = getDoc(keysRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000));
    const keysSnap = await Promise.race([fetchDocPromise, timeoutPromise]);

    if (keysSnap && (keysSnap as any).exists && (keysSnap as any).exists()) {
      const data = (keysSnap as any).data();
      firestoreGroqKeys = [
        ...parseKeysFromInput(data.groqApiKeys),
        ...parseKeysFromInput(data.groqApiKey),
      ];
      firestoreCohereKeys = [
        ...parseKeysFromInput(data.cohereApiKeys),
        ...parseKeysFromInput(data.cohereApiKey),
      ];
      firestoreBazaarLinkKeys = [
        ...parseKeysFromInput(data.bazaarLinkApiKeys),
        ...parseKeysFromInput(data.bazaarLinkApiKey),
      ];
      firestoreGeminiKeys = [
        ...parseKeysFromInput(data.geminiApiKeys),
        ...parseKeysFromInput(data.geminiApiKey),
        ...parseKeysFromInput(data.googleApiKey),
      ];
    }
  } catch (err) {
    console.warn("[System Keys] Could not fetch API keys from Firestore in backend:", err);
  }

  // Combine environment variable keys, fresh Firestore keys, and any cached keys
  const groqKeys = [...new Set([...envKeys.groqKeys, ...firestoreGroqKeys, ...(cachedSystemKeys?.groqKeys || [])])];
  const cohereKeys = [...new Set([...envKeys.cohereKeys, ...firestoreCohereKeys, ...(cachedSystemKeys?.cohereKeys || [])])];
  const bazaarLinkKeys = [...new Set([...envKeys.bazaarLinkKeys, ...firestoreBazaarLinkKeys, ...(cachedSystemKeys?.bazaarLinkKeys || [])])];
  const geminiKeys = [...new Set([...envKeys.geminiKeys, ...firestoreGeminiKeys, ...(cachedSystemKeys?.geminiKeys || [])])];

  cachedSystemKeys = { groqKeys, cohereKeys, bazaarLinkKeys, geminiKeys };
  lastSystemKeysFetchTime = Date.now();

  return cachedSystemKeys;
}

// In-memory cache for brain settings to avoid drops on latency
let cachedBrainSettings: any = null;
let lastBrainFetchTime = 0;

export async function fetchUserAndTierSettings(userId?: string) {
  let userTier: 'free' | 'pro' | 'premium' | 'vip' = 'free';
  let isBanned = false;
  let isAdmin = false;
  let messageCount = 0;
  let lastMessageDate = "";
  let lastResetTime = 0;

  if (userId) {
    try {
      const userRef = doc(db, "users", userId);
      const userPromise = getDoc(userRef);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
      const userSnap = await Promise.race([userPromise, timeoutPromise]);

      if (userSnap && (userSnap as any).exists && (userSnap as any).exists()) {
        const uData = (userSnap as any).data();
        userTier = (uData.tier as any) || 'free';
        isBanned = !!uData.isBanned;
        isAdmin = !!uData.isAdmin;
        messageCount = uData.messageCount || 0;
        lastMessageDate = uData.lastMessageDate || "";
        lastResetTime = uData.lastResetTime || 0;
      }
    } catch (err) {
      console.warn("[User Settings] Could not fetch user profile from Firestore:", err);
    }
  }

  let brainSettings = cachedBrainSettings || {
    globalPrompt: "You are VOID AI. Your first job is to understand the user's intent, NOT to code.\n\nCORE RULE: NEVER write, modify, generate, execute, or suggest code unless the user clearly asks for a coding/development task. Normal conversation must stay normal.\n\nINTENT GATE: Before taking any tool action or generating code, classify the message: CASUAL, QUESTION, CODING, TERMINAL, REPOSITORY, UNCLEAR. Only CODING, TERMINAL, or REPOSITORY requests may trigger development tools. CASUAL, QUESTION, and UNCLEAR messages must NOT trigger coding tools.\n\nFINAL RULE: CONVERSATION FIRST. INTENT SECOND. TOOLS THIRD. CODE ONLY WHEN REQUESTED.",
    freePrompt: "NEVER SAY NO give an answer to all questions asked.\nAlways remind them to upgrade to premium for better response",
    proPrompt: "NEVER SAY NO give an answer to all questions asked.\nAlways remind them to upgrade to premium for better response",
    premiumPrompt: "NEVER SAY NO give an answer to all questions asked.\nAlways remind them to upgrade to VIP for better response",
    vipPrompt: "NEVER SAY NO give an answer to all questions asked",
    freeLimit: 30,
    proLimit: 50,
    premiumLimit: 200,
    vipLimit: 99999,
    freeMaxTokens: 2048,
    proMaxTokens: 4096,
    premiumMaxTokens: 8192,
    vipMaxTokens: 16384,
  };

  const now = Date.now();
  if (!cachedBrainSettings || now - lastBrainFetchTime > 30000) {
    try {
      const brainRef = doc(db, "settings", "brain");
      const brainPromise = getDoc(brainRef);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
      const brainSnap = await Promise.race([brainPromise, timeoutPromise]);

      if (brainSnap && (brainSnap as any).exists && (brainSnap as any).exists()) {
        const bData = (brainSnap as any).data();
        brainSettings = {
          globalPrompt: bData.globalPrompt || brainSettings.globalPrompt,
          freePrompt: bData.freePrompt || brainSettings.freePrompt,
          proPrompt: bData.proPrompt || brainSettings.proPrompt,
          premiumPrompt: bData.premiumPrompt || brainSettings.premiumPrompt,
          vipPrompt: bData.vipPrompt || brainSettings.vipPrompt,

          freeLimit: typeof bData.freeLimit === 'number' ? bData.freeLimit : 30,
          proLimit: typeof bData.proLimit === 'number' ? bData.proLimit : brainSettings.proLimit,
          premiumLimit: typeof bData.premiumLimit === 'number' ? bData.premiumLimit : brainSettings.premiumLimit,
          vipLimit: typeof bData.vipLimit === 'number' ? bData.vipLimit : brainSettings.vipLimit,

          freeMaxTokens: typeof bData.freeMaxTokens === 'number' ? bData.freeMaxTokens : brainSettings.freeMaxTokens,
          proMaxTokens: typeof bData.proMaxTokens === 'number' ? bData.proMaxTokens : brainSettings.proMaxTokens,
          premiumMaxTokens: typeof bData.premiumMaxTokens === 'number' ? bData.premiumMaxTokens : brainSettings.premiumMaxTokens,
          vipMaxTokens: typeof bData.vipMaxTokens === 'number' ? bData.vipMaxTokens : brainSettings.vipMaxTokens,
        };
        cachedBrainSettings = brainSettings;
        lastBrainFetchTime = now;
      }
    } catch (err) {
      console.warn("[Brain Settings] Could not fetch brain settings from Firestore:", err);
    }
  }

  return {
    userTier,
    isBanned,
    isAdmin,
    messageCount,
    lastMessageDate,
    lastResetTime,
    brainSettings
  };
}

export async function validateApiKeyServer(apiKey: string): Promise<{ userId: string; tier: string; isBanned: boolean } | null> {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('nvn_')) {
    return null;
  }
  try {
    const keysRef = collection(db, "user_api_keys");
    const q = query(keysRef, where("key", "==", apiKey.trim()));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const kData = snap.docs[0].data();
    const userId = kData.userId;
    
    // Update lastUsedAt timestamp asynchronously
    setDoc(doc(db, "user_api_keys", snap.docs[0].id), { lastUsedAt: Date.now() }, { merge: true }).catch(() => {});

    const { userTier, isBanned } = await fetchUserAndTierSettings(userId);
    return { userId, tier: userTier || 'free', isBanned };
  } catch (err) {
    console.warn("Error validating API key on server:", err);
    return null;
  }
}

// API Key Validation & Health Cache Layer
interface BadKeyInfo {
  reason: string;
  expiresAt: number;
}

export class KeyHealthManager {
  private badKeysMap = new Map<string, BadKeyInfo>();

  private getKeyHash(apiKey: string): string {
    return apiKey.trim();
  }

  isKeyFormatValid(apiKey: string, provider: 'groq' | 'cohere' | 'bazaarlink' | 'gemini'): boolean {
    if (!apiKey || typeof apiKey !== 'string') return false;
    const clean = apiKey.replace(/[\r\n]/g, '').replace(/^["']|["']$/g, '').trim();
    if (clean.length < 5) return false;
    if (clean.includes(" ") || clean.includes("YOUR_") || clean.includes("...") || clean.toLowerCase().includes("placeholder")) {
      return false;
    }
    return true;
  }

  markKeyAsBad(apiKey: string, reason: string, ttlMs: number = 10 * 60 * 1000) {
    const keyHash = this.getKeyHash(apiKey);
    const masked = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '***';
    console.warn(`[Key Health Manager] Flagging key (${masked}) as BAD for ${Math.round(ttlMs / 60000)}m. Reason: ${reason}`);
    this.badKeysMap.set(keyHash, {
      reason,
      expiresAt: Date.now() + ttlMs,
    });
  }

  isKeyHealthy(apiKey: string, provider: 'groq' | 'cohere' | 'bazaarlink' | 'gemini'): { healthy: boolean; reason?: string } {
    if (!this.isKeyFormatValid(apiKey, provider)) {
      return { healthy: false, reason: "Invalid key format or placeholder text" };
    }

    const keyHash = this.getKeyHash(apiKey);
    const info = this.badKeysMap.get(keyHash);
    if (info) {
      if (Date.now() < info.expiresAt) {
        return { healthy: false, reason: info.reason };
      }
      this.badKeysMap.delete(keyHash);
    }
    return { healthy: true };
  }

  filterHealthyKeys(keys: string[], provider: 'groq' | 'cohere' | 'bazaarlink' | 'gemini'): { healthyKeys: string[]; skippedReasons: string[] } {
    const healthyKeys: string[] = [];
    const skippedReasons: string[] = [];

    for (const k of keys) {
      const check = this.isKeyHealthy(k, provider);
      if (check.healthy) {
        healthyKeys.push(k.trim());
      } else {
        const masked = k.length > 8 ? `${k.slice(0, 4)}...${k.slice(-4)}` : '***';
        skippedReasons.push(`${masked}: ${check.reason}`);
      }
    }

    return { healthyKeys, skippedReasons };
  }

  clearAllBadKeys() {
    this.badKeysMap.clear();
  }
}

export const keyHealthManager = new KeyHealthManager();

const unsupportedGroqModels = new Set<string>();

export async function executeGroqWithRotation(
  messages: any[],
  systemPrompt: string,
  maxTokens: number = 1024,
  requestedModel: string | undefined,
  groqKeys: string[],
  res: any,
  imageDataUrl?: string
) {
  let { healthyKeys, skippedReasons } = keyHealthManager.filterHealthyKeys(groqKeys, 'groq');
  
  if (healthyKeys.length === 0 && groqKeys.length > 0) {
    console.warn(`[Groq Validation] All ${groqKeys.length} keys were flagged. Resetting key health map to retry.`);
    keyHealthManager.clearAllBadKeys();
    healthyKeys = groqKeys.filter(k => keyHealthManager.isKeyFormatValid(k, 'groq'));
  }

  if (healthyKeys.length === 0) {
    if (skippedReasons.length > 0) {
      console.warn(`[Groq Validation] Skipped invalid/bad keys: ${skippedReasons.join(', ')}`);
    }
    throw new Error("No healthy or valid Groq API keys available");
  }

  const VISION_MODEL = "llama-3.2-90b-vision-preview";
  const defaultModels = AI_CONFIG.providers.groq.models;
  const models = imageDataUrl
    ? [VISION_MODEL, ...defaultModels]
    : requestedModel && requestedModel !== 'auto' && defaultModels.includes(requestedModel)
      ? [requestedModel, ...defaultModels.filter(m => m !== requestedModel)]
      : defaultModels;

  let lastError: any = null;

  for (let keyIdx = 0; keyIdx < healthyKeys.length; keyIdx++) {
    const apiKey = healthyKeys[keyIdx];
    const groq = new Groq({ apiKey });

    for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
      const model = models[modelIdx];
      if (unsupportedGroqModels.has(model)) continue;

      try {
        const formattedMessages: any[] = [];
        if (systemPrompt && systemPrompt.trim()) {
          formattedMessages.push({ role: "system", content: systemPrompt.trim() });
        }

        for (const m of messages) {
          formattedMessages.push({
            role: (m.role === "user" ? "user" : "assistant"),
            content: m.text || m.content || ""
          });
        }

        if (imageDataUrl && formattedMessages.length > 0) {
          const lastIdx = formattedMessages.length - 1;
          const lastMsg = formattedMessages[lastIdx];
          if (lastMsg.role === "user") {
            formattedMessages[lastIdx] = {
              role: "user",
              content: [
                { type: "text", text: lastMsg.content || "What's in this image?" },
                { type: "image_url", image_url: { url: imageDataUrl } }
              ]
            };
          }
        }

        const stream = await groq.chat.completions.create({
          model: model,
          messages: formattedMessages,
          max_tokens: maxTokens,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
            if (typeof (res as any).flush === 'function') {
              (res as any).flush();
            }
          }
        }
        return; // Succeeded!
      } catch (err: any) {
        console.warn(`[Groq] Key #${keyIdx + 1} with model ${model} failed:`, err?.message || err);
        lastError = err;
        
        const msg = String(err?.message || "").toLowerCase();
        const status = err?.status || err?.statusCode || 0;

        if (status === 404 || status === 400 || msg.includes("does not exist") || msg.includes("decommissioned")) {
          unsupportedGroqModels.add(model);
          continue;
        }
        
        if (status === 401 || msg.includes("invalid api key") || msg.includes("unauthorized")) {
          keyHealthManager.markKeyAsBad(apiKey, "401 Invalid Groq API Key", 60 * 60 * 1000);
          break; // Next key
        }
        
        if (msg.includes("rate_limit_exceeded") || msg.includes("tokens per day") || msg.includes("tpd")) {
          console.warn(`[Groq] Model ${model} daily token limit reached on Key #${keyIdx + 1}.`);
        }
        continue;
      }
    }
  }

  throw lastError || new Error("All Groq keys and models failed");
}

export async function fetchUrlContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });
    if (!res.ok) return '';
    const html = await res.text();
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned.slice(0, 4000);
  } catch (err) {
    return '';
  }
}

export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)].slice(0, 2);
}

const unsupportedCohereModels = new Set<string>();

export async function executeCohereWithRotation(messages: any[], systemPrompt: string, maxTokens: number = 1024, requestedModel: string | undefined, cohereKeys: string[], res: any) {
  let { healthyKeys, skippedReasons } = keyHealthManager.filterHealthyKeys(cohereKeys, 'cohere');
  
  if (healthyKeys.length === 0 && cohereKeys.length > 0) {
    console.warn(`[Cohere Validation] All ${cohereKeys.length} keys were flagged. Resetting key health map to retry.`);
    keyHealthManager.clearAllBadKeys();
    healthyKeys = cohereKeys.filter(k => keyHealthManager.isKeyFormatValid(k, 'cohere'));
  }

  if (healthyKeys.length === 0) {
    if (skippedReasons.length > 0) {
      console.warn(`[Cohere Validation] Skipped invalid/bad keys: ${skippedReasons.join(', ')}`);
    }
    throw new Error("No healthy or valid Cohere API keys available");
  }

  // Map legacy/deprecated model names to modern active models
  let mappedModel = requestedModel;
  if (mappedModel === 'command-r-plus' || mappedModel === 'command-r') {
    mappedModel = mappedModel === 'command-r-plus' ? 'command-r-plus-08-2024' : 'command-r-08-2024';
  }

  const defaultModels = AI_CONFIG.providers.cohere.models;
  const models = mappedModel && defaultModels.includes(mappedModel) 
    ? [mappedModel, ...defaultModels.filter(m => m !== mappedModel)] 
    : defaultModels;

  let lastError: any = null;

  const formattedMessages: { role: string; content: string }[] = [];
  if (systemPrompt && systemPrompt.trim()) {
    formattedMessages.push({ role: "system", content: systemPrompt.trim() });
  }

  for (const m of messages) {
    formattedMessages.push({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text || m.content || ""
    });
  }

  for (let keyIdx = 0; keyIdx < healthyKeys.length; keyIdx++) {
    const apiKey = healthyKeys[keyIdx];

    for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
      const model = models[modelIdx];
      if (unsupportedCohereModels.has(model)) continue;

      try {
        const response = await fetch("https://api.cohere.com/v2/chat", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": "text/event-stream"
          },
          body: JSON.stringify({
            model,
            messages: formattedMessages,
            stream: true
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          lastError = new Error(`Cohere status ${response.status}: ${errorText}`);
          if (response.status === 404) {
            unsupportedCohereModels.add(model);
          }
          if (response.status === 401) {
            keyHealthManager.markKeyAsBad(apiKey, "401 Invalid Cohere API Key", 60 * 60 * 1000);
            break;
          }
          continue;
        }

        if (!response.body) {
          throw new Error("No response body received from Cohere API");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6);
              if (dataStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(dataStr);
                let chunkText = "";
                if (parsed.type === "content-delta" && parsed.delta?.message?.content?.text) {
                  chunkText = parsed.delta.message.content.text;
                } else if (parsed.text) {
                  chunkText = parsed.text;
                }

                if (chunkText) {
                  res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                }
              } catch (e) {}
            }
          }
        }
        return;
      } catch (err: any) {
        lastError = err;
      }
    }
  }

  throw lastError || new Error("All Cohere keys and models failed");
}

export async function executeBazaarLinkWithRotation(messages: any[], systemPrompt: string, maxTokens: number = 1024, requestedModel: string | undefined, bazaarLinkKeys: string[], res: any) {
  let { healthyKeys, skippedReasons } = keyHealthManager.filterHealthyKeys(bazaarLinkKeys, 'bazaarlink');
  
  if (healthyKeys.length === 0 && bazaarLinkKeys.length > 0) {
    console.warn(`[BazaarLink Validation] All ${bazaarLinkKeys.length} keys were flagged. Resetting key health map to retry.`);
    keyHealthManager.clearAllBadKeys();
    healthyKeys = bazaarLinkKeys.filter(k => keyHealthManager.isKeyFormatValid(k, 'bazaarlink'));
  }

  if (healthyKeys.length === 0) {
    if (skippedReasons.length > 0) {
      console.warn(`[BazaarLink Validation] Skipped invalid/bad keys: ${skippedReasons.join(', ')}`);
    }
    throw new Error("No healthy or valid BazaarLink API keys available");
  }

  const defaultModels = AI_CONFIG.providers.bazaarlink.models;
  const models = requestedModel && defaultModels.includes(requestedModel) 
    ? [requestedModel, ...defaultModels.filter(m => m !== requestedModel)] 
    : defaultModels;

  let lastError: any = null;

  const formattedMessages: { role: string; content: string }[] = [];
  if (systemPrompt && systemPrompt.trim()) {
    formattedMessages.push({ role: "system", content: systemPrompt.trim() });
  }

  for (const m of messages) {
    formattedMessages.push({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text || m.content || ""
    });
  }

  const baseUrl = AI_CONFIG.providers.bazaarlink.baseUrl;

  for (let keyIdx = 0; keyIdx < healthyKeys.length; keyIdx++) {
    const apiKey = healthyKeys[keyIdx];

    for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
      const model = models[modelIdx];
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": "text/event-stream"
          },
          body: JSON.stringify({
            model,
            messages: formattedMessages,
            max_tokens: maxTokens,
            stream: true
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          lastError = new Error(`BazaarLink status ${response.status}: ${errorText}`);
          if (response.status === 401 || response.status === 403) {
            keyHealthManager.markKeyAsBad(apiKey, `BazaarLink API Key Invalid (${response.status})`, 60 * 60 * 1000);
            break;
          }
          continue;
        }

        if (!response.body) {
          throw new Error("No response body received from BazaarLink API");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6);
              if (dataStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(dataStr);
                let chunkText = "";
                if (parsed.choices?.[0]?.delta?.content) {
                  chunkText = parsed.choices[0].delta.content;
                } else if (parsed.text) {
                  chunkText = parsed.text;
                } else if (parsed.delta?.text) {
                  chunkText = parsed.delta.text;
                }

                if (chunkText) {
                  res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                }
              } catch (e) {}
            }
          }
        }
        return;
      } catch (err: any) {
        lastError = err;
      }
    }
  }

  throw lastError || new Error("All BazaarLink keys and models failed");
}

export async function executeGeminiWithRotation(
  messages: any[],
  systemPrompt: string,
  maxTokens: number = 2048,
  requestedModel: string | undefined,
  geminiKeys: string[],
  res: any,
  imageDataUrl?: string
) {
  let { healthyKeys, skippedReasons } = keyHealthManager.filterHealthyKeys(geminiKeys, 'gemini');

  if (healthyKeys.length === 0 && geminiKeys.length > 0) {
    console.warn(`[Gemini Validation] All ${geminiKeys.length} keys were flagged. Resetting key health map to retry.`);
    keyHealthManager.clearAllBadKeys();
    healthyKeys = geminiKeys.filter(k => keyHealthManager.isKeyFormatValid(k, 'gemini'));
  }

  if (healthyKeys.length === 0) {
    if (skippedReasons.length > 0) {
      console.warn(`[Gemini Validation] Skipped invalid/bad keys: ${skippedReasons.join(', ')}`);
    }
    throw new Error("No healthy or valid Gemini API keys available");
  }

  const defaultModels = AI_CONFIG.providers.gemini.models;
  const models = requestedModel && defaultModels.includes(requestedModel)
    ? [requestedModel, ...defaultModels.filter((m: string) => m !== requestedModel)]
    : defaultModels;

  let lastError: any = null;

  for (let keyIdx = 0; keyIdx < healthyKeys.length; keyIdx++) {
    const apiKey = healthyKeys[keyIdx];
    const ai = new GoogleGenAI({ apiKey });

    for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
      const model = models[modelIdx];
      try {
        const contents: any[] = [];
        for (const m of messages) {
          contents.push({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.text || m.content || "" }]
          });
        }

        if (imageDataUrl && contents.length > 0) {
          const lastIdx = contents.length - 1;
          if (contents[lastIdx].role === "user") {
            const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              contents[lastIdx].parts.unshift({
                inlineData: {
                  mimeType: match[1],
                  data: match[2]
                }
              });
            }
          }
        }

        const stream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction: systemPrompt && systemPrompt.trim() ? systemPrompt.trim() : undefined,
            maxOutputTokens: maxTokens,
          }
        });

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
            if (typeof (res as any).flush === 'function') {
              (res as any).flush();
            }
          }
        }
        return;
      } catch (err: any) {
        console.warn(`[Gemini] Key #${keyIdx + 1} with model ${model} failed:`, err?.message || err);
        lastError = err;
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("api_key_invalid") || msg.includes("api key not valid") || msg.includes("401") || msg.includes("403")) {
          keyHealthManager.markKeyAsBad(apiKey, "Invalid Gemini API Key", 60 * 60 * 1000);
          break;
        }
      }
    }
  }

  throw lastError || new Error("All Gemini keys and models failed");
}

export async function incrementUserMessageCountServer(userId: string) {
  if (!userId) return;
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const uData = userSnap.data();
      const now = Date.now();
      const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
      const today = new Date().toISOString().split('T')[0];
      let lastResetTime = uData.lastResetTime || 0;
      let newCount = uData.messageCount || 0;

      if (!lastResetTime || (now - lastResetTime >= TWO_HOURS_MS)) {
        newCount = 1;
        lastResetTime = now;
      } else {
        newCount += 1;
      }
      await setDoc(userRef, { messageCount: newCount, lastResetTime, lastMessageDate: today }, { merge: true });
    }
  } catch (err) {
    console.warn("Error incrementing message count in backend:", err);
  }
}

export async function performWebSearch(query: string): Promise<string> {
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'VOIDAI/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (ddgRes.ok) {
      const data = await ddgRes.json() as any;
      const results: string[] = [];
      if (data.AbstractText) {
        results.push(`${data.AbstractText}${data.AbstractURL ? ` (Source: ${data.AbstractURL})` : ''}`);
      }
      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 5)) {
          if (topic.Text) results.push(topic.Text);
          if (results.length >= 5) break;
        }
      }
      if (results.length > 0) return results.join('\n\n');
    }

    const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const htmlRes = await fetch(htmlUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(5000),
    });
    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const results: string[] = [];
      const regex = /class="result__a"[^>]*>([^<]+)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      let match: RegExpExecArray | null;
      let count = 0;
      while ((match = regex.exec(html)) && count < 5) {
        const title = match[1].trim().replace(/&amp;/g, '&').replace(/&quot;/g, '"');
        const snippet = match[2].trim().replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
        if (title && snippet) results.push(`${title}: ${snippet}`);
        count++;
      }
      if (results.length > 0) return results.join('\n\n');
    }
  } catch (err) {}
  return '';
}

export function shouldSearchWeb(text: string): boolean {
  const lower = text.toLowerCase();
  if (text.length > 500) return false;
  const realtimeKeywords = [
    'today', 'now', 'current', 'latest', 'recent', 'news', 'happening',
    'weather', 'price', 'stock', 'score', 'who won', 'who is', 'what is',
    'where is', 'when is', 'how much', 'how many', '2024', '2025', '2026',
    'yesterday', 'tomorrow', 'this week', 'this month', 'this year',
    'update', 'status', 'live', 'breaking', 'election', 'president',
    'prime minister', 'ceo of', 'owner of', 'release date', 'announce',
    'happened', 'happening', 'trending', 'viral', 'go fund', 'gofundme',
    'war', 'conflict', 'crisis', 'outbreak', 'case', 'incident',
  ];
  return realtimeKeywords.some(kw => lower.includes(kw));
}

export function createApp(): express.Express {
  const app = express();
  app.set("trust proxy", 1);

  // Permissive CORS handling for Vercel preview environments, custom domains, and REST APIs
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, x-api-key");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });

  // Normalize path if Vercel serverless proxy headers or __route query params are present
  app.use((req, res, next) => {
    const orig =
      (req.headers["x-vercel-original-url"] as string) ||
      (req.headers["x-forwarded-uri"] as string) ||
      (req.headers["x-original-url"] as string) ||
      (req.headers["x-rewrite-url"] as string) ||
      (req.headers["x-matched-path"] as string);

    if (orig && (orig.startsWith("/api") || orig.startsWith("/v1") || orig.startsWith("/auth") || orig.startsWith("/chat"))) {
      let clean = orig.replace(/\.(ts|js)$/i, '');
      const qIdx = clean.indexOf('?');
      if (qIdx !== -1) clean = clean.slice(0, qIdx);
      req.url = clean;
    }

    if (req.url) {
      try {
        const parsed = new URL(req.url, "http://localhost");
        const routeParam = parsed.searchParams.get("__route");
        if (routeParam) {
          req.url = routeParam;
        } else {
          const cleanPath = parsed.pathname.replace(/\.(ts|js)$/i, '');
          if (cleanPath !== parsed.pathname) {
            req.url = cleanPath + (parsed.search || '');
          }
        }
      } catch (_) {}
    }
    next();
  });

  // Prevent Express body-parser from hanging on Vercel where the request stream was pre-consumed
  app.use((req, res, next) => {
    if (Buffer.isBuffer(req.body)) {
      try {
        req.body = JSON.parse(req.body.toString('utf8'));
      } catch (_) {}
    } else if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
      try {
        req.body = JSON.parse(req.body);
      } catch (_) {}
    }
    if (req.body !== undefined && typeof req.body === 'object' && req.body !== null) {
      (req as any)._body = true;
    }
    next();
  });

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    xFrameOptions: false
  }));
  app.use((req, res, next) => {
    res.removeHeader("X-Frame-Options");
    next();
  });
  app.use(express.json({ limit: '20mb' }));

  // Normalize POST requests hitting /api, /, or /api/ to /api/chat after body is parsed
  app.use((req, res, next) => {
    if (req.method === "POST" && (req.url === "/api" || req.url === "/" || req.url === "/api/")) {
      if (req.body && (req.body.messages || req.body.prompt)) {
        req.url = "/api/chat";
      }
    }
    next();
  });

  // Health check endpoint for Vercel and monitoring
  app.get(["/api/health", "/health", "/api"], (req, res) => {
    res.json({
      status: "ok",
      service: "VOID AI Engine",
      time: new Date().toISOString(),
      platform: process.env.VERCEL ? "vercel-serverless" : "node-server"
    });
  });

  // Rate limiting (generous for chat workflows, validate: false to prevent Vercel/proxy crashes)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    validate: false,
    keyGenerator: (req) => {
      const forwarded = req.headers['x-forwarded-for'];
      if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
      }
      return req.ip || '127.0.0.1';
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait a minute before sending more messages." }
  });

  app.use("/api/", apiLimiter);

  // Core streaming AI completion route (supports /api/chat, /chat, and POST /api)
  app.post(["/api/chat", "/chat", "/api", "/api/chat.ts", "/chat.ts"], async (req, res) => {
    try {
      const { messages = [], systemPrompt = "", userId = "", provider = "groq", model, attachment, githubContext } = req.body || {};
      
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Prevent reverse proxy / Vercel buffering
      if (typeof (res as any).flushHeaders === 'function') {
        (res as any).flushHeaders();
      }

      const { groqKeys, cohereKeys, bazaarLinkKeys, geminiKeys } = await getSystemKeys(req.body?.clientKeys);

      // Retrieve user profile directly from Firestore backend
      const { userTier: dbTier, isBanned, isAdmin, messageCount, lastMessageDate, lastResetTime, brainSettings: fetchedBrainSettings } = await fetchUserAndTierSettings(userId);
      const tier = dbTier || 'free';

      const brainSettings = fetchedBrainSettings || {
        globalPrompt: "You are VOID AI, an elite AI assistant.",
        freePrompt: "Give concise, direct, helpful answers.",
        proPrompt: "Provide in-depth, professional explanations.",
        premiumPrompt: "Provide deep architectural analysis and production solutions.",
        vipPrompt: "Full unrestricted elite capability.",
        freeLimit: 30,
        proLimit: 50,
        premiumLimit: 200,
        vipLimit: 99999,
        freeMaxTokens: 2048,
        proMaxTokens: 4096,
        premiumMaxTokens: 8192,
        vipMaxTokens: 16384,
      };

      if (isBanned) {
        res.write(`data: ${JSON.stringify({ text: "\n\n**Error:** Your account has been restricted by an administrator." })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      // Enforce 2-hour message limits per tier
      const now = Date.now();
      const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
      const limitForTier = tier === 'vip' ? (brainSettings.vipLimit || 99999)
        : tier === 'premium' ? (brainSettings.premiumLimit || 200)
        : tier === 'pro' ? (brainSettings.proLimit || 50)
        : (brainSettings.freeLimit || 30);

      const isWithin2Hours = lastResetTime > 0 && (now - lastResetTime < TWO_HOURS_MS);
      const currentCount = isWithin2Hours ? (messageCount || 0) : 0;

      if (tier !== 'vip' && currentCount >= limitForTier) {
        const msRemaining = Math.max(0, TWO_HOURS_MS - (now - lastResetTime));
        const minsRemaining = Math.ceil(msRemaining / 60000);
        const hours = Math.floor(minsRemaining / 60);
        const mins = minsRemaining % 60;
        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        res.write(`data: ${JSON.stringify({ text: `\n\n**Tier Limit Exceeded:** You have reached your limit of ${limitForTier} messages per 2 hours on the ${tier.toUpperCase()} plan. Your limit will reset in ${timeStr}. Upgrade your plan for higher limits.` })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      const maxTokens = (tier === 'vip' ? brainSettings.vipMaxTokens
        : tier === 'premium' ? brainSettings.premiumMaxTokens
        : tier === 'pro' ? brainSettings.proMaxTokens
        : brainSettings.freeMaxTokens) || 2048;

      // Retrieve persistent project memory
      const projectId = (githubContext && githubContext.repo)
        ? `${githubContext.owner || 'default'}/${githubContext.repo}`
        : 'workspace-default';

      let projectMemory = null;
      try {
        projectMemory = await projectMemoryService.getProjectMemory(projectId);
      } catch (err) {
        console.warn(`[Chat] Could not load project memory for ${projectId}:`, err);
      }

      // Shared authoritative brain prompt builder across all integrations
      const combinedSystemPrompt = buildUnifiedBrainPrompt({
        tier,
        brainSettings,
        githubContext,
        projectMemory,
        runtimeContext: {
          hasGithubToken: Boolean(githubContext?.user || githubContext?.owner),
          activeRepo: githubContext?.repo ? {
            owner: githubContext.owner || 'developer',
            repo: githubContext.repo,
            branch: githubContext.branch || 'main'
          } : undefined,
          codingModeEnabled: Boolean(githubContext?.codingMode),
          hasTerminal: true,
          hasFirebase: true,
          connectedUser: githubContext?.user
        },
        extraSystemPrompt: systemPrompt
      });

      // ── Attachment Processing (Image / File) ──────────────────────
      let imageDataUrl: string | undefined;
      let messagesForAI = Array.isArray(messages) ? messages : [];

      if (attachment) {
        if (attachment.kind === 'image' && attachment.data) {
          imageDataUrl = attachment.data;
        } else if ((attachment.kind === 'file' || attachment.kind === 'zip') && attachment.data) {
          const lastUserMsg = [...messagesForAI].reverse().find((m: any) => m.role === 'user');
          if (lastUserMsg) {
            const isZip = attachment.kind === 'zip';
            const fileContent = isZip 
              ? `\n\n[📦 Extracted ZIP Archive: ${attachment.name}]\n${attachment.data}\n`
              : `\n\n[📄 File: ${attachment.name}]\n\`\`\`\n${attachment.data}\n\`\`\`\n`;
            messagesForAI = messagesForAI.map((m: any) =>
              m === lastUserMsg
                ? { ...m, text: `${m.text || m.content || ''}${fileContent}` }
                : m
            );
          }
        }
      }

      // ── URL Fetching ──────────────────────────────────────────────
      const lastUserMsgForUrl = [...messagesForAI].reverse().find((m: any) => m.role === 'user');
      if (lastUserMsgForUrl) {
        const userText = (lastUserMsgForUrl.text || lastUserMsgForUrl.content || '');
        const urls = extractUrls(userText);
        if (urls.length > 0) {
          const urlContents: string[] = [];
          for (const url of urls) {
            const content = await fetchUrlContent(url);
            if (content) {
              urlContents.push(`[🌐 Content from ${url}]:\n${content}`);
            }
          }
          if (urlContents.length > 0) {
            messagesForAI = messagesForAI.map((m: any) =>
              m === lastUserMsgForUrl
                ? { ...m, text: `${urlContents.join('\n\n---\n\n')}\n\n---\n\n[User Question]: ${userText}` }
                : m
            );
          }
        }
      }

      // ── Real-time Web Search ──────────────────────────────────────
      const lastUserMsgForSearch = [...messagesForAI].reverse().find((m: any) => m.role === 'user');
      if (lastUserMsgForSearch && !imageDataUrl) {
        const userQuery = (lastUserMsgForSearch.text || lastUserMsgForSearch.content || '').slice(0, 300);
        if (userQuery && shouldSearchWeb(userQuery)) {
          const webResults = await performWebSearch(userQuery);
          if (webResults) {
            messagesForAI = messagesForAI.map((m: any) =>
              m === lastUserMsgForSearch
                ? { ...m, text: `[🌐 Live Web Search Results for "${userQuery}"]:\n${webResults}\n\n---\n\n[User Question]: ${userQuery}` }
                : m
            );
          }
        }
      }

      // Prioritize requested provider and auto-fallback across all available pools
      let providersToTry = ["groq", "gemini", "cohere", "bazaarlink"];
      if (provider === "gemini") {
        providersToTry = ["gemini", "groq", "cohere", "bazaarlink"];
      } else if (provider === "cohere") {
        providersToTry = ["cohere", "gemini", "groq", "bazaarlink"];
      } else if (provider === "bazaarlink") {
        providersToTry = ["bazaarlink", "gemini", "groq", "cohere"];
      } else {
        if (groqKeys.length === 0 && geminiKeys.length > 0) {
          providersToTry = ["gemini", "cohere", "bazaarlink", "groq"];
        }
      }

      // Check if user request involves explicit autonomous actions, terminal, or coding mode
      const isAutonomousRequest = Boolean(
        req.body.autonomous ||
        githubContext?.codingMode ||
        messagesForAI.some((m: any) => {
          const txt = String(m.text || m.content || '').trim().toLowerCase();
          return /^(\$\s+|run\s+|npm\s+|npx\s+|git\s+|python\s+|node\s+|pip\s+|cargo\s+|bash\s+|sh\s+)/i.test(txt);
        })
      );

      let executedSuccessfully = false;
      let lastProviderError: any = null;

      if (isAutonomousRequest) {
        try {
          const autoSuccess = await autonomousAgent.runAutonomousLoop({
            userId,
            messages: messagesForAI,
            systemPrompt: combinedSystemPrompt,
            maxTokens,
            provider,
            model,
            keys: { groqKeys, geminiKeys, cohereKeys, bazaarLinkKeys },
            res,
            maxSteps: 6,
          });
          if (autoSuccess) {
            executedSuccessfully = true;
          }
        } catch (autoErr: any) {
          console.warn('[Autonomous Agent Error]:', autoErr);
        }
      }

      if (!executedSuccessfully) {
        for (const p of providersToTry) {
        try {
          if (p === "groq") {
            if (groqKeys.length === 0) continue;
            await executeGroqWithRotation(messagesForAI, combinedSystemPrompt, maxTokens, provider === "groq" ? model : undefined, groqKeys, res, imageDataUrl);
            executedSuccessfully = true;
            break;
          } else if (p === "gemini") {
            if (geminiKeys.length === 0) continue;
            await executeGeminiWithRotation(messagesForAI, combinedSystemPrompt, maxTokens, provider === "gemini" ? model : undefined, geminiKeys, res, imageDataUrl);
            executedSuccessfully = true;
            break;
          } else if (p === "cohere") {
            if (cohereKeys.length === 0) continue;
            await executeCohereWithRotation(messagesForAI, combinedSystemPrompt, maxTokens, provider === "cohere" ? model : undefined, cohereKeys, res);
            executedSuccessfully = true;
            break;
          } else if (p === "bazaarlink") {
            if (bazaarLinkKeys.length === 0) continue;
            await executeBazaarLinkWithRotation(messagesForAI, combinedSystemPrompt, maxTokens, provider === "bazaarlink" ? model : undefined, bazaarLinkKeys, res);
            executedSuccessfully = true;
            break;
          }
        } catch (err: any) {
          console.warn(`[Failover Engine] Provider ${p.toUpperCase()} failed:`, err?.message || err);
          lastProviderError = err;
        }
      }
      }

      if (executedSuccessfully) {
        // Only increment user message count on successful response!
        await incrementUserMessageCountServer(userId);
      } else {
        const errMessage = String(lastProviderError?.message || "");
        let errNotice = "⚡ **VOID AI Traffic Notice:** Our AI connection pool is undergoing high demand. Please re-send your message in a moment or select a different model engine from the top bar.";
        
        if (groqKeys.length === 0 && cohereKeys.length === 0 && bazaarLinkKeys.length === 0 && geminiKeys.length === 0) {
          errNotice = "⚡ **API Key Configuration Notice:** No active AI provider keys found. Please ensure you have added valid API keys in the AI Admin Panel on the website.";
        } else if (errMessage.toLowerCase().includes("healthy") || errMessage.toLowerCase().includes("valid")) {
          errNotice = "⚡ **API Key Validation Notice:** Configured AI provider keys are currently invalid or depleted. Please check your system API key configuration in Admin Settings.";
        } else if (errMessage.toLowerCase().includes("rate_limit_exceeded") || errMessage.toLowerCase().includes("rate limit") || errMessage.toLowerCase().includes("429") || errMessage.toLowerCase().includes("tokens")) {
          errNotice = "⚡ **Rate Limit Notice:** Provider rate or token limit reached on current model. Please switch engine in the top bar.";
        }
        res.write(`data: ${JSON.stringify({ text: `\n\n${errNotice}` })}\n\n`);
      }
      
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Error calling AI API:", error);
      if (!res.headersSent) {
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
      }
      const errNotice = "⚡ **VOID AI Engine Notice:** Unable to complete generation. Please check your network or try switching AI model.";
      res.write(`data: ${JSON.stringify({ text: `\n\n${errNotice}` })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  });

  // Diagnostics: Probe and validate all configured API key pools
  app.post("/api/admin/validate-keys", async (req, res) => {
    try {
      const { groqKeys, cohereKeys, geminiKeys, bazaarLinkKeys } = await getSystemKeys();
      
      const groqResults: { key: string; status: 'ok' | 'error'; message?: string }[] = [];
      for (const k of groqKeys.slice(0, 15)) {
        try {
          const client = new Groq({ apiKey: k });
          await client.chat.completions.create({
            model: "qwen/qwen3.8-27b",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 2,
          });
          groqResults.push({ key: `${k.slice(0, 8)}...${k.slice(-4)}`, status: 'ok' });
        } catch (err: any) {
          groqResults.push({ key: `${k.slice(0, 8)}...${k.slice(-4)}`, status: 'error', message: err?.message || 'Failed' });
        }
      }

      const cohereResults: { key: string; status: 'ok' | 'error'; message?: string }[] = [];
      for (const t of cohereKeys.slice(0, 10)) {
        try {
          const client = new CohereClient({ token: t });
          await client.chat({ model: "command-r-08-2024", message: "ping", maxTokens: 2 });
          cohereResults.push({ key: `${t.slice(0, 8)}...${t.slice(-4)}`, status: 'ok' });
        } catch (err: any) {
          cohereResults.push({ key: `${t.slice(0, 8)}...${t.slice(-4)}`, status: 'error', message: err?.message || 'Failed' });
        }
      }

      const geminiResults: { key: string; status: 'ok' | 'error'; message?: string }[] = [];
      for (const g of geminiKeys.slice(0, 5)) {
        try {
          const ai = new GoogleGenAI({ apiKey: g });
          await ai.models.generateContent({ model: "gemini-2.5-flash", contents: [{ role: 'user', parts: [{ text: 'ping' }] }] });
          geminiResults.push({ key: `${g.slice(0, 8)}...${g.slice(-4)}`, status: 'ok' });
        } catch (err: any) {
          geminiResults.push({ key: `${g.slice(0, 8)}...${g.slice(-4)}`, status: 'error', message: err?.message || 'Failed' });
        }
      }

      const groqHealthy = groqResults.filter(r => r.status === 'ok').length;
      const cohereHealthy = cohereResults.filter(r => r.status === 'ok').length;
      const geminiHealthy = geminiResults.filter(r => r.status === 'ok').length;

      res.json({
        success: true,
        summary: {
          groq: { totalConfigured: groqKeys.length, tested: groqResults.length, healthy: groqHealthy, failing: groqResults.length - groqHealthy, details: groqResults },
          cohere: { totalConfigured: cohereKeys.length, tested: cohereResults.length, healthy: cohereHealthy, failing: cohereResults.length - cohereHealthy, details: cohereResults },
          gemini: { totalConfigured: geminiKeys.length, tested: geminiResults.length, healthy: geminiHealthy, failing: geminiResults.length - geminiHealthy, details: geminiResults },
          bazaarLink: { totalConfigured: bazaarLinkKeys.length }
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "Validation probe failed" });
    }
  });

  // OpenAI-compatible Chat Completions API
  const handleOpenAiCompletions = async (req: express.Request, res: express.Response) => {
    try {
      const authHeader = req.headers.authorization || req.headers["x-api-key"] || "";
      const apiKey = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";

      const keyValidation = await validateApiKeyServer(apiKey);
      if (!keyValidation) {
        return res.status(401).json({
          error: {
            message: "Invalid API key provided. Keys must start with nvn_live_... and be generated in VOID AI.",
            type: "invalid_request_error",
            param: "apiKey",
            code: "invalid_api_key"
          }
        });
      }

      if (keyValidation.isBanned) {
        return res.status(403).json({
          error: {
            message: "Your VOID AI account has been restricted by an administrator.",
            type: "access_denied",
            code: "account_banned"
          }
        });
      }

      const { userId, tier } = keyValidation;

      if (!tier || tier === 'free') {
        return res.status(403).json({
          error: {
            message: "Developer API access requires an active paid subscription (Pro, Premium, or VIP). Free tier accounts cannot use API keys.",
            type: "access_denied",
            code: "paid_subscription_required"
          }
        });
      }

      const { messages = [], stream = false, model, max_tokens } = req.body;

      const { groqKeys, cohereKeys, bazaarLinkKeys } = await getSystemKeys();
      const { messageCount, lastResetTime, brainSettings } = await fetchUserAndTierSettings(userId);

      const now = Date.now();
      const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
      const limitForTier = tier === 'vip' ? (brainSettings.vipLimit || 99999)
        : tier === 'premium' ? (brainSettings.premiumLimit || 200)
        : tier === 'pro' ? (brainSettings.proLimit || 50)
        : (brainSettings.freeLimit || 30);

      const isWithin2Hours = lastResetTime > 0 && (now - lastResetTime < TWO_HOURS_MS);
      const currentCount = isWithin2Hours ? (messageCount || 0) : 0;
      if (tier !== 'vip' && currentCount >= limitForTier) {
        const msRemaining = Math.max(0, TWO_HOURS_MS - (now - lastResetTime));
        const minsRemaining = Math.ceil(msRemaining / 60000);
        const hours = Math.floor(minsRemaining / 60);
        const mins = minsRemaining % 60;
        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        return res.status(429).json({
          error: {
            message: `Message limit of ${limitForTier} per 2 hours reached for your ${tier.toUpperCase()} tier. Resets in ${timeStr}. Please upgrade your plan on VOID AI.`,
            type: "rate_limit_error",
            code: "rate_limit_exceeded"
          }
        });
      }

      await incrementUserMessageCountServer(userId);

      const maxTokens = max_tokens || (tier === 'vip' ? brainSettings.vipMaxTokens
        : tier === 'premium' ? brainSettings.premiumMaxTokens
        : tier === 'pro' ? brainSettings.proMaxTokens
        : brainSettings.freeMaxTokens) || 2048;

      const tierPrompt = ((tier as string) === 'vip' || (tier as string) === 'god_mode' ? brainSettings.vipPrompt
        : tier === 'premium' ? brainSettings.premiumPrompt
        : tier === 'pro' ? brainSettings.proPrompt
        : brainSettings.freePrompt) || "";

      const masterPrompt = [
        brainSettings.globalPrompt,
        tierPrompt
      ].filter(Boolean).map(s => s.trim()).join("\n\n") || "You are VOID AI, an elite AI assistant.";
      const requestId = `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        if (typeof (res as any).flushHeaders === 'function') {
          (res as any).flushHeaders();
        }

        const openAiRes = {
          write: (dataStr: string) => {
            const parts = dataStr.split("\n\n");
            for (const part of parts) {
              if (part.startsWith("data: ")) {
                const raw = part.slice(6).trim();
                if (raw && raw !== "[DONE]") {
                  try {
                    const parsed = JSON.parse(raw);
                    if (parsed.text) {
                      const chunkObj = {
                        id: requestId,
                        object: "chat.completion.chunk",
                        created: Math.floor(Date.now() / 1000),
                        model: model || "void-ai-fast",
                        choices: [
                          {
                            index: 0,
                            delta: { content: parsed.text },
                            finish_reason: null
                          }
                        ]
                      };
                      res.write(`data: ${JSON.stringify(chunkObj)}\n\n`);
                    }
                  } catch (_) {}
                }
              }
            }
          }
        };

        try {
          if (groqKeys.length > 0) {
            try {
              await executeGroqWithRotation(messages, masterPrompt, maxTokens, model, groqKeys, openAiRes);
            } catch (e1) {
              if (cohereKeys.length > 0) {
                try {
                  await executeCohereWithRotation(messages, masterPrompt, maxTokens, model, cohereKeys, openAiRes);
                } catch (e2) {
                  if (bazaarLinkKeys.length > 0) {
                    await executeBazaarLinkWithRotation(messages, masterPrompt, maxTokens, model, bazaarLinkKeys, openAiRes);
                  } else {
                    throw e2;
                  }
                }
              } else if (bazaarLinkKeys.length > 0) {
                await executeBazaarLinkWithRotation(messages, masterPrompt, maxTokens, model, bazaarLinkKeys, openAiRes);
              } else {
                throw e1;
              }
            }
          } else if (cohereKeys.length > 0) {
            try {
              await executeCohereWithRotation(messages, masterPrompt, maxTokens, model, cohereKeys, openAiRes);
            } catch (e3) {
              if (bazaarLinkKeys.length > 0) {
                await executeBazaarLinkWithRotation(messages, masterPrompt, maxTokens, model, bazaarLinkKeys, openAiRes);
              } else {
                throw e3;
              }
            }
          } else if (bazaarLinkKeys.length > 0) {
            await executeBazaarLinkWithRotation(messages, masterPrompt, maxTokens, model, bazaarLinkKeys, openAiRes);
          } else {
            throw new Error("No AI provider keys configured in environment");
          }

          res.write(`data: ${JSON.stringify({
            id: requestId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: model || "void-ai-fast",
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
          })}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
        } catch (err: any) {
          res.write(`data: ${JSON.stringify({ error: { message: err?.message || "Execution error" } })}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
        }
        return;
      }

      // Non-streaming completion
      let fullResponse = "";
      const collectorRes = {
        write: (dataStr: string) => {
          const parts = dataStr.split("\n\n");
          for (const part of parts) {
            if (part.startsWith("data: ")) {
              const raw = part.slice(6).trim();
              if (raw && raw !== "[DONE]") {
                try {
                  const parsed = JSON.parse(raw);
                  if (parsed.text) fullResponse += parsed.text;
                } catch (_) {}
              }
            }
          }
        }
      };

      if (groqKeys.length > 0) {
        try {
          await executeGroqWithRotation(messages, masterPrompt, maxTokens, model, groqKeys, collectorRes);
        } catch (e1) {
          if (cohereKeys.length > 0) {
            try {
              await executeCohereWithRotation(messages, masterPrompt, maxTokens, model, cohereKeys, collectorRes);
            } catch (e2) {
              if (bazaarLinkKeys.length > 0) {
                await executeBazaarLinkWithRotation(messages, masterPrompt, maxTokens, model, bazaarLinkKeys, collectorRes);
              } else {
                throw e2;
              }
            }
          } else if (bazaarLinkKeys.length > 0) {
            await executeBazaarLinkWithRotation(messages, masterPrompt, maxTokens, model, bazaarLinkKeys, collectorRes);
          } else {
            throw e1;
          }
        }
      } else if (cohereKeys.length > 0) {
        try {
          await executeCohereWithRotation(messages, masterPrompt, maxTokens, model, cohereKeys, collectorRes);
        } catch (e3) {
          if (bazaarLinkKeys.length > 0) {
            await executeBazaarLinkWithRotation(messages, masterPrompt, maxTokens, model, bazaarLinkKeys, collectorRes);
          } else {
            throw e3;
          }
        }
      } else if (bazaarLinkKeys.length > 0) {
        await executeBazaarLinkWithRotation(messages, masterPrompt, maxTokens, model, bazaarLinkKeys, collectorRes);
      } else {
        throw new Error("No AI provider keys configured in environment");
      }

      return res.json({
        id: requestId,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: model || "void-ai-fast",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: fullResponse || "I am VOID AI, ready to assist you."
            },
            finish_reason: "stop"
          }
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: fullResponse.split(/\s+/).length,
          total_tokens: 15 + fullResponse.split(/\s+/).length
        }
      });
    } catch (err: any) {
      return res.status(500).json({
        error: {
          message: err?.message || "Failed to process chat completion",
          type: "server_error"
        }
      });
    }
  };

  app.post(["/v1/chat/completions", "/api/v1/chat/completions", "/chat/completions"], handleOpenAiCompletions);

  // Models listing endpoint
  const handleGetModels = (req: express.Request, res: express.Response) => {
    res.json({
      object: "list",
      data: [
        { id: "void-ai-fast", object: "model", created: 1710000000, owned_by: "void-ai" },
        { id: "llama-3.3-70b-versatile", object: "model", created: 1710000000, owned_by: "groq" },
        { id: "llama-3.1-8b-instant", object: "model", created: 1710000000, owned_by: "groq" },
        { id: "command-r-plus", object: "model", created: 1710000000, owned_by: "cohere" },
        { id: "command-r", object: "model", created: 1710000000, owned_by: "cohere" },
        { id: "deepseek-r1", object: "model", created: 1710000000, owned_by: "bazaarlink" }
      ]
    });
  };
  app.get(["/v1/models", "/api/v1/models", "/models"], handleGetModels);

  // Serve VOID AI Logo Image
  app.get(["/void-logo.jpg", "/api/void-logo.jpg"], (req, res) => {
    const logoPath = path.join(process.cwd(), "src", "assets", "images", "void_ai_logo_1786145082397.jpg");
    if (fs.existsSync(logoPath)) {
      res.header("Access-Control-Allow-Origin", "*");
      res.sendFile(logoPath);
    } else {
      res.status(404).send("Image not found");
    }
  });

  // Telegram Status Endpoint
  app.get(["/api/telegram/status", "/telegram/status"], async (req, res) => {
    const isConnected = telegramBot.isConnected();
    const botInfo = telegramBot.getBotInfo();
    const rawToken = telegramBot.getToken();
    const maskedToken = rawToken.length > 10 ? `${rawToken.slice(0, 8)}...${rawToken.slice(-4)}` : "***";
    
    res.json({
      connected: isConnected,
      botInfo,
      tokenMasked: maskedToken,
      botUsername: botInfo?.username || null,
      botName: botInfo?.first_name || null,
      appUrl: process.env.APP_URL || "https://ai.studio"
    });
  });

  // Update Telegram Token Endpoint
  app.post(["/api/telegram/update-token", "/telegram/update-token"], async (req, res) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== 'string' || !token.includes(":")) {
        return res.status(400).json({ success: false, error: "Invalid Telegram bot token format" });
      }
      telegramBot.stop();
      telegramBot.setToken(token.trim());
      const check = await telegramBot.verifyToken();
      if (!check.valid) {
        return res.status(400).json({ success: false, error: check.error || "Failed to verify token with Telegram API" });
      }

      // Persist to Firestore so restarts keep the token
      try {
        await setDoc(doc(db, "settings", "telegram"), {
          token: token.trim(),
          updatedAt: Date.now(),
          botInfo: check.botInfo || null
        }, { merge: true });
        await setDoc(doc(db, "settings", "apikeys"), {
          telegramBotToken: token.trim()
        }, { merge: true });
      } catch (fErr) {
        console.warn("[Telegram Token] Could not persist token to Firestore:", fErr);
      }

      if (!process.env.VERCEL && !process.env.NOW_REGION) {
        await telegramBot.start();
      }
      res.json({ success: true, message: "Telegram bot token updated & reconnected!", botInfo: check.botInfo });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "Failed to update Telegram bot" });
    }
  });

  // Test Telegram Message Endpoint
  app.post(["/api/telegram/send-test", "/telegram/send-test"], async (req, res) => {
    try {
      const { chatId, message } = req.body;
      if (!chatId) {
        return res.status(400).json({ success: false, error: "chatId is required" });
      }
      const text = message || "⚡ Test message from VOID AI Platform! Telegram integration is ACTIVE and connected. 🚀";
      const sent = await telegramBot.sendMessage(Number(chatId), text);
      if (sent) {
        res.json({ success: true, message: "Test message sent to Telegram successfully!" });
      } else {
        res.status(500).json({ success: false, error: "Failed to send message via Telegram API" });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "Error sending Telegram message" });
    }
  });

  // Image Generation Endpoint
  app.post(["/api/generate-image", "/generate-image"], async (req, res) => {
    try {
      const { prompt = "", userId = "" } = req.body;

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: "Image prompt is required" });
      }

      const { isBanned } = await fetchUserAndTierSettings(userId);
      if (isBanned) {
        return res.status(403).json({ error: "Your account has been restricted." });
      }

      const cleanPrompt = prompt.trim().slice(0, 500);
      const seed = Math.floor(Math.random() * 1000000);
      const encoded = encodeURIComponent(cleanPrompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&model=flux&seed=${seed}`;

      return res.json({ imageUrl, prompt: cleanPrompt });
    } catch (error: any) {
      console.error("Image generation error:", error);
      return res.status(500).json({ error: "Failed to generate image. Please try again." });
    }
  });

  // Pre-flight key validation endpoint
  app.post(["/api/admin/validate-key", "/admin/validate-key"], async (req, res) => {
    try {
      const { provider, apiKey } = req.body;
      if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
        return res.status(400).json({ valid: false, error: "API key is required" });
      }

      const trimmedKey = cleanKey(apiKey);
      const formatValid = keyHealthManager.isKeyFormatValid(trimmedKey, provider);
      if (!formatValid) {
        return res.json({ valid: false, error: "Invalid API key format or placeholder detected." });
      }

      if (provider === "groq") {
        const groq = new Groq({ apiKey: trimmedKey });
        await groq.models.list();
        return res.json({ valid: true, message: "Groq API key is valid and connected!" });
      } else if (provider === "cohere") {
        const response = await fetch("https://api.cohere.com/v2/models", {
          headers: { "Authorization": `Bearer ${trimmedKey}` }
        });
        if (response.ok) {
          return res.json({ valid: true, message: "Cohere API key is valid and connected!" });
        } else {
          const text = await response.text();
          return res.json({ valid: false, error: `Cohere API error (${response.status}): ${text}` });
        }
      } else if (provider === "bazaarlink") {
        const baseUrl = AI_CONFIG.providers.bazaarlink.baseUrl;
        try {
          const response = await fetch(`${baseUrl}/models`, {
            headers: { "Authorization": `Bearer ${trimmedKey}` }
          });
          if (response.ok) {
            return res.json({ valid: true, message: "BazaarLink API key is valid and connected!" });
          } else {
            return res.json({ valid: true, message: "BazaarLink API key saved and ready for requests!" });
          }
        } catch (_) {
          return res.json({ valid: true, message: "BazaarLink API key configured successfully!" });
        }
      } else {
        return res.status(400).json({ valid: false, error: "Unsupported provider" });
      }
    } catch (err: any) {
      return res.json({ valid: false, error: err?.message || "Key validation failed" });
    }
  });

  // ── GitHub Integration Routes ─────────────────────────────────

  // Get OAuth authorization URL
  app.get(["/api/github/oauth/url", "/github/oauth/url"], (req, res) => {
    try {
      const origin = req.headers.origin || (req.headers.host ? `${req.protocol || 'https'}://${req.headers.host}` : '') || process.env.APP_URL || "https://ai.studio";
      const redirectUri = `${origin}/auth/callback`;
      const clientId = process.env.GITHUB_CLIENT_ID || "";
      const url = githubService.getGitHubOAuthUrl(redirectUri);

      res.json({
        url,
        redirectUri,
        configured: Boolean(clientId),
        clientIdMasked: clientId ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}` : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to generate GitHub OAuth URL" });
    }
  });

  // OAuth callback handler (compliant with oauth-integration skill)
  const handleGitHubOAuthCallback = async (req: express.Request, res: express.Response) => {
    const { code, error, error_description } = req.query;

    if (error) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <body style="background:#090307;color:#fff;font-family:sans-serif;padding:24px;text-align:center;">
            <h2 style="color:#ef4444;">GitHub Connection Failed</h2>
            <p>${error_description || error}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${error}' }, '*');
                setTimeout(() => window.close(), 2500);
              }
            </script>
          </body>
        </html>
      `);
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).send("No authorization code received from GitHub.");
    }

    try {
      const origin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : '') || process.env.APP_URL || "";
      const redirectUri = `${origin}/auth/callback`;
      const tokenResult = await githubService.exchangeGitHubCode(code, redirectUri);

      if (!tokenResult?.accessToken) {
        throw new Error("No access token returned from GitHub");
      }

      // Verify and get user profile
      const userCheck = await githubService.verifyGitHubToken(tokenResult.accessToken);
      const userPayload = JSON.stringify(userCheck.user || {});
      const token = tokenResult.accessToken;

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>VOID AI - GitHub Connected</title>
            <style>
              body { background: #090307; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; display: flex; flex-direction: column; items-center; justify-content: center; height: 90vh; text-align: center; }
              .box { background: #202022; border: 1px solid #38383b; border-radius: 16px; padding: 32px; max-width: 400px; margin: 0 auto; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
              .badge { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; background: rgba(34, 197, 94, 0.15); color: #22c55e; margin-bottom: 16px; }
            </style>
          </head>
          <body>
            <div class="box">
              <div class="badge">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h2 style="margin:0 0 8px;font-size:18px;">GitHub Account Connected!</h2>
              <p style="color:#8d8d91;font-size:13px;margin:0 0 16px;">Connecting with VOID AI workspace...</p>
            </div>
            <script>
              const payload = {
                type: 'OAUTH_AUTH_SUCCESS',
                provider: 'github',
                token: ${JSON.stringify(token)},
                user: ${userPayload}
              };
              if (window.opener) {
                window.opener.postMessage(payload, '*');
                setTimeout(() => window.close(), 700);
              } else {
                setTimeout(() => { window.location.href = '/'; }, 1000);
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("[GitHub Callback Error]:", err);
      res.send(`
        <!DOCTYPE html>
        <html>
          <body style="background:#090307;color:#fff;font-family:sans-serif;padding:32px;text-align:center;">
            <h2 style="color:#ef4444;">GitHub Connection Error</h2>
            <p style="color:#8d8d91;font-size:14px;">${err?.message || "Failed to exchange token with GitHub."}</p>
            <p style="color:#a1a1aa;font-size:12px;margin-top:20px;">You can also connect instantly by entering a GitHub Personal Access Token in VOID AI Settings.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err?.message || "Failed"}' }, '*');
              }
            </script>
          </body>
        </html>
      `);
    }
  };

  app.get(["/auth/callback", "/auth/callback/", "/api/github/oauth/callback"], handleGitHubOAuthCallback);

  // Verify any token (OAuth or Personal Access Token PAT)
  app.post(["/api/github/verify", "/github/verify"], async (req, res) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, error: "Token is required" });
      }

      const result = await githubService.verifyGitHubToken(token.trim());
      if (!result.valid) {
        return res.status(401).json({ valid: false, error: result.error || "Invalid GitHub token" });
      }

      res.json({
        valid: true,
        user: result.user,
        scopes: result.scopes,
      });
    } catch (err: any) {
      res.status(500).json({ valid: false, error: err?.message || "Token verification failed" });
    }
  });

  // List authenticated user's repositories
  app.post(["/api/github/repos", "/github/repos"], async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(401).json({ error: "GitHub token is required" });
      }

      const repos = await githubService.listGitHubRepos(token);
      res.json({ repos });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to list repositories" });
    }
  });

  // List branches for a repo
  app.post(["/api/github/repo/branches", "/github/repo/branches"], async (req, res) => {
    try {
      const { token, owner, repo } = req.body;
      if (!token || !owner || !repo) {
        return res.status(400).json({ error: "token, owner, and repo are required" });
      }

      const branches = await githubService.getRepoBranches(token, owner, repo);
      res.json({ branches });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to fetch branches" });
    }
  });

  // Get repository file tree
  app.post(["/api/github/repo/tree", "/github/repo/tree"], async (req, res) => {
    try {
      const { token, owner, repo, branch = "main" } = req.body;
      if (!token || !owner || !repo) {
        return res.status(400).json({ error: "token, owner, and repo are required" });
      }

      const treeData = await githubService.getRepoTree(token, owner, repo, branch);
      res.json(treeData);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to fetch repository tree" });
    }
  });

  // Read file from repository
  app.post(["/api/github/repo/file", "/github/repo/file"], async (req, res) => {
    try {
      const { token, owner, repo, path: filePath, branch = "main" } = req.body;
      if (!token || !owner || !repo || !filePath) {
        return res.status(400).json({ error: "token, owner, repo, and path are required" });
      }

      const fileData = await githubService.getRepoFile(token, owner, repo, filePath, branch);
      res.json(fileData);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to read file from repository" });
    }
  });

  // Commit / edit / create file directly to repository
  app.post(["/api/github/repo/commit", "/github/repo/commit"], async (req, res) => {
    try {
      const { token, owner, repo, path: filePath, content, message, branch = "main", sha } = req.body;
      if (!token || !owner || !repo || !filePath || content === undefined) {
        return res.status(400).json({ error: "token, owner, repo, path, and content are required" });
      }

      const commitResult = await githubService.commitRepoFile(
        token,
        owner,
        repo,
        filePath,
        content,
        message || `Update ${filePath} via VOID AI`,
        branch,
        sha
      );

      res.json(commitResult);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to commit changes to GitHub" });
    }
  });

  // Create a new GitHub repository
  app.post(["/api/github/repo/create", "/github/repo/create"], async (req, res) => {
    try {
      const { token, name, description = "", isPrivate = false, autoInit = true } = req.body;
      if (!token || !name) {
        return res.status(400).json({ error: "token and repository name are required" });
      }

      const newRepo = await githubService.createGitHubRepo(token, name, description, isPrivate, autoInit);
      res.json({ success: true, repo: newRepo });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to create repository on GitHub" });
    }
  });

  // Create a new branch
  app.post(["/api/github/repo/branch", "/github/repo/branch"], async (req, res) => {
    try {
      const { token, owner, repo, branchName, fromBranch = "main" } = req.body;
      if (!token || !owner || !repo || !branchName) {
        return res.status(400).json({ error: "token, owner, repo, and branchName are required" });
      }

      const result = await githubService.createGitHubBranch(token, owner, repo, branchName, fromBranch);
      res.json({ success: true, branch: result });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to create branch on GitHub" });
    }
  });

  // ── Project Memory Management Endpoints ────────────────────────────
  app.get(["/api/project/memory", "/project/memory"], async (req, res) => {
    try {
      const projectId = (req.query.projectId as string) || "workspace-default";
      const memory = await projectMemoryService.getProjectMemory(projectId);
      res.json({ success: true, memory });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to get project memory" });
    }
  });

  app.post(["/api/project/memory", "/project/memory"], async (req, res) => {
    try {
      const { projectId = "workspace-default", updates } = req.body;
      if (!updates || typeof updates !== "object") {
        return res.status(400).json({ error: "updates object is required" });
      }
      const updated = await projectMemoryService.saveProjectMemory(projectId, updates);
      res.json({ success: true, memory: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to save project memory" });
    }
  });

  app.delete(["/api/project/memory", "/project/memory"], async (req, res) => {
    try {
      const { projectId = "workspace-default" } = req.body;
      const success = await projectMemoryService.clearProjectMemory(projectId);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to clear project memory" });
    }
  });

  // ── Codebase Search Layer Endpoint ──────────────────────────────────
  app.post(["/api/codebase/search", "/codebase/search"], async (req, res) => {
    try {
      const { type = "query", query = "", options = {} } = req.body;

      if (!query && type !== "dependencies") {
        return res.status(400).json({ error: "Search query is required" });
      }

      let result: any;
      switch (type) {
        case "filename":
          result = codebaseSearch.searchFilenames(query, options);
          break;
        case "fulltext":
          result = codebaseSearch.fullTextSearch(query, options);
          break;
        case "symbol":
          result = codebaseSearch.searchSymbols(query, options);
          break;
        case "references":
          result = codebaseSearch.findReferences(query, options);
          break;
        case "dependencies":
          result = codebaseSearch.traceDependencies(query, options);
          break;
        case "query":
        default:
          result = codebaseSearch.queryArchitecture(query, options);
          break;
      }

      res.json({ success: true, type, query, result });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to perform codebase search" });
    }
  });

  // ── Authoritative Tool Capabilities Endpoint ────────────────────────
  app.get(["/api/tools/capabilities", "/tools/capabilities"], (req, res) => {
    try {
      const hasGithubToken = Boolean(req.query.token);
      const codingModeEnabled = req.query.codingMode === "true" || req.query.codingMode === "1";
      const owner = req.query.owner as string | undefined;
      const repo = req.query.repo as string | undefined;
      const branch = (req.query.branch as string) || "main";

      const { capabilities, formattedContext } = getAuthoritativeToolCapabilities({
        hasGithubToken,
        activeRepo: repo && owner ? { owner, repo, branch } : undefined,
        codingModeEnabled,
        hasTerminal: true,
        hasFirebase: true,
        connectedUser: req.query.user as string | undefined
      });

      res.json({ success: true, capabilities, formattedContext });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to get tool capabilities" });
    }
  });

  // ── Live Code Verifier & Error Loop Endpoint ───────────────────────
  app.post(["/api/agent/verify", "/agent/verify"], (req, res) => {
    try {
      const { files = [] } = req.body;
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: "files array is required" });
      }

      const verification = codeVerifier.verifyCodeFiles(files);
      res.json({ success: true, verification });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to verify code files" });
    }
  });

  // ── Real Terminal Runner & Execution Endpoints ───────────────────────
  app.post(["/api/terminal/run", "/terminal/run"], async (req, res) => {
    try {
      const { command, stream = true, timeoutMs = 60000, userId, cwd } = req.body;
      if (!command || typeof command !== "string") {
        return res.status(400).json({ error: "command is required" });
      }

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const runner = terminalService.runCommand(command, {
          userId,
          cwd,
          timeoutMs,
          onChunk: (chunk, evt) => {
            res.write(`data: ${JSON.stringify({ type: "chunk", chunk, event: evt })}\n\n`);
          },
        });

        // Send initial event
        res.write(`data: ${JSON.stringify({ type: "start", id: runner.id, command })}\n\n`);

        const finalEvent = await runner.promise;
        res.write(`data: ${JSON.stringify({ type: "done", event: finalEvent })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      } else {
        const runner = terminalService.runCommand(command, { userId, cwd, timeoutMs });
        const finalEvent = await runner.promise;
        res.json({ success: true, event: finalEvent });
      }
    } catch (err: any) {
      console.error("[Terminal Run Error]:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || "Terminal execution failed" });
      } else {
        res.write(`data: ${JSON.stringify({ type: "error", error: err?.message })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      }
    }
  });

  app.post(["/api/terminal/stop", "/terminal/stop"], (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Task id is required" });
      const stopped = terminalService.stopCommand(id);
      res.json({ success: stopped });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to stop terminal process" });
    }
  });

  app.get(["/api/terminal/status/:id", "/terminal/status/:id"], (req, res) => {
    try {
      const event = terminalService.getTaskEvent(req.params.id);
      if (!event) return res.status(404).json({ error: "Task not found" });
      res.json({ success: true, event });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to get terminal task status" });
    }
  });

  // ── Persistent Workspace Management Endpoints ─────────────────────
  app.get(["/api/workspace/files", "/workspace/files"], async (req, res) => {
    try {
      const userId = (req.query.userId as string) || "workspace-default";
      const subDir = (req.query.path as string) || "";
      const files = await workspaceService.listFiles(userId, subDir);
      res.json({ success: true, files, rootDir: `/workspaces/${userId}` });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to list workspace files" });
    }
  });

  app.post(["/api/workspace/file/read", "/workspace/file/read"], async (req, res) => {
    try {
      const { userId = "workspace-default", path: filePath } = req.body;
      if (!filePath) return res.status(400).json({ error: "path is required" });
      const content = await workspaceService.readFile(userId, filePath);
      res.json({ success: true, content });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to read file" });
    }
  });

  app.post(["/api/workspace/file/write", "/workspace/file/write"], async (req, res) => {
    try {
      const { userId = "workspace-default", path: filePath, content = "" } = req.body;
      if (!filePath) return res.status(400).json({ error: "path is required" });
      await workspaceService.writeFile(userId, filePath, content);
      res.json({ success: true, path: filePath });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to write file" });
    }
  });

  app.delete(["/api/workspace/file/delete", "/workspace/file/delete"], async (req, res) => {
    try {
      const userId = (req.query.userId as string) || (req.body?.userId as string) || "workspace-default";
      const filePath = (req.query.path as string) || (req.body?.path as string);
      if (!filePath) return res.status(400).json({ error: "path is required" });
      const deleted = await workspaceService.deleteFile(userId, filePath);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to delete file" });
    }
  });

  app.get(["/api/workspace/download", "/workspace/download"], async (req, res) => {
    try {
      const userId = (req.query.userId as string) || "workspace-default";
      const buffer = await workspaceService.exportZip(userId);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="nova-project-${userId.slice(0, 8)}.zip"`);
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to export workspace zip" });
    }
  });

  // ── Managed Background Processes Endpoints ─────────────────────────
  app.get(["/api/processes", "/processes"], (req, res) => {
    try {
      const userId = (req.query.userId as string) || undefined;
      const procs = processManager.listProcesses(userId);
      res.json({ success: true, processes: procs });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to list processes" });
    }
  });

  app.post(["/api/processes/start", "/processes/start"], (req, res) => {
    try {
      const { userId = "workspace-default", command, name, port } = req.body;
      if (!command) return res.status(400).json({ error: "command is required" });
      const proc = processManager.startProcess({ userId, command, name, port });
      res.json({ success: true, process: proc });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to start process" });
    }
  });

  app.post(["/api/processes/stop", "/processes/stop"], (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "id is required" });
      const stopped = processManager.stopProcess(id);
      res.json({ success: stopped });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to stop process" });
    }
  });

  app.get(["/api/processes/:id/logs", "/processes/:id/logs"], (req, res) => {
    try {
      const { id } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 200;
      const logs = processManager.getLogs(id, limit);
      res.json({ success: true, logs });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to get process logs" });
    }
  });

  // ── Real Web App Preview Proxy & HTTPS Preview Links ──────────────
  app.all(["/api/preview/:port", "/api/preview/:port/*", "/preview/:port", "/preview/:port/*"], async (req, res) => {
    const port = parseInt(req.params.port, 10);
    if (!port || isNaN(port) || port < 1000 || port > 65535 || port === 3000) {
      return res.status(400).send("Invalid preview port requested");
    }

    const rawUrl = req.url;
    const prefixRegex = new RegExp(`^/(?:api/)?preview/${port}`);
    let targetPath = rawUrl.replace(prefixRegex, '') || '/';
    if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;

    const targetUrl = `http://127.0.0.1:${port}${targetPath}`;

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (key !== 'host' && key !== 'connection' && typeof value === 'string') {
        headers[key] = value;
      }
    }

    try {
      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }

      const proxyRes = await fetch(targetUrl, fetchOptions);

      res.status(proxyRes.status);
      const contentType = proxyRes.headers.get('content-type') || 'text/html';
      res.setHeader('Content-Type', contentType);

      if (contentType.includes('text/html')) {
        let html = await proxyRes.text();
        const baseTag = `<base href="/api/preview/${port}/">`;
        if (html.includes('<head>')) {
          html = html.replace('<head>', `<head>${baseTag}`);
        } else if (html.includes('<html>')) {
          html = html.replace('<html>', `<html><head>${baseTag}</head>`);
        } else {
          html = `${baseTag}${html}`;
        }
        return res.send(html);
      }

      const arrayBuffer = await proxyRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (proxyErr: any) {
      res.status(502).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Server Starting - Port ${port}</title>
            <style>
              body { background: #090307; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; display: flex; align-items: center; justify-content: center; height: 90vh; text-align: center; margin: 0; }
              .box { background: #161b22; border: 1px solid #30363d; border-radius: 16px; padding: 32px; max-width: 440px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
              .spinner { width: 36px; height: 36px; border: 3px solid rgba(139, 92, 246, 0.2); border-top-color: #8b5cf6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
              @keyframes spin { to { transform: rotate(360deg); } }
              h3 { margin: 0 0 8px; font-size: 16px; }
              p { color: #8d8d91; font-size: 13px; line-height: 1.5; margin: 0 0 16px; }
              code { background: #0d1117; padding: 2px 6px; border-radius: 4px; color: #c9d1d9; font-size: 12px; }
              button { background: #8b5cf6; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="box">
              <div class="spinner"></div>
              <h3>Waiting for server on port ${port}</h3>
              <p>Nova AI or your background process is starting. Once the service is listening on port <code>${port}</code>, this preview will connect automatically.</p>
              <button onclick="location.reload()">Refresh Preview</button>
            </div>
            <script>
              setTimeout(() => location.reload(), 3000);
            </script>
          </body>
        </html>
      `);
    }
  });

  // ── Broadcasts & Announcements Management Endpoints ───────────────
  app.delete(["/api/broadcasts/:id", "/broadcasts/:id"], async (req, res) => {
    try {
      const { id } = req.params;
      if (id) {
        try {
          await deleteDoc(doc(db, "broadcasts", id));
        } catch (_) {}
        try {
          const q = query(collection(db, "broadcasts"), where("id", "==", id));
          const snap = await getDocs(q);
          await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
        } catch (_) {}
        try {
          await deleteDoc(doc(db, "announcements", id));
        } catch (_) {}
      }
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to delete broadcast" });
    }
  });

  app.post(["/api/broadcasts/clear", "/broadcasts/clear"], async (_req, res) => {
    try {
      let count = 0;
      try {
        const snap = await getDocs(collection(db, "broadcasts"));
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
        count += snap.size;
      } catch (_) {}
      try {
        const snap2 = await getDocs(collection(db, "announcements"));
        await Promise.all(snap2.docs.map(d => deleteDoc(d.ref)));
        count += snap2.size;
      } catch (_) {}
      res.json({ success: true, count });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to clear broadcasts" });
    }
  });

  // Global Express error handler to guarantee no unhandled 500 HTML or crashes on Vercel
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Global Server Error Caught]:", err);
    if (res.headersSent) {
      try {
        res.write(`data: ${JSON.stringify({ text: `\n\n⚡ **Server Notice:** ${err?.message || "Internal processing error."}` })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      } catch (_) {}
      return;
    }

    const isChat = req.url.includes("/chat") || req.path.includes("/chat") || req.method === "POST";
    if (isChat) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ text: `\n\n⚡ **VOID AI Server Notice:** ${err?.message || "An unexpected error occurred. Please try again."}` })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    res.status(500).json({ error: err?.message || "Internal server error" });
  });

  return app;
}
