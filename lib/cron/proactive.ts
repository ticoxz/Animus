import { runDailyBriefing } from "@/lib/cron/briefing";
import { runCuratorAllUsers } from "@/lib/runtime-skills/curator";

/**
 * Proactividad (Nivel 2): briefing calendario si skill reuniones + proactive_enabled.
 */
export async function runProactiveCron(): Promise<{
  ok: boolean;
  sent: number;
  message: string;
}> {
  const supabaseConfigured = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (!supabaseConfigured) {
    return { ok: true, sent: 0, message: "Cron OK — Supabase no configurado" };
  }

  const sent = await runDailyBriefing();
  const curator = await runCuratorAllUsers();

  return {
    ok: true,
    sent,
    message:
      sent > 0
        ? `Briefing: ${sent} · Curator archivó ${curator.archived} skill(s)`
        : `Cron OK · Curator: ${curator.archived} archivados · briefings: conectá Google + reuniones`,
  };
}
