export const AI_CONFIG = {
  providers: {
    groq: {
      models: [
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "allam-2-7b"
      ]
    },
    cohere: {
      models: [
        "command-r-08-2024",
        "command-r-plus-08-2024",
        "command-r7b-12-2024"
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
    },
    gemini: {
      models: [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.5-flash-lite"
      ]
    }
  },
  systemPrompt: "You are VOID AI, an elite AI assistant.",
  maxRetries: 2
};
