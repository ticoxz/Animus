import { getSupabase } from "@/lib/supabase/server";

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  factCount?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  relation: string;
}

export interface MindGraph {
  nodes: GraphNode[];
  links: GraphLink[];
  updatedAt: string;
  counts: { entities: number; facts: number; relations: number };
}

export async function buildMindGraph(userId: string): Promise<MindGraph> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      nodes: [],
      links: [],
      updatedAt: new Date().toISOString(),
      counts: { entities: 0, facts: 0, relations: 0 },
    };
  }

  const [{ data: entities }, { data: relations }, { data: facts }] =
    await Promise.all([
      supabase
        .from("user_entities")
        .select("id, name, type")
        .eq("user_id", userId),
      supabase
        .from("entity_relations")
        .select("from_entity_id, to_entity_id, relation_type")
        .eq("user_id", userId),
      supabase
        .from("memory_facts")
        .select("id, fact, entity_id, category")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(80),
    ]);

  const nodes: GraphNode[] = [];
  const nodeIds = new Set<string>();

  for (const e of entities ?? []) {
    nodes.push({
      id: e.id,
      label: e.name,
      type: e.type,
    });
    nodeIds.add(e.id);
  }

  const factsByEntity = new Map<string, number>();
  const orphanFacts: typeof facts = [];

  for (const f of facts ?? []) {
    if (f.entity_id && nodeIds.has(f.entity_id)) {
      factsByEntity.set(
        f.entity_id,
        (factsByEntity.get(f.entity_id) ?? 0) + 1,
      );
    } else {
      orphanFacts.push(f);
    }
  }

  for (const n of nodes) {
    n.factCount = factsByEntity.get(n.id) ?? 0;
  }

  for (const f of orphanFacts.slice(0, 40)) {
    const id = `fact-${f.id}`;
    const short =
      f.fact.length > 40 ? `${f.fact.slice(0, 37)}…` : f.fact;
    nodes.push({
      id,
      label: short,
      type: `fact:${f.category}`,
    });
    nodeIds.add(id);
  }

  const links: GraphLink[] = [];

  for (const r of relations ?? []) {
    if (nodeIds.has(r.from_entity_id) && nodeIds.has(r.to_entity_id)) {
      links.push({
        source: r.from_entity_id,
        target: r.to_entity_id,
        relation: r.relation_type,
      });
    }
  }

  for (const f of orphanFacts.slice(0, 40)) {
    if (f.entity_id && nodeIds.has(f.entity_id)) {
      links.push({
        source: `fact-${f.id}`,
        target: f.entity_id,
        relation: "about",
      });
    }
  }

  return {
    nodes,
    links,
    updatedAt: new Date().toISOString(),
    counts: {
      entities: entities?.length ?? 0,
      facts: facts?.length ?? 0,
      relations: relations?.length ?? 0,
    },
  };
}

export async function getNodeFacts(
  userId: string,
  nodeId: string,
): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  if (nodeId.startsWith("fact-")) {
    const factId = nodeId.replace("fact-", "");
    const { data } = await supabase
      .from("memory_facts")
      .select("fact")
      .eq("id", factId)
      .eq("user_id", userId)
      .maybeSingle();
    return data ? [data.fact] : [];
  }

  const { data } = await supabase
    .from("memory_facts")
    .select("fact")
    .eq("user_id", userId)
    .eq("entity_id", nodeId)
    .order("created_at", { ascending: false })
    .limit(20);

  const fromEntity = (data ?? []).map((r) => r.fact);

  const { data: entity } = await supabase
    .from("user_entities")
    .select("name, description")
    .eq("id", nodeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (entity?.description) {
    fromEntity.unshift(`${entity.name}: ${entity.description}`);
  } else if (entity?.name) {
    fromEntity.unshift(entity.name);
  }

  return fromEntity;
}
