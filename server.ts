import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { CohereClient } from "cohere-ai";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

import { AI_CONFIG } from "./src/config/ai.js";

async function executeWithFallback(provider: string, apiKey: string, messages: any[], res: any) {
  const models = AI_CONFIG.providers[provider as keyof typeof AI_CONFIG.providers]?.models || [];
  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      console.log(`Trying ${provider} model: ${model}`);
      
      if (provider === "groq") {
        const groq = new Groq({ apiKey });
        const formattedMessages = messages.map((m: any) => ({
          role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: m.text
        }));

        const stream = await groq.chat.completions.create({
          model: model,
          messages: formattedMessages,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
          }
        }
        return; // Success, exit fallback loop
      } else if (provider === "cohere") {
        const cohere = new CohereClient({ token: apiKey });
        const chatHistory = messages.slice(0, -1).map((m: any) => ({
          role: (m.role === "user" ? "USER" : "CHATBOT") as "USER" | "CHATBOT",
          message: m.text
        }));
        
        const message = messages.length > 0 ? messages[messages.length - 1].text : "";

        const stream = await cohere.chatStream({
          model: model,
          message: message,
          chatHistory: chatHistory,
        });

        for await (const chatEvent of stream) {
          if (chatEvent.eventType === "text-generation") {
            res.write(`data: ${JSON.stringify({ text: chatEvent.text })}\n\n`);
          }
        }
        return;
      } else {
        const ai = new GoogleGenAI({ apiKey });
        const geminiMessages = messages.map((m: any) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.text }],
        }));

        const responseStream = await ai.models.generateContentStream({
          model: model,
          contents: geminiMessages,
        });
        
        for await (const chunk of responseStream) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
        return;
      }
    } catch (err: any) {
      console.warn(`${provider} model ${model} failed:`, err.message);
      lastError = err;
      // If it's an API key error, don't fallback, just throw immediately
      if (err.status === 401 || err.statusCode === 401 || err.message.includes("API key")) {
        throw err;
      }
      // Otherwise continue to next model
    }
  }

  throw lastError || new Error(`All fallback models failed for ${provider}`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(helmet({
    contentSecurityPolicy: false, // disable to allow local vite loading
    crossOriginEmbedderPolicy: false
  }));
  app.use(express.json());

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: "Too many requests, please try again later." }
  });

  app.use("/api/", apiLimiter);

  // Handle AI API streaming proxy
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, provider = "gemini", customKey } = req.body;
      
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      if (provider === "groq") {
        const apiKey = customKey || process.env.GROQ_API_KEY;
        if (!apiKey) {
          res.write(`data: ${JSON.stringify({ text: "Error: API key is missing for Groq" })}\n\n`);
          res.write("data: [DONE]\n\n");
          return res.end();
        }
        await executeWithFallback("groq", apiKey, messages, res);
      } else if (provider === "cohere") {
        const apiKey = customKey || process.env.COHERE_API_KEY;
        if (!apiKey) {
          res.write(`data: ${JSON.stringify({ text: "Error: API key is missing for Cohere" })}\n\n`);
          res.write("data: [DONE]\n\n");
          return res.end();
        }
        await executeWithFallback("cohere", apiKey, messages, res);
      } else {
        // Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          res.write(`data: ${JSON.stringify({ text: "Error: GEMINI_API_KEY is missing" })}\n\n`);
          res.write("data: [DONE]\n\n");
          return res.end();
        }
        await executeWithFallback("gemini", apiKey, messages, res);
      }
      
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Error calling AI API:", error);
      
      // Never expose raw API errors to users. Show friendly error messages instead.
      let friendlyError = "I'm having trouble connecting right now. Please try again later.";
      if (error.status === 429 || error.statusCode === 429) friendlyError = "I'm receiving too many requests right now. Please slow down and try again.";
      else if (error.status === 401 || error.statusCode === 401 || String(error.message).includes("API key")) friendlyError = "The API key configured for this provider is invalid.";
      
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
