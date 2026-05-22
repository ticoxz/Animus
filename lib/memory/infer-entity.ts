import type { EntityType } from "@/lib/db/entities";

const PLACE_WORDS =
  /\b(Santiago|Paraguay|Cochamó|CABA|Buenos Aires|Energy Club)\b/i;
const PROJECT_WORDS =
  /\b(Banana Bridge|Gravity Software Studio|Animus)\b/i;
const PERSON_HINTS = /\b(madre|hermana|socio|Marcelo)\b/i;

export function inferEntityFromFact(
  fact: string,
  category: string,
): { name: string; type: EntityType } | null {
  const mProject = fact.match(PROJECT_WORDS);
  if (mProject) return { name: mProject[1], type: "project" };

  const mPlace = fact.match(PLACE_WORDS);
  if (mPlace) return { name: mPlace[1], type: "place" };

  if (PERSON_HINTS.test(fact)) {
    const m = fact.match(/\bMarcelo\b/i);
    if (m) return { name: "Marcelo", type: "person" };
    if (/madre/i.test(fact)) return { name: "Madre", type: "person" };
    if (/hermana/i.test(fact)) return { name: "Hermana", type: "person" };
  }

  if (category === "relationships") {
    return { name: "Familia y vínculos", type: "person" };
  }
  if (category === "interests") {
    return { name: "Intereses", type: "habit" };
  }

  return null;
}
