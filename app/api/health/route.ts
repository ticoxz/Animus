import { NextResponse } from "next/server";
import {
  getCoreFeatures,
  getImplementedSkills,
  getOptionalFeatures,
  MIGRATION_FILES,
} from "@/lib/dev/feature-flags";
import { getLlmConfig } from "@/lib/llm/config";

export async function GET() {
  const llm = getLlmConfig();
  const core = getCoreFeatures();
  const optional = getOptionalFeatures();

  const ready = core.every((f) => f.enabled);

  const appUrl = process.env.APP_BASE_URL ?? "";
  const ngrokOk = !appUrl.includes("localhost");

  return NextResponse.json({
    ok: true,
    ready,
    service: "animus",
    channel: "telegram",
    phase: "local-dev",
    appBaseUrl: appUrl || null,
    ngrokRecommended: !ngrokOk,
    llmProvider: llm?.provider ?? null,
    core,
    optional,
    skills: getImplementedSkills(),
    migrations: MIGRATION_FILES,
    nextSteps: ready
      ? ngrokOk
        ? ["set-webhook.sh", "docs/LOCAL-COMPLETO.md checklist"]
        : ["Set APP_BASE_URL to ngrok", "restart dev", "set-webhook.sh"]
      : ["npm run check:env", "npm run verify:db"],
  });
}
