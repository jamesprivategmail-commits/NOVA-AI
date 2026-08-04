export const AI_CONFIG = {
  providers: {
    groq: {
      models: [
        "llama-3.1-8b-instant", // Default
        "llama3-70b-8192",      // Fallback 1
        "mixtral-8x7b-32768"    // Fallback 2
      ]
    },
    cohere: {
      models: [
        "command-r",
        "command-r-plus",
        "command-light"
      ]
    },
    gemini: {
      models: [
        "gemini-2.5-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash"
      ]
    }
  },
  systemPrompt: "You are NOVA AI, a helpful and highly capable AI assistant.",
  maxRetries: 2
};
