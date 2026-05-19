import { completeChat } from "@/lib/llm/client";
import { buildProfileBlock, BASE_SYSTEM_PROMPT } from "@/lib/memory/profile-prompt";
import type { DbUser } from "@/lib/db/users";
import type { SkillDefinition } from "@/lib/skills/base-skill";

async function handleCoreChatLogic(user: DbUser, text: string): Promise<string> {
  const system = `${BASE_SYSTEM_PROMPT}\n\n${buildProfileBlock(user.profile)}`;

  if (text === "Ayuda" || text === "/help") {
    return (
      "Estoy para charlar, recordar lo importante y — cuando quieras — " +
      "activar skills: gastos, reuniones, nutrición.\n\n" +
      "Comandos: /memory · /help · /reset\n" +
      "Botones: Qué podés hacer · Mis skills · Parar hoy"
    );
  }

  if (text === "Qué podés hacer") {
    return (
      "Puedo:\n" +
      "• Charlar y armar tu perfil con el tiempo\n" +
      "• Anotar gastos (cuando actives esa skill)\n" +
      "• Avisarte antes de reuniones (con tu agenda)\n" +
      "• Sugerir comida con foto de tu heladera\n" +
      "• Cerrar el día con prioridades\n\n" +
      "Nada te molesta solo hasta que actives avisos por skill."
    );
  }

  if (text === "Mis skills") {
    return (
      "Skills (MVP en construcción):\n" +
      "✅ Charla — activa\n" +
      "🔒 Gastos — decime «gasté X» para ofrecerla\n" +
      "🔒 Reuniones — mencioná una call\n" +
      "🔒 Nutrición — mandá foto de ingredientes"
    );
  }

  if (text === "Parar hoy") {
    return "Listo. Hoy no te escribo por mi cuenta. Podés seguir charlando cuando quieras.";
  }

  if (text === "/reset") {
    return "Sesión reiniciada en este chat. Tu memoria guardada sigue; solo arranco fresco acá.";
  }

  return completeChat({ system, user: text });
}

export const coreChatSkill: SkillDefinition = {
  id: "core_chat",
  description: "Conversación general con memoria en prompt",
  matches: () => false,
  handle: async ({ user, text }) => handleCoreChatLogic(user, text),
};
