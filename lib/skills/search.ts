import { webSearch } from "@/lib/integrations/search";
import type { SkillDefinition } from "@/lib/skills/base-skill";

export const searchSkill: SkillDefinition = {
  id: "core_chat",
  description: "Toolset web (Hermes)",
  matches: (text) => /^(buscar|buscá|search)\s+/i.test(text),
  handle: async ({ text }) => {
    const query = text.replace(/^(buscar|buscá|search)\s+/i, "").trim();
    if (!query) return "Decime qué querés buscar. Ej: buscar clima mañana Santiago";
    return await webSearch(query);
  },
};
