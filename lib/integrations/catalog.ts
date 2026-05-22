import type { IntegrationMeta } from "@/lib/integrations/types";
import { getWebSearchStatus } from "@/lib/integrations/search";

/** Integraciones disponibles en Animus (Telegram). */
export const INTEGRATION_CATALOG: IntegrationMeta[] = [
  {
    id: "google",
    name: "Google Calendar",
    description: "Agenda y reuniones (OAuth)",
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"],
    requiresOAuth: true,
    telegramKeywords: /google|calendario|agenda|conectar google/i,
  },
  {
    id: "spotify",
    name: "Spotify",
    description: "Música (Spotify — stub)",
    envVars: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
    requiresOAuth: true,
    telegramKeywords: /spotify|playlist/i,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "WhatsApp (stub)",
    envVars: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
    requiresOAuth: false,
    telegramKeywords: /whatsapp|wsp/i,
  },
  {
    id: "weather",
    name: "Clima",
    description: "wttr.in — sin API key",
    envVars: [],
    requiresOAuth: false,
    telegramKeywords: /clima|tiempo|temperatura|lluvia/i,
  },
  {
    id: "search",
    name: "Web search",
    description: `Toolset web · ${getWebSearchStatus()}`,
    envVars: ["BRAVE_SEARCH_API_KEY", "TAVILY_API_KEY"],
    requiresOAuth: false,
    telegramKeywords: /buscar|buscá|search web|internet/i,
  },
  {
    id: "voice",
    name: "Voz (transcripción)",
    description: "Groq Whisper — BACKLOG",
    envVars: ["GROQ_API_KEY"],
    requiresOAuth: false,
    telegramKeywords: /transcribir|nota de voz/i,
  },
];

export function listIntegrationsStatus(): string {
  const lines = INTEGRATION_CATALOG.map((i) => {
    const configured =
      i.envVars.length === 0 ||
      i.envVars.some((v) => Boolean(process.env[v]));
    const icon = configured ? "✅" : "🔧";
    return `${icon} <b>${i.name}</b> — ${i.description}`;
  });

  return (
    "<b>Integraciones</b>\n\n" +
    lines.join("\n") +
    "\n\nModo agente: <code>/agent</code>\n" +
    "Web: <code>SEARCH_PROVIDER</code>=brave|tavily|duckduckgo\n" +
    "Google: <code>/connect google</code> · Agenda: <code>/agenda</code>"
  );
}
