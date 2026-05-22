import { NextRequest, NextResponse } from "next/server";
import {
  exchangeGoogleCode,
  verifyOAuthState,
} from "@/lib/integrations/google/auth";
import { upsertOAuthToken } from "@/lib/db/oauth";
import { activateSkill } from "@/lib/db/skills";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return htmlPage("No se pudo conectar Google", String(error));
  }

  if (!code || !state) {
    return htmlPage("Error", "Faltan parámetros de Google OAuth.");
  }

  const userId = await verifyOAuthState(state);
  if (!userId) {
    return htmlPage("Link expirado", "Pedí /connect google de nuevo en Telegram.");
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    await upsertOAuthToken({
      userId,
      provider: "google",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      scope: tokens.scope,
    });
    await activateSkill(userId, "reuniones");

    return htmlPage(
      "Google conectado",
      "Calendar y Gmail listos. Volvé a Telegram y mandá /agenda.",
    );
  } catch (e) {
    console.error("[oauth/google]", e);
    return htmlPage("Error", "No se pudo guardar el token. Revisá logs del servidor.");
  }
}

function htmlPage(title: string, body: string): NextResponse {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:system-ui;background:#0f0f1a;color:#eee;padding:2rem">
<h1>${title}</h1><p>${body}</p><p>Podés cerrar esta ventana.</p></body></html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
