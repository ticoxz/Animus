import { getSupabase } from "@/lib/supabase/server";
import type { SkillId, SkillStatus } from "@/lib/types";

export interface UserSkillRow {
  skill_id: SkillId;
  status: SkillStatus;
  proactive_enabled: boolean;
}

export async function getUserSkills(userId: string): Promise<UserSkillRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("user_skills")
    .select("skill_id, status, proactive_enabled")
    .eq("user_id", userId);

  return (data ?? []) as UserSkillRow[];
}

export async function getSkillStatus(
  userId: string,
  skillId: SkillId,
): Promise<SkillStatus> {
  const supabase = getSupabase();
  if (!supabase) return "locked";

  const { data } = await supabase
    .from("user_skills")
    .select("status")
    .eq("user_id", userId)
    .eq("skill_id", skillId)
    .maybeSingle();

  return (data?.status as SkillStatus) ?? "locked";
}

export async function isSkillActive(
  userId: string,
  skillId: SkillId,
): Promise<boolean> {
  const status = await getSkillStatus(userId, skillId);
  return status === "active";
}

export async function offerSkill(
  userId: string,
  skillId: SkillId,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const current = await getSkillStatus(userId, skillId);
  if (current !== "locked") return;

  await supabase.from("user_skills").upsert(
    {
      user_id: userId,
      skill_id: skillId,
      status: "offered",
      offered_at: new Date().toISOString(),
    },
    { onConflict: "user_id,skill_id" },
  );
}

export async function activateSkill(
  userId: string,
  skillId: SkillId,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from("user_skills").upsert(
    {
      user_id: userId,
      skill_id: skillId,
      status: "active",
      activated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,skill_id" },
  );
}

export async function declineSkill(
  userId: string,
  skillId: SkillId,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from("user_skills").upsert(
    {
      user_id: userId,
      skill_id: skillId,
      status: "locked",
      offered_at: null,
    },
    { onConflict: "user_id,skill_id" },
  );
}

export const SKILL_LABELS: Record<SkillId, string> = {
  core_chat: "Charla + memoria",
  gastos: "Gastos",
  reuniones: "Reuniones",
  nutricion: "Nutrición",
  wrapup: "Resumen del día",
  plan_dia: "Plan del día",
  contexto_vida: "Contexto (clima, etc.)",
};
