import { getSupabase } from "@/lib/supabase/server";
import { normalizeEntityName } from "@/lib/memory/normalize";
import { buildProfileBlock, BASE_SYSTEM_PROMPT } from "@/lib/memory/profile-prompt";
import { buildVoiceStyleBlock } from "@/lib/memory/voice-style";
import type { UserProfile } from "@/lib/types";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export async function retrieveRelevantMemory(input: {
  userId: string;
  query: string;
  profile: UserProfile;
  limit?: number;
}): Promise<string> {
  const supabase = getSupabase();
  const limit = input.limit ?? 10;
  const tokens = tokenize(input.query);

  if (!supabase) {
    return buildProfileBlock(input.profile);
  }

  if (tokens.length === 0) {
    return buildProfileBlock(input.profile);
  }

  const [{ data: facts }, { data: entities }, { data: relations }] =
    await Promise.all([
      supabase
        .from("memory_facts")
        .select("fact, category, created_at")
        .eq("user_id", input.userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("user_entities")
        .select("id, name, type, description")
        .eq("user_id", input.userId)
        .limit(50),
      supabase
        .from("entity_relations")
        .select("relation_type, from_entity_id, to_entity_id")
        .eq("user_id", input.userId)
        .limit(30),
    ]);

  const entityNameById = new Map(
    (entities ?? []).map((e) => [e.id, e.name]),
  );

  type Scored = { score: number; line: string };

  const scored: Scored[] = [];

  for (const f of facts ?? []) {
    const lower = f.fact.toLowerCase();
    const score = tokens.filter((t) => lower.includes(t)).length;
    if (score > 0) {
      scored.push({ score, line: `• [${f.category}] ${f.fact}` });
    }
  }

  for (const e of entities ?? []) {
    const blob = `${e.name} ${e.description ?? ""}`.toLowerCase();
    const score = tokens.filter((t) => blob.includes(t)).length;
    const nameNorm = normalizeEntityName(e.name);
    if (score > 0 || tokens.some((t) => nameNorm.includes(t))) {
      scored.push({
        score: score + 1,
        line: `• [${e.type}] ${e.name}${e.description ? `: ${e.description}` : ""}`,
      });
    }
  }

  for (const r of relations ?? []) {
    const from = entityNameById.get(r.from_entity_id) ?? "?";
    const to = entityNameById.get(r.to_entity_id) ?? "?";
    const line = `• ${from} —${r.relation_type}→ ${to}`;
    const lower = line.toLowerCase();
    const score = tokens.filter((t) => lower.includes(t)).length;
    if (score > 0) scored.push({ score, line });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  const leanProfile = buildProfileBlock(input.profile);
  if (!top.length) {
    return leanProfile;
  }

  return (
    `${leanProfile}\n\n### Memoria relevante (recuperada)\n` +
    top.map((s) => s.line).join("\n")
  );
}

export async function buildChatSystemPrompt(input: {
  userId: string;
  userMessage: string;
  profile: UserProfile;
}): Promise<string> {
  const memoryBlock = await retrieveRelevantMemory({
    userId: input.userId,
    query: input.userMessage,
    profile: input.profile,
  });

  const voiceBlock = buildVoiceStyleBlock(input.profile);
  return `${BASE_SYSTEM_PROMPT}\n\n${voiceBlock}\n\n${memoryBlock}`;
}
