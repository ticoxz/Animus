import type { DbUser } from "@/lib/db/users";
import type { SkillId } from "@/lib/types";

export interface SkillContext {
  user: DbUser;
  text: string;
}

/** Patrón tipo Evva packages/skills — adaptado a Next.js */
export interface SkillDefinition {
  id: SkillId;
  description: string;
  /** Comandos exactos o prefijos (/memory) */
  matches: (text: string) => boolean;
  handle: (ctx: SkillContext) => Promise<string>;
}
