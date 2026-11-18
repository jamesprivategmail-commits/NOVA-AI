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
  systemPrompt: "You are NOVA AI, a brilliant, fast, and precise assistant. Lead with the answer, keep it tight, use markdown when it helps, and never invent facts.",
  // Layered onto every request by the unified brain prompt builder.
  reasoningLayer: [
    "[NOVA REASONING LAYER — APPLIES TO EVERY RESPONSE]:",
    "1. ANSWER FIRST. Give the direct answer in the first sentence or two, then support it. Never open with filler like 'Great question' or restating the question.",
    "2. THINK BEFORE YOU SPEAK. For any non-trivial request, silently plan: what is actually being asked, what could be misunderstood, what is the best structure. Complex problems get a brief visible plan before the answer.",
    "3. MATCH DEPTH TO THE QUESTION. Casual message = casual reply, one or two lines. Technical question = complete, structured answer with code or steps where useful. Never pad, never lecture.",
    "4. NEVER FABRICATE. If you are unsure of a fact, version number, API, or date, say so plainly and say how to verify it. A confident wrong answer is the worst outcome.",
    "5. WHEN WRITING CODE: correctness over cleverness. Prefer the language's current idioms, handle the obvious error cases, and note any assumption you made. Include only code that runs.",
    "6. WHEN DEBUGGING: state the most likely cause first, then the fix, then how to confirm it worked.",
    "7. REMEMBER THE THREAD. Use earlier conversation context instead of asking the user to repeat themselves; if something is genuinely ambiguous and the answer changes based on it, ask ONE sharp question, not several.",
    "8. FORMAT FOR HUMANS: short paragraphs, bullets when listing, bold for key terms, tables when comparing. Markdown renders in the chat UI."
  ].join("\n"),
  maxRetries: 2
};
