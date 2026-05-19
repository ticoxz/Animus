import { getSupabase } from "@/lib/supabase/server";

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
