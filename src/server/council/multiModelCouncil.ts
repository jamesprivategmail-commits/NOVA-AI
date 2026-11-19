import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import { AI_CONFIG } from "../../config/ai.js";
import type { SystemKeysPool } from "../createApp.js";
import {
  conductLiveResearch,
  extractUrlsFromText,
  needsLiveInternetResearch,
  type LiveResearchReport,
} from "../research/webResearcher.js";
import type {
  CouncilAgentDiscussion,
  CouncilWorkerTask,
} from "../../models/types.js";
import {
  clampTokensForModel,
  compactSystemPrompt,
  isPermanentAuthKeyError,
} from "../aiRouting.js";
import { evolutionEngine } from "../evolution/evolutionEngine.js";

export interface CouncilAgentSpec {
  id: string;
  name: string;
  role: string;
  provider: "groq" | "gemini" | "cohere" | "bazaarlink";
  modelId: string;
  systemDirective: string;
}

const DEFAULT_COUNCIL_AGENTS: CouncilAgentSpec[] = [
  {
    id: "shii",
    name: "Shii",
    role: "Swift Muse · Rapid Builder",
    provider: "groq",
    modelId: "qwen/qwen3.8-27b",
    systemDirective:
      "You are Shii, fast execution & UI/implementation specialist. Focus on shipping clean, concrete deliverables rapidly with zero placeholders.",
  },
  {
    id: "shiia",
    name: "Shiia",
    role: "Deep Architect · Full-System Muse",
    provider: "groq",
    modelId: "openai/gpt-oss-120b",
    systemDirective:
      "You are Shiia, systems architect & continuity guardian. Track full-system structure, edge cases, and seamless continuity with the current thread.",
  },
  {
    id: "lyra",
    name: "Lyra",
    role: "Grounded Scholar · Precision & Verification",
    provider: "cohere",
    modelId: "command-r-08-2024",
    systemDirective:
      "You are Lyra, verification & research precision specialist. Cross-check facts, live web sources, correctness, and clarity.",
  },
  {
    id: "sora",
    name: "Sora",
    role: "Long-Context Oracle · Synthesis & Edge Cases",
    provider: "gemini",
    modelId: "gemini-2.5-flash",
    systemDirective:
      "You are Sora, holistic integration & edge-case specialist. Ensure every sub-part integrates cleanly and no detail is dropped.",
  },
];

const GROQ_DIVERSE_POOL = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];

/**
 * Ensures all 4 council members have an available provider+model even if the workspace
 * only has 1 or 2 provider keys configured, maximizing model diversity across healthy keys.
 */
function resolveSquadAgents(
  requested: CouncilAgentSpec[] | undefined,
  keys: SystemKeysPool
): CouncilAgentSpec[] {
  const baseList =
    Array.isArray(requested) && requested.length > 0
      ? requested.slice(0, 4)
      : DEFAULT_COUNCIL_AGENTS;

  while (baseList.length < 4) {
    const candidate = DEFAULT_COUNCIL_AGENTS.find(
      (d) => !baseList.some((x) => x.id === d.id)
    );
    baseList.push(candidate || DEFAULT_COUNCIL_AGENTS[baseList.length % 4]);
  }

  const availableProviders: Array<"groq" | "gemini" | "cohere" | "bazaarlink"> = [];
  if (keys.groqKeys.length > 0) availableProviders.push("groq");
  if (keys.geminiKeys.length > 0) availableProviders.push("gemini");
  if (keys.cohereKeys.length > 0) availableProviders.push("cohere");
  if (keys.bazaarLinkKeys.length > 0) availableProviders.push("bazaarlink");

  if (availableProviders.length === 0) {
    return baseList;
  }

  let groqAssignIdx = 0;
  return baseList.map((agent, idx) => {
    const hasPreferred = availableProviders.includes(agent.provider);
    const chosenProvider = hasPreferred
      ? agent.provider
      : availableProviders[idx % availableProviders.length];

    let chosenModel = agent.modelId;
    if (chosenProvider === "groq") {
      if (!hasPreferred || !chosenModel || chosenModel === "auto") {
        chosenModel = GROQ_DIVERSE_POOL[groqAssignIdx % GROQ_DIVERSE_POOL.length];
        groqAssignIdx++;
      }
    } else if (chosenProvider === "gemini") {
      chosenModel =
        chosenModel && chosenModel.startsWith("gemini-2.5")
          ? chosenModel
          : "gemini-2.5-flash";
    } else if (chosenProvider === "cohere") {
      chosenModel =
        chosenModel && chosenModel.includes("command")
          ? chosenModel
          : (AI_CONFIG.providers.cohere.models[0] || "command-r-08-2024");
    } else if (chosenProvider === "bazaarlink") {
      chosenModel = AI_CONFIG.providers.bazaarlink.models[0] || "bazaarlink-fast";
    }

    return {
      ...agent,
      provider: chosenProvider,
      modelId: chosenModel,
    };
  });
}

async function runSingleCompletion(params: {
  provider: "groq" | "gemini" | "cohere" | "bazaarlink";
  model: string;
  systemPrompt: string;
  messages: { role: string; text: string }[];
  maxTokens: number;
  temperature: number;
  keys: SystemKeysPool;
  keyOffset?: number;
  signal?: AbortSignal;
}): Promise<{ text: string; provider: string; modelUsed: string }> {
  const {
    provider,
    model,
    systemPrompt,
    messages,
    maxTokens,
    temperature,
    keys,
    keyOffset = 0,
    signal,
  } = params;

  const compactedSystem = compactSystemPrompt(systemPrompt, 4800);

  const tryOrder: Array<"groq" | "gemini" | "cohere" | "bazaarlink"> = [
    provider,
    ...(["groq", "gemini", "cohere", "bazaarlink"] as const).filter(
      (p) => p !== provider
    ),
  ];

  let lastErr: any = null;

  for (const p of tryOrder) {
    const tStart = Date.now();
    try {
      if (p === "groq" && keys.groqKeys.length > 0) {
        const totalKeys = keys.groqKeys.length;
        const modelCandidates = [
          model === "auto" || !model || model.includes("llama-3.3") || model.includes("llama-3.1")
            ? "qwen/qwen3.8-27b"
            : model,
          "qwen/qwen3.8-27b",
          "openai/gpt-oss-120b",
          "openai/gpt-oss-20b",
        ];
        const uniqueModels = [...new Set(modelCandidates)];

        for (let kStep = 0; kStep < totalKeys; kStep++) {
          const apiKey = keys.groqKeys[(keyOffset + kStep) % totalKeys];
          const groq = new Groq({ apiKey });
          for (const m of uniqueModels) {
            try {
              const clampedTokens = clampTokensForModel("groq", m, maxTokens);
              const reqSignal = signal
                ? AbortSignal.any([signal, AbortSignal.timeout(22000)])
                : AbortSignal.timeout(22000);
              const completion = await groq.chat.completions.create(
                {
                  model: m,
                  messages: [
                    ...(compactedSystem ? [{ role: "system" as const, content: compactedSystem }] : []),
                    ...messages.map((msg) => ({
                      role: (msg.role === "user" ? "user" : "assistant") as "user" | "assistant",
                      content: msg.text,
                    })),
                  ],
                  max_tokens: clampedTokens,
                  temperature,
                },
                { signal: reqSignal }
              );
              const text = completion.choices?.[0]?.message?.content?.trim() || "";
              if (text) {
                evolutionEngine.recordTelemetry({
                  route: "/api/council",
                  provider: "groq",
                  model: m,
                  latencyMs: Date.now() - tStart,
                  success: true,
                });
                return { text, provider: "groq", modelUsed: m };
              }
            } catch (err: any) {
              lastErr = err;
              if (err?.name === "AbortError" && signal?.aborted) throw err;
              if (isPermanentAuthKeyError(err?.status, err?.message)) {
                break; // Move directly to next API key
              }
            }
          }
        }
      } else if (p === "gemini" && keys.geminiKeys.length > 0) {
        for (let kStep = 0; kStep < keys.geminiKeys.length; kStep++) {
          try {
            const apiKey = keys.geminiKeys[(keyOffset + kStep) % keys.geminiKeys.length];
            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: { headers: { "User-Agent": "aistudio-build" } },
            });
            const targetModel =
              p === provider && model && model.startsWith("gemini-2.5")
                ? model
                : "gemini-2.5-flash";
            const clampedTokens = clampTokensForModel("gemini", targetModel, maxTokens);
            const response = await ai.models.generateContent({
              model: targetModel,
              contents: messages.map((m) => ({
                role: m.role === "user" ? "user" : "model",
                parts: [{ text: m.text }],
              })),
              config: {
                systemInstruction: compactedSystem || undefined,
                maxOutputTokens: clampedTokens,
                temperature,
              },
            });
            const text = response.text?.trim() || "";
            if (text) {
              evolutionEngine.recordTelemetry({
                route: "/api/council",
                provider: "gemini",
                model: targetModel,
                latencyMs: Date.now() - tStart,
                success: true,
              });
              return { text, provider: "gemini", modelUsed: targetModel };
            }
          } catch (gErr: any) {
            lastErr = gErr;
          }
        }
      } else if (p === "cohere" && keys.cohereKeys.length > 0) {
        for (let kStep = 0; kStep < keys.cohereKeys.length; kStep++) {
          try {
            const apiKey = keys.cohereKeys[(keyOffset + kStep) % keys.cohereKeys.length];
            const targetModel =
              p === provider && model && model.includes("command")
                ? model
                : "command-r-08-2024";
            const clampedTokens = clampTokensForModel("cohere", targetModel, maxTokens);
            const reqSignal = signal
              ? AbortSignal.any([signal, AbortSignal.timeout(25000)])
              : AbortSignal.timeout(25000);
            const response = await fetch("https://api.cohere.com/v2/chat", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: targetModel,
                messages: [
                  ...(compactedSystem ? [{ role: "system", content: compactedSystem }] : []),
                  ...messages.map((m) => ({
                    role: m.role === "user" ? "user" : "assistant",
                    content: m.text,
                  })),
                ],
                max_tokens: clampedTokens,
                temperature: Math.max(0, Math.min(1, temperature)),
              }),
              signal: reqSignal,
            });
            if (response.ok) {
              const data = (await response.json()) as any;
              const text =
                data?.message?.content?.[0]?.text?.trim() ||
                data?.text?.trim() ||
                "";
              if (text) {
                evolutionEngine.recordTelemetry({
                  route: "/api/council",
                  provider: "cohere",
                  model: targetModel,
                  latencyMs: Date.now() - tStart,
                  success: true,
                });
                return { text, provider: "cohere", modelUsed: targetModel };
              }
            }
          } catch (cErr: any) {
            lastErr = cErr;
            if (cErr?.name === "AbortError" && signal?.aborted) throw cErr;
          }
        }
      } else if (p === "bazaarlink" && keys.bazaarLinkKeys.length > 0) {
        const apiKey = keys.bazaarLinkKeys[keyOffset % keys.bazaarLinkKeys.length];
        const targetModel = AI_CONFIG.providers.bazaarlink.models[0] || "bazaarlink-fast";
        const clampedTokens = clampTokensForModel("bazaarlink", targetModel, maxTokens);
        const reqSignal = signal
          ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
          : AbortSignal.timeout(8000);
        const response = await fetch(
          `${AI_CONFIG.providers.bazaarlink.baseUrl}/chat/completions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: targetModel,
              messages: [
                ...(compactedSystem ? [{ role: "system", content: compactedSystem }] : []),
                ...messages.map((m) => ({
                  role: m.role === "user" ? "user" : "assistant",
                  content: m.text,
                })),
              ],
              max_tokens: clampedTokens,
              temperature,
            }),
            signal: reqSignal,
          }
        );
        if (response.ok) {
          const data = (await response.json()) as any;
          const text = data?.choices?.[0]?.message?.content?.trim() || "";
          if (text) return { text, provider: "bazaarlink", modelUsed: targetModel };
        }
      }
    } catch (err: any) {
      lastErr = err;
      if (err?.name === "AbortError" && signal?.aborted) throw err;
    }
  }

  evolutionEngine.recordTelemetry({
    route: "/api/council",
    provider,
    model,
    latencyMs: 0,
    success: false,
    error: lastErr?.message || "Council single completion failed",
  });
  throw lastErr || new Error("No healthy AI provider keys available for council agent");
}

async function streamLeadSynthesis(params: {
  leadAgent: CouncilAgentSpec;
  systemPrompt: string;
  synthesisPrompt: string;
  maxTokens: number;
  temperature: number;
  keys: SystemKeysPool;
  onChunk: (chunk: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const { leadAgent, systemPrompt, synthesisPrompt, maxTokens, temperature, keys, onChunk, signal } = params;
  const compactedSystem = compactSystemPrompt(systemPrompt, 4800);

  const tryOrder: Array<"groq" | "gemini" | "cohere" | "bazaarlink"> = [
    leadAgent.provider,
    ...(["groq", "gemini", "cohere", "bazaarlink"] as const).filter((p) => p !== leadAgent.provider),
  ];

  for (const p of tryOrder) {
    try {
      if (p === "groq" && keys.groqKeys.length > 0) {
        const model =
          leadAgent.provider === "groq" &&
          leadAgent.modelId &&
          leadAgent.modelId !== "auto" &&
          !leadAgent.modelId.includes("llama-3.3") &&
          !leadAgent.modelId.includes("llama-3.1")
            ? leadAgent.modelId
            : "qwen/qwen3.8-27b";
        const clampedTokens = clampTokensForModel("groq", model, maxTokens);

        for (const apiKey of keys.groqKeys) {
          try {
            const groq = new Groq({ apiKey });
            const reqSignal = signal
              ? AbortSignal.any([signal, AbortSignal.timeout(45000)])
              : AbortSignal.timeout(45000);
            const stream = await groq.chat.completions.create(
              {
                model,
                messages: [
                  ...(compactedSystem ? [{ role: "system" as const, content: compactedSystem }] : []),
                  { role: "user", content: synthesisPrompt },
                ],
                max_tokens: clampedTokens,
                temperature,
                stream: true,
              },
              { signal: reqSignal }
            );
            let full = "";
            for await (const chunk of stream) {
              const delta = chunk.choices?.[0]?.delta?.content || "";
              if (delta) {
                full += delta;
                onChunk(delta);
              }
            }
            if (full) return full;
          } catch (gErr: any) {
            if (gErr?.name === "AbortError" && signal?.aborted) throw gErr;
            continue;
          }
        }
      } else if (p === "gemini" && keys.geminiKeys.length > 0) {
        for (const apiKey of keys.geminiKeys) {
          try {
            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: { headers: { "User-Agent": "aistudio-build" } },
            });
            const clampedTokens = clampTokensForModel("gemini", "gemini-2.5-flash", maxTokens);
            const stream = await ai.models.generateContentStream({
              model: "gemini-2.5-flash",
              contents: [{ role: "user", parts: [{ text: synthesisPrompt }] }],
              config: {
                systemInstruction: compactedSystem || undefined,
                maxOutputTokens: clampedTokens,
                temperature,
              },
            });
            let full = "";
            for await (const chunk of stream) {
              const delta = chunk.text || "";
              if (delta) {
                full += delta;
                onChunk(delta);
              }
            }
            if (full) return full;
          } catch {
            continue;
          }
        }
      } else {
        const fallback = await runSingleCompletion({
          provider: p,
          model: leadAgent.modelId,
          systemPrompt: compactedSystem,
          messages: [{ role: "user", text: synthesisPrompt }],
          maxTokens,
          temperature,
          keys,
          signal,
        });
        onChunk(fallback.text);
        return fallback.text;
      }
    } catch (err: any) {
      if (err?.name === "AbortError" && signal?.aborted) throw err;
    }
  }

  throw new Error("Lead synthesis failed across all available providers");
}

function parseDiscussionJson(raw: string, fallbackRole: string): { analysis: string; proposedSubtask: string } {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]);
      if (obj.analysis) {
        return {
          analysis: String(obj.analysis).trim(),
          proposedSubtask: String(obj.proposedSubtask || fallbackRole).trim(),
        };
      }
    } catch {
      // fall through
    }
  }
  return {
    analysis: raw.trim(),
    proposedSubtask: fallbackRole,
  };
}

function safeWriteSse(res: any, payload: any) {
  if (res.writableEnded || res.destroyed) return;
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function runMultiModelCouncil(params: {
  messages: { role: string; text?: string; content?: string }[];
  systemPrompt: string;
  agents?: CouncilAgentSpec[];
  webResearch?: boolean | "auto";
  maxTokens: number;
  temperature: number;
  keys: SystemKeysPool;
  res: any;
  signal?: AbortSignal;
}): Promise<boolean> {
  const {
    messages,
    systemPrompt,
    agents: requestedAgents,
    webResearch = "auto",
    maxTokens,
    temperature,
    keys,
    res,
    signal,
  } = params;

  const squad = resolveSquadAgents(requestedAgents, keys);
  const startTime = Date.now();

  const normalizedMessages = (Array.isArray(messages) ? messages : []).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    text: String(m.text || m.content || ""),
  }));
  const latestUserText =
    [...normalizedMessages].reverse().find((m) => m.role === "user")?.text || "";
  const conversationTranscript = normalizedMessages
    .slice(-8)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text.slice(0, 1200)}`)
    .join("\n\n");

  const hasAnyKeys =
    keys.groqKeys.length > 0 ||
    keys.geminiKeys.length > 0 ||
    keys.cohereKeys.length > 0 ||
    keys.bazaarLinkKeys.length > 0;

  if (!hasAnyKeys) {
    safeWriteSse(res, {
      text: "⚡ **API Key Configuration Notice:** No active AI provider keys found. Add keys in Admin Settings to launch the 4-Model Squad.",
    });
    return false;
  }

  // ── PHASE 1: Live Internet Research & Full-Site Crawling ────────────────────
  let researchReport: LiveResearchReport | null = null;
  const forceWeb = webResearch === true;
  const shouldRunWeb =
    webResearch !== false && needsLiveInternetResearch(latestUserText, forceWeb);

  if (shouldRunWeb && latestUserText.trim()) {
    safeWriteSse(res, {
      type: "council_event",
      event: {
        kind: "research_start",
        query: latestUserText.slice(0, 180),
        squadMemberIds: squad.map((a) => a.id),
      },
    });

    try {
      const explicitUrls = extractUrlsFromText(latestUserText, 3);
      researchReport = await conductLiveResearch({
        query: latestUserText,
        explicitUrls,
        deepCrawl: true,
        maxPagesPerSite: 6,
        maxSearchHitsToRead: 4,
      });
    } catch (err) {
      console.warn("[Council Web Research Warning]:", err);
    }

    safeWriteSse(res, {
      type: "council_event",
      event: {
        kind: "research_done",
        sources: researchReport?.sources || [],
        totalPagesRead: researchReport?.totalPagesRead || 0,
      },
    });
  }

  const webContextBlock = researchReport?.contextPrompt
    ? `\n\n${researchReport.contextPrompt}`
    : "";

  // ── PHASE 2: 4-Model Parallel Round-Table Discussion ────────────────────────
  safeWriteSse(res, {
    type: "council_event",
    event: {
      kind: "discussion_start",
      agents: squad.map((a) => ({
        agentId: a.id,
        agentName: a.name,
        role: a.role,
        provider: a.provider,
        modelUsed: a.modelId,
      })),
    },
  });

  const discussions: CouncilAgentDiscussion[] = await Promise.all(
    squad.map(async (agent, idx) => {
      const t0 = Date.now();
      const discussionPrompt = [
        `You are **${agent.name}** (${agent.role}), collaborating inside a 4-model AI council.`,
        agent.systemDirective,
        ``,
        `CONVERSATION CONTEXT:`,
        conversationTranscript || "(First turn)",
        webContextBlock,
        ``,
        `USER'S CURRENT REQUEST:`,
        latestUserText,
        ``,
        `TASK FOR THIS ROUND-TABLE STEP:`,
        `1. Briefly state your understanding of the user's goal & how it continues the current thread.`,
        `2. Share the most critical architectural/research insights from your specialty.`,
        `3. Propose the exact sub-task you will execute in parallel when we split the work 4 ways.`,
        `Return JSON only: {"analysis": "2-4 crisp sentences of insight", "proposedSubtask": "short specific deliverable title"}`,
      ].join("\n");

      try {
        const result = await runSingleCompletion({
          provider: agent.provider,
          model: agent.modelId,
          systemPrompt: "Respond concisely with valid JSON.",
          messages: [{ role: "user", text: discussionPrompt }],
          maxTokens: 700,
          temperature: Math.min(0.65, temperature),
          keys,
          keyOffset: idx,
          signal,
        });
        const parsed = parseDiscussionJson(result.text, `${agent.role} deliverable`);
        const disc: CouncilAgentDiscussion = {
          agentId: agent.id,
          agentName: agent.name,
          role: agent.role,
          provider: result.provider,
          modelUsed: result.modelUsed,
          analysis: parsed.analysis,
          proposedSubtask: parsed.proposedSubtask,
          durationMs: Date.now() - t0,
          status: "completed",
        };
        safeWriteSse(res, {
          type: "council_event",
          event: { kind: "agent_discussion", discussion: disc },
        });
        return disc;
      } catch (err: any) {
        const disc: CouncilAgentDiscussion = {
          agentId: agent.id,
          agentName: agent.name,
          role: agent.role,
          provider: agent.provider,
          modelUsed: agent.modelId,
          analysis: `Encountered temporary provider delay: ${err?.message || "fallback ready"}.`,
          proposedSubtask: `Support ${agent.role} slice`,
          durationMs: Date.now() - t0,
          status: "error",
        };
        safeWriteSse(res, {
          type: "council_event",
          event: { kind: "agent_discussion", discussion: disc },
        });
        return disc;
      }
    })
  );

  // ── PHASE 3: Parallel 4-Way Work Split & Concurrent Execution ───────────────
  const roundTableSummary = discussions
    .map(
      (d) =>
        `- **${d.agentName}** (${d.role}, model ${d.modelUsed}): ${d.analysis} [Proposed slice: ${d.proposedSubtask}]`
    )
    .join("\n");

  // Build crisp non-overlapping parallel work assignments
  const roleSlices = [
    "Core Implementation / Primary Deliverable",
    "Architecture, Deep Logic & System Continuity",
    "Verification, Research Evidence & Documentation",
    "Integration, Edge Cases & Quality Polish",
  ];

  const workAssignments = squad.map((agent, idx) => {
    const disc = discussions[idx];
    return {
      agentId: agent.id,
      agentName: agent.name,
      role: agent.role,
      taskTitle: disc?.proposedSubtask || roleSlices[idx],
      instruction: `Execute ONLY your assigned parallel slice cleanly and completely: "${disc?.proposedSubtask || roleSlices[idx]}". Do not repeat work assigned to your 3 teammates; produce rich, ready-to-merge content/code/findings for your slice.`,
      provider: disc?.provider || agent.provider,
      modelUsed: disc?.modelUsed || agent.modelId,
    };
  });

  safeWriteSse(res, {
    type: "council_event",
    event: {
      kind: "work_plan",
      tasks: workAssignments.map((w) => ({
        ...w,
        output: "",
        durationMs: 0,
        status: "running",
      })),
    },
  });

  const workerResults: CouncilWorkerTask[] = await Promise.all(
    squad.map(async (agent, idx) => {
      const assignment = workAssignments[idx];
      const t0 = Date.now();
      const workerPrompt = [
        `You are **${agent.name}** (${agent.role}) executing ONE of 4 parallel workstreams for the user's request.`,
        agent.systemDirective,
        ``,
        `TEAM ROUND-TABLE CONSENSUS:`,
        roundTableSummary,
        ``,
        `CONVERSATION HISTORY:`,
        conversationTranscript,
        webContextBlock,
        ``,
        `USER REQUEST:`,
        latestUserText,
        ``,
        `YOUR ASSIGNED PARALLEL WORKSTREAM: **${assignment.taskTitle}**`,
        assignment.instruction,
        `Produce a thorough, complete, directly usable output for your workstream (no meta-chatter, no placeholders).`,
      ].join("\n");

      try {
        const resWorker = await runSingleCompletion({
          provider: agent.provider,
          model: agent.modelId,
          systemPrompt: systemPrompt || agent.systemDirective,
          messages: [{ role: "user", text: workerPrompt }],
          maxTokens: Math.min(maxTokens, 4096),
          temperature,
          keys,
          keyOffset: idx,
          signal,
        });

        const task: CouncilWorkerTask = {
          agentId: agent.id,
          agentName: agent.name,
          role: agent.role,
          taskTitle: assignment.taskTitle,
          instruction: assignment.instruction,
          provider: resWorker.provider,
          modelUsed: resWorker.modelUsed,
          output: resWorker.text,
          durationMs: Date.now() - t0,
          status: "completed",
        };
        safeWriteSse(res, {
          type: "council_event",
          event: { kind: "task_result", task },
        });
        return task;
      } catch (err: any) {
        const task: CouncilWorkerTask = {
          agentId: agent.id,
          agentName: agent.name,
          role: agent.role,
          taskTitle: assignment.taskTitle,
          instruction: assignment.instruction,
          provider: agent.provider,
          modelUsed: agent.modelId,
          output: `Slice delayed (${err?.message || "provider error"}).`,
          durationMs: Date.now() - t0,
          status: "error",
        };
        safeWriteSse(res, {
          type: "council_event",
          event: { kind: "task_result", task },
        });
        return task;
      }
    })
  );

  // ── PHASE 4: Unified Lead Synthesis Stream ──────────────────────────────────
  const leadAgent =
    squad.find((a) => a.id === "shiia") || squad[0];

  safeWriteSse(res, {
    type: "council_event",
    event: {
      kind: "synthesis_start",
      leadAgentId: leadAgent.id,
      leadAgentName: leadAgent.name,
    },
  });

  const combinedWorkerSlices = workerResults
    .map(
      (w, idx) =>
        `### Workstream ${idx + 1} — ${w.agentName} (${w.modelUsed}): ${w.taskTitle}\n${w.output}`
    )
    .join("\n\n---\n\n");

  const synthesisPrompt = [
    `You are **${leadAgent.name}** (${leadAgent.role}), Lead Synthesizer of the 4-Model Muse Council.`,
    `Combine the team's round-table consensus, live internet research, and all 4 parallel workstreams into ONE cohesive, complete, seamless response to the user.`,
    `Requirements:`,
    `- Continue directly from the active conversation thread; do NOT restart from scratch.`,
    `- Merge all code, architecture, research findings, and edge-case fixes into a unified, well-structured final deliverable with ZERO placeholders or truncation.`,
    `- When citing live web facts, include clickable markdown links from the verified sources.`,
    ``,
    `CONVERSATION CONTEXT:`,
    conversationTranscript,
    webContextBlock,
    ``,
    `4-MODEL PARALLEL WORKSTREAMS TO SYNTHESIZE:`,
    combinedWorkerSlices,
    ``,
    `USER REQUEST:`,
    latestUserText,
    ``,
    `Deliver the complete, unified final response now:`,
  ].join("\n");

  await streamLeadSynthesis({
    leadAgent,
    systemPrompt,
    synthesisPrompt,
    maxTokens,
    temperature,
    keys,
    onChunk: (chunk) => {
      safeWriteSse(res, { text: chunk });
    },
    signal,
  });

  safeWriteSse(res, {
    type: "council_event",
    event: {
      kind: "council_complete",
      totalDurationMs: Date.now() - startTime,
      leadAgentName: leadAgent.name,
    },
  });

  return true;
}
