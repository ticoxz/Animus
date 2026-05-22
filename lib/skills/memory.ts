import { getSupabase } from "@/lib/supabase/server";
import { buildProfileBlock } from "@/lib/memory/profile-prompt";
import type { SkillDefinition } from "@/lib/skills/base-skill";

function matchesMemoryCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t === "/memory" ||
    t === "mostrar memoria" ||
    t === "ver memoria" ||
    t === "ver mi memoria"
  );
}

/** Toolset memory (Hermes) — perfil + últimos hechos */
export const memorySkill: SkillDefinition = {
  id: "core_chat",
  description: "Mostrar memoria (perfil + hechos recientes)",
  matches: matchesMemoryCommand,
  handle: async ({ user }) => {
    const { flushFactExtractionNow } = await import(
      "@/lib/memory/extraction-queue"
    );
    await flushFactExtractionNow(user.id);

    const supabase = getSupabase();
    let profile = user.profile;
    if (supabase) {
      const { data: fresh } = await supabase
        .from("users")
        .select("profile")
        .eq("id", user.id)
        .single();
      if (fresh?.profile) profile = fresh.profile as typeof user.profile;
    }

    const profileBlock = buildProfileBlock(profile);

    let factsBlock = "_Todavía no hay hechos sueltos guardados._";
    let entitiesBlock = "";
    if (supabase) {
      const [{ data: facts }, { data: entities }] = await Promise.all([
        supabase
          .from("memory_facts")
          .select("fact, category, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("user_entities")
          .select("name, type")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(8),
      ]);

      if (facts?.length) {
        factsBlock = facts
          .map((f) => `• [${f.category}] ${f.fact}`)
          .join("\n");
      }

      if (entities?.length) {
        entitiesBlock =
          "\n\n<b>Entidades en tu grafo</b>\n" +
          entities.map((e) => `• [${e.type}] ${e.name}`).join("\n");
      }
    }

    return (
      "🧠 <b>Lo que tengo de vos</b>\n\n" +
      profileBlock +
      "\n\n<b>Hechos recientes</b>\n" +
      factsBlock +
      entitiesBlock +
      "\n\nVer grafo: /mind\n" +
      "Corregir: «olvidá que …»"
    );
  },
};
