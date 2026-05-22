import { getSupabase } from "@/lib/supabase/server";

export type OAuthProvider = "google" | "spotify";

export interface OAuthTokenRow {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
}

export async function getOAuthToken(
  userId: string,
  provider: OAuthProvider,
): Promise<OAuthTokenRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from("user_oauth_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  return data as OAuthTokenRow | null;
}

export async function upsertOAuthToken(input: {
  userId: string;
  provider: OAuthProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from("user_oauth_tokens").upsert(
    {
      user_id: input.userId,
      provider: input.provider,
      access_token: input.accessToken,
      refresh_token: input.refreshToken ?? null,
      expires_at: input.expiresAt?.toISOString() ?? null,
      scope: input.scope ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );
}

export async function deleteOAuthToken(
  userId: string,
  provider: OAuthProvider,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase
    .from("user_oauth_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
}
