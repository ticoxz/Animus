import { completeChat } from "@/lib/llm/client";
import { getSkillStatus, offerSkill } from "@/lib/db/skills";
import { getSupabase } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/channels/telegram";
import type { DbUser } from "@/lib/db/users";
import type { SkillDefinition } from "@/lib/skills/base-skill";

const PLAN_PATTERN =
  /\b(plan del d[ií]a|qu[eé] hac[eé]s hoy|arm(ar|emos) el d[ií]a|mi d[ií]a|agenda de hoy)\b/i;

async function saveDayPlan(userId: string, planText: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const today = new Date().toISOString().slice(0, 10);

  const { data: user } = await supabase
    .from("users")
    .select("profile")
    .eq("id", userId)
    .single();

  if (!user) return;

  const profile = user.profile as Record<string, string>;
  const block = `[${today}] ${planText}`;
  const existing = profile.dated_plans ?? "";
  const lines = existing.split("\n").filter((l) => !l.startsWith(`[${today}]`));
  lines.push(block);

  await supabase
    .from("users")
    .update({
      profile: { ...profile, dated_plans: lines.join("\n").trim() },
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

async function handlePlanDia(user: DbUser, text: string, chatId?: number): Promise<string> {
  const status = await getSkillStatus(user.id, "plan_dia");

  if (status === "locked") {
    await offerSkill(user.id, "plan_dia");
    if (chatId) {
      await sendTelegramMessage(
        chatId,
        "Puedo ayudarte a armar el plan del día (sin ubicación, solo lo que me contés). ¿La activamos?",
        {
          inlineKeyboard: [
            [
              { text: "Sí, activar", callback_data: "skill:activate:plan_dia" },
              { text: "Ahora no", callback_data: "skill:decline:plan_dia" },
            ],
          ],
        },
      );
    }
    return "Te pregunté si querés activar Plan del día 👆";
  }

  if (status === "offered") {
    return "Activá Plan del día con el botón de arriba.";
  }

  const reply = await completeChat({
    system: `Sos Animus. Ayudá a armar el plan del día en español rioplatense.
Mensaje corto (máx 4 líneas). Si el usuario no dio detalle, hacé 2 preguntas concretas.
No inventes reuniones; si no hay calendario, solo lo que diga.`,
    user: text,
  });

  if (text.length > 15 && !text.endsWith("?")) {
    await saveDayPlan(user.id, text);
  }

  return reply;
}

export const planDiaSkill: SkillDefinition = {
  id: "plan_dia",
  description: "Plan del día por preguntas",
  matches: (text) => PLAN_PATTERN.test(text) || text === "/plan",
  handle: async ({ user, text, chatId }) => handlePlanDia(user, text, chatId),
};
