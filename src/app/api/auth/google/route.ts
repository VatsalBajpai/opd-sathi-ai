import { NextResponse } from "next/server";

const rawClientId = (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
const clientId = rawClientId && !rawClientId.includes("YOUR_") ? rawClientId : "";

export async function GET() {
  return NextResponse.json({ configured: Boolean(clientId), clientId: clientId || undefined });
}

export async function POST(request: Request) {
  try {
    if (!clientId) {
      return NextResponse.json({ message: "Google Sign-In is not configured yet." }, { status: 503 });
    }
    const body = await request.json() as { credential?: string };
    if (!body.credential) {
      return NextResponse.json({ message: "Missing Google credential." }, { status: 400 });
    }

    const verify = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.credential)}`, {
      cache: "no-store",
    });
    if (!verify.ok) {
      return NextResponse.json({ message: "Google could not verify this sign-in." }, { status: 401 });
    }

    const token = await verify.json() as {
      aud?: string;
      email?: string;
      email_verified?: string;
      name?: string;
      picture?: string;
      sub?: string;
      iss?: string;
    };

    const issuerOk = token.iss === "accounts.google.com" || token.iss === "https://accounts.google.com";
    if (!issuerOk || token.aud !== clientId || token.email_verified !== "true" || !token.email) {
      return NextResponse.json({ message: "Google credential did not match this OPD Saathi app." }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        email: token.email,
        name: token.name,
        picture: token.picture,
        id: token.sub,
      },
    });
  } catch {
    return NextResponse.json({ message: "Google sign-in verification failed." }, { status: 500 });
  }
}
