import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { 
  createApp, 
  getSystemKeys, 
  fetchUserAndTierSettings, 
  executeGroqWithRotation, 
  executeCohereWithRotation, 
  executeBazaarLinkWithRotation 
} from "./src/server/createApp.js";
import { telegramBot } from "./src/telegram/bot.js";
import { buildUnifiedBrainPrompt } from "./src/server/agent/brainPrompt.js";

async function startServer() {
  const app = createApp();
  const PORT = Number(process.env.PORT) || 3000;

  // Helper function for Telegram Bot AI responses with failover and strict timeout
  async function generateAiTextForTelegram(userPrompt: string, history: any[] = [], userId?: string): Promise<string> {
    let fullText = "";
    const mockRes = {
      write: (data: string) => {
        const parts = data.split("\n\n");
        for (const part of parts) {
          if (part.startsWith("data: ")) {
            const raw = part.slice(6).trim();
            if (raw && raw !== "[DONE]") {
              try {
                const parsed = JSON.parse(raw);
                if (parsed.text) {
                  fullText += parsed.text;
                }
              } catch (_) {}
            }
          }
        }
      }
    };

    const { groqKeys, cohereKeys, bazaarLinkKeys } = await getSystemKeys();
    const { userTier, brainSettings } = await fetchUserAndTierSettings(userId);
    const maxTokens = ((userTier as string) === 'vip' || (userTier as string) === 'god_mode' ? brainSettings.vipMaxTokens
      : userTier === 'premium' ? brainSettings.premiumMaxTokens
      : userTier === 'pro' ? brainSettings.proMaxTokens
      : brainSettings.freeMaxTokens) || 2048;

    // Use unified brain prompt across all integrations
    const masterPrompt = buildUnifiedBrainPrompt({
      tier: userTier,
      brainSettings,
      runtimeContext: {
        hasGithubToken: false,
        hasTerminal: false,
        hasFirebase: true
      }
    });

    const messages = [...history, { role: "user", text: userPrompt }];

    let executed = false;

    // 1. Prioritize Cohere if keys available (Cohere strictly follows system personas and instructions without breaking character)
    if (cohereKeys.length > 0) {
      try {
        fullText = "";
        await executeCohereWithRotation(messages, masterPrompt, maxTokens, undefined, cohereKeys, mockRes);
        if (fullText.trim()) {
          executed = true;
        }
      } catch (err) {
        console.warn("[Telegram AI] Cohere primary attempt failed, trying Groq failover...", err);
      }
    }

    // 2. Groq failover or fallback
    if (!executed && groqKeys.length > 0) {
      try {
        fullText = "";
        await executeGroqWithRotation(messages, masterPrompt, maxTokens, undefined, groqKeys, mockRes);
        // Verify Groq didn't break character into default provider persona
        const lower = fullText.toLowerCase();
        if (lower.includes("i am qwen") || lower.includes("tongyi lab") || lower.includes("i’m chatgpt") || lower.includes("i am chatgpt")) {
          console.warn("[Telegram AI] Groq broke character, rejecting response");
          fullText = "";
        } else if (fullText.trim()) {
          executed = true;
        }
      } catch (err) {
        console.warn("[Telegram AI] Groq attempt failed, trying BazaarLink failover...", err);
      }
    }

    // 3. BazaarLink fallback
    if (!executed && bazaarLinkKeys.length > 0) {
      try {
        fullText = "";
        await executeBazaarLinkWithRotation(messages, masterPrompt, maxTokens, undefined, bazaarLinkKeys, mockRes);
        if (fullText.trim()) {
          executed = true;
        }
      } catch (err) {
        console.error("[Telegram AI] BazaarLink failover also failed:", err);
      }
    }

    return fullText.trim() || "⚡ **VOID AI Notice:** AI engine is currently processing high demand. Please resend your message in a moment.";
  }

  // Start Telegram only when an explicit environment token has been configured.
  // Do not load credentials from Firestore during startup on public deployments.
  if (
    !process.env.VERCEL &&
    !process.env.NOW_REGION &&
    !process.env.AWS_LAMBDA_FUNCTION_NAME &&
    process.env.TELEGRAM_BOT_TOKEN?.trim()
  ) {
    telegramBot.setAiGenerator(generateAiTextForTelegram);
    telegramBot.start(process.env.TELEGRAM_BOT_TOKEN).catch(err => {
      console.warn("[Telegram Bot] Initial startup error (continuing without bot):", err);
    });
  }

  // Check if running in production mode (dist/server.cjs) or dev mode (AI Studio with tsx)
  const isProduction = 
    process.env.NODE_ENV === "production" || 
    (typeof process.argv[1] === "string" && (process.argv[1].endsWith(".cjs") || process.argv[1].includes("dist")));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Fallback for SPA routing in development mode
    app.use("*", async (req, res, next) => {
      if (req.method !== "GET" || req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/health")) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), "index.html");
        let html = fs.readFileSync(indexPath, "utf-8");
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (err) {
        next(err);
      }
    });
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
