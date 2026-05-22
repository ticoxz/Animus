import { getSupabase } from "@/lib/supabase/server";
import { EMPTY_PROFILE, type UserProfile } from "@/lib/types";

export interface DbUser {
  id: string;
  telegram_user_id: number;
  first_name: string | null;
  username: string | null;
  profile: UserProfile;
  timezone: string;
  created_at: string;
}

export async function findOrCreateUser(input: {
  telegramUserId: number;
  firstName?: string;
  username?: string;
}): Promise<DbUser | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_user_id", input.telegramUserId)
    .maybeSingle();

  if (existing) {
    return existing as DbUser;
  }

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      telegram_user_id: input.telegramUserId,
      first_name: input.firstName ?? null,
      username: input.username ?? null,
      profile: EMPTY_PROFILE,
      timezone: "America/Argentina/Buenos_Aires",
    })
    .select()
    .single();

  if (error) {
    console.error("[db] findOrCreateUser", error);
    return null;
  }

  return created as DbUser;
}

/** Perfil fresco desde DB (estilo de voz, memoria JSON). */
export async function reloadUser(userId: string): Promise<DbUser | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as DbUser;
}
