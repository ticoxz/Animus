import { findOrCreateUser } from "@/lib/db/users";
import { logMessage } from "@/lib/db/messages";
import {
  parseTelegramUpdate,
  sendTelegramMessage,
  MAIN_KEYBOARD,
} from "@/lib/channels/telegram";
import { dispatchSkill } from "@/lib/skills/registry";
import { enqueueFactExtraction } from "@/lib/memory/extract-facts";

export async function handleTelegramUpdate(
  update: Record<string, unknown>,
): Promise<void> {
  const parsed = parseTelegramUpdate(update);
  if (!parsed?.message?.text) return;

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

  const reply = user
    ? await dispatchSkill({ user, text: trimmed })
    : "Hola. El servidor está en marcha pero falta conectar Supabase (revisá .env.local).";

  const isStart = trimmed.startsWith("/start");
  const welcome =
    isStart &&
    "¡Hola! Soy <b>Animus</b>. Charlamos acá; voy aprendiendo sin molestarte.\n\n";

  const fullReply = `${welcome ?? ""}${reply}`;

  await sendTelegramMessage(chatId, fullReply, {
    replyMarkup: MAIN_KEYBOARD,
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
