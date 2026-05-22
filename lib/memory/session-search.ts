import { getSupabase } from "@/lib/supabase/server";

/** Búsqueda en historial (estilo Hermes FTS-lite). */
export async function searchPastChats(
  userId: string,
  query: string,
  limit = 8,
): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase || query.trim().length < 2) return [];

  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 5);

  if (!tokens.length) return [];

  const { data } = await supabase
    .from("messages_log")
    .select("role, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  const hits: Array<{ score: number; line: string }> = [];

  for (const row of data ?? []) {
    const lower = row.content.toLowerCase();
    const score = tokens.filter((t) => lower.includes(t)).length;
    if (score === 0) continue;
    const date = new Date(row.created_at).toLocaleDateString("es-AR");
    const preview =
      row.content.length > 120 ? `${row.content.slice(0, 117)}…` : row.content;
    hits.push({
      score,
      line: `[${date}] ${row.role}: ${preview}`,
    });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit).map((h) => h.line);
}
