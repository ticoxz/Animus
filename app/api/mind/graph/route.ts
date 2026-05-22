import { NextRequest, NextResponse } from "next/server";
import { getMindUserIdFromSession } from "@/lib/mind/auth";
import { buildMindGraph, getNodeFacts } from "@/lib/mind/graph-builder";

export async function GET(request: NextRequest) {
  const userId = await getMindUserIdFromSession();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nodeId = request.nextUrl.searchParams.get("nodeId");
  if (nodeId) {
    const facts = await getNodeFacts(userId, nodeId);
    return NextResponse.json({ facts });
  }

  const graph = await buildMindGraph(userId);
  return NextResponse.json(graph);
}
