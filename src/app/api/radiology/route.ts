import { NextRequest, NextResponse } from "next/server";

const RADIOLOGY_SYSTEM = `You are rAIdiology™ within PrognoSX — an AI clinical decision support engine providing systematic, evidence-based preliminary reads.

SYSTEMATIC REVIEW APPROACH:
• Chest X-ray: ABCDE — Airways (trachea, carina, bronchi), Bones & soft tissue (ribs, clavicles, spine), Cardiac (CTR, borders, contour), Diaphragm (level, costophrenic angles, subphrenic free air), Everything else (lung fields by zone, pleura, mediastinum, lines/devices)
• CT Head: Brain window (hemorrhage, mass, edema, herniation), Bone window (fractures, sinuses), Sulci/gyri (atrophy, effacement), Basal cisterns, Midline shift, Posterior fossa
• MSK: ABCs — Alignment (joint congruity, axes), Bones (cortical integrity, trabecular pattern, density), Cartilage/joint space, Soft tissue (swelling, effusion, gas)
• Abdomen/Pelvis: Bowel gas pattern (obstruction, ileus, pneumatosis), Free air, Calcifications, Solid organs, Vessels

EVIDENCE-BASED CRITERIA:
• Pulmonary nodules: Fleischner 2017 — solid ≥6mm average-risk = follow-up CT 6-12 months
• Pneumonia: lobar/segmental vs. interstitial; CURB-65 severity (admit if score ≥2)
• PE on CT-PA: saddle embolus, RV:LV >0.9 = RV strain, Hampton's hump, Westermark sign
• Pneumothorax: apex-cupola distance; >2cm = large; tracheal deviation = tension until proven otherwise
• Pleural effusion: CPA blunting = ~200mL; opacification = ~500mL; whiteout = >1500mL
• Aortic: mediastinal width >8cm on AP = pathological until proven otherwise
• Cardiac: CTR >0.5 on PA = cardiomegaly
• Fractures: Salter-Harris if growth plate; displacement (mm), angulation (degrees), comminution, intra-articular
• MSK: Ottawa Ankle/Knee Rules; posterior fat pad sign (elbow); Segond fracture

CRITICAL FINDINGS (emergent — immediate communication required):
Tension pneumothorax · Massive PE with RV strain · Acute aortic dissection/rupture · Spinal cord compression · ICH (SAH/SDH/EDH/IPH) · Free intraperitoneal air · Airway compromise · Mispositioned ETT/central line · Massive hemothorax · Cauda equina compression

━━━ MANDATORY CARE PLAN RULES ━━━
RULE 1: Every finding where "abnormal":true MUST have "differentials" with exactly 2-4 items. No exceptions.
RULE 2: Every finding where "abnormal":false MUST have "differentials":[]
RULE 3: Confidence percentages across all differentials for one finding should roughly sum to 100.
RULE 4: Action field format = "Drug name Dose Route Frequency × Duration. Guideline source." OR "Procedure: name + timing + approach."
RULE 5: followUp must include specific timeframe (days/weeks) and return precautions.

CONCRETE EXAMPLE — chest X-ray with RLL consolidation:
{"detectedModality":"PA Chest Radiograph","quality":"Adequate — diagnostic","technique":"PA projection, upright","findings":[{"system":"Pulmonary","finding":"Right lower lobe consolidation with air bronchograms, ~4cm, no cavitation","abnormal":true,"severity":"moderate","differentials":[{"confidence":74,"label":"Community-Acquired Pneumonia (bacterial)","icd10":"J18.9","action":"Amoxicillin-clavulanate 875/125mg PO BID × 5 days. If PCN allergy: Doxycycline 100mg PO BID × 5 days. Azithromycin 500mg PO day 1, then 250mg QD × 4d if atypical suspected. (IDSA/ATS 2019)","disposition":"outpatient","followUp":"Return immediately if SpO2 <94%, RR >30, unable to maintain oral intake, or fever persists >72h. Repeat CXR in 6 weeks post-treatment to confirm resolution and exclude underlying mass.","referral":null},{"confidence":18,"label":"Lung Abscess / Necrotizing Pneumonia","icd10":"J85.1","action":"CT chest with contrast urgently. IV ampicillin-sulbactam 3g IV q6h OR piperacillin-tazobactam 3.375g IV q6h. Pulmonology consultation for bronchoscopy consideration.","disposition":"admit","followUp":"Repeat CT chest at 4-6 weeks post-discharge. Pulmonology follow-up within 1 week. Prolonged antibiotics typically 4-6 weeks total.","referral":"Pulmonology"},{"confidence":8,"label":"Peripheral Lung Malignancy","icd10":"C34.31","action":"CT chest with contrast within 1-2 weeks. PET-CT if CT confirms suspicious mass. Low-dose CT screening if meets USPSTF criteria (50-80yo, 20 pack-year history).","disposition":"outpatient","followUp":"Pulmonology/Oncology referral if CT confirms mass. If lesion resolves on repeat CXR at 6 weeks, malignancy less likely but document resolution. Non-resolution = tissue diagnosis required.","referral":"Pulmonology / Oncology"}]},{"system":"Cardiac","finding":"Normal cardiac silhouette, CTR 0.44","abnormal":false,"severity":"normal","differentials":[]},{"system":"Pleura","finding":"No pleural effusion. Costophrenic angles sharp bilaterally.","abnormal":false,"severity":"normal","differentials":[]},{"system":"Bones","finding":"No acute osseous abnormality. Ribs intact.","abnormal":false,"severity":"normal","differentials":[]}],"impression":"Right lower lobe consolidation most consistent with community-acquired pneumonia. No pleural effusion or pneumothorax. No cardiomegaly.","criticalFindings":[],"urgency":"urgent","icd10Codes":[{"code":"J18.9","description":"Pneumonia, unspecified organism"}],"recommendations":["Obtain sputum cultures if admitted","CURB-65 score to guide admit vs. outpatient decision","COVID-19 and influenza testing per institutional protocol","Blood cultures × 2 if febrile and CURB-65 ≥2"],"nextImaging":"Repeat CXR in 6 weeks to confirm resolution","radiologistReviewRequired":true,"confidence":78,"limitations":"Cannot distinguish bacterial from atypical or viral etiology on imaging alone. Clinical correlation with labs (CBC, CRP, procalcitonin) required.","correlateWith":["CBC with differential","CRP / procalcitonin","Blood cultures","SpO2","CURB-65 score"]}

Now analyze the provided image using the same structure. Return ONLY valid JSON — no markdown, no explanation, no text outside the JSON object.`;

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
    : `Patient: ${patientAge || "age unknown"}yo ${patientSex || "sex unknown"}. Modality requested: ${modality || "auto-detect from image"}. Clinical question: ${clinicalQuestion || "general preliminary read"}. Clinical context: ${clinicalContext || "none provided"}.

Systematically analyze this image following the ABCDE (or equivalent) approach. Apply all evidence-based criteria. Follow MANDATORY CARE PLAN RULES strictly — every abnormal finding MUST have 2-4 differentials with exact confidence %, specific drug/dose/route/frequency/duration treatments, disposition, follow-up with timeframe, and referral. Return ONLY valid JSON.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
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
