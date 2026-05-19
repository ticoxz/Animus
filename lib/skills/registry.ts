import type { SkillContext, SkillDefinition } from "@/lib/skills/base-skill";
import { coreChatSkill } from "@/lib/skills/core-chat";
import { memorySkill } from "@/lib/skills/memory";

/** Skills con matcher específico; el resto cae en core_chat (patrón Evva registry) */
const routedSkills: SkillDefinition[] = [memorySkill];

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
  return coreChatSkill.handle(ctx);
}
