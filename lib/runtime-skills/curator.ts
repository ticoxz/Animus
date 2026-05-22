import { getSupabase } from "@/lib/supabase/server";
import { buildSkillMarkdown } from "@/lib/runtime-skills/skill-md";
import type { RuntimeSkillRow } from "@/lib/runtime-skills/types";

const STALE_DAYS = Number(process.env.SKILL_CURATOR_DAYS ?? "30");

function staleCutoff(): string {
  const d = new Date();
  d.setDate(d.getDate() - STALE_DAYS);
  return d.toISOString();
}

/** Archiva skills sin uso en N días (curator Hermes). */
export async function runCuratorForUser(userId: string): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const cutoff = staleCutoff();

  const { data: candidates } = await supabase
    .from("runtime_skills")
    .select("id, name, description, category, keywords, config, use_count, created_at, last_used_at, updated_at")
    .eq("user_id", userId)
    .eq("is_active", true);

  const archived: string[] = [];

  for (const row of candidates ?? []) {
    const skill = row as RuntimeSkillRow & {
      created_at: string;
      last_used_at: string | null;
      updated_at: string;
    };

    const lastTouch = skill.last_used_at ?? skill.updated_at;
    const neverUsed = skill.use_count === 0;
    const stale =
      (neverUsed && skill.created_at < cutoff) ||
      (!neverUsed && lastTouch < cutoff);

    if (!stale) continue;

    const skillMd = buildSkillMarkdown(skill as RuntimeSkillRow);
    const now = new Date().toISOString();

    await supabase
      .from("runtime_skills")
      .update({
        is_active: false,
        archived_at: now,
        skill_md: skillMd,
        updated_at: now,
      })
      .eq("id", skill.id);

    archived.push(skill.name);
  }

  return archived;
}

export async function runCuratorAllUsers(): Promise<{
  users: number;
  archived: number;
}> {
  const supabase = getSupabase();
  if (!supabase) return { users: 0, archived: 0 };

  const { data: users } = await supabase.from("users").select("id");
  let total = 0;

  for (const u of users ?? []) {
    const names = await runCuratorForUser(u.id);
    total += names.length;
  }

  return { users: users?.length ?? 0, archived: total };
}

export async function listArchivedRuntimeSkills(
  userId: string,
): Promise<Array<{ name: string; description: string; archived_at: string | null }>> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("runtime_skills")
    .select("name, description, archived_at")
    .eq("user_id", userId)
    .eq("is_active", false)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
    .limit(20);

  return (data ?? []) as Array<{
    name: string;
    description: string;
    archived_at: string | null;
  }>;
}

export async function restoreArchivedSkill(
  userId: string,
  name: string,
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("runtime_skills")
    .update({
      is_active: true,
      archived_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("name", name)
    .eq("is_active", false);

  return !error;
}
