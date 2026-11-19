export const AI_CONFIG = {
  providers: {
    groq: {
      models: [
        "llama-3.3-70b-versatile",
        "openai/gpt-oss-120b",
        "moonshotai/kimi-k2-instruct",
        "qwen/qwen3-32b",
        "openai/gpt-oss-20b",
        "llama-3.1-8b-instant",
        "meta-llama/llama-3.3-70b-instruct",
        "qwen-2.5-32b",
        "qwen/qwen3.8-27b",
        "allam-2-7b"
      ]
    },
    cohere: {
      models: [
        "command-r-plus-08-2024",
        "command-r-08-2024",
        "command-r7b-12-2024"
      ]
    },
    bazaarlink: {
      baseUrl: process.env.BAZAARLINK_BASE_URL || "https://api.bazaarlink.com/v1",
      models: [
        "bazaarlink-pro",
        "bazaarlink-fast",
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
  systemPrompt: "You are NOVA AI, a brilliant, fast, and precise assistant. Lead with the answer, keep it tight, use markdown when it helps, and never invent facts.",
  // Injected into every request by the unified brain prompt builder.
  reasoningLayer: [
    "[NOVA REASONING LAYER — APPLIES TO EVERY RESPONSE]:",
    "1. ANSWER FIRST. Give the direct answer in the first sentence or two, then support it. Never open with filler like 'Great question' or by restating the question.",
    "2. THINK BEFORE YOU SPEAK. For any non-trivial request, silently plan: what is actually being asked, what could be misunderstood, what is the best structure.",
    "3. MATCH DEPTH TO THE QUESTION. Casual message = casual reply, one or two lines. Technical question = complete, structured answer with code or steps where useful. Never pad.",
    "4. NEVER FABRICATE. If unsure of a fact, version, API, or date, say so plainly and say how to verify it.",
    "5. CODE: correctness over cleverness. Use current idioms, handle obvious error cases, note assumptions. Only include code that runs.",
    "6. DEBUGGING: state the most likely cause first, then the fix, then how to confirm it worked.",
    "7. REMEMBER THE THREAD. Use earlier context instead of making the user repeat themselves; if genuinely ambiguous, ask ONE sharp question.",
    "8. FORMAT FOR HUMANS: short paragraphs, bullets when listing, bold for key terms, tables when comparing."
  ].join("\n"),
  maxRetries: 2,
  /**
   * Model routing registry. Each entry describes what a model is best at so
   * the server can pick a sensible default when the user selected "auto".
   * `strengths` is ordered: the first listed strength is the model's primary one.
   */
  modelRouting: {
    // Task classes the router can classify a request into.
    taskClasses: ["coding", "reasoning", "quick_chat"] as const,
    groq: {
      // Default order when no classification wins: strong general model first.
      default: "llama-3.3-70b-versatile",
      byTask: {
        coding: ["openai/gpt-oss-120b", "qwen/qwen3-32b", "llama-3.3-70b-versatile"],
        reasoning: ["openai/gpt-oss-120b", "moonshotai/kimi-k2-instruct", "llama-3.3-70b-versatile"],
        quick_chat: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"]
      }
    },
    gemini: {
      default: "gemini-2.5-flash",
      byTask: {
        coding: ["gemini-2.5-flash"],
        reasoning: ["gemini-2.5-flash"],
        quick_chat: ["gemini-2.0-flash"]
      }
    },
    cohere: {
      default: "command-r-plus-08-2024",
      byTask: {
        coding: ["command-r-plus-08-2024"],
        reasoning: ["command-r-plus-08-2024"],
        quick_chat: ["command-r7b-12-2024"]
      }
    },
    bazaarlink: {
      default: "bazaarlink-pro",
      byTask: {
        coding: ["bazaarlink-pro", "deepseek-r1"],
        reasoning: ["deepseek-r1", "bazaarlink-pro"],
        quick_chat: ["bazaarlink-fast"]
      }
    }
  } as const
};

/**
 * Classify a chat request into a routing task class from cheap surface
 * heuristics on the conversation. Returns "quick_chat" for short, conversational
 * turns; "coding" for code/terminal intent; "reasoning" for long analytical asks.
 * The classifier never hard-fails: unknown shapes default to quick_chat.
 */
export function classifyRequest(messages: Array<{ role?: string; text?: string; content?: string }>): string {
  const lastUser = [...(messages || [])].reverse().find((m: any) => m && m.role === 'user');
  const text = String((lastUser && (lastUser.text || lastUser.content)) || '').trim();
  if (!text) return 'quick_chat';

  const lower = text.toLowerCase();

  // Coding intent: explicit code blocks, tooling/terminal verbs, or file references.
  const codeSignals = [
    /```/,
    /\b(code|function|bug|error|stack ?trace|compile|refactor|debug|implement|typescript|javascript|python|sql|regex|api|endpoint|component|repository|commit|branch|npm|pip|git|docker|test)\b/,
    /\.[a-z]{1,4}\b\s*(file|extension)?/i,
    /\b(run|execute|deploy|build)\b/
  ];
  if (codeSignals.some((re) => re.test(lower))) return 'coding';

  // Reasoning intent: longer, structured asks (compare, analyse, plan, why, strategy).
  const reasoningSignals = [
    /\b(analy[sz]e|analysis|compare|evaluate|trade[- ]?offs?|pros? and cons?|strategy|plan|design|architect|explain why|walk me through|step by step|framework|recommend)\b/
  ];
  const wordCount = text.split(/\s+/).length;
  if (reasoningSignals.some((re) => re.test(lower)) || wordCount > 80) return 'reasoning';

  // Short conversational turns stay on the fast lane.
  if (wordCount <= 25 && /\b(hi|hello|hey|thanks|thank you|ok|okay|yo|good morning|good evening|how are you|what'?s up)\b/.test(lower)) {
    return 'quick_chat';
  }

  return wordCount > 45 ? 'reasoning' : 'quick_chat';
}
