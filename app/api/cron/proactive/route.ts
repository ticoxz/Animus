import { NextRequest, NextResponse } from "next/server";
import { runProactiveCron } from "@/lib/cron/proactive";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runProactiveCron();
  return NextResponse.json(result);
}
