import { buildHermesStatusMessage } from "@/lib/agent/status";
import { recordAgentRun } from "@/lib/agent/last-run";
import { runAgent, isAgentModeEnabled } from "@/lib/agent/run";
import { completeChat } from "@/lib/llm/client";
import { getRecentChatTurns } from "@/lib/db/messages";
import { answerIdentityQuestion } from "@/lib/memory/user-name";
import { buildChatSystemPrompt } from "@/lib/memory/retrieve";
import { applyVoiceStyleFromMessage } from "@/lib/memory/voice-style";
import { createMindUrl } from "@/lib/mind/jwt";
import { getUserSkills, SKILL_LABELS } from "@/lib/db/skills";
import type { SkillId } from "@/lib/types";
import { reloadUser, type DbUser } from "@/lib/db/users";
import type { SkillDefinition } from "@/lib/skills/base-skill";

const ALWAYS_ACTIVE: SkillId[] = ["core_chat"];

function skillLine(id: SkillId, status: string | undefined): string {
  const label = SKILL_LABELS[id] ?? id;
  if (ALWAYS_ACTIVE.includes(id) || status === "active") {
    return `✅ ${label} — activa`;
  }
  if (status === "offered") {
    return `🟡 ${label} — te la ofrecí, confirmá con el botón`;
  }
  return `🔒 ${label} — pedila cuando quieras`;
}

async function handleCoreChatLogic(user: DbUser, text: string): Promise<string> {
  if (text === "/agent" || text === "/hermes" || text === "modo agente") {
    return buildHermesStatusMessage();
  }

  if (text === "Ayuda" || text === "/help") {
    const agentNote = isAgentModeEnabled()
      ? "\n🧠 <b>Modo agente</b> activo — uso tools (memoria, web, calendario…). /agent\n"
      : "";
    return (
      "Estoy para charlar, recordar lo importante y — cuando quieras — " +
      "activar skills: gastos, reuniones, nutrición." +
      agentNote +
      "\n\nComandos: /memory · /mind · /skills · /migrate-to-skills · /curator · /agent\n" +
      "/agenda · /integrations · /connect google\n" +
      "/help · /reset\n" +
      "Botones: Qué podés hacer · Mis skills · Parar hoy"
    );
  }

  if (text === "/mind") {
    const url = await createMindUrl(user.id);
    if (!url) {
      return (
        "Configurá <code>APP_BASE_URL</code> en el servidor (ej. https://tu-app.vercel.app) " +
        "y volvé a probar /mind."
      );
    }
    const localhostNote = url.includes("localhost")
      ? "\n\n⚠️ Ese link solo abre en tu Mac. En el celular, poné en <code>.env.local</code> tu URL de ngrok:\n<code>APP_BASE_URL=https://tu-url.ngrok-free.dev</code>"
      : "";

    return (
      "Abrí tu cerebro en la web (link válido 15 min):\n" +
      url +
      "\n\nSolo vos ves tu grafo." +
      localhostNote
    );
  }

  if (
    text === "Qué podés hacer" ||
    /qu[eé]\s*pod[eé]s\s*hacer/i.test(text)
  ) {
    return (
      "Puedo:\n" +
      "• Charlar y armar tu perfil con el tiempo\n" +
      "• Ver tu cerebro en /mind (grafo de conexiones)\n" +
      "• Anotar gastos (cuando actives esa skill)\n" +
      "• Avisarte antes de reuniones (Google Calendar — /connect google)\n" +
      "• Clima, web search (toolset Hermes), WhatsApp/Spotify (config)\n" +
      "• Sugerir comida con foto de tu heladera\n\n" +
      "Nada te molesta solo hasta que actives avisos por skill."
    );
  }

  if (text === "Mis skills") {
    const rows = await getUserSkills(user.id);
    const statusMap = Object.fromEntries(rows.map((r) => [r.skill_id, r.status]));
    const lines = (
      ["core_chat", "gastos", "plan_dia", "reuniones", "nutricion"] as SkillId[]
    ).map((id) => skillLine(id, statusMap[id]));
    return (
      "Tus skills:\n" +
      lines.join("\n") +
      "\n\n✅ Grafo web — /mind\n" +
      "Para activar: decime «gasté…» o «¿qué hacés hoy?»"
    );
  }

  if (text === "Parar hoy") {
    return "Listo. Hoy no te escribo por mi cuenta. Podés seguir charlando cuando quieras.";
  }

  if (text === "/reset") {
    return "Sesión reiniciada en este chat. Tu memoria guardada sigue; solo arranco fresco acá.";
  }

  const identityReply = await answerIdentityQuestion(user, text);
  if (identityReply) return identityReply;

  // Fragmentos sueltos (lugar, fecha, hora) sin contexto claro
  if (
    !text.includes("?") &&
    text.split("\n").filter((l) => l.trim()).length >= 3 &&
    text.length < 120
  ) {
    return (
      "Recibí varios datos sueltos (lugar, fecha, hora…). ¿Querés que guarde tu ciudad, " +
      "una reunión, o era otra cosa? Decime en una frase y lo anoto bien."
    );
  }

  const fresh = (await reloadUser(user.id)) ?? user;
  const { profile: chatProfile, applied: voiceSaved } =
    await applyVoiceStyleFromMessage(fresh.id, fresh.profile, text);
  const chatUser = { ...fresh, profile: chatProfile };

  if (voiceSaved && text.length < 160) {
    return (
      "Listo che, de ahora en más te hablo en <b>español paraguayo</b> nomás 🇵🇾 " +
      "(sin chilenismos ni inglés). ¿En qué te ayudo?"
    );
  }

  const history = await getRecentChatTurns(user.id, 8);
  const contextQuery = [
    ...history.filter((t) => t.role === "user").map((t) => t.content),
    text,
  ]
    .join(" ")
    .slice(-500);

  const system = await buildChatSystemPrompt({
    userId: user.id,
    userMessage: contextQuery,
    profile: chatProfile,
  });

  // Excluir el mensaje actual si ya está al final del historial
  const priorTurns =
    history.length && history[history.length - 1]?.content === text
      ? history.slice(0, -1)
      : history;

  if (isAgentModeEnabled()) {
    const agentResult = await runAgent({
      user: chatUser,
      system,
      userMessage: text,
      history: priorTurns,
    });
    if (agentResult) {
      recordAgentRun(user.id, agentResult);
      return agentResult.reply;
    }
  }

  return completeChat({
    system,
    user: text,
    history: priorTurns,
  });
}

export const coreChatSkill: SkillDefinition = {
  id: "core_chat",
  description: "Conversación general con memoria recuperada",
  matches: () => false,
  handle: async ({ user, text }) => handleCoreChatLogic(user, text),
};
