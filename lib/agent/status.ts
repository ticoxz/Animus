import { AGENT_TOOL_NAMES } from "@/lib/agent/tools";
import { getWebSearchStatus } from "@/lib/integrations/search";

export function isHermesModeActive(): boolean {
  return process.env.AGENT_TOOLS_ENABLED !== "false";
}

export function buildHermesStatusMessage(): string {
  const on = isHermesModeActive();
  const tools = AGENT_TOOL_NAMES.join(", ");
  const web = getWebSearchStatus();
  const google = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  return (
    `<b>Modo agente</b>: ${on ? "✅ activo" : "❌ apagado"}\n\n` +
    (on
      ? "El modelo elige tools antes de responder (memoria, web, calendario…).\n\n"
      : "Activá con <code>AGENT_TOOLS_ENABLED=true</code> y reiniciá.\n\n") +
    `<b>Tools</b>: ${tools}\n` +
    `<b>Web</b> (${process.env.SEARCH_PROVIDER ?? "brave"}): ${web}\n` +
    `<b>Calendar</b>: ${google ? "✅ OAuth config" : "⚪"} · /connect google\n\n` +
    "Probá: «¿qué sabés de mí?», «¿hablamos de X?», «buscá noticias IA»"
  );
}
