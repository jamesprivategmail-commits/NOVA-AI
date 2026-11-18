import { Message } from "../models/types";

/**
 * Conversation continuity engine.
 *
 * Goal: Nova never "forgets" what the conversation is about and never starts
 * a fresh conversation mid-task. We carry the FULL conversation history to the
 * model and only compress the oldest tail when the request would blow past a
 * budget, always preserving a summary of what was accomplished so the model
 * can pick up exactly where it left off.
 */

export class MemoryManager {
  private systemPrompt: string =
    "You are NOVA AI, a highly intelligent and helpful AI assistant created by NovaTech. " +
    "You answer clearly, concisely, and use formatting like markdown where appropriate.";

  /** Rough char budget for the conversation payload sent with each request. */
  private maxChars = 48000;

  /**
   * Builds the conversation payload for the AI.
   * - Returns the FULL history whenever it fits (no information loss).
   * - If it doesn't fit, keeps the most recent messages intact and compresses
   *   the oldest ones into a single "conversation so far" summary message,
   *   preserving task state, decisions and unfinished work.
   */
  public buildContext(
    history: Message[],
    maxChars: number = this.maxChars
  ): { role: string; text: string }[] {
    const mapped = history.map((m) => ({
      role: m.role,
      text: m.text || (m as any).content || "",
    }));

    const total = mapped.reduce((sum, m) => sum + m.text.length, 0);
    if (total <= maxChars) {
      return mapped;
    }

    // Walk from the newest message backwards, keeping as many recent messages
    // as fit. Whatever doesn't fit becomes one summary message at the top.
    let budget = maxChars;
    let keepFrom = mapped.length;
    for (let i = mapped.length - 1; i >= 0; i--) {
      if (budget - mapped[i].text.length < 0) break;
      budget -= mapped[i].text.length;
      keepFrom = i;
    }

    const older = mapped.slice(0, keepFrom);
    const recent = mapped.slice(keepFrom);

    if (older.length === 0) return recent;

    return [
      {
        role: "system",
        text:
          "[Conversation so far — compressed summary of earlier messages. " +
          "You MUST treat everything here as established context and continue seamlessly.]\n" +
          summarize(older),
      },
      ...recent,
    ];
  }
}

/** Extracts task-relevant lines from older messages into a compact summary. */
function summarize(messages: { role: string; text: string }[]): string {
  const lines: string[] = [];
  for (const m of messages) {
    const text = m.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    // Keep the first sentence-ish chunk of each message: enough to retain
    // topic, decisions and unfinished tasks without drowning the context.
    const snippet = text.length > 220 ? text.slice(0, 220) + "…" : text;
    lines.push(`${m.role === "user" ? "User" : "Nova"}: ${snippet}`);
  }
  return lines.join("\n");
}

export const memoryManager = new MemoryManager();
