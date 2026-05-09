import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt, context } = await req.json();

  const systemPrompt = `You are PrognoSX, an AI clinical assistant for licensed healthcare providers.
You help with pre-visit charting, SOAP notes, scope of practice validation, care planning,
insurance optimization, and revenue analysis. Always be concise, clinically precise, and
flag any safety concerns. Never provide direct patient advice — only provider-facing summaries.`;

  const fullPrompt = context ? `Context:\n${context}\n\nTask: ${prompt}` : prompt;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: fullPrompt }],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }

  const data = await response.json();
  return NextResponse.json({ reply: data.content[0].text });
}
