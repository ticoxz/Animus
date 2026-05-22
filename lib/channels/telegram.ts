import { sanitizeForTelegram } from "@/lib/channels/format";

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

  const safeText = sanitizeForTelegram(text);

  const base: Record<string, unknown> = {
    chat_id: chatId,
    text: safeText,
  };

  if (options?.inlineKeyboard) {
    base.reply_markup = { inline_keyboard: options.inlineKeyboard };
  } else if (options?.replyMarkup) {
    base.reply_markup = {
      keyboard: options.replyMarkup.keyboard,
      resize_keyboard: options.replyMarkup.resize_keyboard ?? true,
    };
  }

  let res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...base, parse_mode: "HTML" }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (err.includes("can't parse entities")) {
      res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(base),
      });
    }
    if (!res.ok) {
      console.error("[telegram] sendMessage failed", await res.text());
    }
  }
}

export const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "Ayuda" }, { text: "Qué podés hacer" }],
    [{ text: "Mis skills" }, { text: "Parar hoy" }],
  ],
  resize_keyboard: true,
};

export type ParsedTelegramUpdate = {
  message?: {
    chatId: number;
    telegramUserId: number;
    text?: string;
    firstName?: string;
    username?: string;
  };
  callback?: {
    chatId: number;
    telegramUserId: number;
    callbackId: string;
    data: string;
    firstName?: string;
    username?: string;
  };
};

export function parseTelegramUpdate(
  update: Record<string, unknown>,
): ParsedTelegramUpdate | null {
  const callbackQuery = update.callback_query as
    | Record<string, unknown>
    | undefined;

  if (callbackQuery) {
    const from = callbackQuery.from as
      | { id: number; first_name?: string; username?: string }
      | undefined;
    const message = callbackQuery.message as
      | { chat?: { id: number } }
      | undefined;
    const data =
      typeof callbackQuery.data === "string" ? callbackQuery.data : "";
    const id =
      typeof callbackQuery.id === "string" ? callbackQuery.id : String(callbackQuery.id);

    if (!from?.id || !message?.chat?.id || !data) return null;

    return {
      callback: {
        chatId: message.chat.id,
        telegramUserId: from.id,
        callbackId: id,
        data,
        firstName: from.first_name,
        username: from.username,
      },
    };
  }

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

export async function answerCallbackQuery(callbackId: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId }),
  });
}
