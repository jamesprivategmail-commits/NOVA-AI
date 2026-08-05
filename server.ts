import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./src/config/firebase.js";

dotenv.config();

import { AI_CONFIG } from "./src/config/ai.js";

const HARDCODED_GROQ_KEY = process.env.GROQ_API_KEY || "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";

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

async function executeGroqWithFallback(messages: any[], systemPrompt: string, maxTokens: number = 1024, res: any) {
  const models = AI_CONFIG.providers.groq.models;
  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      console.log(`Executing Groq model: ${model} (max_tokens: ${maxTokens})`);
      
      const groq = new Groq({ apiKey: HARDCODED_GROQ_KEY });
      const formattedMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];
      
      if (systemPrompt && systemPrompt.trim()) {
        formattedMessages.push({
          role: "system",
          content: systemPrompt.trim()
        });
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
      return; // Success
    } catch (err: any) {
      console.warn(`Groq model ${model} failed:`, err.message);
      lastError = err;
      if (err.status === 401 || err.statusCode === 401 || err.message.includes("API key")) {
        throw err;
      }
    }
  }

  throw lastError || new Error(`All Groq models failed`);
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
    max: 100,
    message: { error: "Too many requests, please try again later." }
  });

  app.use("/api/", apiLimiter);

  // Handle AI API streaming proxy with tier limits & behavior enforcement
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages = [], systemPrompt = "", userId = "", userTier: clientTier = "" } = req.body;
      
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Retrieve user profile and brain settings directly from Firestore backend
      const { userTier: dbTier, isBanned, isAdmin, messageCount, lastMessageDate, brainSettings } = await fetchUserAndTierSettings(userId);
      const tier = dbTier || clientTier || 'free';

      if (isBanned) {
        res.write(`data: ${JSON.stringify({ text: "\n\n**Error:** Your account has been restricted by an administrator." })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      // Check daily message limits enforced per tier
      const today = new Date().toISOString().split('T')[0];
      const limitForTier = tier === 'vip' ? brainSettings.vipLimit 
        : tier === 'premium' ? brainSettings.premiumLimit 
        : tier === 'pro' ? brainSettings.proLimit 
        : brainSettings.freeLimit;

      if (!isAdmin && lastMessageDate === today && messageCount >= limitForTier) {
        res.write(`data: ${JSON.stringify({ text: `\n\n**Tier Limit Exceeded:** You have reached your daily limit of ${limitForTier} messages on the ${tier.toUpperCase()} plan. Please upgrade your plan to continue.` })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      // Determine AI System Persona and Limits for effective Tier
      let combinedSystemPrompt = brainSettings.globalPrompt;
      let tierSpecificPrompt = "";
      let maxTokens = 1024;

      if (tier === 'free') {
        tierSpecificPrompt = brainSettings.freePrompt;
        maxTokens = brainSettings.freeMaxTokens;
      } else if (tier === 'pro') {
        tierSpecificPrompt = brainSettings.proPrompt;
        maxTokens = brainSettings.proMaxTokens;
      } else if (tier === 'premium') {
        tierSpecificPrompt = brainSettings.premiumPrompt;
        maxTokens = brainSettings.premiumMaxTokens;
      } else if (tier === 'vip') {
        tierSpecificPrompt = brainSettings.vipPrompt;
        maxTokens = brainSettings.vipMaxTokens;
      }

      if (tierSpecificPrompt) {
        combinedSystemPrompt += `\n\n[ENFORCED TIER BEHAVIOR: ${tier.toUpperCase()}]\n${tierSpecificPrompt}`;
      }
      if (systemPrompt && !systemPrompt.includes(brainSettings.globalPrompt)) {
        combinedSystemPrompt += `\n\n${systemPrompt}`;
      }

      await executeGroqWithFallback(messages, combinedSystemPrompt, maxTokens, res);
      
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Error calling Groq API:", error);
      
      let friendlyError = "I'm having trouble connecting to Groq right now. Please try again later.";
      if (error.status === 429 || error.statusCode === 429) friendlyError = "Groq rate limit exceeded. Please wait a moment and try again.";
      else if (error.status === 401 || error.statusCode === 401 || String(error.message).includes("API key")) friendlyError = "Groq API key error. Please check system credentials.";
      
      res.write(`data: ${JSON.stringify({ text: `\n\n**Error:** ${friendlyError}` })}\n\n`);
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
