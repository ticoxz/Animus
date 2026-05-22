import { findOrCreateUser } from "@/lib/db/users";
import { logMessage } from "@/lib/db/messages";
import { declineSkill } from "@/lib/db/skills";
import {
  parseTelegramUpdate,
  sendTelegramMessage,
  answerCallbackQuery,
  MAIN_KEYBOARD,
} from "@/lib/channels/telegram";
import { consumeAgentRunMeta } from "@/lib/agent/last-run";
import { dispatchSkill } from "@/lib/skills/registry";
import { enqueueFactExtraction } from "@/lib/memory/extraction-queue";
import { tryHandleForget } from "@/lib/memory/forget";
import {
  attachNudgeIdToKeyboard,
  buildSkillNudgeMessage,
  createSkillNudge,
  shouldOfferSkillNudge,
} from "@/lib/runtime-skills/nudge";
import { handleRuntimeCallback } from "@/lib/runtime-skills/handlers";
import {
  handleGastosCallback,
  handleSkillActivateCallback,
} from "@/lib/skills/gastos";
import type { SkillId } from "@/lib/types";

async function handleCallback(
  data: string,
  user: NonNullable<Awaited<ReturnType<typeof findOrCreateUser>>>,
  chatId: number,
): Promise<string> {
  const parts = data.split(":");
  const [prefix, action, id] = parts;

  if (prefix === "gastos" && (action === "yes" || action === "no") && id) {
    return handleGastosCallback(user, chatId, action, id);
  }

  if (prefix === "skill" && action === "activate" && id) {
    return handleSkillActivateCallback(
      user,
      id as "gastos" | "plan_dia" | "reuniones",
    );
  }

  if (prefix === "skill" && action === "decline" && id) {
    await declineSkill(user.id, id as SkillId);
    return "Ok, sin problema. Cuando quieras lo activamos.";
  }

  const runtimeReply = await handleRuntimeCallback(user.id, data);
  if (runtimeReply) return runtimeReply;

  return "No entendí ese botón.";
}

export async function handleTelegramUpdate(
  update: Record<string, unknown>,
): Promise<void> {
  const parsed = parseTelegramUpdate(update);
  if (!parsed) return;

  if (parsed.callback) {
    const { chatId, telegramUserId, callbackId, data, firstName, username } =
      parsed.callback;

    await answerCallbackQuery(callbackId);

    const user = await findOrCreateUser({
      telegramUserId,
      firstName,
      username,
    });

    const reply = user
      ? await handleCallback(data, user, chatId)
      : "Falta conectar Supabase.";

    await sendTelegramMessage(chatId, reply, { replyMarkup: MAIN_KEYBOARD });
    if (user) {
      await logMessage({ userId: user.id, role: "assistant", content: reply });
    }
    return;
  }

  if (!parsed.message?.text) return;

  const { chatId, telegramUserId, text, firstName, username } = parsed.message;
  const trimmed = text.trim();

  const user = await findOrCreateUser({
    telegramUserId,
    firstName,
    username,
  });

  if (user) {
    await logMessage({ userId: user.id, role: "user", content: trimmed });
  }

  const agentOn = process.env.AGENT_TOOLS_ENABLED !== "false";
  const START_REPLY =
    "¡Hola! Soy <b>Animus</b>. Charlamos acá; voy aprendiendo sin molestarte.\n\n" +
    (agentOn
      ? "🧠 <b>Modo agente</b> activo: busco en tu memoria y chats antes de responder.\n\n"
      : "") +
    "Podés preguntarme <b>qué podés hacer</b>, usar /memory o /mind, o contarme algo de vos.";

  let reply: string;
  if (!user) {
    reply =
      "Hola. El servidor está en marcha pero falta conectar Supabase (revisá .env.local).";
  } else if (trimmed.startsWith("/start")) {
    reply = START_REPLY;
  } else {
    const forgetReply = await tryHandleForget(user, trimmed);
    reply =
      forgetReply ??
      (await dispatchSkill({ user, text: trimmed, chatId }));
  }

  let fullReply = reply;
  let inlineKeyboard: Array<Array<{ text: string; callback_data: string }>> | undefined;

  if (user && !trimmed.startsWith("/start")) {
    const agentMeta = consumeAgentRunMeta(user.id);
    if (
      agentMeta &&
      (await shouldOfferSkillNudge({
        userId: user.id,
        toolsUsed: agentMeta.toolsUsed,
        assistantReply: agentMeta.reply,
        userMessage: trimmed,
      }))
    ) {
      const nudgeId = await createSkillNudge({
        userId: user.id,
        userMessage: trimmed,
        assistantSummary: agentMeta.reply,
        toolsUsed: agentMeta.toolsUsed,
      });
      if (nudgeId) {
        const nudge = buildSkillNudgeMessage(agentMeta.reply);
        fullReply += nudge.text;
        inlineKeyboard = attachNudgeIdToKeyboard(nudge.inlineKeyboard, nudgeId);
      }
    }
  }

  await sendTelegramMessage(chatId, fullReply, {
    replyMarkup: MAIN_KEYBOARD,
    inlineKeyboard,
  });

  if (user) {
    await logMessage({ userId: user.id, role: "assistant", content: fullReply });
    enqueueFactExtraction({
      user,
      userMessage: trimmed,
      assistantReply: fullReply,
    });
  }
}
