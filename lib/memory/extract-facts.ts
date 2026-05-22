import { getSupabase } from "@/lib/supabase/server";
import { upsertEntity, upsertRelation, type EntityType } from "@/lib/db/entities";
import { completeChatJson } from "@/lib/llm/client";
import { isLlmConfigured } from "@/lib/llm/config";
import { parseJsonFromLlm } from "@/lib/llm/parse-json";
import { inferEntityFromFact } from "@/lib/memory/infer-entity";
import type { UserProfile } from "@/lib/types";
import type { DbUser } from "@/lib/db/users";

type FactCategory = keyof UserProfile | "general";

interface ExtractedFact {
  fact: string;
  category: FactCategory;
  entity_name?: string;
}

interface ExtractedEntity {
  name: string;
  type: EntityType;
  description?: string;
}

interface ExtractedRelation {
  from_name: string;
  to_name: string;
  relation_type: string;
}

interface ExtractionResult {
  facts?: ExtractedFact[];
  entities?: ExtractedEntity[];
  relations?: ExtractedRelation[];
}

export async function runExtraction(input: {
  user: DbUser;
  userMessage: string;
  assistantReply: string;
}): Promise<void> {
  const supabase = getSupabase();
  if (!isLlmConfigured() || !supabase) return;

  const skip =
    input.userMessage.startsWith("/") ||
    ["Ayuda", "Qué podés hacer", "Mis skills", "Parar hoy"].includes(
      input.userMessage.split("\n")[0] ?? "",
    );
  if (skip || input.userMessage.length < 8) return;

  const raw = await completeChatJson({
    system: `Extraé información NUEVA del usuario desde este turno. Textos en español.
JSON:
{
  "facts": [{ "fact": string, "category": "demographic"|"interests"|"relationships"|"dated_plans"|"instructions"|"general", "entity_name": string opcional }],
  "entities": [{ "name": string, "type": "person"|"place"|"project"|"habit"|"emotion"|"other", "description": string opcional }],
  "relations": [{ "from_name": string, "to_name": string, "relation_type": string }]
}
Máximo 8 facts, 6 entities, 5 relations. Incluí entity_name cuando aplique.
Preferencias de tono/idioma ("hablame como X") → category "instructions".
Entrevistas y citas con fecha/hora → category "dated_plans" (y entity si hay empresa).
Si el usuario dice «me llamo X», guardá fact demographic con nombre X.
No inventes reuniones ni lugares si solo hay datos sueltos sin contexto. Español.`,
    user: `Usuario: ${input.userMessage}\nAsistente: ${input.assistantReply}`,
  });

  if (!raw) {
    console.warn("[memory/extract] sin respuesta del modelo");
    return;
  }

  const json = parseJsonFromLlm(raw);
  if (!json || typeof json !== "object") {
    console.warn("[memory/extract] JSON inválido:", raw.slice(0, 200));
    return;
  }

  const parsed = json as ExtractionResult;

  const entityIdByName = new Map<string, string>();

  for (const ent of parsed.entities ?? []) {
    if (!ent.name?.trim()) continue;
    const id = await upsertEntity({
      userId: input.user.id,
      name: ent.name,
      type: ent.type ?? "other",
      description: ent.description,
    });
    if (id) entityIdByName.set(ent.name.toLowerCase(), id);
  }

  for (const rel of parsed.relations ?? []) {
    let fromId = entityIdByName.get(rel.from_name?.toLowerCase() ?? "");
    let toId = entityIdByName.get(rel.to_name?.toLowerCase() ?? "");
    if (!fromId && rel.from_name) {
      fromId =
        (await upsertEntity({
          userId: input.user.id,
          name: rel.from_name,
          type: "other",
        })) ?? undefined;
      if (fromId) entityIdByName.set(rel.from_name.toLowerCase(), fromId);
    }
    if (!toId && rel.to_name) {
      toId =
        (await upsertEntity({
          userId: input.user.id,
          name: rel.to_name,
          type: "other",
        })) ?? undefined;
      if (toId) entityIdByName.set(rel.to_name.toLowerCase(), toId);
    }
    if (fromId && toId && rel.relation_type) {
      await upsertRelation({
        userId: input.user.id,
        fromEntityId: fromId,
        toEntityId: toId,
        relationType: rel.relation_type,
      });
    }
  }

  const facts = (parsed.facts ?? []).filter((f) => f.fact?.trim());
  if (!facts.length && !(parsed.entities ?? []).length) {
    console.warn("[memory/extract] turno sin facts/entities");
    return;
  }

  console.log(
    `[memory/extract] user=${input.user.id} facts=${facts.length} entities=${(parsed.entities ?? []).length}`,
  );

  for (const { fact, category, entity_name } of facts) {
    let entity_id: string | null = null;
    const cat = normalizeFactCategory(category);

    let linkName = entity_name?.trim();
    let linkType: EntityType = "other";
    if (!linkName) {
      const inferred = inferEntityFromFact(fact, cat);
      if (inferred) {
        linkName = inferred.name;
        linkType = inferred.type;
      }
    }

    if (linkName) {
      entity_id =
        entityIdByName.get(linkName.toLowerCase()) ??
        (await upsertEntity({
          userId: input.user.id,
          name: linkName,
          type: linkType,
          description: fact.slice(0, 200),
        }));
      if (entity_id) entityIdByName.set(linkName.toLowerCase(), entity_id);
    }

    const { error } = await supabase.from("memory_facts").insert({
      user_id: input.user.id,
      fact: fact.trim(),
      category: cat,
      entity_id,
      confidence: 0.85,
      source: "extract",
    });
    if (error) console.error("[memory/extract] insert fact", error.message);
  }

  if (facts.length) {
    await mergeFactsIntoProfile(input.user.id, facts);
  }
}

const PROFILE_CATEGORIES = new Set([
  "demographic",
  "interests",
  "relationships",
  "dated_plans",
  "instructions",
  "general",
]);

function normalizeFactCategory(category?: string): FactCategory {
  if (!category) return "general";
  const c = category.toLowerCase().trim();
  if (PROFILE_CATEGORIES.has(c)) return c as FactCategory;
  if (/demograf|edad|nombre|ciudad|trabaj|profes|vivo|santiago/i.test(c)) {
    return "demographic";
  }
  if (/interes|hobby|gusta|música|musica|juego/i.test(c)) return "interests";
  if (/famil|madre|herman|socio|relacion|gente/i.test(c)) return "relationships";
  if (/plan|proyect|viaje|mudanza|fecha|compr/i.test(c)) return "dated_plans";
  return "general";
}

async function mergeFactsIntoProfile(
  userId: string,
  facts: ExtractedFact[],
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: row } = await supabase
    .from("users")
    .select("profile")
    .eq("id", userId)
    .single();

  const profile = (row?.profile as UserProfile) ?? {
    demographic: "",
    interests: "",
    relationships: "",
    dated_plans: "",
    instructions: "",
  };

  const next = { ...profile };
  const profileKeys: (keyof UserProfile)[] = [
    "demographic",
    "interests",
    "relationships",
    "dated_plans",
    "instructions",
  ];
  for (const { fact, category } of facts) {
    const cat = normalizeFactCategory(category);
    if (!profileKeys.includes(cat as keyof UserProfile)) continue;
    const key = cat as keyof UserProfile;
    const line = `• ${fact}`;
    next[key] = next[key] ? `${next[key]}\n${line}` : line;
  }

  await supabase
    .from("users")
    .update({ profile: next, updated_at: new Date().toISOString() })
    .eq("id", userId);
}
