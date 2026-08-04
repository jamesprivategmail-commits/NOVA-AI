export async function sendMessageToGemini(
  messages: {role: string, text: string}[], 
  provider: string = 'gemini',
  customKey: string = '',
  onChunk: (text: string) => void
) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages, provider, customKey }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
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
      // The last part might be incomplete, so keep it in buffer
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
    console.error("Error in sendMessageToGemini:", error);
    throw error;
  }
}
