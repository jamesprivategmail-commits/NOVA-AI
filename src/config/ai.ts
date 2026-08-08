export const AI_CONFIG = {
  providers: {
    groq: {
      models: [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
        "llama3-70b-8192",
        "llama3-8b-8192"
      ]
    },
    cohere: {
      models: [
        "command-r-08-2024",
        "command-r-plus-08-2024",
        "command-r",
        "command-r7b-12-2024",
        "command-light"
      ]
    },
    bazaarlink: {
      baseUrl: process.env.BAZAARLINK_BASE_URL || "https://api.bazaarlink.com/v1",
      models: [
        "bazaarlink-fast",
        "bazaarlink-pro",
        "llama-3.3-70b",
        "deepseek-r1"
      ]
    }
  },
  systemPrompt: "You are VOID AI, an elite AI assistant.",
  maxRetries: 2
};
