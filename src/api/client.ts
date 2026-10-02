import type { ChatAttachment } from '../frontend/components/InputArea';

export interface GitHubContextPayload {
  owner?: string;
  repo?: string;
  branch?: string;
  user?: string;
  activeFile?: string;
  fileTreeSnippet?: string;
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
      // If Vercel rewrote /api to root or if 404 encountered, retry /chat
      if (response.status === 404) {
        response = await fetch("/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: payload,
          signal
        });
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
        errText = "⚡ **VOID AI Server Notice:** Backend API route unreachable. If running on Vercel, ensure you set `GROQ_API_KEY` in Vercel Project Settings → Environment Variables and redeploy.";
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
