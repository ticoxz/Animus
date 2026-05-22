import { scheduleEventsFromMessage } from "@/lib/calendar/schedule-from-chat";
import {
  formatEventsForTelegram,
  listUpcomingEvents,
} from "@/lib/integrations/google/calendar";
import {
  getGoogleAuthUrl,
  isGoogleConfigured,
  signOAuthState,
} from "@/lib/integrations/google/auth";
import { getOAuthToken } from "@/lib/db/oauth";
import type { SkillDefinition } from "@/lib/skills/base-skill";

const MATCH =
  /\b(agenda|calendario|reuniones?|eventos?|qué tengo hoy|que tengo hoy|\/agenda)\b/i;

/** "agendar" sí; "/agenda" y "ver agenda" no (evita conflicto con listar). */
const SCHEDULE_MATCH =
  /\b(anot[aá]r?|agend[aá]r|agendá|pon[eé]?\s+en\s+(el\s+)?calendario|cre[aá]\s+evento|record[aá]\s+en\s+el\s+calendario)\b/i;

function wantsToSchedule(text: string): boolean {
  if (text === "/agenda") return false;
  if (text === "/agendar") return true;
  if (/\banota\b/i.test(text) && /\d{1,2}\s*\/\s*\d{1,2}/.test(text)) return true;
  return SCHEDULE_MATCH.test(text);
}

export const reunionesSkill: SkillDefinition = {
  id: "reuniones",
  description: "Google Calendar — ver agenda, conectar y crear eventos",
  matches: (text) =>
    text === "/agenda" ||
    text === "/agendar" ||
    MATCH.test(text) ||
    wantsToSchedule(text),
  handle: async ({ user, text }) => {
    if (!isGoogleConfigured()) {
      return (
        "Calendar no está configurado en el servidor. " +
        "Agregá GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local."
      );
    }

    const token = await getOAuthToken(user.id, "google");
    if (!token) {
      const state = await signOAuthState(user.id);
      const url = getGoogleAuthUrl(state);
      return (
        "Para ver tu agenda, conectá Google (Calendar + Gmail):\n" +
        url +
        "\n\nEl link vence en 15 min."
      );
    }

    if (/conectar|connect/i.test(text)) {
      return "Tu Google ya está conectado. Mandá <code>/agenda</code> para ver eventos.";
    }

    if (text === "/agenda") {
      const events = await listUpcomingEvents(user.id);
      return (
        "<b>Próximos eventos</b>\n\n" + formatEventsForTelegram(events)
      );
    }

    if (wantsToSchedule(text)) {
      return scheduleEventsFromMessage(user, text);
    }

    const events = await listUpcomingEvents(user.id);
    return (
      "<b>Próximos eventos</b>\n\n" + formatEventsForTelegram(events)
    );
  },
};
