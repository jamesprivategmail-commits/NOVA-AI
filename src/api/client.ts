export async function sendMessageToGroq(
  messages: { role: string; text: string }[], 
  systemPrompt: string = '',
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  userId?: string,
  userTier?: string,
  provider: 'groq' | 'cohere' | 'bazaarlink' = 'groq',
  model?: string
) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages, systemPrompt, userId, userTier, provider, model }),
      signal
    });

    if (!response.ok) {
      let errText = `API status ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.error) errText = errJson.error;
        else if (errJson.message) errText = errJson.message;
      } catch (e) {
        try {
          const raw = await response.text();
          if (raw) errText = raw;
        } catch (_) {}
      }
      throw new Error(errText);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let buffer = "";
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process SSE format: "data: {...}\n\n"
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
            console.error("Error parsing JSON from stream", e);
          }
        }
      }
    }
  } catch (error) {
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

