import { getSupabase } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/channels/telegram";
import {
  formatEventsForTelegram,
  listUpcomingEvents,
} from "@/lib/integrations/google/calendar";
import { getOAuthToken } from "@/lib/db/oauth";

/** Cronjob estilo Hermes — briefing para usuarios con Google + proactive. */
export async function runDailyBriefing(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const { data: skills } = await supabase
    .from("user_skills")
    .select("user_id, proactive_enabled")
    .eq("skill_id", "reuniones")
    .eq("status", "active")
    .eq("proactive_enabled", true);

  let sent = 0;

  for (const row of skills ?? []) {
    const google = await getOAuthToken(row.user_id, "google");
    if (!google) continue;

    const { data: user } = await supabase
      .from("users")
      .select("telegram_user_id")
      .eq("id", row.user_id)
      .single();

    if (!user?.telegram_user_id) continue;

    const events = await listUpcomingEvents(row.user_id, 5);
    const body =
      "☀️ <b>Briefing del día</b>\n\n" + formatEventsForTelegram(events);

    await sendTelegramMessage(Number(user.telegram_user_id), body);
    sent++;
  }

  return sent;
}
