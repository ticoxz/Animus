import { getSupabase } from "@/lib/supabase/server";
import { buildProfileBlock } from "@/lib/memory/profile-prompt";
import type { SkillDefinition } from "@/lib/skills/base-skill";

function matchesMemoryCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t === "/memory" ||
    t === "qué sabés de mí" ||
    t === "que sabes de mi" ||
    t === "que sabés de mí"
  );
}

/** Equivalente al /memory de Evva — perfil + últimos hechos */
export const memorySkill: SkillDefinition = {
  id: "core_chat",
  description: "Mostrar memoria (perfil + hechos recientes)",
  matches: matchesMemoryCommand,
  handle: async ({ user }) => {
    const profileBlock = buildProfileBlock(user.profile);
    const supabase = getSupabase();

    let factsBlock = "_Todavía no hay hechos sueltos guardados._";
    if (supabase) {
      const { data: facts } = await supabase
        .from("memory_facts")
        .select("fact, category, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);

      if (facts?.length) {
        factsBlock = facts
          .map((f) => `• [${f.category}] ${f.fact}`)
          .join("\n");
      }
    }

    return (
      "🧠 <b>Lo que tengo de vos</b>\n\n" +
      profileBlock +
      "\n\n<b>Hechos recientes</b>\n" +
      factsBlock +
      "\n\nSi algo está mal, decime «olvidá que …» o corregime en el chat."
    );
  },
};
