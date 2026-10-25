import { NextResponse } from "next/server";

function configured(value?: string) {
  return Boolean(value && value.trim() && !value.includes("YOUR_"));
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "opd-saathi-ai",
    time: new Date().toISOString(),
    integrations: {
      ai: configured(process.env.OPENAI_API_KEY),
      googleAuth: configured(process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
      googlePlaces: configured(process.env.GOOGLE_MAPS_API_KEY),
      googleEmbed: configured(process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY),
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
