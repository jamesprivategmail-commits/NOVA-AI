import express from "express";
import path from "path";
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

async function startServer() {
  const app = createApp();
  const PORT = 3000;

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
    const maxTokens = (userTier === 'vip' || userTier === 'god_mode' ? brainSettings.vipMaxTokens
      : userTier === 'premium' ? brainSettings.premiumMaxTokens
      : userTier === 'pro' ? brainSettings.proMaxTokens
      : brainSettings.freeMaxTokens) || 2048;

    const tierPrompt = (userTier === 'vip' || userTier === 'god_mode' ? brainSettings.vipPrompt
      : userTier === 'premium' ? brainSettings.premiumPrompt
      : userTier === 'pro' ? brainSettings.proPrompt
      : brainSettings.freePrompt) || "";

    // Abide strictly by the exact website AI Brain prompt and tier rules
    const masterPrompt = [
      brainSettings.globalPrompt,
      tierPrompt
    ].filter(Boolean).map(s => s.trim()).join("\n\n") || "You are VOID AI, an elite AI assistant.";

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

  // Bind AI generator to Telegram Bot Service and start polling only when NOT on Vercel serverless
  if (!process.env.VERCEL && !process.env.NOW_REGION && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    telegramBot.setAiGenerator(generateAiTextForTelegram);
    
    // Live Firestore listeners for real-time bot token updates without needing server restart
    (async () => {
      try {
        const { getDoc, doc, onSnapshot } = await import("firebase/firestore");
        const { db } = await import("./src/config/firebase.js");
        
        let lastAppliedToken = telegramBot.getToken();

        // 1. Live listener for settings/telegram
        onSnapshot(doc(db, "settings", "telegram"), async (snap) => {
          if (snap.exists() && snap.data()?.token) {
            const newToken = snap.data().token.trim();
            if (newToken && newToken !== lastAppliedToken && newToken.includes(":")) {
              console.log("[Telegram Bot] Live Firestore token update detected from settings/telegram");
              lastAppliedToken = newToken;
              telegramBot.setToken(newToken);
              await telegramBot.start(newToken).catch(() => {});
            }
          }
        }, (err) => {
          console.warn("[Telegram Bot] Firestore settings/telegram listener warning:", err.message);
        });

        // 2. Live listener for settings/apikeys
        onSnapshot(doc(db, "settings", "apikeys"), async (snap) => {
          if (snap.exists() && snap.data()?.telegramBotToken) {
            const newToken = snap.data().telegramBotToken.trim();
            if (newToken && newToken !== lastAppliedToken && newToken.includes(":")) {
              console.log("[Telegram Bot] Live Firestore token update detected from settings/apikeys");
              lastAppliedToken = newToken;
              telegramBot.setToken(newToken);
              await telegramBot.start(newToken).catch(() => {});
            }
          }
        }, (err) => {
          console.warn("[Telegram Bot] Firestore settings/apikeys listener warning:", err.message);
        });

        // Initial token load from Firestore if present
        try {
          const teleDoc = await getDoc(doc(db, "settings", "telegram"));
          if (teleDoc.exists() && teleDoc.data()?.token) {
            lastAppliedToken = teleDoc.data().token.trim();
            telegramBot.setToken(lastAppliedToken);
          } else {
            const apiDoc = await getDoc(doc(db, "settings", "apikeys"));
            if (apiDoc.exists() && apiDoc.data()?.telegramBotToken) {
              lastAppliedToken = apiDoc.data().telegramBotToken.trim();
              telegramBot.setToken(lastAppliedToken);
            }
          }
        } catch (_) {}
      } catch (err) {
        console.warn("[Telegram Bot] Error initializing token listeners:", err);
      }

      telegramBot.start().catch(err => {
        console.warn("[Telegram Bot] Initial startup error (continuing without bot):", err);
      });
    })();
  }

  // Vite middleware for development (AI Studio) or static hosting in production (Docker)
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
