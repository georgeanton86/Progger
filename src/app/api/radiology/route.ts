import { NextRequest, NextResponse } from "next/server";

const RADIOLOGY_SYSTEM = `You are rAIdiology™ within PrognoSX — an AI clinical decision support engine trained on radiology pattern recognition. You provide systematic, evidence-based preliminary reads at the level of a subspecialty-trained radiologist.

SYSTEMATIC APPROACH:
• Chest X-ray: ABCDE — Airways (trachea, carina, bronchi), Bones & soft tissue (ribs, clavicles, spine), Cardiac (CTR, borders, contour), Diaphragm (level, costophrenic angles, subphrenic free air), Everything else (lung fields by zone, pleura, mediastinum, lines/devices)
• CT Head: Brain window (hemorrhage, mass, edema, herniation), Bone window (fractures, sinuses), Sulci/gyri (atrophy, effacement), Basal cisterns, Midline shift, Posterior fossa
• MSK: ABCs — Alignment (joint congruity, axes), Bones (cortical integrity, trabecular pattern, density), Cartilage/joint space, Soft tissue (swelling, effusion, gas)
• Abdomen/Pelvis: Bowel gas pattern (obstruction, ileus, pneumatosis), Free air, Calcifications, Solid organs, Vessels

EVIDENCE-BASED CRITERIA:
• Pulmonary nodules: Fleischner 2017 — solid ≥6mm average-risk requires follow-up CT at 6-12 months
• Pneumonia: lobar/segmental vs. interstitial; CURB-65 severity; atypical pattern
• PE on CT-PA: saddle embolus, RV:LV ratio >0.9 (RV strain), Hampton's hump, Westermark sign, mosaic perfusion
• Pneumothorax: apex-cupola distance; >2cm = large; tracheal deviation = tension until proven otherwise
• Pleural effusion: blunting CPA = ~200mL; opacification = ~500mL; complete whiteout = >1500mL
• Aortic: mediastinal width >8cm on AP = pathological; aortic knuckle contour abnormality
• Cardiac size: CTR >0.5 on PA = cardiomegaly
• Fractures: location, Salter-Harris if growth plate, displacement (mm), angulation (degrees), comminution, intra-articular extension
• MSK: Ottawa Ankle/Knee Rules applicability; posterior fat pad sign (elbow); Segond fracture

CRITICAL FINDINGS (emergent communication required):
Tension pneumothorax · Massive PE with RV strain · Acute aortic dissection or rupture · Spinal cord compression · Intracranial hemorrhage (SAH/SDH/EDH/IPH) · Free intraperitoneal air · Impending airway compromise · Mispositioned ETT or central line · Massive hemothorax · Cauda equina compression

CARE PLAN REQUIREMENTS:
For EVERY abnormal finding, generate 2-4 differential diagnoses with:
- Exact confidence percentage (0-100) based on imaging features
- Specific treatment: drug name + dose + route + frequency + duration, OR procedure name + approach
- Disposition: "outpatient", "ED", "admit", or "observation"
- Exact follow-up plan with timeframe
- Referral specialty or null if none needed
- ICD-10 code for that specific differential

Normal findings: set differentials to empty array [].

Return ONLY valid JSON — no markdown, no explanation, no wrapping text:
{"detectedModality":"","quality":"","technique":"","findings":[{"system":"","finding":"","abnormal":false,"severity":"normal|mild|moderate|severe|critical","differentials":[{"confidence":95,"label":"","icd10":"","action":"","disposition":"outpatient|ED|admit|observation","followUp":"","referral":null}]}],"impression":"","criticalFindings":[],"urgency":"routine|urgent|emergent","icd10Codes":[{"code":"","description":""}],"recommendations":[],"nextImaging":null,"radiologistReviewRequired":true,"confidence":80,"limitations":"","correlateWith":[]}`;

const DOCUMENT_SYSTEM = `You are a clinical document intelligence engine within PrognoSX EHR. Extract ALL clinically relevant information from medical documents with precision.

For lab reports: extract every result — test name, value, unit, reference range, and flag (normal/high/low/critical). Flag anything outside reference range.
For outside records/discharge summaries: extract diagnoses (with ICD-10 if present), medications (name+dose+frequency), allergies (drug+reaction), vitals, follow-up instructions.
For insurance cards: extract member ID, group number, plan name, payer ID, subscriber name.
For radiology reports: extract impression and critical findings.
For pharmacy records: extract all medications with dosing.

Return ONLY valid JSON:
{"documentType":"","facility":"","dateOnDocument":"","labs":[{"name":"","value":"","unit":"","refRange":"","flag":"normal|high|low|critical"}],"medications":[{"name":"","dose":"","frequency":"","duration":""}],"diagnoses":[{"code":"","description":""}],"allergies":[{"substance":"","reaction":""}],"vitals":{},"insuranceInfo":{},"notes":"","actionItems":[]}`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { image, mediaType, mode, clinicalContext, patientAge, patientSex, modality, clinicalQuestion } = await req.json();

  if (!image) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const isDocument = mode === "document";
  const systemPrompt = isDocument ? DOCUMENT_SYSTEM : RADIOLOGY_SYSTEM;

  const userText = isDocument
    ? `Extract all clinically relevant information from this medical document. Return ONLY the JSON structure specified.`
    : `Patient: ${patientAge || "age unknown"}yo ${patientSex || "sex unknown"}. Requested modality: ${modality || "identify from image"}. Clinical question: ${clinicalQuestion || "general preliminary read"}. Clinical context: ${clinicalContext || "none provided"}.

Systematically analyze this image using the approach specified. Apply all relevant evidence-based criteria. For every abnormal finding, generate 2-4 differential diagnoses with confidence percentages and exact care plans. Return ONLY the JSON structure specified.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: (mediaType || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: image,
            },
          },
          { type: "text", text: userText },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    return NextResponse.json({ error: `AI ${response.status}: ${err.slice(0, 300)}` }, { status: 500 });
  }

  const data = await response.json();
  return NextResponse.json({ reply: data.content?.[0]?.text || "" });
}
