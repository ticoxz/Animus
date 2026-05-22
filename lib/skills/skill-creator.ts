import { handleRuntimeSkillsCommand } from "@/lib/runtime-skills/handlers";
import { wantsCreateRuntimeSkill } from "@/lib/runtime-skills/generate";
import type { SkillDefinition } from "@/lib/skills/base-skill";

const RUNTIME_CMD =
  /^\/(skills|mis-skills-runtime|curator|export-skill|restore-skill|migrate-to-skills)\b/i;

export const skillCreatorSkill: SkillDefinition = {
  id: "core_chat",
  description: "Skills runtime Hermes: crear, listar, export, curator",
  matches: (text) => wantsCreateRuntimeSkill(text) || RUNTIME_CMD.test(text),
  handle: async ({ user, text }) => {
    const reply = await handleRuntimeSkillsCommand(user.id, text);
    return reply ?? "No entendí el comando de skills.";
  },
};
