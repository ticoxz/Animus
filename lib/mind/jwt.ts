import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "animus_mind_session";
const EXPIRY = "15m";

function getSecret(): Uint8Array {
  const secret =
    process.env.MIND_JWT_SECRET ?? process.env.CRON_SECRET ?? "dev-mind-secret";
  return new TextEncoder().encode(secret);
}

export async function createMindToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

export async function verifyMindToken(
  token: string,
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub;
    if (!sub || typeof sub !== "string") return null;
    return { userId: sub };
  } catch {
    return null;
  }
}

export function getMindCookieName(): string {
  return COOKIE_NAME;
}

export function mindSessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  };
}

export async function createMindUrl(userId: string): Promise<string | null> {
  const base = process.env.APP_BASE_URL ?? process.env.VERCEL_URL;
  if (!base) return null;

  const host = base.startsWith("http") ? base : `https://${base}`;
  const token = await createMindToken(userId);
  return `${host}/api/mind/session?token=${encodeURIComponent(token)}`;
}
