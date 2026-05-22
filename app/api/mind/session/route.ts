import { NextRequest, NextResponse } from "next/server";
import {
  getMindCookieName,
  mindSessionCookieOptions,
  verifyMindToken,
} from "@/lib/mind/jwt";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/mind?error=missing_token", request.url));
  }

  const verified = await verifyMindToken(token);
  if (!verified) {
    return NextResponse.redirect(new URL("/mind?error=invalid_token", request.url));
  }

  const res = NextResponse.redirect(new URL("/mind", request.url));
  res.cookies.set(getMindCookieName(), token, mindSessionCookieOptions());
  return res;
}
