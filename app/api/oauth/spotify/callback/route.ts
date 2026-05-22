import { NextRequest, NextResponse } from "next/server";

/** Stub Spotify OAuth (toolset Hermes spotify). */
export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    return new NextResponse(`Spotify error: ${error}`, { status: 400 });
  }
  return new NextResponse(
    "Spotify OAuth: configurá SPOTIFY_CLIENT_ID/SECRET (ver docs Hermes toolset spotify).",
    { status: 501 },
  );
}
