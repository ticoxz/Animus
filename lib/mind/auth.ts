import { cookies } from "next/headers";
import { getMindCookieName, verifyMindToken } from "@/lib/mind/jwt";

export async function getMindUserIdFromSession(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(getMindCookieName())?.value;
  if (!token) return null;
  const verified = await verifyMindToken(token);
  return verified?.userId ?? null;
}

export async function getMindUserIdFromRequest(
  request: Request,
): Promise<string | null> {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  if (queryToken) {
    const verified = await verifyMindToken(queryToken);
    return verified?.userId ?? null;
  }
  return getMindUserIdFromSession();
}
