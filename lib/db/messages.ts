import { getSupabase } from "@/lib/supabase/server";

export type ChatTurn = { role: "user" | "assistant"; content: string };

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Últimos turnos del chat (para contexto conversacional). */
export async function getRecentChatTurns(
  userId: string,
  limit = 10,
): Promise<ChatTurn[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("messages_log")
    .select("role, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  return data
    .reverse()
    .map((row) => ({
      role: row.role as "user" | "assistant",
      content: stripHtml(row.content).slice(0, 1500),
    }))
    .filter((t) => t.content.length > 0);
}

export async function logMessage(input: {
  userId: string;
  role: "user" | "assistant";
  content: string;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from("messages_log").insert({
    user_id: input.userId,
    role: input.role,
    content: input.content.slice(0, 8000),
  });
}
