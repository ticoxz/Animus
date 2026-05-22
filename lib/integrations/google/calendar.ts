import { getSupabase } from "@/lib/supabase/server";
import { getGoogleAccessToken } from "@/lib/integrations/google/auth";

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
}

export async function listUpcomingEvents(
  userId: string,
  maxResults = 8,
): Promise<CalendarEvent[]> {
  const accessToken = await getGoogleAccessToken(userId);
  if (!accessToken) return [];

  const timeMin = new Date().toISOString();
  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
  );
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    console.error("[calendar] list", await res.text());
    return [];
  }

  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      location?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }>;
  };

  const events: CalendarEvent[] = [];

  for (const item of data.items ?? []) {
    const start = item.start?.dateTime ?? item.start?.date;
    const end = item.end?.dateTime ?? item.end?.date;
    if (!start || !end) continue;

    events.push({
      id: item.id,
      summary: item.summary ?? "(sin título)",
      start,
      end,
      location: item.location,
    });
  }

  await cacheEvents(userId, events);
  return events;
}

async function cacheEvents(
  userId: string,
  events: CalendarEvent[],
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  for (const e of events) {
    await supabase.from("calendar_events_cache").upsert(
      {
        user_id: userId,
        external_id: e.id,
        summary: e.summary,
        starts_at: e.start,
        ends_at: e.end,
        location: e.location ?? null,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,external_id" },
    );
  }
}

export function formatEventsForTelegram(events: CalendarEvent[]): string {
  if (!events.length) {
    return "No tenés eventos próximos en el calendario.";
  }

  return events
    .map((e) => {
      const when = new Date(e.start).toLocaleString("es-AR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      const loc = e.location ? ` · ${e.location}` : "";
      return `• <b>${when}</b> — ${e.summary}${loc}`;
    })
    .join("\n");
}

export async function createCalendarEvent(
  userId: string,
  input: {
    summary: string;
    start: string;
    end: string;
    description?: string;
    timeZone?: string;
  },
): Promise<{ ok: boolean; eventId?: string; error?: string }> {
  const accessToken = await getGoogleAccessToken(userId);
  if (!accessToken) {
    return { ok: false, error: "google_not_connected" };
  }

  const timeZone = input.timeZone ?? "America/Santiago";

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start, timeZone },
        end: { dateTime: input.end, timeZone },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[calendar] create", err);
    return { ok: false, error: err.slice(0, 200) };
  }

  const data = (await res.json()) as { id?: string };
  const event: CalendarEvent = {
    id: data.id ?? "",
    summary: input.summary,
    start: input.start,
    end: input.end,
  };
  if (data.id) await cacheEvents(userId, [event]);

  return { ok: true, eventId: data.id };
}
