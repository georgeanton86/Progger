import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  const { pearl } = await req.json();
  if (!pearl) return NextResponse.json({ error: "pearl required" }, { status: 400 });

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1400,
        system: `You are a clinical CME question writer for PrognoSX. Write exactly 2 multiple-choice questions from the given clinical case. Questions must be relevant to practicing MDs, NPs, PAs, and RNs. Focus on clinical decision-making, not trivia. Return ONLY valid JSON — no markdown, no preamble.

Format (exactly):
{"questions":[{"q":"Question?","options":["A: ...","B: ...","C: ...","D: ..."],"correct":"A","explanation":"Why A is correct and why the others are wrong."}]}`,
        messages: [{ role: "user", content: `Write 2 CME questions based on this clinical case:\n\n${pearl}` }],
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: `Network error: ${String(err).slice(0, 200)}` }, { status: 502 });
  }

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    return NextResponse.json({ error: `AI ${response.status}: ${err.slice(0, 200)}` }, { status: 500 });
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  const start = text.indexOf("{");
  if (start === -1) return NextResponse.json({ error: "No JSON in response" }, { status: 500 });
  try {
    return NextResponse.json(JSON.parse(text.slice(start)));
  } catch {
    return NextResponse.json({ error: "Failed to parse quiz" }, { status: 500 });
  }
}
