import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./src/config/firebase.js";

dotenv.config();

import { AI_CONFIG } from "./src/config/ai.js";

function cleanKey(k: any): string {
  if (typeof k !== 'string') return '';
  return k.replace(/^["']|["']$/g, '').trim();
}

async function getSystemKeys(): Promise<{ groqKeys: string[]; cohereKeys: string[] }> {
  let groqKeys: string[] = [];
  let cohereKeys: string[] = [];

  try {
    const keysRef = doc(db, "settings", "apikeys");
    const keysSnap = await getDoc(keysRef);
    if (keysSnap.exists()) {
      const data = keysSnap.data();
      if (Array.isArray(data.groqApiKeys)) {
        groqKeys = data.groqApiKeys.map(cleanKey).filter(Boolean);
      }
      if (groqKeys.length === 0 && data.groqApiKey) {
        const cleaned = cleanKey(data.groqApiKey);
        if (cleaned) groqKeys = [cleaned];
      }

      if (Array.isArray(data.cohereApiKeys)) {
        cohereKeys = data.cohereApiKeys.map(cleanKey).filter(Boolean);
      }
      if (cohereKeys.length === 0 && data.cohereApiKey) {
        const cleaned = cleanKey(data.cohereApiKey);
        if (cleaned) cohereKeys = [cleaned];
      }
    }
  } catch (err) {
    console.warn("Could not fetch API keys from Firestore in backend:", err);
  }

  if (groqKeys.length === 0 && process.env.GROQ_API_KEY) {
    const cleaned = cleanKey(process.env.GROQ_API_KEY);
    if (cleaned) groqKeys = [cleaned];
  }
  if (cohereKeys.length === 0 && process.env.COHERE_API_KEY) {
    const cleaned = cleanKey(process.env.COHERE_API_KEY);
    if (cleaned) cohereKeys = [cleaned];
  }

  return { groqKeys, cohereKeys };
}

async function fetchUserAndTierSettings(userId?: string) {
  let userTier: 'free' | 'pro' | 'premium' | 'vip' = 'free';
  let isBanned = false;
  let isAdmin = false;
  let messageCount = 0;
  let lastMessageDate = "";

  if (userId) {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const uData = userSnap.data();
        userTier = (uData.tier as any) || 'free';
        isBanned = !!uData.isBanned;
        isAdmin = !!uData.isAdmin;
        messageCount = uData.messageCount || 0;
        lastMessageDate = uData.lastMessageDate || "";
      }
    } catch (err) {
      console.warn("Could not fetch user profile from Firestore in backend:", err);
    }
  }

  let brainSettings = {
    globalPrompt: "You are VOID AI, an elite, hyper-intelligent, dangerous AI assistant and master email marketing campaign strategist.",
    freePrompt: "Free Tier Brain: Precise, focused email marketing and AI assistant responses.",
    proPrompt: "Pro Tier Brain: Advanced marketing strategy, extended copy variations, deeper campaign analytics insights.",
    premiumPrompt: "Premium Tier Brain: Full campaign strategy suite, multi-stage funnel email sequences, conversion rate optimization hacks.",
    vipPrompt: "VIP Tier Brain: Unrestricted elite AI capabilities, custom bespoke campaign designs, 1-on-1 copy teardowns.",
    freeLimit: 5,
    proLimit: 50,
    premiumLimit: 250,
    vipLimit: 99999,
    freeMaxTokens: 512,
    proMaxTokens: 1024,
    premiumMaxTokens: 2048,
    vipMaxTokens: 4096,
  };

  try {
    const brainRef = doc(db, "settings", "brain");
    const brainSnap = await getDoc(brainRef);
    if (brainSnap.exists()) {
      const bData = brainSnap.data();
      brainSettings = {
        globalPrompt: bData.globalPrompt || brainSettings.globalPrompt,
        freePrompt: bData.freePrompt || brainSettings.freePrompt,
        proPrompt: bData.proPrompt || brainSettings.proPrompt,
        premiumPrompt: bData.premiumPrompt || brainSettings.premiumPrompt,
        vipPrompt: bData.vipPrompt || brainSettings.vipPrompt,

        freeLimit: typeof bData.freeLimit === 'number' ? bData.freeLimit : brainSettings.freeLimit,
        proLimit: typeof bData.proLimit === 'number' ? bData.proLimit : brainSettings.proLimit,
        premiumLimit: typeof bData.premiumLimit === 'number' ? bData.premiumLimit : brainSettings.premiumLimit,
        vipLimit: typeof bData.vipLimit === 'number' ? bData.vipLimit : brainSettings.vipLimit,

        freeMaxTokens: typeof bData.freeMaxTokens === 'number' ? bData.freeMaxTokens : brainSettings.freeMaxTokens,
        proMaxTokens: typeof bData.proMaxTokens === 'number' ? bData.proMaxTokens : brainSettings.proMaxTokens,
        premiumMaxTokens: typeof bData.premiumMaxTokens === 'number' ? bData.premiumMaxTokens : brainSettings.premiumMaxTokens,
        vipMaxTokens: typeof bData.vipMaxTokens === 'number' ? bData.vipMaxTokens : brainSettings.vipMaxTokens,
      };
    }
  } catch (err) {
    console.warn("Could not fetch brain settings from Firestore in backend:", err);
  }

  return {
    userTier,
    isBanned,
    isAdmin,
    messageCount,
    lastMessageDate,
    brainSettings
  };
}

// API Key Validation & Health Cache Layer
interface BadKeyInfo {
  reason: string;
  expiresAt: number;
}

class KeyHealthManager {
  private badKeysMap = new Map<string, BadKeyInfo>();

  private getKeyHash(apiKey: string): string {
    return apiKey.trim();
  }

  // Format validation check without making network request
  isKeyFormatValid(apiKey: string, provider: 'groq' | 'cohere'): boolean {
    if (!apiKey || typeof apiKey !== 'string') return false;
    const clean = apiKey.replace(/^["']|["']$/g, '').trim();
    if (clean.length < 10) return false;
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

  isKeyHealthy(apiKey: string, provider: 'groq' | 'cohere'): { healthy: boolean; reason?: string } {
    if (!this.isKeyFormatValid(apiKey, provider)) {
      return { healthy: false, reason: "Invalid key format or placeholder text" };
    }

    const keyHash = this.getKeyHash(apiKey);
    const info = this.badKeysMap.get(keyHash);
    if (info) {
      if (Date.now() < info.expiresAt) {
        return { healthy: false, reason: info.reason };
      }
      // Expired, clear from map to allow re-validation
      this.badKeysMap.delete(keyHash);
    }
    return { healthy: true };
  }

  filterHealthyKeys(keys: string[], provider: 'groq' | 'cohere'): { healthyKeys: string[]; skippedReasons: string[] } {
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
}

const keyHealthManager = new KeyHealthManager();

async function executeGroqWithRotation(messages: any[], systemPrompt: string, maxTokens: number = 1024, requestedModel: string | undefined, groqKeys: string[], res: any) {
  const { healthyKeys, skippedReasons } = keyHealthManager.filterHealthyKeys(groqKeys, 'groq');
  
  if (healthyKeys.length === 0) {
    if (skippedReasons.length > 0) {
      console.warn(`[Groq Validation] Skipped invalid/bad keys: ${skippedReasons.join(', ')}`);
    }
    throw new Error("No healthy or valid Groq API keys available");
  }

  const defaultModels = AI_CONFIG.providers.groq.models;
  const models = requestedModel && defaultModels.includes(requestedModel) 
    ? [requestedModel, ...defaultModels.filter(m => m !== requestedModel)] 
    : defaultModels;

  let lastError: any = null;

  for (let keyIdx = 0; keyIdx < healthyKeys.length; keyIdx++) {
    const apiKey = healthyKeys[keyIdx];
    const groq = new Groq({ apiKey });

    for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
      const model = models[modelIdx];
      try {
        console.log(`[Groq Multi-Key] Key #${keyIdx + 1}/${healthyKeys.length} -> Model: ${model}`);
        
        const formattedMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];
        if (systemPrompt && systemPrompt.trim()) {
          formattedMessages.push({ role: "system", content: systemPrompt.trim() });
        }

        for (const m of messages) {
          formattedMessages.push({
            role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
            content: m.text || m.content || ""
          });
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
          }
        }
        return; // Execution succeeded!
      } catch (err: any) {
        console.warn(`[Groq] Key #${keyIdx + 1} with model ${model} failed:`, err?.message || err);
        lastError = err;
        
        const msg = String(err?.message || "").toLowerCase();
        const status = err?.status || err?.statusCode || 0;
        
        if (status === 401 || msg.includes("invalid api key") || msg.includes("unauthorized")) {
          keyHealthManager.markKeyAsBad(apiKey, "401 Invalid Groq API Key", 60 * 60 * 1000);
          console.warn(`[Groq] Key #${keyIdx + 1} invalid. Rotating to next key...`);
          break; // Key itself is invalid, skip to next key
        }
        
        // If daily token limit or organization rate limit reached on Groq
        if (msg.includes("rate_limit_exceeded") || msg.includes("tokens per day") || msg.includes("tpd")) {
          console.warn(`[Groq] Model ${model} daily token limit reached on Key #${keyIdx + 1}. Trying next model/key...`);
        } else {
          console.warn(`[Groq] Model ${model} unavailable/rate-limited on Key #${keyIdx + 1}. Trying next model...`);
        }
        continue;
      }
    }
  }

  throw lastError || new Error(`All Groq keys and models failed`);
}

async function executeCohereWithRotation(messages: any[], systemPrompt: string, maxTokens: number = 1024, requestedModel: string | undefined, cohereKeys: string[], res: any) {
  const { healthyKeys, skippedReasons } = keyHealthManager.filterHealthyKeys(cohereKeys, 'cohere');
  
  if (healthyKeys.length === 0) {
    if (skippedReasons.length > 0) {
      console.warn(`[Cohere Validation] Skipped invalid/bad keys: ${skippedReasons.join(', ')}`);
    }
    throw new Error("No healthy or valid Cohere API keys available");
  }

  const defaultModels = AI_CONFIG.providers.cohere.models;
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

  for (let keyIdx = 0; keyIdx < healthyKeys.length; keyIdx++) {
    const apiKey = healthyKeys[keyIdx];

    for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
      const model = models[modelIdx];
      try {
        console.log(`[Cohere Multi-Key] Key #${keyIdx + 1}/${healthyKeys.length} -> Model: ${model}`);

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
          console.warn(`[Cohere] Key #${keyIdx + 1} model ${model} failed (${response.status}): ${errorText}`);
          lastError = new Error(`Cohere status ${response.status}: ${errorText}`);
          
          if (response.status === 401) {
            keyHealthManager.markKeyAsBad(apiKey, "401 Invalid Cohere API Key", 60 * 60 * 1000);
            break; // Skip to next key
          }
          continue; // Try next model on this key
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
              } catch (e) {
                // Non-JSON SSE line or parse event
              }
            }
          }
        }
        return; // Cohere succeeded!
      } catch (err: any) {
        console.warn(`[Cohere] Key #${keyIdx + 1} with model ${model} execution failed:`, err?.message || err);
        lastError = err;
      }
    }
  }

  throw lastError || new Error(`All Cohere keys and models failed`);
}

async function incrementUserMessageCountServer(userId: string) {
  if (!userId) return;
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const uData = userSnap.data();
      const today = new Date().toISOString().split('T')[0];
      let newCount = (uData.messageCount || 0) + 1;
      if (uData.lastMessageDate !== today) {
        newCount = 1;
      }
      await setDoc(userRef, { messageCount: newCount, lastMessageDate: today }, { merge: true });
    }
  } catch (err) {
    console.warn("Error incrementing message count in backend:", err);
  }
}

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const PORT = 3000;

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  app.use(express.json());

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: "Too many requests. Please wait a minute before sending more messages." }
  });

  app.use("/api/", apiLimiter);

  // Handle AI API streaming proxy
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages = [], systemPrompt = "", userId = "", provider = "groq", model } = req.body;
      
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const { groqKeys, cohereKeys } = await getSystemKeys();

      // Retrieve user profile directly from Firestore backend
      const { userTier: dbTier, isBanned, isAdmin, messageCount, lastMessageDate, brainSettings } = await fetchUserAndTierSettings(userId);
      const tier = dbTier || 'free';

      if (isBanned) {
        res.write(`data: ${JSON.stringify({ text: "\n\n**Error:** Your account has been restricted by an administrator." })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      // Enforce daily message limits per tier
      const today = new Date().toISOString().split('T')[0];
      const limitForTier = tier === 'vip' ? brainSettings.vipLimit 
        : tier === 'premium' ? brainSettings.premiumLimit 
        : tier === 'pro' ? brainSettings.proLimit 
        : brainSettings.freeLimit;

      const currentCount = lastMessageDate === today ? (messageCount || 0) : 0;

      if (tier !== 'vip' && currentCount >= limitForTier) {
        res.write(`data: ${JSON.stringify({ text: `\n\n**Tier Limit Exceeded:** You have reached your daily limit of ${limitForTier} messages on the ${tier.toUpperCase()} plan. Please upgrade your plan to continue.` })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      // Increment message count on server side
      await incrementUserMessageCountServer(userId);

      const maxTokens = (tier === 'vip' ? brainSettings.vipMaxTokens
        : tier === 'premium' ? brainSettings.premiumMaxTokens
        : tier === 'pro' ? brainSettings.proMaxTokens
        : brainSettings.freeMaxTokens) || 2048;

      const masterPrompt = brainSettings.globalPrompt || "You are VOID AI, an elite AI assistant.";
      const combinedSystemPrompt = [
        masterPrompt,
        systemPrompt
      ].filter(Boolean).map(s => s.trim()).join("\n\n");

      const providersToTry = provider === "cohere" ? ["cohere", "groq"] : ["groq", "cohere"];
      let executedSuccessfully = false;
      let lastProviderError: any = null;

      for (const p of providersToTry) {
        try {
          if (p === "groq") {
            await executeGroqWithRotation(messages, combinedSystemPrompt, maxTokens, provider === "groq" ? model : undefined, groqKeys, res);
            executedSuccessfully = true;
            break;
          } else if (p === "cohere") {
            await executeCohereWithRotation(messages, combinedSystemPrompt, maxTokens, provider === "cohere" ? model : undefined, cohereKeys, res);
            executedSuccessfully = true;
            break;
          }
        } catch (err: any) {
          console.warn(`[Failover Engine] Provider ${p.toUpperCase()} failed:`, err?.message || err);
          lastProviderError = err;
        }
      }

      if (!executedSuccessfully) {
        console.warn("[Failover Engine] All providers failed:", lastProviderError?.message);
        const errMessage = String(lastProviderError?.message || "");
        let errNotice = "⚡ **VOID AI Traffic Notice:** Our AI connection pool is undergoing high demand. Please re-send your message in a moment or select a different model engine from the top bar.";
        if (errMessage.toLowerCase().includes("healthy") || errMessage.toLowerCase().includes("valid")) {
          errNotice = "⚡ **API Key Validation Notice:** Configured AI provider keys are currently invalid or depleted. Please check system API key configuration in Admin Settings.";
        } else if (errMessage.toLowerCase().includes("rate_limit_exceeded") || errMessage.toLowerCase().includes("rate limit") || errMessage.toLowerCase().includes("429") || errMessage.toLowerCase().includes("tokens")) {
          errNotice = "⚡ **Rate Limit Notice:** Groq daily token limit reached on current model. Please switch engine to **Cohere** or **Llama 3.1 8B** from the dropdown menu above.";
        }
        res.write(`data: ${JSON.stringify({ text: `\n\n${errNotice}` })}\n\n`);
      }
      
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Error calling AI API:", error);
      const errNotice = "⚡ **VOID AI Traffic Notice:** System temporarily busy. Please re-send your message or select an alternate model.";
      res.write(`data: ${JSON.stringify({ text: `\n\n${errNotice}` })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  });

  // Pre-flight key validation endpoint
  app.post("/api/admin/validate-key", async (req, res) => {
    try {
      const { provider, apiKey } = req.body;
      if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
        return res.status(400).json({ valid: false, error: "API key is required" });
      }

      const trimmedKey = apiKey.trim();
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
      } else {
        return res.status(400).json({ valid: false, error: "Unsupported provider" });
      }
    } catch (err: any) {
      return res.json({ valid: false, error: err?.message || "Key validation failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
