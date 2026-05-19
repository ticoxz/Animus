const TELEGRAM_API = "https://api.telegram.org/bot";

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: {
    replyMarkup?: {
      keyboard: Array<Array<{ text: string }>>;
      resize_keyboard?: boolean;
      one_time_keyboard?: boolean;
    };
    inlineKeyboard?: Array<Array<{ text: string; callback_data: string }>>;
  },
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN missing");
    return;
  }

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };

  if (options?.inlineKeyboard) {
    body.reply_markup = { inline_keyboard: options.inlineKeyboard };
  } else if (options?.replyMarkup) {
    body.reply_markup = {
      keyboard: options.replyMarkup.keyboard,
      resize_keyboard: options.replyMarkup.resize_keyboard ?? true,
    };
  }

  const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[telegram] sendMessage failed", err);
  }
}

export const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "Ayuda" }, { text: "Qué podés hacer" }],
    [{ text: "Mis skills" }, { text: "Parar hoy" }],
  ],
  resize_keyboard: true,
};

export function parseTelegramUpdate(update: Record<string, unknown>): {
  message?: {
    chatId: number;
    telegramUserId: number;
    text?: string;
    firstName?: string;
    username?: string;
  };
} | null {
  const message = update.message as Record<string, unknown> | undefined;
  if (!message) return null;

  const chat = message.chat as { id: number } | undefined;
  const from = message.from as
    | { id: number; first_name?: string; username?: string }
    | undefined;

  if (!chat?.id || !from?.id) return null;

  return {
    message: {
      chatId: chat.id,
      telegramUserId: from.id,
      text: typeof message.text === "string" ? message.text : undefined,
      firstName: from.first_name,
      username: from.username,
    },
  };
}
