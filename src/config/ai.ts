export const AI_CONFIG = {
  providers: {
    groq: {
      models: [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "deepseek-r1-distill-llama-70b"
      ]
    },
    cohere: {
      models: [
        "command-r-plus",
        "command-r",
        "command-light"
      ]
    }
  },
  systemPrompt: "You are VOID AI, an elite AI assistant.",
  maxRetries: 2
};
