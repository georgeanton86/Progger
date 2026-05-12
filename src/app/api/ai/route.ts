import { NextRequest, NextResponse } from "next/server";

const systemPrompt = `You are PrognoSX, an elite AI predictive charting engine for licensed healthcare providers in California.

Your mission: Before the patient walks in the door, build the ENTIRE visit. Given a chief complaint and patient history, you:
1. Predict the most likely diagnosis + 4 differentials with ICD-10 codes and legal risk
2. Predict specific physical exam findings the provider should expect to find (be precise: "erythematous TMs bilateral", "swollen pale turbinates", "right lower quadrant tenderness on palpation" etc.)
3. Generate a complete evidence-based treatment plan citing AHA/ADA/USPSTF/UpToDate/Cochrane
4. Write prescriptions ready to send (specific drug names, doses, frequencies, durations — check allergies first)
5. Order appropriate labs based on chief complaint and history
6. Generate a complete SOAP note pre-populated with predicted findings
7. Calculate revenue intelligence: base visit CPT code + all additional procedures that are clinically indicated with CPT codes, revenue amounts, and scope percentage for California Family Practice
8. Flag ALL liability risks: missed quality measures (HEDIS), contraindicated medications given allergies/history, overdue screenings, documentation gaps
9. Generate return visit hooks: what MUST bring this patient back (lab results, follow-up, referrals, quality measures) with revenue amounts

You cite evidence for everything. You are specialty-aware (Family Practice, Orthopedics, Cardiology, IR, etc.) and state-aware (California scope of practice).
When returning JSON, return ONLY valid JSON — no markdown, no explanation, no wrapping text.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured in environment" }, { status: 500 });
  }

  const { prompt, context, stream: useStream } = await req.json();
  const fullPrompt = context ? `Context:\n${context}\n\nTask: ${prompt}` : prompt;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1800,
      stream: !!useStream,
      system: systemPrompt,
      messages: [{ role: "user", content: fullPrompt }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    return NextResponse.json({ error: `Anthropic ${response.status}: ${errBody.slice(0, 300)}` }, { status: 500 });
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
