import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
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

interface UserLoginState {
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
  private userLoginStates: Map<number, UserLoginState> = new Map();
  private acceptedDisclaimers: Map<number, boolean> = new Map();

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
  }

  public getBotInfo(): TelegramBotInfo | null {
    return this.botInfo;
  }

  public isConnected(): boolean {
    return this.isRunning && !!this.botInfo;
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
    console.log("[Telegram Bot] Stopped long polling.");
  }

  private async pollUpdates() {
    while (this.isRunning) {
      try {
        const url = `https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=15`;
        const res = await fetch(url);
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
        }
      } catch (err: any) {
        // Suppress network logs on standard polling timeouts
        await new Promise(r => setTimeout(r, 5000));
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
      // Split text into chunks if it exceeds Telegram's 4000 character limit
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

        // If Markdown parsing fails due to unescaped special symbols, retry without parse_mode
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
        return { success: false, error: "No account registered with this email on the website." };
      }
      return { success: false, error: errMsg };
    } catch (err: any) {
      return { success: false, error: err?.message || "Authentication network error." };
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

Welcome to **VOID AI**. You have acknowledged and accepted the official platform disclaimer.

🔐 *Next Step:* Log in with your website account to activate all features and tier privileges:
• Send \`/login\` to log in step-by-step
• Or send \`/login email@example.com password\` to log in instantly!`;

      const replyMarkup = {
        inline_keyboard: [
          [
            { text: "🔑 Login Now", callback_data: "start_login" },
            { text: "📲 Contact Admin @nova_tech_1", url: "https://t.me/nova_tech_1" }
          ]
        ]
      };

      await this.sendMessage(chatId, confirmMsg, replyMarkup);
    } else if (data === "start_login") {
      await this.answerCallbackQuery(queryData.id);
      this.userLoginStates.set(telegramUserId, { step: 'AWAITING_EMAIL', timestamp: Date.now() });
      await this.sendMessage(chatId, `📧 *VOID AI Website Login (Step 1/2)*\n\nPlease send your **website registered email address**:`);
    }
  }

  private async handleMessage(msg: any) {
    if (!msg.chat || !msg.text) return;
    const chatId = msg.chat.id;
    const telegramUserId = msg.from?.id;
    const senderName = msg.from?.first_name || "User";
    const text = msg.text.trim();

    console.log(`[Telegram Bot] Message from ${senderName} (${chatId}): "${text.slice(0, 50)}"`);

    // Clean up expired login states (older than 10 mins)
    const now = Date.now();
    const currentState = this.userLoginStates.get(telegramUserId);
    if (currentState && now - currentState.timestamp > 10 * 60 * 1000) {
      this.userLoginStates.delete(telegramUserId);
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

I am your official **VOID AI Assistant** connected directly to the website platform!`;

      if (linkedUser) {
        welcomeText += `\n\n✅ *Account Status:* Logged In as \`${linkedUser.email}\`
👑 *Tier Plan:* *${linkedUser.tier}*
🔓 *Access:* Full Website Privileges Active!

Send any message below to chat with VOID AI directly in Telegram!`;
      } else {
        welcomeText += `\n\n🔐 *Authentication Required*
To access VOID AI with all your website features, tier privileges, and saved chat history, please log in with your website email & password.

💡 *How to Log In:*
• Send \`/login\` to log in step-by-step
• Or send \`/login email@example.com password\``;
      }

      welcomeText += `\n\n🌐 *Commands:*
/login - Log in with website account
/status - View system status & active tier
/topup - Contact @nova_tech_1 to top up or upgrade plan
/disclaimer - View platform terms & disclaimer
/logout - Log out from Telegram
/help - View user guide`;

      if (isAdmin) {
        welcomeText += `\n\n👑 *Admin Commands:*
/grant <tier> <user_email> - Grant tier (pro, premium, vip)
/revoke <user_email> - Reset user to free tier
/users - View registered users overview`;
      }

      // Send the official VOID AI Logo image
      await this.sendPhoto(chatId, logoUrl, welcomeText);

      // Send Disclaimer block
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

    // Enforce Disclaimer Acceptance for all other commands & messages
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

• */login:* Log in using your website account email & password.
• */topup:* Contact admin @nova_tech_1 to top up tokens or upgrade tier.
• */logout:* Log out your Telegram session.
• */status:* View active AI engine & tier plan privileges.
• */clear:* Clear current chat context.`;

      if (isAdmin) {
        helpText += `\n\n👑 *Admin Grant Commands:*
• \`/grant premium user@example.com\`
• \`/grant vip user@example.com\`
• \`/grant pro user@example.com\`
• \`/revoke user@example.com\``;
      }

      helpText += `\n\nNeed top-up or custom plan support? Message **@nova_tech_1** on Telegram!`;
      await this.sendMessage(chatId, helpText);
      return;
    }

    // Command: /topup, /buy, /upgrade
    if (text === "/topup" || text === "/buy" || text === "/upgrade") {
      const topupText = `💳 *VOID AI Plan Top-Up & Upgrades*

To top up your account limits, purchase additional AI tokens, or upgrade your plan (Pro, Premium, VIP):

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

    // Admin Command: /grant <tier> <email> or /grant <email> <tier>
    if (text.startsWith("/grant")) {
      if (!isAdmin) {
        await this.sendMessage(chatId, `⚠️ *Access Denied:* Only admin (@nova_tech_1) can execute \`/grant\` commands.`);
        return;
      }

      const parts = text.split(" ").filter((p: string) => p.trim().length > 0);
      if (parts.length < 2) {
        await this.sendMessage(chatId, `⚠️ *Usage:* \`/grant <tier> <user_email>\`
Example: \`/grant premium user@example.com\`
Example: \`/grant vip user@example.com\`
Available Tiers: \`pro\`, \`premium\`, \`vip\`, \`god_mode\`, \`free\``);
        return;
      }

      const knownTiers = ["free", "pro", "premium", "vip", "god_mode"];
      let targetEmail = "";
      let targetTier = "vip"; // default if tier not specified

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
          await this.sendMessage(chatId, `❌ *User Not Found:* No account registered with email \`${targetEmail}\` in Firestore database. Make sure they registered on the website first!`);
          return;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        const targetTelegramId = userData.telegramId;

        // Update Tier in Firestore
        await setDoc(doc(db, "users", userDoc.id), {
          tier: targetTier,
          isPaid: targetTier !== 'free',
          tierGrantedBy: `@${msg.from?.username || 'nova_tech_1'}`,
          tierGrantedAt: new Date().toISOString()
        }, { merge: true });

        // If target user is on Telegram, send direct notification
        let userNotified = false;
        if (targetTelegramId) {
          userNotified = await this.sendMessage(Number(targetTelegramId), `🎉 *Plan Upgrade Granted!*

Your VOID AI account (\`${targetEmail}\`) has been upgraded to the **${targetTier.toUpperCase()}** plan by **@nova_tech_1**!

✨ All limits, high-speed AI generation, and tier features are active! Send any prompt below to chat with VOID AI.`);
        }

        // Confirmation to Admin
        await this.sendMessage(chatId, `✅ *Grant Successful!*

👤 **User Email:** \`${targetEmail}\`
👑 **Granted Tier:** *${targetTier.toUpperCase()}*
📲 **Telegram Notification Sent:** ${userNotified ? 'Yes 📲' : 'No (User not connected on Telegram yet) 🌐'}

The user's website and Telegram limits are now updated!`);
      } catch (err: any) {
        await this.sendMessage(chatId, `❌ *Error executing grant:* ${err?.message || "Database error"}`);
      }
      return;
    }

    // Admin Command: /revoke <email>
    if (text.startsWith("/revoke")) {
      if (!isAdmin) {
        await this.sendMessage(chatId, `⚠️ *Access Denied:* Only admin (@nova_tech_1) can execute \`/revoke\` commands.`);
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
• **VIP:** ${vipCount}

💡 Use \`/grant <tier> <email>\` to upgrade any user account!`);
      } catch (err: any) {
        await this.sendMessage(chatId, `❌ Failed to fetch users: ${err?.message}`);
      }
      return;
    }

    // Command: /status or /account or /profile
    if (text === "/status" || text === "/account" || text === "/profile") {
      let statusText = `⚡ *System & AI Engine Status*\n\n🟢 *Telegram Bot:* Active (@${this.botInfo?.username || 'VoidAiBot'})\n🤖 *Primary AI:* Groq LLaMA 3.1 & Cohere Failover Pool\n🔒 *Security:* Server-Side Encrypted Routing\n`;

      if (linkedUser) {
        statusText += `\n👤 *Account Email:* \`${linkedUser.email}\`\n👑 *Website Tier:* *${linkedUser.tier}*\n⚡ *Privileges:* Fully Active & Synced!`;
      } else {
        statusText += `\n⚠️ *Account Status:* Not Logged In\nSend \`/login\` to log in with your website account.`;
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
      this.userLoginStates.delete(telegramUserId);
      await this.sendMessage(chatId, "🚪 *Logged Out Successfully.* Send `/login` anytime to log back in.");
      return;
    }

    // Command: /login
    if (text === "/login" || text.startsWith("/login ")) {
      const parts = text.split(" ");
      if (parts.length === 1) {
        // Start interactive step-by-step login
        this.userLoginStates.set(telegramUserId, { step: 'AWAITING_EMAIL', timestamp: Date.now() });
        await this.sendMessage(chatId, `📧 *VOID AI Website Login (Step 1/2)*

Please send your **website registered email address**:`);
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
      // Attempt to delete password message for privacy
      await this.deleteMessage(chatId, msg.message_id);

      const authRes = await this.authenticateWithFirebase(email, pass);
      if (authRes.success && authRes.uid) {
        // Link in Firestore
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

All your website features, tier limits, and settings are now active on Telegram! Ask any question below to generate content.`);
      } else {
        await this.sendMessage(chatId, `❌ *Login Failed:* ${authRes.error || "Invalid credentials."} Please try again.`);
      }
      return;
    }

    // Step-by-Step Login State Machine
    const activeState = this.userLoginStates.get(telegramUserId);
    if (activeState) {
      if (activeState.step === 'AWAITING_EMAIL') {
        const inputEmail = text.toLowerCase();
        if (!inputEmail.includes("@")) {
          await this.sendMessage(chatId, `⚠️ *Invalid Email:* Please enter a valid email address (e.g., \`user@example.com\`):`);
          return;
        }

        // Check if user account exists
        try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", inputEmail));
          const snapshot = await getDocs(q);
          if (snapshot.empty) {
            await this.sendMessage(chatId, `❌ No account registered with email \`${inputEmail}\`. Please register on the website first, or check for typos. Send \`/login\` to retry.`);
            this.userLoginStates.delete(telegramUserId);
            return;
          }
        } catch (_) {}

        // Move to Step 2
        this.userLoginStates.set(telegramUserId, {
          step: 'AWAITING_PASSWORD',
          email: inputEmail,
          timestamp: Date.now()
        });

        await this.sendMessage(chatId, `🔑 *VOID AI Website Login (Step 2/2)*

Email: \`${inputEmail}\`

Now please send your **website account password** to authenticate:`);
        return;
      }

      if (activeState.step === 'AWAITING_PASSWORD') {
        const email = activeState.email!;
        const password = text;

        // Delete user's password message for privacy
        await this.deleteMessage(chatId, msg.message_id);
        this.userLoginStates.delete(telegramUserId);

        await this.sendTypingAction(chatId);
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

All your website features, tier limits, and settings are active! Send any message below to chat with VOID AI.`);
        } else {
          await this.sendMessage(chatId, `❌ *Login Failed:* ${authRes.error || "Invalid password."}\nSend \`/login\` to try again.`);
        }
        return;
      }
    }

    // Check if user is logged in for standard AI chat
    if (!linkedUser) {
      await this.sendMessage(chatId, `🔐 *Website Login Required*

To chat with **VOID AI** on Telegram with all your website features, saved history, and tier privileges, please log in with your website account.

💡 *How to Log In:*
• Send \`/login\` to log in step-by-step
• Or send \`/login email@example.com password\``);
      return;
    }

    if (text === "/clear") {
      await this.sendMessage(chatId, "🧹 *Conversation Memory Cleared!* Starting fresh chat context.");
      return;
    }

    // Standard Chat Message -> AI Generation for Logged In User
    await this.sendTypingAction(chatId);

    if (!this.aiGenerator) {
      await this.sendMessage(chatId, "⚡ AI generator engine is loading. Please try again in a moment.");
      return;
    }

    try {
      const aiReply = await this.aiGenerator(text, [], linkedUser.uid);
      await this.sendMessage(chatId, aiReply);
    } catch (err: any) {
      console.error("[Telegram Bot] AI Generation error:", err);
      await this.sendMessage(chatId, "⚡ *Notice:* System busy or temporary AI limit reached. Please send your query again in a few seconds.");
    }
  }
}

export const telegramBot = new TelegramBotService();

