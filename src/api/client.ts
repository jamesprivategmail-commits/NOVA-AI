import type { ChatAttachment } from '../frontend/components/InputArea';
import type { TerminalToolEvent } from '../models/types';

export interface GitHubContextPayload {
  owner?: string;
  repo?: string;
  branch?: string;
  user?: string;
  activeFile?: string;
  fileTreeSnippet?: string;
  codingMode?: boolean;
}

export interface ChatTelemetryResult {
  ttftMs: number;
  latencyMs: number;
  tokensPerSec: number;
  totalTokens: number;
}

// In-memory and localStorage cache for system API keys loaded from Firestore on client
let cachedClientKeys: {
  groqKeys?: string[];
  cohereKeys?: string[];
  bazaarLinkKeys?: string[];
  geminiKeys?: string[];
} | null = null;

export function setClientSystemKeys(keys: {
  groqKeys?: string[];
  cohereKeys?: string[];
  bazaarLinkKeys?: string[];
  geminiKeys?: string[];
}) {
  cachedClientKeys = keys;
  try {
    localStorage.setItem('void_ai_client_system_keys', JSON.stringify(keys));
  } catch (_) {}
}

export function getClientSystemKeys(): {
  groqKeys?: string[];
  cohereKeys?: string[];
  bazaarLinkKeys?: string[];
  geminiKeys?: string[];
} | null {
  if (cachedClientKeys && (
    (cachedClientKeys.groqKeys && cachedClientKeys.groqKeys.length > 0) ||
    (cachedClientKeys.cohereKeys && cachedClientKeys.cohereKeys.length > 0) ||
    (cachedClientKeys.geminiKeys && cachedClientKeys.geminiKeys.length > 0) ||
    (cachedClientKeys.bazaarLinkKeys && cachedClientKeys.bazaarLinkKeys.length > 0)
  )) {
    return cachedClientKeys;
  }
  try {
    const raw = localStorage.getItem('void_ai_client_system_keys');
    if (raw) {
      cachedClientKeys = JSON.parse(raw);
      return cachedClientKeys;
    }
  } catch (_) {}
  return null;
}

export async function sendMessageToGroq(
  messages: { role: string; text: string }[], 
  systemPrompt: string = '',
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  userId?: string,
  userTier?: string,
  provider: 'groq' | 'cohere' | 'bazaarlink' | 'gemini' = 'groq',
  model?: string,
  attachment?: ChatAttachment,
  githubContext?: GitHubContextPayload,
  clientKeysParam?: {
    groqKeys?: string[];
    cohereKeys?: string[];
    bazaarLinkKeys?: string[];
    geminiKeys?: string[];
  }
): Promise<ChatTelemetryResult> {
  const startTime = performance.now();
  let firstTokenTime: number | null = null;
  let accumulatedChars = 0;
  let chunkCount = 0;
  try {
    const clientKeys = clientKeysParam || getClientSystemKeys();
    const payload = JSON.stringify({ 
      messages, 
      systemPrompt, 
      userId, 
      userTier, 
      provider, 
      model, 
      attachment, 
      githubContext,
      clientKeys: clientKeys || undefined
    });

    let response: Response;
    try {
      response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
        signal
      });
      // If 404 or 500, retry on fallback routes
      if (response.status === 404 || response.status === 500) {
        try {
          const fallbackRes = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            signal
          });
          if (fallbackRes.ok) {
            response = fallbackRes;
          } else {
            const apiRes = await fetch("/api", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: payload,
              signal
            });
            if (apiRes.ok) {
              response = apiRes;
            }
          }
        } catch (_) {}
      }
    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError') throw fetchErr;
      // Retry once on /chat if network fetch failed
      try {
        response = await fetch("/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: payload,
          signal
        });
      } catch (_) {
        throw fetchErr;
      }
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      throw new Error("⚡ **VOID AI Server Notice:** Backend API returned HTML webpage instead of streaming SSE data. Please ensure the backend server is running and /api/chat is not routed to index.html.");
    }

    if (!response.ok) {
      let errText = `API status ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.error) {
          errText = typeof errJson.error === 'string' ? errJson.error : errJson.error.message || JSON.stringify(errJson.error);
        } else if (errJson.message) {
          errText = errJson.message;
        }
      } catch (e) {
        try {
          const raw = await response.text();
          if (raw) errText = raw;
        } catch (_) {}
      }

      if (errText.includes("<!DOCTYPE") || errText.includes("<html") || response.status === 404) {
        errText = "⚡ **VOID AI Server Notice:** Backend API route unreachable. Please verify server connectivity or model selection.";
      } else if (!errText || errText === 'API status 500' || errText === 'Internal server error') {
        errText = "⚡ **VOID AI Server Notice:** AI completion encountered a server issue. Your API keys from the admin panel are being refreshed. Please try again or switch model.";
      }
      throw new Error(errText);
    }

    if (!response.body) {
      throw new Error("No response body received from server");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let buffer = "";
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      
      for (const part of parts) {
        if (part.startsWith("data: ")) {
          const dataStr = part.slice(6);
          if (dataStr === "[DONE]") {
            const totalDurationMs = Math.max(1, Math.round(performance.now() - startTime));
            const ttftMs = Math.round(firstTokenTime ? firstTokenTime - startTime : totalDurationMs);
            const totalTokens = Math.max(1, Math.round(accumulatedChars / 3.8));
            const durationSec = totalDurationMs / 1000;
            const tokensPerSec = Math.round((totalTokens / durationSec) * 10) / 10;
            return {
              ttftMs,
              latencyMs: totalDurationMs,
              tokensPerSec,
              totalTokens,
            };
          }
          try {
            const data = JSON.parse(dataStr);
            if (data.text) {
              if (firstTokenTime === null) {
                firstTokenTime = performance.now();
              }
              accumulatedChars += data.text.length;
              chunkCount++;
              onChunk(data.text);
            }
          } catch (e) {
            // Ignore partial SSE chunk
          }
        }
      }
    }

    const totalDurationMs = Math.max(1, Math.round(performance.now() - startTime));
    const ttftMs = Math.round(firstTokenTime ? firstTokenTime - startTime : totalDurationMs);
    const totalTokens = Math.max(1, Math.round(accumulatedChars / 3.8));
    const durationSec = totalDurationMs / 1000;
    const tokensPerSec = Math.round((totalTokens / durationSec) * 10) / 10;
    return {
      ttftMs,
      latencyMs: totalDurationMs,
      tokensPerSec,
      totalTokens,
    };
  } catch (error: any) {
    console.error("Error in sendMessageToGroq:", error);
    throw error;
  }
}

// Backwards compatibility wrapper
export async function sendMessageToGemini(
  messages: { role: string; text: string }[],
  _provider: string = 'groq',
  _customKey: string = '',
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  systemPrompt: string = ''
) {
  return sendMessageToGroq(messages, systemPrompt, onChunk, signal);
}

/**
 * Execute real terminal command via backend runner with live SSE streaming
 */
export async function runTerminalCommand(
  command: string,
  onChunk?: (chunk: string, event: TerminalToolEvent) => void,
  signal?: AbortSignal,
  userId?: string,
  cwd?: string
): Promise<TerminalToolEvent> {
  const response = await fetch('/api/terminal/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, stream: true, userId, cwd }),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Terminal error (${response.status}): ${errText}`);
  }

  if (!response.body) {
    throw new Error('No response stream received from terminal service');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalEvent: TerminalToolEvent = {
    id: 'term-' + Date.now(),
    type: 'tool',
    tool: 'terminal',
    status: 'running',
    command,
    output: '',
    startedAt: Date.now(),
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      if (part.startsWith('data: ')) {
        const dataStr = part.slice(6);
        if (dataStr === '[DONE]') {
          return finalEvent;
        }
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.type === 'start') {
            finalEvent.id = parsed.id;
          } else if (parsed.type === 'chunk' && parsed.event) {
            finalEvent = parsed.event;
            if (onChunk) onChunk(parsed.chunk, parsed.event);
          } else if (parsed.type === 'done' && parsed.event) {
            finalEvent = parsed.event;
          }
        } catch (_) {}
      }
    }
  }

  return finalEvent;
}

/**
 * Stop/cancel a running terminal command
 */
export async function stopTerminalCommand(id: string): Promise<boolean> {
  try {
    const res = await fetch('/api/terminal/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.error('Failed to stop terminal command:', err);
    return false;
  }
}

/**
 * Workspace file and process management client APIs
 */
export async function fetchWorkspaceFiles(userId?: string, path?: string): Promise<{ files: any[]; rootDir: string }> {
  const url = `/api/workspace/files?userId=${encodeURIComponent(userId || 'workspace-default')}&path=${encodeURIComponent(path || '')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch workspace files');
  return res.json();
}

export async function readWorkspaceFile(path: string, userId?: string): Promise<string> {
  const res = await fetch('/api/workspace/file/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userId || 'workspace-default', path }),
  });
  if (!res.ok) throw new Error('Failed to read file');
  const data = await res.json();
  return data.content;
}

export async function writeWorkspaceFile(path: string, content: string, userId?: string): Promise<void> {
  const res = await fetch('/api/workspace/file/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userId || 'workspace-default', path, content }),
  });
  if (!res.ok) throw new Error('Failed to write file');
}

export async function deleteWorkspaceFile(path: string, userId?: string): Promise<boolean> {
  const res = await fetch('/api/workspace/file/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userId || 'workspace-default', path }),
  });
  if (!res.ok) throw new Error('Failed to delete file');
  const data = await res.json();
  return data.success;
}

export async function fetchProcesses(userId?: string): Promise<any[]> {
  const url = `/api/processes${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.processes || [];
}

export async function startBackgroundProcess(options: { command: string; name?: string; port?: number; userId?: string }): Promise<any> {
  const res = await fetch('/api/processes/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) throw new Error('Failed to start process');
  const data = await res.json();
  return data.process;
}

export async function stopBackgroundProcess(id: string): Promise<boolean> {
  const res = await fetch('/api/processes/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data.success);
}

export async function fetchProcessLogs(id: string): Promise<string[]> {
  const res = await fetch(`/api/processes/${id}/logs`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.logs || [];
}

