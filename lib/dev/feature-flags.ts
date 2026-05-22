/** Estado de features para local / health (sin secretos). */

export type FeatureStatus = {
  id: string;
  name: string;
  enabled: boolean;
  hint: string;
};

export function getCoreFeatures(): FeatureStatus[] {
  const agentOn = process.env.AGENT_TOOLS_ENABLED !== "false";
  return [
    {
      id: "telegram",
      name: "Telegram webhook",
      enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      hint: "TELEGRAM_BOT_TOKEN",
    },
    {
      id: "supabase",
      name: "Supabase",
      enabled: Boolean(
        process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
      ),
      hint: "SUPABASE_URL + SERVICE_ROLE",
    },
    {
      id: "llm",
      name: `LLM (${process.env.LLM_PROVIDER ?? "minimax"})`,
      enabled: Boolean(
        process.env.MINIMAX_API_KEY || process.env.OPENAI_API_KEY,
      ),
      hint: "MINIMAX_API_KEY u OPENAI_API_KEY",
    },
    {
      id: "agent",
      name: "Modo agente (tools)",
      enabled: agentOn,
      hint: "AGENT_TOOLS_ENABLED=true",
    },
    {
      id: "mind",
      name: "Grafo /mind",
      enabled: Boolean(
        process.env.MIND_JWT_SECRET && process.env.APP_BASE_URL,
      ),
      hint: "MIND_JWT_SECRET + APP_BASE_URL (ngrok en local)",
    },
  ];
}

export function getOptionalFeatures(): FeatureStatus[] {
  const searchProvider = process.env.SEARCH_PROVIDER ?? "brave";
  const searchKey =
    searchProvider === "tavily"
      ? process.env.TAVILY_API_KEY
      : searchProvider === "duckduckgo"
        ? "ok"
        : process.env.BRAVE_SEARCH_API_KEY;

  return [
    {
      id: "web_search",
      name: `Web search (${searchProvider})`,
      enabled: Boolean(searchKey),
      hint:
        searchProvider === "tavily"
          ? "TAVILY_API_KEY"
          : searchProvider === "duckduckgo"
            ? "sin key"
            : "BRAVE_SEARCH_API_KEY",
    },
    {
      id: "google",
      name: "Google Calendar",
      enabled: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      ),
      hint: "GOOGLE_* + /connect google",
    },
    {
      id: "cron",
      name: "Cron briefing + curator",
      enabled: Boolean(process.env.CRON_SECRET),
      hint: "CRON_SECRET + scripts/test-cron.sh",
    },
    {
      id: "groq_voice",
      name: "Voz (Whisper)",
      enabled: Boolean(process.env.GROQ_API_KEY),
      hint: "GROQ_API_KEY — BACKLOG handler",
    },
    {
      id: "spotify",
      name: "Spotify",
      enabled: Boolean(
        process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET,
      ),
      hint: "SPOTIFY_* — OAuth stub",
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      enabled: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
      hint: "WHATSAPP_* — stub",
    },
    {
      id: "browser",
      name: "Browser automation",
      enabled: false,
      hint: "BACKLOG — requiere VPS 4GB+",
    },
    {
      id: "mcp",
      name: "MCP connectors",
      enabled: false,
      hint: "BACKLOG Fase 3",
    },
  ];
}

export function getImplementedSkills(): string[] {
  return [
    "core_chat (chat + agent)",
    "memory (/memory)",
    "gastos",
    "plan_dia",
    "reuniones + /agenda",
    "weather / clima",
    "search (buscar …)",
    "integrations (/connect google)",
    "skill_creator (/skills, /migrate-to-skills)",
  ];
}

export const MIGRATION_FILES = [
  "001_initial.sql",
  "002_memory_facts.sql",
  "003_memory_bank.sql",
  "004_integrations.sql",
  "005_runtime_skills.sql",
  "006_skill_curator.sql",
];
