import { getWeather } from "@/lib/integrations/weather";
import { normalizeWeatherCity } from "@/lib/integrations/weather-places";
import type { SkillDefinition } from "@/lib/skills/base-skill";

export const weatherSkill: SkillDefinition = {
  id: "contexto_vida",
  description: "Clima por ciudad (wttr.in)",
  matches: (text) =>
    /\b(clima|tiempo|temperatura|lluvia|va a llover)\b/i.test(text) ||
    /^clima en /i.test(text),
  handle: async ({ text }) => {
    const m = text.match(/clima en\s+(.+)/i) || text.match(/tiempo en\s+(.+)/i);
    const raw = m?.[1]?.trim() ?? "Santiago";
    const { city, country } = normalizeWeatherCity(raw);
    return getWeather({ city, country });
  },
};
