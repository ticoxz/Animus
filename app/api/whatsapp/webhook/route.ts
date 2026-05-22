import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook WhatsApp (Hermes messaging gateway — stub).
 * Verificar con WHATSAPP_VERIFY_TOKEN en GET; mensajes en POST.
 */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  // TODO: parse Meta payload → mismo orchestrator que Telegram
  await request.json();
  return NextResponse.json({ ok: true });
}
