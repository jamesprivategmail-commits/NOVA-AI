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

export async function sendMessageToGroq(
  messages: { role: string; text: string }[], 
  systemPrompt: string = '',
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  userId?: string,
  userTier?: string,
  provider: 'groq' | 'cohere' | 'bazaarlink' = 'groq',
  model?: string,
  attachment?: ChatAttachment,
  githubContext?: GitHubContextPayload
) {
  try {
    const payload = JSON.stringify({ messages, systemPrompt, userId, userTier, provider, model, attachment, githubContext });

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
      // If 404, retry /chat or /api
      if (response.status === 404) {
        response = await fetch("/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: payload,
          signal
        });
        if (response.status === 404) {
          response = await fetch("/api", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: payload,
            signal
          });
        }
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
        errText = "⚡ **VOID AI Server Notice:** Backend API route unreachable. If running on Vercel, ensure you set GROQ_API_KEY or COHERE_API_KEY in Vercel Project Settings → Environment Variables and redeploy.";
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
            return;
          }
          try {
            const data = JSON.parse(dataStr);
            if (data.text) {
              onChunk(data.text);
            }
          } catch (e) {
            // Ignore partial SSE chunk
          }
        }
      }
    }
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
  signal?: AbortSignal
): Promise<TerminalToolEvent> {
  const response = await fetch('/api/terminal/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, stream: true }),
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
