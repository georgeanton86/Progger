"use client";
import { useState, useCallback } from "react";

export function useStreamingAI() {
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (prompt: string, context?: string) => {
    setLoading(true);
    setOutput("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context, stream: true }),
      });

      if (!res.body) throw new Error("No stream body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
              setOutput(prev => prev + json.delta.text);
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch {
      setOutput("Error generating response. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => setOutput(""), []);

  return { output, loading, run, reset, setOutput };
}
