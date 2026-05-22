import { getSupabase } from "@/lib/supabase/server";
import { listActiveRuntimeSkills } from "@/lib/runtime-skills/db";
import { generateAndCreateRuntimeSkill } from "@/lib/runtime-skills/generate";

const MIN_TOOLS_FOR_NUDGE = 2;
const MIN_REPLY_CHARS = 500;

function scoreKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter((k) => k.length > 2 && lower.includes(k.toLowerCase()))
    .length;
}

export async function shouldOfferSkillNudge(input: {
  userId: string;
  toolsUsed: string[];
  assistantReply: string;
  userMessage: string;
}): Promise<boolean> {
  const msg = input.userMessage.trim();
  if (/^(sí|si|no|ok|gracias|dale|\/)/i.test(msg)) {
    return false;
  }
  if (/\b(skill|habilidad|migrate)\b/i.test(msg)) {
    return false;
  }

  const skills = await listActiveRuntimeSkills(input.userId);
  if (skills.some((s) => scoreKeywords(msg, s.keywords) >= 2)) {
    return false;
  }

  const supabase = getSupabase();
  if (supabase) {
    const since = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("runtime_skills")
      .select("id")
      .eq("user_id", input.userId)
      .gte("created_at", since)
      .limit(1);
    if (data?.length) return false;
  }

  return (
    input.toolsUsed.length >= MIN_TOOLS_FOR_NUDGE ||
    input.assistantReply.length >= MIN_REPLY_CHARS
  );
}

export async function createSkillNudge(input: {
  userId: string;
  userMessage: string;
  assistantSummary: string;
  toolsUsed: string[];
}): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  // Una sola nudge pendiente por usuario
  await supabase
    .from("skill_nudges")
    .update({ status: "dismissed", resolved_at: new Date().toISOString() })
    .eq("user_id", input.userId)
    .eq("status", "pending");

  const { data, error } = await supabase
    .from("skill_nudges")
    .insert({
      user_id: input.userId,
      user_message: input.userMessage.slice(0, 500),
      assistant_summary: input.assistantSummary.slice(0, 800),
      tools_used: input.toolsUsed,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[skill-nudge] create", error);
    return null;
  }

  return data.id as string;
}

export function buildSkillNudgeMessage(summary: string): {
  text: string;
  inlineKeyboard: Array<Array<{ text: string; callback_data: string }>>;
} {
  const preview =
    summary.length > 120 ? `${summary.slice(0, 117)}…` : summary;

  return {
    text:
      "\n\n💡 <b>¿Guardo esto como skill?</b>\n" +
      `Así la próxima vez lo hago en un paso.\n<i>${preview}</i>`,
    inlineKeyboard: [
      [
        { text: "✅ Sí, crear skill", callback_data: "runtime:nudge:yes:PLACEHOLDER" },
        { text: "No", callback_data: "runtime:nudge:no:PLACEHOLDER" },
      ],
    ],
  };
}

export function attachNudgeIdToKeyboard(
  keyboard: Array<Array<{ text: string; callback_data: string }>>,
  nudgeId: string,
): Array<Array<{ text: string; callback_data: string }>> {
  return keyboard.map((row) =>
    row.map((btn) => ({
      ...btn,
      callback_data: btn.callback_data.replace("PLACEHOLDER", nudgeId),
    })),
  );
}

export async function handleSkillNudgeCallback(
  userId: string,
  nudgeId: string,
  accept: boolean,
): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) return "Sin base de datos.";

  const { data: nudge } = await supabase
    .from("skill_nudges")
    .select("user_message, assistant_summary, status")
    .eq("id", nudgeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!nudge || nudge.status !== "pending") {
    return (
      "Ese botón ya venció (solo vale unos minutos).\n\n" +
      "Para guardar el chat completo: <code>/migrate-to-skills</code>"
    );
  }

  const now = new Date().toISOString();

  if (!accept) {
    await supabase
      .from("skill_nudges")
      .update({ status: "dismissed", resolved_at: now })
      .eq("id", nudgeId);
    return "Dale, no lo guardo como skill.";
  }

  await supabase
    .from("skill_nudges")
    .update({ status: "accepted", resolved_at: now })
    .eq("id", nudgeId);

  const prompt =
    `Creá un skill reutilizable basado en esta conversación.\n` +
    `Usuario: ${nudge.user_message}\n` +
    `Lo que resolví: ${nudge.assistant_summary}`;

  return generateAndCreateRuntimeSkill(userId, prompt);
}
