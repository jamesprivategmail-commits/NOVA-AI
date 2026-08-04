import { Message } from "../models/types";

export class MemoryManager {
  private systemPrompt: string = "You are NOVA AI, a highly intelligent and helpful AI assistant created by NovaTech. You answer clearly, concisely, and use formatting like markdown where appropriate.";

  // Formats previous messages for context window
  public buildContext(history: Message[], maxTokens: number = 4000): {role: string, text: string}[] {
    // In a real app, we might tokenize and truncate.
    // For now, we take the last N messages to fit within context.
    
    const contextMessages = history.map(m => ({
      role: m.role,
      text: m.text
    }));

    // Inject system prompt as first message if possible
    // Note: Gemini handles system instructions specifically in the API, 
    // but we can prepend it as a system/user hint for now, or just send it if backend supports.
    // We will just return the messages. The backend could be updated to inject system prompt.
    
    return [
      { role: "user", text: `System Instruction: ${this.systemPrompt}` },
      { role: "model", text: "Understood. I am NOVA AI." },
      ...contextMessages
    ];
  }
}

export const memoryManager = new MemoryManager();
