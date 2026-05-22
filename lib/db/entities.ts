import { getSupabase } from "@/lib/supabase/server";
import { normalizeEntityName } from "@/lib/memory/normalize";

export type EntityType =
  | "person"
  | "place"
  | "project"
  | "habit"
  | "emotion"
  | "other";

export interface UserEntity {
  id: string;
  user_id: string;
  name: string;
  name_normalized: string;
  type: EntityType;
  description: string | null;
}

export async function upsertEntity(input: {
  userId: string;
  name: string;
  type: EntityType;
  description?: string;
}): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const name_normalized = normalizeEntityName(input.name);
  if (!name_normalized) return null;

  const { data: existing } = await supabase
    .from("user_entities")
    .select("id")
    .eq("user_id", input.userId)
    .eq("name_normalized", name_normalized)
    .maybeSingle();

  if (existing) {
    if (input.description) {
      await supabase
        .from("user_entities")
        .update({
          description: input.description,
          type: input.type,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("user_entities")
    .insert({
      user_id: input.userId,
      name: input.name.trim(),
      name_normalized,
      type: input.type,
      description: input.description ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[db] upsertEntity", error);
    return null;
  }

  return created.id;
}

export async function upsertRelation(input: {
  userId: string;
  fromEntityId: string;
  toEntityId: string;
  relationType: string;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("entity_relations").insert({
    user_id: input.userId,
    from_entity_id: input.fromEntityId,
    to_entity_id: input.toEntityId,
    relation_type: input.relationType,
  });

  if (error && !error.message.includes("duplicate")) {
    console.error("[db] upsertRelation", error);
  }
}
