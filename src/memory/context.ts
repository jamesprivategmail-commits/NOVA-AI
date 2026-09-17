import { Message } from "../models/types";

export class MemoryManager {
  // No hardcoded brain prompt — the AI Brain is controlled entirely from the
  // Admin "AI Brain Rules & Prompts" panel (Firestore settings/brain). This
  // manager now only formats the conversation history with no injected persona.
  public buildContext(history: Message[], maxTokens: number = 4000): {role: string, text: string}[] {
    return history.map(m => ({
      role: m.role,
      text: m.text
    }));
  }
}

export const memoryManager = new MemoryManager();
