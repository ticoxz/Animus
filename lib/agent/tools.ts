import {
  createCalendarEvent,
  listUpcomingEvents,
  formatEventsForTelegram,
} from "@/lib/integrations/google/calendar";
import { normalizeWeatherCity } from "@/lib/integrations/weather-places";
import { getGoogleAccessToken } from "@/lib/integrations/google/auth";
import { getWeather } from "@/lib/integrations/weather";
import { searchPastChats } from "@/lib/memory/session-search";
import { retrieveRelevantMemory } from "@/lib/memory/retrieve";
import { webSearch } from "@/lib/integrations/search";
import { listActiveRuntimeSkills } from "@/lib/runtime-skills/db";
import { tryRuntimeSkillDispatch } from "@/lib/runtime-skills/dispatch";
import type { DbUser } from "@/lib/db/users";

export const AGENT_TOOL_NAMES = [
  "search_memory_facts",
  "search_past_chats",
  "get_calendar_events",
  "create_calendar_event",
  "get_weather",
  "web_search",
  "list_my_skills",
  "run_custom_skill",
] as const;

export const AGENT_TOOL_SCHEMAS = [
  {
    type: "function" as const,
    function: {
      name: "search_memory_facts",
      description:
        "Busca hechos y perfil guardados del usuario. Usar antes de afirmar qué sabés de él.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Tema a buscar" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_past_chats",
      description:
        "Busca en conversaciones anteriores con el usuario (como Hermes FTS).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Palabras clave" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_calendar_events",
      description: "Próximos eventos de Google Calendar si está conectado.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_calendar_event",
      description:
        "Crea un evento en Google Calendar del usuario. Usar cuando pida anotar/agendar una reunión.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          start: {
            type: "string",
            description: "ISO local YYYY-MM-DDTHH:mm:ss",
          },
          end: { type: "string", description: "ISO fin" },
          description: { type: "string" },
        },
        required: ["title", "start", "end"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_weather",
      description: "Clima actual de una ciudad.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          country: { type: "string", description: "Código país ej CL" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description:
        "Toolset web (Hermes): busca en internet. Noticias, precios, datos actuales.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Consulta de búsqueda" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_my_skills",
      description: "Skills personalizados autocreados del usuario.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_custom_skill",
      description:
        "Ejecuta un skill autocreado del usuario si el texto encaja con sus keywords.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Mensaje o intención del usuario" },
        },
        required: ["message"],
      },
    },
  },
];

export async function executeAgentTool(
  user: DbUser,
  name: string,
  argsJson: string,
): Promise<string> {
  let args: Record<string, string> = {};
  try {
    args = JSON.parse(argsJson || "{}") as Record<string, string>;
  } catch {
    return JSON.stringify({ error: "invalid_json_args" });
  }

  switch (name) {
    case "search_memory_facts": {
      const block = await retrieveRelevantMemory({
        userId: user.id,
        query: args.query ?? "",
        profile: user.profile,
      });
      return JSON.stringify({
        memory: block.slice(0, 2500),
        hint: "Resumí en pocas líneas para el usuario; no pegues listas ni ### en la respuesta.",
      });
    }
    case "search_past_chats": {
      const lines = await searchPastChats(user.id, args.query ?? "");
      return JSON.stringify({ hits: lines });
    }
    case "get_calendar_events": {
      const token = await getGoogleAccessToken(user.id);
      if (!token) {
        return JSON.stringify({
          error: "google_not_connected",
          hint: "Pedile al usuario /connect google",
        });
      }
      const events = await listUpcomingEvents(user.id, 6);
      return JSON.stringify({ events: formatEventsForTelegram(events) });
    }
    case "create_calendar_event": {
      const token = await getGoogleAccessToken(user.id);
      if (!token) {
        return JSON.stringify({
          error: "google_not_connected",
          hint: "/connect google",
        });
      }
      const result = await createCalendarEvent(user.id, {
        summary: args.title ?? "Reunión",
        start: args.start ?? "",
        end: args.end ?? "",
        description: args.description,
        timeZone: user.timezone || "America/Santiago",
      });
      return JSON.stringify(result);
    }
    case "get_weather": {
      const norm = normalizeWeatherCity(args.city ?? "Santiago");
      const text = await getWeather(norm);
      return JSON.stringify({ weather: text });
    }
    case "web_search": {
      const text = await webSearch(args.query ?? "");
      return JSON.stringify({ results: text.slice(0, 2500) });
    }
    case "list_my_skills": {
      const skills = await listActiveRuntimeSkills(user.id);
      return JSON.stringify({
        skills: skills.map((s) => ({
          name: s.name,
          description: s.description,
          keywords: s.keywords,
        })),
      });
    }
    case "run_custom_skill": {
      const out = await tryRuntimeSkillDispatch(user, args.message ?? "");
      return JSON.stringify({
        ran: Boolean(out),
        output: out?.replace(/<[^>]+>/g, "").slice(0, 2000) ?? null,
      });
    }
    default:
      return JSON.stringify({ error: "unknown_tool" });
  }
}
