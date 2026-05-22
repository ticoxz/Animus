import { getRecentChatTurns } from "@/lib/db/messages";
import { getSupabase } from "@/lib/supabase/server";
import { listActiveRuntimeSkills } from "@/lib/runtime-skills/db";
import { generateAndCreateRuntimeSkill } from "@/lib/runtime-skills/generate";

/** Convierte el chat reciente en un runtime skill (Hermes procedural memory). */
export async function migrateChatToRuntimeSkill(
  userId: string,
): Promise<string> {
  const turns = await getRecentChatTurns(userId, 30);

  const relevant = turns.filter((t) => {
    const c = t.content.trim();
    if (!c || c.startsWith("/")) return false;
    if (/^(sí|si|no|ok|dale|listo|gracias)$/i.test(c)) return false;
    return true;
  });

  if (relevant.length < 4) {
    return (
      "Necesito más conversación para migrar.\n\n" +
      "Charlá un rato y volvé a mandar <code>/migrate-to-skills</code>."
    );
  }

  const existing = await listActiveRuntimeSkills(userId);
  const fitnessLike = existing.filter(
    (s) =>
      s.category === "fitness" ||
      /trainer|comida|press|entreno|variar|dieta/i.test(s.name),
  );

  const transcript = relevant
    .map((t) => `${t.role === "user" ? "Usuario" : "Animus"}: ${t.content}`)
    .join("\n\n");

  const consolidate =
    fitnessLike.length >= 2
      ? `Ya existen skills: ${fitnessLike.map((s) => s.name).join(", ")}. ` +
        `Creá UN solo skill unificado (nombre: fitness-coach-marcelo) que incluya entreno, comida y press banca. ` +
        `No repitas skills chicos.\n\n`
      : "";

  const prompt =
    consolidate +
    `Migrá esta conversación a UN skill (type "instructions").\n` +
    `Incluí: datos del usuario (edad, peso, gym 5d), rutina, comida sin gramos, press banca 75→80kg.\n\n` +
    `CONVERSACIÓN:\n${transcript.slice(0, 6500)}`;

  const result = await generateAndCreateRuntimeSkill(userId, prompt);

  if (fitnessLike.length >= 2 && result.includes("✅ Skill")) {
    const supabase = getSupabase();
    if (supabase) {
      const now = new Date().toISOString();
      for (const old of fitnessLike) {
        if (result.includes(old.name)) continue;
        await supabase
          .from("runtime_skills")
          .update({
            is_active: false,
            archived_at: now,
            updated_at: now,
          })
          .eq("user_id", userId)
          .eq("name", old.name);
      }
      return (
        result +
        `\n\n📦 Archivé ${fitnessLike.length} skill(s) viejos (quedó uno unificado). Ver <code>/skills</code>`
      );
    }
  }

  return result;
}
