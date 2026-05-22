import { getSupabase } from "@/lib/supabase/server";
import { normalizeEntityName } from "@/lib/memory/normalize";
import type { DbUser } from "@/lib/db/users";

const FORGET_PATTERNS = [
  /^olvid[aá]\s+(?:que\s+)?(.+)/i,
  /^borr[aá]\s+(?:de mi memoria\s+)?(.+)/i,
  /^no\s+recuerdes?\s+(.+)/i,
  /^forget\s+(.+)/i,
];

export async function tryHandleForget(
  user: DbUser,
  text: string,
): Promise<string | null> {
  const trimmed = text.trim();
  let target: string | null = null;

  for (const pattern of FORGET_PATTERNS) {
    const m = trimmed.match(pattern);
    if (m?.[1]) {
      target = m[1].trim().replace(/[.!?]+$/, "");
      break;
    }
  }

  if (!target || target.length < 2) return null;

  const supabase = getSupabase();
  if (!supabase) {
    return "No puedo actualizar memoria sin Supabase conectado.";
  }

  const normalized = normalizeEntityName(target);
  let deletedFacts = 0;
  let deletedEntities = 0;

  const { data: facts } = await supabase
    .from("memory_facts")
    .select("id, fact")
    .eq("user_id", user.id)
    .ilike("fact", `%${target}%`);

  if (facts?.length) {
    await supabase
      .from("memory_facts")
      .delete()
      .in(
        "id",
        facts.map((f) => f.id),
      );
    deletedFacts = facts.length;
  }

  const { data: byName } = await supabase
    .from("user_entities")
    .select("id")
    .eq("user_id", user.id)
    .eq("name_normalized", normalized);

  const { data: byPartial } = await supabase
    .from("user_entities")
    .select("id")
    .eq("user_id", user.id)
    .ilike("name", `%${target}%`);

  const entityIds = new Set([
    ...(byName ?? []).map((e) => e.id),
    ...(byPartial ?? []).map((e) => e.id),
  ]);
  const entities = [...entityIds].map((id) => ({ id }));

  if (entities?.length) {
    await supabase
      .from("user_entities")
      .delete()
      .in(
        "id",
        entities.map((e) => e.id),
      );
    deletedEntities = entities.length;
  }

  if (!deletedFacts && !deletedEntities) {
    return `No encontré nada sobre «${target}» en tu memoria.`;
  }

  return (
    `Listo. Saqué de tu cerebro:\n` +
    `• ${deletedFacts} hecho(s)\n` +
    `• ${deletedEntities} entidad(es)\n\n` +
    `El grafo en /mind se actualizará en el próximo refresco.`
  );
}
