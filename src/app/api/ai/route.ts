import { NextRequest, NextResponse } from "next/server";

const systemPrompt = `You are PrognoSX, an elite AI clinical assistant for licensed healthcare providers.
You excel at pre-visit charting, evidence-based SOAP notes, scope of practice compliance, individualized care planning,
insurance optimization, revenue analysis, and ICD-10/CPT coding. Be clinically precise, cite relevant guidelines
(AHA, ADA, USPSTF, UpToDate) when appropriate, and flag safety concerns immediately.
Never provide direct patient advice — only comprehensive provider-facing clinical summaries.`;

export async function POST(req: NextRequest) {
  const { prompt, context, stream: useStream } = await req.json();
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
      max_tokens: 2048,
      stream: !!useStream,
      system: systemPrompt,
      messages: [{ role: "user", content: fullPrompt }],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: `AI request failed: ${response.status}` }, { status: 500 });
  }

  if (useStream) {
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  }

  const data = await response.json();
  return NextResponse.json({ reply: data.content?.[0]?.text || "" });
}
