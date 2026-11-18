import { Message } from "../models/types";

export class MemoryManager {
  private systemPrompt: string = "You are NOVA AI, a brilliant, fast, and precise AI assistant. Lead with the answer, keep it tight, use markdown where it helps, and never invent facts.";

  // Builds the context window: system prompt first, then the most recent
  // messages, oldest first, trimmed to a rough token budget.
  public buildContext(history: Message[], maxTokens: number = 4000): {role: string, text: string}[] {
    const CHARS_PER_TOKEN = 4;
    const budgetChars = Math.max(1000, maxTokens * CHARS_PER_TOKEN);

    // Walk backwards so the newest messages always win the budget.
    const kept: Message[] = [];
    let used = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const m = history[i];
      const cost = (m.text || '').length + 8;
      if (used + cost > budgetChars && kept.length >= 6) break;
      used += cost;
      kept.unshift(m);
    }

    return [
      { role: 'system', text: this.systemPrompt },
      ...kept.map(m => ({ role: m.role, text: m.text }))
    ];
  }

  public setSystemPrompt(prompt: string) {
    if (prompt && prompt.trim()) this.systemPrompt = prompt.trim();
  }
}

export const memoryManager = new MemoryManager();
