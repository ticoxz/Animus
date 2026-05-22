import { createCalendarEvent } from "@/lib/integrations/google/calendar";
import { getGoogleAccessToken } from "@/lib/integrations/google/auth";
import { getRecentChatTurns } from "@/lib/db/messages";
import { completeChatJson } from "@/lib/llm/client";
import { parseJsonFromLlm } from "@/lib/llm/parse-json";
import { getSupabase } from "@/lib/supabase/server";
import {
  parseQuickSchedule,
  type ParsedEvent,
} from "@/lib/calendar/parse-quick";
import type { DbUser } from "@/lib/db/users";
import type { UserProfile } from "@/lib/types";

export type { ParsedEvent };

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function scheduleEventsFromMessage(
  user: DbUser,
  text: string,
): Promise<string> {
  const token = await getGoogleAccessToken(user.id);
  if (!token) {
    return "Conectá Google primero con /connect google.";
  }

  let events = parseQuickSchedule(text);

  const history = await getRecentChatTurns(user.id, 10);
  const chatCtx = history
    .map((t) => `${t.role === "user" ? "Usuario" : "Animus"}: ${t.content}`)
    .join("\n");

  if (!events.length) {
    for (const turn of [...history].reverse()) {
      if (turn.role !== "user") continue;
      events = parseQuickSchedule(turn.content);
      if (events.length) break;
    }
  }

  const raw = events.length
    ? null
    : await completeChatJson({
    system: `Extraé eventos para Google Calendar desde el pedido del usuario y el chat reciente.
Hoy es ${todayIsoDate()} (usa año 2026 si el usuario no dice otro).
Zona horaria: America/Santiago (Chile).
JSON: { "events": [{ "title": string, "start": "YYYY-MM-DDTHH:mm:ss", "end": "YYYY-MM-DDTHH:mm:ss", "description": string opcional }] }
Si solo hay hora de inicio, duración 1 hora por defecto.
Máximo 5 eventos. Solo reuniones/citas que el usuario mencionó explícitamente (Drimo, Mercado Libre, entrevistas).
No inventes eventos que no estén en el chat o en el mensaje actual.`,
    user: `Chat reciente:\n${chatCtx}\n\nPedido actual: ${text}`,
      });

  if (!events.length && raw) {
    const json = parseJsonFromLlm(raw) as { events?: ParsedEvent[] } | null;
    events =
      json?.events
        ?.filter((e) => e.title && e.start && e.end)
        .map((e) => normalizeEvent(e)) ?? [];
  }

  if (!events.length && !raw) {
    return "No pude interpretar las reuniones. Decime: «Drimo lunes 25/5 a las 11» en una frase.";
  }

  if (!events.length) {
    return (
      "No encontré fechas claras para agendar. Ejemplo:\n" +
      "«Anotá: Drimo lunes 25/5 a las 11»"
    );
  }

  const created: string[] = [];
  const failed: string[] = [];

  for (const ev of events) {
    const result = await createCalendarEvent(user.id, {
      summary: ev.title,
      start: ev.start,
      end: ev.end,
      description: ev.description,
      timeZone: user.timezone || "America/Santiago",
    });
    if (result.ok) {
      created.push(`✅ ${ev.title} — ${formatLocal(ev.start)}`);
      await appendDatedPlan(user.id, user.profile, ev);
    } else {
      const hint = result.error?.includes("invalid")
        ? " (fecha/hora inválida)"
        : result.error?.includes("403")
          ? " (sin permiso Calendar)"
          : "";
      failed.push(`❌ ${ev.title}${hint}`);
      console.error("[schedule]", ev, result.error);
    }
  }

  if (!created.length && failed.length) {
    return (
      "<b>No pude crear el evento</b>\n\n" +
      failed.join("\n") +
      "\n\nProbá de nuevo: <code>Drimo 25/5 a las 11</code> o reconectá /connect google."
    );
  }

  let msg = "<b>Calendario actualizado</b>\n\n" + created.join("\n");
  if (failed.length) msg += "\n\n" + failed.join("\n");
  msg += "\n\nMirá con /agenda.";
  return msg;
}

function normalizeEvent(e: ParsedEvent): ParsedEvent {
  let { start, end } = e;
  if (start.length === 10) start += "T11:00:00";
  if (end.length === 10) {
    const d = new Date(start);
    d.setHours(d.getHours() + 1);
    end = start.slice(0, 11) + `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
  }
  if (!end && start) {
    const d = new Date(start);
    d.setHours(d.getHours() + 1);
    end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
  }
  return { ...e, start, end };
}

function formatLocal(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function appendDatedPlan(
  userId: string,
  profile: UserProfile,
  ev: ParsedEvent,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const line = `• ${ev.title} — ${formatLocal(ev.start)}`;
  const next = {
    ...profile,
    dated_plans: profile.dated_plans
      ? `${profile.dated_plans}\n${line}`
      : line,
  };

  await supabase
    .from("users")
    .update({ profile: next, updated_at: new Date().toISOString() })
    .eq("id", userId);
}
