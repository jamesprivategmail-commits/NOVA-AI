import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase.js";

const DISCLAIMER_TEXT = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
ᴠᴏɪᴅ ᴀɪ • ᴅɪꜱᴄʟᴀɪᴍᴇR ⚠️
ꜱᴍᴀRᴛᴇR. ꜰᴀꜱᴛᴇR. ᴘᴏᴡᴇRᴇᴅ ʙʏ ᴛʜᴇ ᴠᴏɪᴅ.
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

ᴠᴏɪᴅ ᴀɪ ɪꜱ ᴀɴ ᴀᴅᴠᴀɴᴄᴇᴅ ᴀɪ ᴘʟᴀᴛꜰᴏRᴍ ᴅᴇꜱɪɢɴᴇᴅ ꜰᴏR ᴘRᴏɢRᴀᴍᴍɪɴɢ, ᴄʏʙᴇRꜱᴇᴄᴜRɪᴛʏ ᴇᴅᴜᴄᴀᴛɪᴏɴ, RᴇꜱᴇᴀRᴄʜ, ᴀɴᴅ ᴀᴜᴛᴏᴍᴀᴛɪᴏɴ.

━━━━━━━━━━━━━━━━━━━━━━
⚠️ ɪᴍᴘᴏRᴛᴀɴᴛ ɴᴏᴛɪᴄᴇ
━━━━━━━━━━━━━━━━━━━━━━

ᴀɴʏ ᴄᴏɴᴛᴇɴᴛ Rᴇʟᴀᴛᴇᴅ ᴛᴏ ᴘʜɪꜱʜɪɴɢ, ꜱᴏᴄɪᴀʟ ᴇɴɢɪɴᴇᴇRɪɴɢ, ᴏR ᴏꜰꜰᴇɴꜱɪᴠᴇ ꜱᴇᴄᴜRɪᴛʏ ɪꜱ ᴘRᴏᴠɪᴅᴇᴅ ꜱᴏʟᴇʟʏ ꜰᴏR ᴇᴅᴜᴄᴀᴛɪᴏɴᴀʟ, RᴇꜱᴇᴀRᴄʜ, ᴀɴᴅ ᴀᴜᴛʜᴏRɪᴢᴇᴅ ᴛᴇꜱᴛɪɴɢ ᴘᴜRᴘᴏꜱᴇꜱ.

━━━━━━━━━━━━━━━━━━━━━━
🚫 ᴘRᴏʜɪʙɪᴛᴇᴅ ᴜꜱᴇ
━━━━━━━━━━━━━━━━━━━━━━

• ᴅᴏ ɴᴏᴛ ᴜꜱᴇ ᴠᴏɪᴅ ᴀɪ ᴛᴏ ᴛᴀRɢᴇᴛ Rᴇᴀʟ ᴘᴇᴏᴘʟᴇ.
• ᴅᴏ ɴᴏᴛ ᴜꜱᴇ ɪᴛ ꜰᴏR ᴜɴᴀᴜᴛʜᴏRɪᴢᴇᴅ ᴀᴄᴄᴇꜱꜱ.
• ᴅᴏ ɴᴏᴛ ᴜꜱᴇ ɪᴛ ꜰᴏR ꜰRᴀᴜᴅ, ᴅᴇᴄᴇᴘᴛɪᴏɴ, ᴏR ʜᴀRᴍ.

━━━━━━━━━━━━━━━━━━━━━━
⚖️ ᴜꜱᴇR Rᴇꜱᴘᴏɴꜱɪʙɪʟɪᴛʏ
━━━━━━━━━━━━━━━━━━━━━━

ʙʏ ᴜꜱɪɴɢ ᴠᴏɪᴅ ᴀɪ, ʏᴏᴜ ᴀᴄᴋɴᴏᴡʟᴇᴅɢᴇ ᴛʜᴀᴛ ʏᴏᴜ ᴀRᴇ ꜱᴏʟᴇʟʏ Rᴇꜱᴘᴏɴꜱɪʙʟᴇ ꜰᴏR ʜᴏᴡ ʏᴏᴜ ᴜꜱᴇ ᴛʜᴇ ᴘʟᴀᴛꜰᴏRᴍ ᴀɴᴅ ᴛʜᴀᴛ ᴀʟʟ ᴀᴄᴛɪᴠɪᴛɪᴇꜱ ᴍᴜꜱᴛ ʙᴇ ʟᴀᴡꜰᴜʟ, ᴇᴛʜɪᴄᴀʟ, ᴀɴᴅ ᴀᴜᴛʜᴏRɪᴢᴇᴅ.

━━━━━━━━━━━━━━━━━━━━━━
📜 ʟɪᴍɪᴛᴀᴛɪᴏɴ ᴏꜰ ʟɪᴀʙɪʟɪᴛʏ
━━━━━━━━━━━━━━━━━━━━━━

ɴᴏᴠᴀ ᴀɪ ɪꜱ ɴᴏᴛ Rᴇꜱᴘᴏɴꜱɪʙʟᴇ ꜰᴏR ᴀɴʏ ᴍɪꜱᴜꜱᴇ ᴏꜰ ᴠᴏɪᴅ ᴀɪ ᴏR ᴀɴʏ ᴄᴏɴꜱᴇQᴜᴇɴᴄᴇꜱ ᴀRɪꜱɪɴɢ ꜰRᴏᴍ ɪʟʟᴇɢᴀʟ ᴏR ᴜɴᴇᴛʜɪᴄᴀʟ ᴜꜱᴇ.`;

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

interface UserAuthState {
  mode: 'LOGIN' | 'REGISTER';
  step: 'AWAITING_EMAIL' | 'AWAITING_PASSWORD';
  email?: string;
  timestamp: number;
}

export class TelegramBotService {
  private token: string;
  private isRunning: boolean = false;
  private lastUpdateId: number = 0;
  private botInfo: TelegramBotInfo | null = null;
  private appUrl: string = process.env.APP_URL || "https://ai.studio";
  private aiGenerator: ((prompt: string, history: { role: string; content: string }[], userId?: string) => Promise<string>) | null = null;
  private userAuthStates: Map<number, UserAuthState> = new Map();
  private acceptedDisclaimers: Map<number, boolean> = new Map();
  private abortController: AbortController | null = null;

  constructor(token?: string) {
    this.token = token || process.env.TELEGRAM_BOT_TOKEN || "8686494399:AAFqXXmzdsMXq4kCTBCjKXD_anJfzdw88SM";
  }

  public setAiGenerator(fn: (prompt: string, history: { role: string; content: string }[], userId?: string) => Promise<string>) {
    this.aiGenerator = fn;
  }

  public getToken(): string {
    return this.token;
  }

  public setToken(newToken: string) {
    this.token = newToken.trim();
    this.lastUpdateId = 0; // CRITICAL: Reset update offset when switching bot tokens
    this.botInfo = null;
  }

  public getBotInfo(): TelegramBotInfo | null {
    return this.botInfo;
  }

  public isConnected(): boolean {
    return this.isRunning && !!this.botInfo;
  }

  public async deleteWebhook(): Promise<boolean> {
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/deleteWebhook?drop_pending_updates=false`);
      const data = await res.json().catch(() => null);
      return !!data?.ok;
    } catch (_) {
      return false;
    }
  }

  public async verifyToken(): Promise<{ valid: boolean; botInfo?: TelegramBotInfo; error?: string }> {
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/getMe`);
      const data = await res.json();
      if (data.ok && data.result) {
        this.botInfo = data.result;
        return { valid: true, botInfo: data.result };
      }
      return { valid: false, error: data.description || "Invalid token or Telegram API error" };
    } catch (err: any) {
      return { valid: false, error: err?.message || "Failed to reach Telegram API" };
    }
  }

  public async start() {
    if (this.isRunning) return;

    // Load persisted token from Firestore if available
    try {
      const teleDoc = await getDoc(doc(db, "settings", "telegram"));
      if (teleDoc.exists() && teleDoc.data()?.token) {
        this.token = teleDoc.data().token.trim();
      }
    } catch (_) {}

    // Clear any previous webhooks that cause 409 conflict
    await this.deleteWebhook();
    
    const check = await this.verifyToken();
    if (!check.valid) {
      console.warn(`[Telegram Bot] Token verification failed: ${check.error}. Bot will retry...`);
    } else {
      console.log(`[Telegram Bot] Connected successfully! Bot username: @${this.botInfo?.username} (${this.botInfo?.first_name})`);
    }

    this.isRunning = true;
    this.pollUpdates();
  }

  public stop() {
    this.isRunning = false;
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch (_) {}
      this.abortController = null;
    }
    console.log("[Telegram Bot] Stopped long polling.");
  }

  private async pollUpdates() {
    while (this.isRunning) {
      try {
        this.abortController = new AbortController();
        const url = `https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=15`;
        const res = await fetch(url, { signal: this.abortController.signal });

        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.result)) {
            for (const update of data.result) {
              this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
              if (update.message) {
                this.handleMessage(update.message).catch(err => {
                  console.error("[Telegram Bot] Error handling message:", err);
                });
              }
              if (update.callback_query) {
                this.handleCallbackQuery(update.callback_query).catch(err => {
                  console.error("[Telegram Bot] Error handling callback query:", err);
                });
              }
            }
          }
        } else if (res.status === 409) {
          console.warn("[Telegram Bot] 409 Conflict received, clearing webhook and retrying in 4s...");
          await this.deleteWebhook();
          await new Promise(r => setTimeout(r, 4000));
        } else if (res.status === 401 || res.status === 404) {
          console.warn(`[Telegram Bot] Invalid token (${res.status}). Waiting before retry...`);
          await new Promise(r => setTimeout(r, 8000));
        }
      } catch (err: any) {
        if (!this.isRunning) break;
        // Suppress expected AbortError / polling network hiccups
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  public async sendTypingAction(chatId: number) {
    try {
      await fetch(`https://api.telegram.org/bot${this.token}/sendChatAction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, action: "typing" })
      });
    } catch (_) {}
  }

  public async deleteMessage(chatId: number, messageId: number) {
    try {
      await fetch(`https://api.telegram.org/bot${this.token}/deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId })
      });
    } catch (_) {}
  }

  public async sendPhoto(chatId: number, photoUrl: string, caption?: string, replyMarkup?: any): Promise<boolean> {
    try {
      const payload: any = {
        chat_id: chatId,
        photo: photoUrl,
        parse_mode: "Markdown"
      };
      if (caption) payload.caption = caption;
      if (replyMarkup) payload.reply_markup = replyMarkup;

      let res = await fetch(`https://api.telegram.org/bot${this.token}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        delete payload.parse_mode;
        res = await fetch(`https://api.telegram.org/bot${this.token}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok && caption) {
        return await this.sendMessage(chatId, caption, replyMarkup);
      }
      return true;
    } catch (err) {
      if (caption) {
        return await this.sendMessage(chatId, caption, replyMarkup);
      }
      return false;
    }
  }

  public async sendMessage(chatId: number, text: string, replyMarkup?: any): Promise<boolean> {
    try {
      const maxLength = 3800;
      const chunks: string[] = [];
      
      let remaining = text;
      while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
          chunks.push(remaining);
          break;
        }
        let splitIndex = remaining.lastIndexOf("\n", maxLength);
        if (splitIndex === -1 || splitIndex < 2000) {
          splitIndex = maxLength;
        }
        chunks.push(remaining.slice(0, splitIndex));
        remaining = remaining.slice(splitIndex).trimStart();
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const isLast = i === chunks.length - 1;
        
        const payload: any = {
          chat_id: chatId,
          text: chunk,
          parse_mode: "Markdown",
        };

        if (isLast && replyMarkup) {
          payload.reply_markup = replyMarkup;
        }

        let res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        // If Markdown parsing fails due to unescaped characters, retry without parse_mode
        if (!res.ok) {
          delete payload.parse_mode;
          res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        }
      }
      return true;
    } catch (err) {
      console.error("[Telegram Bot] Failed to send message:", err);
      return false;
    }
  }

  private async authenticateWithFirebase(email: string, pass: string): Promise<{ success: boolean; uid?: string; emailVerified?: boolean; error?: string }> {
    const apiKey = "AIzaSyBy0g8e-YgsI7fscFQWoRiWbpL7fXO6hho";
    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: pass, returnSecureToken: true })
      });
      const data = await res.json();
      if (res.ok && data.localId) {
        return { success: true, uid: data.localId, emailVerified: data.emailVerified !== false };
      }
      const errMsg = data.error?.message || "INVALID_PASSWORD";
      if (errMsg.includes("INVALID_PASSWORD") || errMsg.includes("INVALID_LOGIN_CREDENTIALS")) {
        return { success: false, error: "Incorrect password or email address." };
      }
      if (errMsg.includes("EMAIL_NOT_FOUND")) {
        return { success: false, error: "No account registered with this email. Send /register to create one." };
      }
      return { success: false, error: errMsg };
    } catch (err: any) {
      return { success: false, error: err?.message || "Authentication network error." };
    }
  }

  private async registerWithFirebase(email: string, pass: string, telegramUserId: number, telegramUsername?: string): Promise<{ success: boolean; uid?: string; error?: string }> {
    const apiKey = "AIzaSyBy0g8e-YgsI7fscFQWoRiWbpL7fXO6hho";
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
        return { success: false, error: "Invalid email address format." };
      }
      if (!pass || pass.length < 6) {
        return { success: false, error: "Password must be at least 6 characters long." };
      }

      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password: pass, returnSecureToken: true })
      });
      const data = await res.json();
      if (res.ok && data.localId) {
        const uid = data.localId;
        const idToken = data.idToken;

        // Send email verification link
        if (idToken) {
          fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestType: "VERIFY_EMAIL", idToken })
          }).catch(() => {});
        }

        // Create user profile in Firestore
        try {
          const now = Date.now();
          const today = new Date().toISOString().split('T')[0];
          await setDoc(doc(db, "users", uid), {
            uid,
            email: trimmedEmail,
            displayName: trimmedEmail.split("@")[0],
            tier: "free",
            messageCount: 0,
            lastMessageDate: today,
            lastResetTime: now,
            isAdmin: false,
            isVerified: false,
            telegramId: telegramUserId,
            telegramUsername: telegramUsername || "",
            createdAt: new Date().toISOString(),
            disclaimerAccepted: true,
            disclaimerAcceptedAt: new Date().toISOString()
          }, { merge: true });
        } catch (dbErr) {
          console.warn("[Telegram Bot] Error saving new user document:", dbErr);
        }

        return { success: true, uid };
      }

      const errMsg = data.error?.message || "REGISTRATION_FAILED";
      if (errMsg.includes("EMAIL_EXISTS")) {
        return { success: false, error: "An account with this email already exists! Send /login to log in." };
      }
      if (errMsg.includes("WEAK_PASSWORD")) {
        return { success: false, error: "Password is too weak. Please use at least 6 characters (letters and numbers)." };
      }
      if (errMsg.includes("INVALID_EMAIL")) {
        return { success: false, error: "Invalid email address format." };
      }
      return { success: false, error: errMsg };
    } catch (err: any) {
      return { success: false, error: err?.message || "Registration network error." };
    }
  }

  private async getLinkedUser(telegramUserId: number): Promise<{ uid: string; email: string; tier: string; name?: string } | null> {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("telegramId", "==", telegramUserId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        return {
          uid: docSnap.id,
          email: data.email || "User",
          tier: (data.tier || "free").toUpperCase(),
          name: data.displayName || data.email?.split("@")[0] || "Member"
        };
      }
    } catch (err) {
      console.error("[Telegram Bot] Error fetching linked user:", err);
    }
    return null;
  }

  public async isDisclaimerAccepted(telegramUserId: number): Promise<boolean> {
    if (this.acceptedDisclaimers.get(telegramUserId)) return true;
    try {
      const docRef = doc(db, "telegramDisclaimers", String(telegramUserId));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data()?.accepted) {
        this.acceptedDisclaimers.set(telegramUserId, true);
        return true;
      }
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("telegramId", "==", telegramUserId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty && snapshot.docs[0].data()?.disclaimerAccepted) {
        this.acceptedDisclaimers.set(telegramUserId, true);
        return true;
      }
    } catch (_) {}
    return false;
  }

  public async answerCallbackQuery(callbackQueryId: string, text?: string) {
    try {
      await fetch(`https://api.telegram.org/bot${this.token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text || "✅ Success!",
          show_alert: true
        })
      });
    } catch (_) {}
  }

  private async handleCallbackQuery(queryData: any) {
    if (!queryData) return;
    const chatId = queryData.message?.chat?.id;
    const telegramUserId = queryData.from?.id;
    const data = queryData.data;

    if (data === "accept_disclaimer") {
      this.acceptedDisclaimers.set(telegramUserId, true);
      try {
        await setDoc(doc(db, "telegramDisclaimers", String(telegramUserId)), {
          telegramId: telegramUserId,
          username: queryData.from?.username || "",
          accepted: true,
          acceptedAt: new Date().toISOString()
        }, { merge: true });

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("telegramId", "==", telegramUserId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          await setDoc(doc(db, "users", snapshot.docs[0].id), {
            disclaimerAccepted: true,
            disclaimerAcceptedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (_) {}

      await this.answerCallbackQuery(queryData.id, "✅ Disclaimer Accepted! Welcome to VOID AI.");

      const confirmMsg = `🎉 *DISCLAIMER ACCEPTED & VERIFIED!*

Welcome to **VOID AI**. You have acknowledged and accepted the official platform terms.

🔐 *Next Step:* Connect your account or create a new one to activate free AI messages:
• Click **Log In** below if you have an existing account
• Click **Create Account** to register instantly!`;

      const replyMarkup = {
        inline_keyboard: [
          [
            { text: "🔑 Log In", callback_data: "start_login" },
            { text: "✨ Create Account / Register", callback_data: "start_register" }
          ],
          [
            { text: "📲 Contact Admin @nova_tech_1", url: "https://t.me/nova_tech_1" }
          ]
        ]
      };

      await this.sendMessage(chatId, confirmMsg, replyMarkup);
    } else if (data === "start_login") {
      await this.answerCallbackQuery(queryData.id);
      this.userAuthStates.set(telegramUserId, { mode: 'LOGIN', step: 'AWAITING_EMAIL', timestamp: Date.now() });
      await this.sendMessage(chatId, `📧 *VOID AI Account Login (Step 1/2)*\n\nPlease send your **registered email address**:`);
    } else if (data === "start_register") {
      await this.answerCallbackQuery(queryData.id);
      this.userAuthStates.set(telegramUserId, { mode: 'REGISTER', step: 'AWAITING_EMAIL', timestamp: Date.now() });
      await this.sendMessage(chatId, `✨ *VOID AI Account Registration (Step 1/2)*\n\nPlease send your **email address** to create your VOID AI account:`);
    }
  }

  private async handleMessage(msg: any) {
    if (!msg.chat || !msg.text) return;
    const chatId = msg.chat.id;
    const telegramUserId = msg.from?.id;
    const senderName = msg.from?.first_name || "User";
    const text = msg.text.trim();

    console.log(`[Telegram Bot] Message from ${senderName} (${chatId}): "${text.slice(0, 50)}"`);

    // Clean up expired auth states (older than 10 mins)
    const now = Date.now();
    const currentState = this.userAuthStates.get(telegramUserId);
    if (currentState && now - currentState.timestamp > 10 * 60 * 1000) {
      this.userAuthStates.delete(telegramUserId);
    }

    const linkedUser = await this.getLinkedUser(telegramUserId);
    const telegramUsername = (msg.from?.username || "").toLowerCase();
    const isAdmin = telegramUsername === "nova_tech_1" || 
                    telegramUsername === "mrnovatech4" || 
                    linkedUser?.tier === "GOD_MODE" || 
                    linkedUser?.email?.toLowerCase() === "mrnovatech4@gmail.com";

    // Command: /disclaimer
    if (text === "/disclaimer") {
      const isAccepted = await this.isDisclaimerAccepted(telegramUserId);
      const logoUrl = `${process.env.APP_URL || "https://ai.studio"}/void-logo.jpg`;
      
      await this.sendPhoto(chatId, logoUrl, `⚡ *VOID AI • OFFICIAL DISCLAIMER*\n\n${isAccepted ? '✅ *Status:* You have accepted this disclaimer.' : '⚠️ *Action Required:* Please read and accept below.'}`);
      
      const replyMarkup = isAccepted ? {
        inline_keyboard: [
          [
            { text: "📲 Contact Admin @nova_tech_1", url: "https://t.me/nova_tech_1" }
          ]
        ]
      } : {
        inline_keyboard: [
          [
            { text: "✅ I ACCEPT & AGREE", callback_data: "accept_disclaimer" }
          ],
          [
            { text: "📲 Contact Admin @nova_tech_1", url: "https://t.me/nova_tech_1" }
          ]
        ]
      };

      await this.sendMessage(chatId, DISCLAIMER_TEXT, replyMarkup);
      return;
    }

    // Command: /start
    if (text === "/start") {
      const isAccepted = await this.isDisclaimerAccepted(telegramUserId);
      const logoUrl = `${process.env.APP_URL || "https://ai.studio"}/void-logo.jpg`;

      let welcomeText = `⚡ *VOID AI Telegram Assistant*

Hello, *${senderName}*! 👋

I am your official **VOID AI Assistant**!`;

      if (linkedUser) {
        welcomeText += `\n\n✅ *Account Status:* Logged In as \`${linkedUser.email}\`
👑 *Tier Plan:* *${linkedUser.tier}*
🔓 *Access:* Full AI Privileges Active (Resets every 2 hours)!

Send any message below to chat with VOID AI directly!`;
      } else {
        welcomeText += `\n\n🔐 *Account Connection Required*
To chat with VOID AI, please log in with your account or create a new account in seconds.

💡 *Quick Commands:*
• Send \`/register\` to create a new account
• Send \`/login\` to log in step-by-step
• Or send \`/login email@example.com password\``;
      }

      welcomeText += `\n\n🌐 *Commands:*
/login - Log in with email & password
/register - Create a new account
/status - View active tier & remaining messages
/topup - Contact @nova_tech_1 to upgrade plan
/disclaimer - View terms & disclaimer
/logout - Log out from Telegram
/help - View user guide`;

      if (isAdmin) {
        welcomeText += `\n\n👑 *Admin Commands:*
/grant <tier> <user_email> - Grant tier (pro, premium, vip)
/revoke <user_email> - Reset user to free tier
/users - View registered users overview`;
      }

      const replyMarkup = !linkedUser ? {
        inline_keyboard: [
          [
            { text: "🔑 Log In", callback_data: "start_login" },
            { text: "✨ Create Account / Register", callback_data: "start_register" }
          ],
          [
            { text: "📲 Contact Admin @nova_tech_1", url: "https://t.me/nova_tech_1" }
          ]
        ]
      } : undefined;

      // Send the official VOID AI Logo image
      await this.sendPhoto(chatId, logoUrl, welcomeText, replyMarkup);

      // Send Disclaimer block if not accepted
      if (!isAccepted) {
        const disclaimerMarkup = {
          inline_keyboard: [
            [
              { text: "✅ I ACCEPT & AGREE", callback_data: "accept_disclaimer" }
            ],
            [
              { text: "📲 Contact Admin @nova_tech_1", url: "https://t.me/nova_tech_1" }
            ]
          ]
        };
        await this.sendMessage(chatId, `⚠️ *BEFORE PROCEEDING:* Please accept the official VOID AI Disclaimer below:\n\n${DISCLAIMER_TEXT}`, disclaimerMarkup);
      }
      return;
    }

    // Enforce Disclaimer Acceptance
    if (!(await this.isDisclaimerAccepted(telegramUserId))) {
      const logoUrl = `${process.env.APP_URL || "https://ai.studio"}/void-logo.jpg`;
      await this.sendPhoto(chatId, logoUrl, `⚠️ *VOID AI Disclaimer Acceptance Required*\n\nHello, *${senderName}*! To use VOID AI, you must first acknowledge and accept our platform terms & disclaimer.`);
      
      const replyMarkup = {
        inline_keyboard: [
          [
            { text: "✅ I ACCEPT & AGREE", callback_data: "accept_disclaimer" }
          ],
          [
            { text: "📲 Contact Admin @nova_tech_1", url: "https://t.me/nova_tech_1" }
          ]
        ]
      };
      await this.sendMessage(chatId, DISCLAIMER_TEXT, replyMarkup);
      return;
    }

    // Command: /help
    if (text === "/help") {
      let helpText = `📚 *VOID AI Telegram Assistant Guide*

• */register:* Create a new account directly from Telegram.
• */login:* Log in using your email & password.
• */status:* View active tier plan & 2-hour limits.
• */topup:* Contact admin @nova_tech_1 to upgrade tier.
• */logout:* Log out your Telegram session.
• */clear:* Clear current chat context.`;

      if (isAdmin) {
        helpText += `\n\n👑 *Admin Grant Commands:*
• \`/grant premium user@example.com\`
• \`/grant vip user@example.com\`
• \`/grant pro user@example.com\`
• \`/revoke user@example.com\``;
      }

      await this.sendMessage(chatId, helpText);
      return;
    }

    // Command: /topup, /buy, /upgrade
    if (text === "/topup" || text === "/buy" || text === "/upgrade") {
      const topupText = `💳 *VOID AI Plan Top-Up & Upgrades*

To top up your limits or upgrade your plan (Pro, Premium, VIP):

📲 **Contact Admin directly on Telegram:**
👉 [@nova_tech_1](https://t.me/nova_tech_1)

Once approved, the admin will grant your upgrade using \`/grant\` and your account will be updated instantly!`;

      const replyMarkup = {
        inline_keyboard: [
          [
            { text: "💬 Message @nova_tech_1 on Telegram", url: "https://t.me/nova_tech_1" }
          ]
        ]
      };
      await this.sendMessage(chatId, topupText, replyMarkup);
      return;
    }

    // Admin Command: /grant <tier> <email>
    if (text.startsWith("/grant")) {
      if (!isAdmin) {
        await this.sendMessage(chatId, `⚠️ *Access Denied:* Only admin (@nova_tech_1) can execute \`/grant\` commands.`);
        return;
      }

      const parts = text.split(" ").filter((p: string) => p.trim().length > 0);
      if (parts.length < 2) {
        await this.sendMessage(chatId, `⚠️ *Usage:* \`/grant <tier> <user_email>\`\nExample: \`/grant premium user@example.com\``);
        return;
      }

      const knownTiers = ["free", "pro", "premium", "vip", "god_mode"];
      let targetEmail = "";
      let targetTier = "vip";

      for (let i = 1; i < parts.length; i++) {
        const arg = parts[i].trim().toLowerCase();
        if (arg.includes("@")) {
          targetEmail = arg;
        } else if (knownTiers.includes(arg)) {
          targetTier = arg;
        }
      }

      if (!targetEmail) {
        await this.sendMessage(chatId, `⚠️ *Missing Email:* Please specify the user's email address.\nExample: \`/grant vip user@example.com\``);
        return;
      }

      await this.sendTypingAction(chatId);

      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", targetEmail));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          await this.sendMessage(chatId, `❌ *User Not Found:* No account registered with email \`${targetEmail}\`. They can create an account using \`/register\`!`);
          return;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        const targetTelegramId = userData.telegramId;

        await setDoc(doc(db, "users", userDoc.id), {
          tier: targetTier,
          isPaid: targetTier !== 'free',
          tierGrantedBy: `@${msg.from?.username || 'nova_tech_1'}`,
          tierGrantedAt: new Date().toISOString()
        }, { merge: true });

        if (targetTelegramId) {
          await this.sendMessage(Number(targetTelegramId), `🎉 *Plan Upgrade Granted!*

Your VOID AI account (\`${targetEmail}\`) has been upgraded to the **${targetTier.toUpperCase()}** plan by **@nova_tech_1**!
✨ All 2-hour limits and tier features are active! Send any prompt to chat.`);
        }

        await this.sendMessage(chatId, `✅ *Grant Successful!*
👤 User: \`${targetEmail}\`
👑 Granted Tier: *${targetTier.toUpperCase()}*`);
      } catch (err: any) {
        await this.sendMessage(chatId, `❌ *Error executing grant:* ${err?.message || "Database error"}`);
      }
      return;
    }

    // Admin Command: /revoke <email>
    if (text.startsWith("/revoke")) {
      if (!isAdmin) {
        await this.sendMessage(chatId, `⚠️ *Access Denied:* Admin command only.`);
        return;
      }

      const parts = text.split(" ").filter((p: string) => p.trim().length > 0);
      const targetEmail = parts[1]?.trim().toLowerCase();

      if (!targetEmail || !targetEmail.includes("@")) {
        await this.sendMessage(chatId, `⚠️ *Usage:* \`/revoke user@example.com\``);
        return;
      }

      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", targetEmail));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          await this.sendMessage(chatId, `❌ *User Not Found:* \`${targetEmail}\``);
          return;
        }

        const userDoc = snapshot.docs[0];
        await setDoc(doc(db, "users", userDoc.id), { tier: "free", isPaid: false }, { merge: true });
        await this.sendMessage(chatId, `✅ Resetted \`${targetEmail}\` back to **FREE** tier.`);
      } catch (err: any) {
        await this.sendMessage(chatId, `❌ Error revoking user: ${err?.message}`);
      }
      return;
    }

    // Admin Command: /users
    if (text === "/users") {
      if (!isAdmin) {
        await this.sendMessage(chatId, `⚠️ *Access Denied:* Admin command only.`);
        return;
      }

      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(query(usersRef));
        let total = snapshot.size;
        let freeCount = 0;
        let proCount = 0;
        let premiumCount = 0;
        let vipCount = 0;

        snapshot.forEach(d => {
          const t = (d.data().tier || "free").toLowerCase();
          if (t === "pro") proCount++;
          else if (t === "premium") premiumCount++;
          else if (t === "vip" || t === "god_mode") vipCount++;
          else freeCount++;
        });

        await this.sendMessage(chatId, `📊 *Registered Users Overview*

👥 **Total Users:** ${total}
• **Free:** ${freeCount}
• **Pro:** ${proCount}
• **Premium:** ${premiumCount}
• **VIP:** ${vipCount}`);
      } catch (err: any) {
        await this.sendMessage(chatId, `❌ Failed to fetch users: ${err?.message}`);
      }
      return;
    }

    // Command: /status or /account or /profile
    if (text === "/status" || text === "/account" || text === "/profile") {
      let statusText = `⚡ *System & AI Engine Status*\n\n🟢 *Telegram Bot:* Active (@${this.botInfo?.username || 'VoidAiBot'})\n🤖 *Engine:* Multi-Provider Rotation Pool (Groq/Cohere/BazaarLink)\n⏳ *Reset Window:* Every 2 hours\n`;

      if (linkedUser) {
        try {
          const uSnap = await getDoc(doc(db, "users", linkedUser.uid));
          const uD = uSnap.data();
          const msgs = uD?.messageCount || 0;
          statusText += `\n👤 *Account Email:* \`${linkedUser.email}\`\n👑 *Plan Tier:* *${linkedUser.tier}*\n📊 *Messages in Window:* ${msgs}\n⚡ *Privileges:* Fully Synced!`;
        } catch (_) {
          statusText += `\n👤 *Account Email:* \`${linkedUser.email}\`\n👑 *Plan Tier:* *${linkedUser.tier}*`;
        }
      } else {
        statusText += `\n⚠️ *Account Status:* Not Connected\nSend \`/register\` to create an account or \`/login\` to log in.`;
      }

      await this.sendMessage(chatId, statusText);
      return;
    }

    // Command: /logout
    if (text === "/logout") {
      if (linkedUser) {
        try {
          await setDoc(doc(db, "users", linkedUser.uid), { telegramId: null, telegramUsername: null }, { merge: true });
        } catch (_) {}
      }
      this.userAuthStates.delete(telegramUserId);
      await this.sendMessage(chatId, "🚪 *Logged Out Successfully.* Send `/login` or `/register` anytime to connect.");
      return;
    }

    // Command: /register or /signup
    if (text === "/register" || text.startsWith("/register ") || text === "/signup" || text.startsWith("/signup ")) {
      const parts = text.split(" ").filter((p: string) => p.trim().length > 0);
      if (parts.length === 1) {
        // Start interactive step-by-step registration
        this.userAuthStates.set(telegramUserId, { mode: 'REGISTER', step: 'AWAITING_EMAIL', timestamp: Date.now() });
        await this.sendMessage(chatId, `✨ *VOID AI Account Registration (Step 1/2)*

Please send the **email address** you want to use for your VOID AI account:`);
        return;
      }

      // One-line registration: /register email password
      const email = parts[1]?.trim().toLowerCase();
      const pass = parts.slice(2).join(" ").trim();

      if (!email || !email.includes("@") || !pass) {
        await this.sendMessage(chatId, `⚠️ *Usage:* Send \`/register your-email@example.com yourpassword\` (min 6 characters)`);
        return;
      }

      await this.sendTypingAction(chatId);
      await this.deleteMessage(chatId, msg.message_id);

      const regRes = await this.registerWithFirebase(email, pass, telegramUserId, msg.from?.username);
      if (regRes.success && regRes.uid) {
        await this.sendMessage(chatId, `🎉 *Account Created Successfully!*

Welcome to **VOID AI**, *${email}*! 🚀
• **Account Email:** \`${email}\`
• **Tier Plan:** *FREE* (10 messages per 2 hours)
• **Telegram Linked:** Yes ✅

A verification link has been sent to your email. You can now send any prompt below to chat with VOID AI directly!`);
      } else {
        await this.sendMessage(chatId, `❌ *Registration Failed:* ${regRes.error || "Could not complete account creation."}\nPlease try again or send \`/register\`.`);
      }
      return;
    }

    // Command: /login
    if (text === "/login" || text.startsWith("/login ")) {
      const parts = text.split(" ").filter((p: string) => p.trim().length > 0);
      if (parts.length === 1) {
        // Start interactive step-by-step login
        this.userAuthStates.set(telegramUserId, { mode: 'LOGIN', step: 'AWAITING_EMAIL', timestamp: Date.now() });
        await this.sendMessage(chatId, `📧 *VOID AI Account Login (Step 1/2)*

Please send your **account email address**:`);
        return;
      }

      // One-line login: /login email password
      const email = parts[1]?.trim().toLowerCase();
      const pass = parts.slice(2).join(" ").trim();

      if (!email || !email.includes("@") || !pass) {
        await this.sendMessage(chatId, `⚠️ *Usage:* Send \`/login your-email@example.com yourpassword\``);
        return;
      }

      await this.sendTypingAction(chatId);
      await this.deleteMessage(chatId, msg.message_id);

      const authRes = await this.authenticateWithFirebase(email, pass);
      if (authRes.success && authRes.uid) {
        await setDoc(doc(db, "users", authRes.uid), {
          telegramId: telegramUserId,
          telegramUsername: msg.from?.username || "",
          email: email
        }, { merge: true });

        const updatedUser = await this.getLinkedUser(telegramUserId);
        await this.sendMessage(chatId, `✅ *Login Successful!*

Welcome back, *${updatedUser?.name || email}*! 🎉
• **Account Email:** \`${email}\`
• **Tier Plan:** *${updatedUser?.tier || 'FREE'}*

All your 2-hour limits and tier settings are active! Send any message below to chat with VOID AI.`);
      } else {
        await this.sendMessage(chatId, `❌ *Login Failed:* ${authRes.error || "Invalid credentials."}\nSend \`/login\` or \`/register\` to try again.`);
      }
      return;
    }

    // Interactive Auth State Machine (Login & Register)
    const activeState = this.userAuthStates.get(telegramUserId);
    if (activeState) {
      if (activeState.step === 'AWAITING_EMAIL') {
        const inputEmail = text.toLowerCase();
        if (!inputEmail.includes("@") || !inputEmail.includes(".")) {
          await this.sendMessage(chatId, `⚠️ *Invalid Email:* Please enter a valid email address (e.g. \`user@example.com\`):`);
          return;
        }

        if (activeState.mode === 'LOGIN') {
          // Verify account exists before asking for password
          try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", inputEmail));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
              await this.sendMessage(chatId, `❌ No account registered with email \`${inputEmail}\`.\nSend \`/register\` to create a new account, or \`/login\` to check for typos.`);
              this.userAuthStates.delete(telegramUserId);
              return;
            }
          } catch (_) {}

          activeState.step = 'AWAITING_PASSWORD';
          activeState.email = inputEmail;
          activeState.timestamp = Date.now();

          await this.sendMessage(chatId, `🔑 *VOID AI Account Login (Step 2/2)*

Email: \`${inputEmail}\`

Now please send your **account password** to authenticate:`);
          return;
        } else if (activeState.mode === 'REGISTER') {
          // Check if email already registered
          try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", inputEmail));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              await this.sendMessage(chatId, `⚠️ An account with \`${inputEmail}\` already exists! Send \`/login\` to log in.`);
              this.userAuthStates.delete(telegramUserId);
              return;
            }
          } catch (_) {}

          activeState.step = 'AWAITING_PASSWORD';
          activeState.email = inputEmail;
          activeState.timestamp = Date.now();

          await this.sendMessage(chatId, `🔐 *VOID AI Account Registration (Step 2/2)*

Email: \`${inputEmail}\`

Now choose and send a **password** (at least 6 characters) to secure your account:`);
          return;
        }
      }

      if (activeState.step === 'AWAITING_PASSWORD') {
        const email = activeState.email!;
        const password = text;

        await this.deleteMessage(chatId, msg.message_id);
        const mode = activeState.mode;
        this.userAuthStates.delete(telegramUserId);
        await this.sendTypingAction(chatId);

        if (mode === 'REGISTER') {
          const regRes = await this.registerWithFirebase(email, password, telegramUserId, msg.from?.username);
          if (regRes.success && regRes.uid) {
            await this.sendMessage(chatId, `🎉 *Account Created Successfully!*

Welcome to **VOID AI**, *${email}*! 🚀
• **Account Email:** \`${email}\`
• **Tier Plan:** *FREE* (10 messages per 2 hours)
• **Telegram Linked:** Yes ✅

Send any question below to chat with VOID AI directly!`);
          } else {
            await this.sendMessage(chatId, `❌ *Registration Failed:* ${regRes.error || "Could not complete account creation."}\nSend \`/register\` to try again.`);
          }
          return;
        } else {
          const authRes = await this.authenticateWithFirebase(email, password);
          if (authRes.success && authRes.uid) {
            await setDoc(doc(db, "users", authRes.uid), {
              telegramId: telegramUserId,
              telegramUsername: msg.from?.username || "",
              email: email
            }, { merge: true });

            const updatedUser = await this.getLinkedUser(telegramUserId);
            await this.sendMessage(chatId, `✅ *Login Successful!*

Welcome back, *${updatedUser?.name || email}*! 🎉
• **Account Email:** \`${email}\`
• **Tier Plan:** *${updatedUser?.tier || 'FREE'}*

All your 2-hour limits and features are active! Send any prompt to chat.`);
          } else {
            await this.sendMessage(chatId, `❌ *Login Failed:* ${authRes.error || "Invalid password."}\nSend \`/login\` to try again.`);
          }
          return;
        }
      }
    }

    // Check if user is linked for standard AI chat
    if (!linkedUser) {
      const replyMarkup = {
        inline_keyboard: [
          [
            { text: "🔑 Log In", callback_data: "start_login" },
            { text: "✨ Create Account / Register", callback_data: "start_register" }
          ],
          [
            { text: "📲 Contact Admin @nova_tech_1", url: "https://t.me/nova_tech_1" }
          ]
        ]
      };

      await this.sendMessage(chatId, `🔐 *Account Connection Required*

To chat with **VOID AI** on Telegram with full 2-hour reset limits, please log in with your existing account or create a new account in seconds!

💡 *Quick Commands:*
• Send \`/register\` to create a new account
• Send \`/login\` to log in`, replyMarkup);
      return;
    }

    if (text === "/clear") {
      await this.sendMessage(chatId, "🧹 *Conversation Memory Cleared!* Starting fresh chat context.");
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // Standard Chat Message -> AI Generation for Linked User
    // ─────────────────────────────────────────────────────────────

    if (!this.aiGenerator) {
      await this.sendMessage(chatId, "⚡ AI generator engine is initializing. Please send your query again in a moment.");
      return;
    }

    // 1. Check 2-Hour Limit Before Running AI
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    let userTier = linkedUser.tier.toLowerCase();
    let messageCount = 0;
    let lastResetTime = 0;
    let freeLimit = 10;
    let proLimit = 20;
    let premiumLimit = 50;
    let vipLimit = 99999;

    try {
      const [uSnap, bSnap] = await Promise.all([
        getDoc(doc(db, "users", linkedUser.uid)),
        getDoc(doc(db, "settings", "brain"))
      ]);
      if (uSnap.exists()) {
        const uD = uSnap.data();
        userTier = (uD.tier || userTier).toLowerCase();
        messageCount = uD.messageCount || 0;
        lastResetTime = uD.lastResetTime || 0;
      }
      if (bSnap.exists()) {
        const bD = bSnap.data();
        if (typeof bD.freeLimit === 'number') freeLimit = bD.freeLimit;
        if (typeof bD.proLimit === 'number') proLimit = bD.proLimit;
        if (typeof bD.premiumLimit === 'number') premiumLimit = bD.premiumLimit;
      }
    } catch (err) {
      console.warn("[Telegram Bot] Could not load user limit from Firestore:", err);
    }

    const limitForTier = userTier === 'vip' || userTier === 'god_mode' ? vipLimit
      : userTier === 'premium' ? premiumLimit
      : userTier === 'pro' ? proLimit
      : freeLimit;

    const isWithin2Hours = lastResetTime > 0 && (now - lastResetTime < TWO_HOURS_MS);
    const currentCount = isWithin2Hours ? messageCount : 0;

    if (userTier !== 'vip' && userTier !== 'god_mode' && currentCount >= limitForTier) {
      const msRemaining = Math.max(0, TWO_HOURS_MS - (now - lastResetTime));
      const minsRemaining = Math.ceil(msRemaining / 60000);
      const hours = Math.floor(minsRemaining / 60);
      const mins = minsRemaining % 60;
      const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      await this.sendMessage(chatId, `⚠️ *2-Hour Message Limit Reached!*

You have used your limit of **${limitForTier} messages per 2 hours** on the **${userTier.toUpperCase()}** plan.
⏳ Resets in: **${timeStr}**

💡 Upgrade to PRO, PREMIUM, or VIP for higher limits! Contact @nova_tech_1 on Telegram.`);
      return;
    }

    // 2. Keep typing action active every 4 seconds so Telegram doesn't stop typing
    await this.sendTypingAction(chatId);
    const typingInterval = setInterval(() => {
      this.sendTypingAction(chatId).catch(() => {});
    }, 4000);

    try {
      const aiReply = await this.aiGenerator(text, [], linkedUser.uid);
      clearInterval(typingInterval);

      // Only increment user message count if generation succeeded!
      if (aiReply && !aiReply.startsWith("⚡ **VOID AI Notice:** AI engine is currently processing high demand")) {
        try {
          const today = new Date().toISOString().split('T')[0];
          let newCount = currentCount + 1;
          let newResetTime = isWithin2Hours ? lastResetTime : now;
          await setDoc(doc(db, "users", linkedUser.uid), {
            messageCount: newCount,
            lastResetTime: newResetTime,
            lastMessageDate: today
          }, { merge: true });
        } catch (_) {}
      }

      await this.sendMessage(chatId, aiReply);
    } catch (err: any) {
      clearInterval(typingInterval);
      console.error("[Telegram Bot] AI Generation error:", err);
      await this.sendMessage(chatId, "⚡ *Notice:* System busy or temporary AI limit reached. Your message credit was NOT deducted. Please send your query again in a moment.");
    } finally {
      clearInterval(typingInterval);
    }
  }
}

export const telegramBot = new TelegramBotService();
