import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  const { pearl } = await req.json();
  if (!pearl) return NextResponse.json({ error: "pearl required" }, { status: 400 });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: `You are a physician CME quiz generator for PrognoSX. Generate exactly 3 multiple-choice questions testing clinical knowledge from the given teaching pearl. Return ONLY valid JSON — no markdown.

Format:
{"questions":[{"q":"Question text?","options":["A: ...","B: ...","C: ...","D: ..."],"correct":"A","explanation":"Brief explanation why A is correct."}]}`,
      messages: [{ role: "user", content: `Generate 3 CME questions from this teaching pearl:\n\n${pearl}` }],
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    return NextResponse.json({ error: `AI ${response.status}: ${err.slice(0, 200)}` }, { status: 500 });
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  const start = text.indexOf("{");
  if (start === -1) return NextResponse.json({ error: "No JSON in response" }, { status: 500 });
  try {
    const parsed = JSON.parse(text.slice(start));
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse quiz" }, { status: 500 });
  }
}
