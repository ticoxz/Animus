import { SignJWT, jwtVerify } from "jose";
import { getOAuthToken, upsertOAuthToken } from "@/lib/db/oauth";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

function secret(): Uint8Array {
  const s = process.env.MIND_JWT_SECRET ?? process.env.CRON_SECRET ?? "dev";
  return new TextEncoder().encode(s);
}

export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

export async function signOAuthState(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, p: "google" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(secret());
}

export async function verifyOAuthState(
  state: string,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(state, secret());
    if (payload.p !== "google" || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export function getGoogleAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/api/oauth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
}> {
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/api/oauth/google/callback`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) throw new Error(await res.text());

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

export async function refreshGoogleToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) throw new Error(await res.text());

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function getGoogleAccessToken(
  userId: string,
): Promise<string | null> {
  const token = await getOAuthToken(userId, "google");
  if (!token) return null;

  if (token.expires_at && new Date(token.expires_at) > new Date()) {
    return token.access_token;
  }

  if (!token.refresh_token) return null;

  try {
    const refreshed = await refreshGoogleToken(token.refresh_token);
    await upsertOAuthToken({
      userId,
      provider: "google",
      accessToken: refreshed.accessToken,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
    });
    return refreshed.accessToken;
  } catch (e) {
    console.error("[google] refresh failed", e);
    return null;
  }
}
