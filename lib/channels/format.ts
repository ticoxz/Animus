/** Alfabetos que MiniMax a veces mezcla y Telegram no queremos en el chat. */
const NON_LATIN_SCRIPTS =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u0400-\u04ff\u0500-\u052f\u0600-\u06ff\u0750-\u077f\u0590-\u05ff\u0900-\u097f\u0e00-\u0e7f\u1100-\u11ff\uac00-\ud7af]/gu;

const TELEGRAM_MAX_LEN = 4096;

import { enforceSpanishOnly } from "@/lib/channels/spanish-guard";

/**
 * Limpia salida de MiniMax (thinking, chino, tags raros) para Telegram parse_mode HTML.
 */
export function sanitizeForTelegram(text: string): string {
  let out = text;

  // MiniMax M2: razonamiento embebido
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, "");
  out = out.replace(/<\/?think>/gi, "");
  out = out.replace(/<\/?think\b[^>]*>/gi, "");

  // Markdown **texto** → HTML <b> (Telegram no entiende **)
  out = out.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  out = out.replace(/\*([^*]+)\*/g, "<i>$1</i>");
  out = out.replace(/\*{2,}/g, "");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Quitar tags HTML no soportados por Telegram
  const allowed = new Set([
    "b",
    "strong",
    "i",
    "em",
    "u",
    "ins",
    "s",
    "strike",
    "del",
    "code",
    "pre",
    "a",
  ]);

  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    const name = tag.toLowerCase();
    return allowed.has(name) ? match : "";
  });

  out = out.replace(NON_LATIN_SCRIPTS, "");
  out = enforceSpanishOnly(out);
  out = escapeStrayHtmlEntities(out);

  out = out.replace(/\n{3,}/g, "\n\n").trim();
  if (out.length > TELEGRAM_MAX_LEN) {
    out = `${out.slice(0, TELEGRAM_MAX_LEN - 1)}…`;
  }
  return out;
}

/** Escapa < > & fuera de las etiquetas HTML permitidas por Telegram. */
function escapeStrayHtmlEntities(text: string): string {
  const tagRe =
    /<\/?(?:b|strong|i|em|u|ins|s|strike|del|code|pre|a)(?:\s[^>]*)?>|<a\s+href="[^"]*">/gi;
  let result = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(text)) !== null) {
    result += escapePlainSegment(text.slice(last, m.index));
    result += m[0];
    last = m.index + m[0].length;
  }
  result += escapePlainSegment(text.slice(last));
  return result;
}

function escapePlainSegment(segment: string): string {
  return segment
    .replace(/&(?!amp;|lt;|gt;|quot;)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
