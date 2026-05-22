import type { DbUser } from "@/lib/db/users";
import type { SkillId } from "@/lib/types";

export interface SkillContext {
  user: DbUser;
  text: string;
  chatId?: number;
}

/** Registry de skills — complementa toolsets del agent loop Hermes */
export interface SkillDefinition {
  id: SkillId;
  description: string;
  /** Comandos exactos o prefijos (/memory) */
  matches: (text: string) => boolean;
  handle: (ctx: SkillContext) => Promise<string>;
}
