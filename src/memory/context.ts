import { Message } from "../models/types";

/**
 * Conversation continuity engine.
 *
 * Goal: Models never "forget" what the conversation is about and never start
 * a fresh conversation mid-task. We carry the FULL conversation history to the
 * model and only compress the oldest tail when the request would exceed budget,
 * surfacing earlierSummary + activeTaskHint cleanly for the system prompt
 * instead of injecting awkward mid-array system roles.
 */

export interface BuiltContextResult {
  messages: { role: string; text: string }[];
  earlierSummary?: string;
  activeTaskHint?: string;
}

export class MemoryManager {
  /** Generous char budget for the conversation payload sent with each request. */
  private maxChars = 72000;

  /**
   * Builds the conversation payload plus extracted earlier summary & active task hint.
   */
  public buildContextWithSummary(
    history: Message[],
    maxChars: number = this.maxChars
  ): BuiltContextResult {
    const mapped = history
      .map((m) => ({
        role: m.role,
        text: m.text || (m as any).content || "",
      }))
      .filter((m) => m.text.trim().length > 0);

    const activeTaskHint = extractActiveTaskHint(mapped);
    const total = mapped.reduce((sum, m) => sum + m.text.length, 0);

    if (total <= maxChars) {
      return {
        messages: mapped,
        activeTaskHint,
      };
    }

    // Walk from the newest message backwards, keeping as many recent turns as fit.
    let budget = maxChars;
    let keepFrom = mapped.length;
    for (let i = mapped.length - 1; i >= 0; i--) {
      if (budget - mapped[i].text.length < 0 && keepFrom < mapped.length) break;
      budget -= mapped[i].text.length;
      keepFrom = i;
    }

    const older = mapped.slice(0, keepFrom);
    const recent = mapped.slice(keepFrom);

    if (older.length === 0) {
      return {
        messages: recent,
        activeTaskHint,
      };
    }

    return {
      messages: recent,
      earlierSummary: summarize(older),
      activeTaskHint,
    };
  }

  /**
   * Legacy-compatible helper returning a message array.
   */
  public buildContext(
    history: Message[],
    maxChars: number = this.maxChars
  ): { role: string; text: string }[] {
    const { messages, earlierSummary } = this.buildContextWithSummary(history, maxChars);
    if (!earlierSummary) return messages;
    return [
      {
        role: "user",
        text:
          "[Earlier Conversation Context — treat everything below as already established and continue seamlessly]\n" +
          earlierSummary,
      },
      ...messages,
    ];
  }
}

/** Extracts task-relevant lines from older messages into a compact summary. */
function summarize(messages: { role: string; text: string }[]): string {
  const lines: string[] = [];
  for (const m of messages) {
    const text = m.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const snippet = text.length > 260 ? text.slice(0, 260) + "…" : text;
    lines.push(`${m.role === "user" ? "User" : "Assistant"}: ${snippet}`);
  }
  return lines.slice(-24).join("\n");
}

/** Captures the ongoing goal from the most recent substantive user turns. */
function extractActiveTaskHint(messages: { role: string; text: string }[]): string | undefined {
  const userMsgs = messages.filter((m) => m.role === "user");
  if (userMsgs.length <= 1) return undefined;
  const recentSubstantive = [...userMsgs]
    .reverse()
    .find((m) => m.text.trim().length > 28 && !/^(continue|go on|keep going|yes|ok|okay|do it|next)\b/i.test(m.text.trim()));
  if (!recentSubstantive) return undefined;
  const compact = recentSubstantive.text.replace(/\s+/g, " ").trim();
  return compact.length > 360 ? compact.slice(0, 360) + "…" : compact;
}

export const memoryManager = new MemoryManager();
