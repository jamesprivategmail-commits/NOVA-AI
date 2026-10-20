export const AI_CONFIG = {
  providers: {
    groq: {
      models: [
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "meta-llama/llama-3.3-70b-instruct",
        "qwen-2.5-32b",
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
        "gemini-2.0-flash",
        "gemini-1.5-flash"
      ]
    }
  },
  systemPrompt: "You are VOID AI, an elite AI assistant.",
  maxRetries: 2
};
