import { getSupabase } from "@/lib/supabase/server";
import { buildSkillMarkdown } from "@/lib/runtime-skills/skill-md";
import type { RuntimeSkillConfig, RuntimeSkillRow } from "@/lib/runtime-skills/types";

export async function listActiveRuntimeSkills(
  userId: string,
): Promise<RuntimeSkillRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("runtime_skills")
    .select(
      "id, name, description, category, keywords, config, is_active, use_count, skill_md",
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  return (data ?? []) as RuntimeSkillRow[];
}

export async function getRuntimeSkillByName(
  userId: string,
  name: string,
  includeArchived = false,
): Promise<(RuntimeSkillRow & { skill_md?: string | null }) | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  let q = supabase
    .from("runtime_skills")
    .select(
      "id, name, description, category, keywords, config, is_active, use_count, skill_md",
    )
    .eq("user_id", userId)
    .eq("name", name);

  if (!includeArchived) {
    q = q.eq("is_active", true);
  }

  const { data } = await q.maybeSingle();
  return (data as RuntimeSkillRow) ?? null;
}

export async function createRuntimeSkill(input: {
  userId: string;
  name: string;
  description: string;
  category?: string;
  keywords: string[];
  config: RuntimeSkillConfig;
  createdBy?: "agent" | "user";
}): Promise<RuntimeSkillRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  const draft: RuntimeSkillRow = {
    id: "",
    name: slug,
    description: input.description,
    category: input.category ?? "utility",
    keywords: input.keywords,
    config: input.config,
    is_active: true,
    use_count: 0,
  };

  const skillMd = buildSkillMarkdown(draft);

  const { data, error } = await supabase
    .from("runtime_skills")
    .insert({
      user_id: input.userId,
      name: slug,
      description: input.description,
      category: input.category ?? "utility",
      keywords: input.keywords,
      config: input.config,
      created_by: input.createdBy ?? "agent",
      skill_md: skillMd,
      last_used_at: new Date().toISOString(),
    })
    .select(
      "id, name, description, category, keywords, config, is_active, use_count, skill_md",
    )
    .single();

  if (error) {
    console.error("[runtime-skills] create", error);
    return null;
  }

  return data as RuntimeSkillRow;
}

export async function incrementRuntimeSkillUse(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const now = new Date().toISOString();
  const { data } = await supabase
    .from("runtime_skills")
    .select("use_count")
    .eq("id", id)
    .single();

  await supabase
    .from("runtime_skills")
    .update({
      use_count: (data?.use_count ?? 0) + 1,
      last_used_at: now,
      updated_at: now,
    })
    .eq("id", id);
}

export async function persistSkillMarkdown(
  skillId: string,
  markdown: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase
    .from("runtime_skills")
    .update({ skill_md: markdown, updated_at: new Date().toISOString() })
    .eq("id", skillId);
}
