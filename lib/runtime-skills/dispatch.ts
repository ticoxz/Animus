import { completeChat, completeChatJson } from "@/lib/llm/client";
import { parseJsonFromLlm } from "@/lib/llm/parse-json";
import {
  incrementRuntimeSkillUse,
  listActiveRuntimeSkills,
} from "@/lib/runtime-skills/db";
import { executeRuntimeTool } from "@/lib/runtime-skills/executor";
import { buildVoiceStyleBlock } from "@/lib/memory/voice-style";
import type { DbUser } from "@/lib/db/users";

function scoreSkillMatch(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const k of keywords) {
    if (k.length < 3) continue;
    if (lower.includes(k.toLowerCase())) score += 1;
  }
  return score;
}

function pickBestSkill(
  text: string,
  skills: Awaited<ReturnType<typeof listActiveRuntimeSkills>>,
) {
  const ranked = skills
    .map((s) => ({ skill: s, score: scoreSkillMatch(text, s.keywords) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return null;

  const top = ranked[0];
  // Empate débil (1 keyword): dejar que el agente general responda
  if (top.score === 1 && ranked.length > 1 && ranked[1].score === 1) {
    return null;
  }
  return top.skill;
}

export async function tryRuntimeSkillDispatch(
  user: DbUser,
  text: string,
): Promise<string | null> {
  const skills = await listActiveRuntimeSkills(user.id);
  if (!skills.length) return null;

  const skill = pickBestSkill(text, skills);
  if (!skill) return null;

  const instructions = skill.config.instructions?.trim();
  const isInstructions =
    skill.config.type === "instructions" ||
    (instructions && !skill.config.tools?.length);

  if (isInstructions && instructions) {
    const reply = await completeChat({
      system:
        instructions +
        "\n\n" +
        buildVoiceStyleBlock(user.profile) +
        "\n\nMensajes cortos para Telegram. No inventes datos que no estén en el mensaje.",
      user: text,
    });
    await incrementRuntimeSkillUse(skill.id);
    if (!reply) {
      return `Skill <b>${skill.name}</b> no pudo responder (error LLM).`;
    }
    return reply;
  }

  const tool = skill.config.tools[0];
  if (!tool) return null;

  const paramKeys = Object.keys(tool.parameters);
  let params: Record<string, unknown> = {};

  if (paramKeys.length) {
    const raw = await completeChatJson({
      system: `Extraé parámetros para llamar API "${tool.name}". JSON: {${paramKeys.map((k) => `"${k}":string`).join(",")}}. Solo valores del mensaje del usuario.`,
      user: text,
    });
    const parsed = raw ? parseJsonFromLlm(raw) : null;
    if (parsed && typeof parsed === "object") {
      params = parsed as Record<string, unknown>;
    }
  }

  const result = await executeRuntimeTool(tool, params);
  await incrementRuntimeSkillUse(skill.id);

  if (!result.success) {
    return `Skill <b>${skill.name}</b> falló: ${result.error}`;
  }

  const preview =
    typeof result.data === "string"
      ? result.data
      : JSON.stringify(result.data, null, 2).slice(0, 1500);

  return (
    `<b>${skill.name}</b>\n${skill.description}\n\n` +
    `<pre>${preview.replace(/</g, "&lt;")}</pre>`
  );
}
