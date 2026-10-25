import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are Saathi, a friendly, clear and multilingual general-purpose assistant inside OPD Saathi, a hackathon demonstration for accessible government hospital services.

You can answer everyday questions and explain concepts, help with hospital logistics, and communicate in English, Hindi or Kannada as the user prefers. Your answers are not limited to navigation. Keep replies concise but genuinely helpful.

The hospital is FICTIONAL. Its demo departments are:
Ground: Reception G-01, Emergency G-02, Pharmacy G-03, Sample collection G-04.
First floor: General medicine 1-101, Pediatrics 1-102, Cardiology 1-103, Orthopedics 1-104.
Second floor: Radiology 2-201, Pathology 2-202, Physiotherapy 2-203, Billing & insurance 2-204.
Third floor: Administration 3-301, Counselling 3-302, Ward A 3-303, Ward B 3-304.
All demo floors have a lift; the app draws illustrative routes only, not surveyed maps.

Never claim access to medical records, true real-time queues, hospital staff, locations, clinical policies, or verified emergency routing. Do not diagnose, prescribe, give personalized treatment or provide definitive triage. For symptoms, provide cautious general educational information and recommend a qualified clinician; for urgent or severe symptoms, tell the person to seek urgent in-person medical attention or local emergency services immediately. Do not advise waiting in an OPD queue during an emergency. Avoid collecting personal identifiers, medical records, or sensitive health details. Never invent specifics about the fictional hospital.`;

type ChatMessage = { role: "user" | "assistant"; content: string };
type ResponsesContent = { type?: string; text?: string };
type ResponsesOutputItem = { type?: string; content?: ResponsesContent[] };
type ResponsesPayload = { output_text?: string; output?: ResponsesOutputItem[] };

function extractOutputText(data: ResponsesPayload): string {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const parts: string[] = [];
  for (const item of data.output ?? []) {
    if (item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if ((content.type === "output_text" || content.type === "text") && typeof content.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function requestedLanguage(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("answer in hindi") || lower.includes("please answer in hindi")) return "Hindi";
  if (lower.includes("answer in kannada") || lower.includes("please answer in kannada")) return "Kannada";
  return "English";
}

function stripLanguagePrefix(text: string) {
  return text.replace(/^please answer in (english|hindi|kannada)\.\s*/i, "").trim();
}

function demoReply(raw: string) {
  const lang = requestedLanguage(raw);
  const q = stripLanguagePrefix(raw).toLowerCase();

  let english = "I can help with hospital navigation, common medical terms, OPD preparation, queues, departments and general health education. For a real diagnosis or treatment decision, please speak with a qualified clinician.";

  if (/emergency|chest pain|cannot breathe|can't breathe|unconscious|severe bleeding|stroke/.test(q)) {
    english = "This may be urgent. Do not wait in an OPD queue. Seek emergency care immediately and use the Emergency Help button for 112 / 102 / 108 options in India.";
  } else if (/cardiology|heart/.test(q)) {
    english = "Cardiology is on the First Floor, room 1-103 in the simulated hospital. From the entrance, take the lift or stairs to Floor 1 and follow the highlighted route.";
  } else if (/pharmacy|medicine counter/.test(q)) {
    english = "The demo Pharmacy is on the Ground Floor, room G-03. Open Find a Department and select Pharmacy to see the route.";
  } else if (/emergency department|casualty/.test(q)) {
    english = "The demo Emergency department is on the Ground Floor, room G-02. For a real emergency, contact local emergency services rather than relying on this demo map.";
  } else if (/pediatric|paediatric|child/.test(q)) {
    english = "Pediatrics is on the First Floor, room 1-102 in the simulated hospital.";
  } else if (/orthopedic|orthopaedic|bone|joint/.test(q)) {
    english = "Orthopedics is on the First Floor, room 1-104 in the simulated hospital.";
  } else if (/radiology|x-ray|xray|ct|mri/.test(q)) {
    english = "Radiology is on the Second Floor, room 2-201 in the simulated hospital. CT/MRI availability at a real hospital should always be confirmed with that hospital.";
  } else if (/pathology|blood test|lab test|sample/.test(q)) {
    english = "Sample Collection is on the Ground Floor, room G-04, and Pathology is on the Second Floor, room 2-202 in the simulated hospital.";
  } else if (/ecg|electrocardiogram/.test(q)) {
    english = "An ECG (electrocardiogram) records the heart's electrical activity using small electrodes placed on the skin. It is painless and commonly used to check heart rhythm and other cardiac clues.";
  } else if (/opd|prepare|appointment|visit/.test(q)) {
    english = "For an OPD visit, keep your appointment details, identification, previous reports and medication list ready. Arrive early, register, collect your token, and use the navigation screen to find the department.";
  } else if (/token|queue|wait/.test(q)) {
    english = "Use My Visit & Token to generate a demo OPD token. The staff workspace can call the next token, so you can demonstrate both sides in separate browser tabs.";
  } else if (/where|department|navigate|floor/.test(q)) {
    english = "Open Find a Department, search by department or room number, select it, then switch between the 3D and 2D maps. The route updates immediately.";
  }

  if (lang === "Hindi") {
    return `डेमो मोड: ${english} यह उत्तर ऑफलाइन डेमो सहायक से आया है; असली AI के लिए OPENAI_API_KEY जोड़ें।`;
  }
  if (lang === "Kannada") {
    return `ಡೆಮೊ ಮೋಡ್: ${english} ಇದು ಆಫ್‌ಲೈನ್ ಡೆಮೊ ಸಹಾಯಕದ ಉತ್ತರ; ನೈಜ AIಗಾಗಿ OPENAI_API_KEY ಸೇರಿಸಿ.`;
  }
  return `${english}\n\nDemo mode: this answer works without an API key. Add OPENAI_API_KEY later to enable open-ended AI answers.`;
}

export async function GET() {
  const key = process.env.OPENAI_API_KEY?.trim();
  return NextResponse.json({ configured: Boolean(key && key !== "YOUR_OPENAI_API_KEY_HERE"), demoMode: !key || key === "YOUR_OPENAI_API_KEY_HERE" }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("messages" in body)) return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  const incoming = (body as { messages?: unknown }).messages;
  if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > 18) return NextResponse.json({ error: "Invalid conversation length" }, { status: 400 });

  const messages: ChatMessage[] = [];
  for (const item of incoming) {
    if (!item || typeof item !== "object") return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    const message = item as Partial<ChatMessage>;
    if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string" || message.content.length < 1 || message.content.length > 3000) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
    messages.push({ role: message.role, content: message.content });
  }
  if (messages[messages.length - 1].role !== "user") return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey === "YOUR_OPENAI_API_KEY_HERE") {
    return NextResponse.json({ reply: demoReply(messages[messages.length - 1].content), demoMode: true });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-6-luna",
        instructions: SYSTEM_PROMPT,
        input: messages.slice(-12).map((message) => ({ role: message.role, content: message.content })),
        max_output_tokens: 650,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const providerMessage = await response.text().catch(() => "");
      console.error("AI provider returned error", response.status, providerMessage.slice(0, 500));
      return NextResponse.json({ reply: demoReply(messages[messages.length - 1].content), demoMode: true, providerFallback: true });
    }

    const data = (await response.json()) as ResponsesPayload;
    const reply = extractOutputText(data);
    if (!reply) return NextResponse.json({ reply: demoReply(messages[messages.length - 1].content), demoMode: true, providerFallback: true });
    return NextResponse.json({ reply, demoMode: false });
  } catch (error) {
    console.error("AI request failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ reply: demoReply(messages[messages.length - 1].content), demoMode: true, providerFallback: true });
  } finally {
    clearTimeout(timer);
  }
}
