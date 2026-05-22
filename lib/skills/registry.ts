import type { SkillContext, SkillDefinition } from "@/lib/skills/base-skill";
import { tryRuntimeSkillDispatch } from "@/lib/runtime-skills/dispatch";
import { coreChatSkill } from "@/lib/skills/core-chat";
import { gastosSkill } from "@/lib/skills/gastos";
import { integrationsSkill } from "@/lib/skills/integrations";
import { skillCreatorSkill } from "@/lib/skills/skill-creator";
import { memorySkill } from "@/lib/skills/memory";
import { planDiaSkill } from "@/lib/skills/plan-dia";
import { reunionesSkill } from "@/lib/skills/reuniones";
import { searchSkill } from "@/lib/skills/search";
import { weatherSkill } from "@/lib/skills/weather";

/** Skills con matcher; el resto cae en core_chat (agent loop Hermes) */
const routedSkills: SkillDefinition[] = [
  skillCreatorSkill,
  integrationsSkill,
  memorySkill,
  reunionesSkill,
  weatherSkill,
  searchSkill,
  gastosSkill,
  planDiaSkill,
];

export function listSkillDescriptions(): string[] {
  return [coreChatSkill, ...routedSkills].map(
    (s) => `• ${s.id}: ${s.description}`,
  );
}

export async function dispatchSkill(ctx: SkillContext): Promise<string> {
  for (const skill of routedSkills) {
    if (skill.matches(ctx.text)) {
      return skill.handle(ctx);
    }
  }

  const runtime = await tryRuntimeSkillDispatch(ctx.user, ctx.text);
  if (runtime) return runtime;

  return coreChatSkill.handle(ctx);
}
