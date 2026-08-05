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

async function getSystemKeys(): Promise<{ groqKeys: string[]; cohereKeys: string[] }> {
  let groqKeys: string[] = [];
  let cohereKeys: string[] = [];

  try {
    const keysRef = doc(db, "settings", "apikeys");
    const keysSnap = await getDoc(keysRef);
    if (keysSnap.exists()) {
      const data = keysSnap.data();
      if (Array.isArray(data.groqApiKeys)) {
        groqKeys = data.groqApiKeys.filter((k: any) => typeof k === 'string' && k.trim());
      }
      if (groqKeys.length === 0 && data.groqApiKey && typeof data.groqApiKey === 'string' && data.groqApiKey.trim()) {
        groqKeys = [data.groqApiKey.trim()];
      }

      if (Array.isArray(data.cohereApiKeys)) {
        cohereKeys = data.cohereApiKeys.filter((k: any) => typeof k === 'string' && k.trim());
      }
      if (cohereKeys.length === 0 && data.cohereApiKey && typeof data.cohereApiKey === 'string' && data.cohereApiKey.trim()) {
        cohereKeys = [data.cohereApiKey.trim()];
      }
    }
  } catch (err) {
    console.warn("Could not fetch API keys from Firestore in backend:", err);
  }

  if (groqKeys.length === 0 && process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
    groqKeys = [process.env.GROQ_API_KEY.trim()];
  }
  if (cohereKeys.length === 0 && process.env.COHERE_API_KEY && process.env.COHERE_API_KEY.trim()) {
    cohereKeys = [process.env.COHERE_API_KEY.trim()];
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

async function executeGroqWithRotation(messages: any[], systemPrompt: string, maxTokens: number = 1024, requestedModel: string | undefined, groqKeys: string[], res: any) {
  if (!groqKeys || groqKeys.length === 0) {
    throw new Error("No Groq API keys configured");
  }

  const defaultModels = AI_CONFIG.providers.groq.models;
  const models = requestedModel && defaultModels.includes(requestedModel) 
    ? [requestedModel, ...defaultModels.filter(m => m !== requestedModel)] 
    : defaultModels;

  let lastError: any = null;

  for (let keyIdx = 0; keyIdx < groqKeys.length; keyIdx++) {
    const apiKey = groqKeys[keyIdx];
    const groq = new Groq({ apiKey });

    for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
      const model = models[modelIdx];
      try {
        console.log(`[Groq Multi-Key] Key #${keyIdx + 1}/${groqKeys.length} -> Model: ${model}`);
        
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
        console.warn(`[Groq] Key #${keyIdx + 1} with model ${model} failed:`, err.message);
        lastError = err;
        // If 429 rate limit or 401 unauthorized, break model loop to rotate key!
        if (err.status === 429 || err.status === 401 || err.statusCode === 429 || err.statusCode === 401) {
          break;
        }
      }
    }
  }

  throw lastError || new Error(`All Groq keys and models failed`);
}

async function executeCohereWithRotation(messages: any[], systemPrompt: string, maxTokens: number = 1024, requestedModel: string | undefined, cohereKeys: string[], res: any) {
  if (!cohereKeys || cohereKeys.length === 0) {
    throw new Error("No Cohere API keys configured");
  }

  const defaultModels = AI_CONFIG.providers.cohere.models;
  const model = requestedModel && defaultModels.includes(requestedModel) ? requestedModel : defaultModels[0] || "command-r-plus";
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

  for (let keyIdx = 0; keyIdx < cohereKeys.length; keyIdx++) {
    const apiKey = cohereKeys[keyIdx];
    try {
      console.log(`[Cohere Multi-Key] Key #${keyIdx + 1}/${cohereKeys.length} -> Model: ${model}`);

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
        console.warn(`[Cohere] Key #${keyIdx + 1} failed (${response.status}): ${errorText}`);
        lastError = new Error(`Cohere API status ${response.status}: ${errorText}`);
        continue; // Try next key
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
      console.warn(`[Cohere] Key #${keyIdx + 1} execution failed:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error(`All Cohere keys failed`);
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

      const maxTokens = 4096;
      const combinedSystemPrompt = systemPrompt ? systemPrompt.trim() : "";

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
        const errNotice = lastProviderError?.message || "All configured AI providers (Groq & Cohere) failed or are exhausted.";
        res.write(`data: ${JSON.stringify({ text: `\n\n**System Failover Notice:** ${errNotice}` })}\n\n`);
      }
      
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Error calling AI API:", error);
      res.write(`data: ${JSON.stringify({ text: `\n\n**System Error:** ${error?.message || "Unexpected failure in AI proxy."}` })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
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
