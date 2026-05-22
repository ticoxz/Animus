import { buildWhoAmIReply } from "@/lib/memory/profile-summary";
import { getSupabase } from "@/lib/supabase/server";
import type { DbUser } from "@/lib/db/users";

const CORE_IDENTITY =
  /^(?:qui[eé]n\s+soy|quien\s+soy|c[oó]mo\s+(?:me\s+)?llamo|cu[aá]l\s+es\s+mi\s+nombre|c[oó]mo\s+se\s+me\s+dice|como\s+se\s+me\s+dice)\??$/i;

const LOOSE_IDENTITY =
  /\b(qui[eé]n\s+soy|qu[eé]\s+sab[eé]s\s+de\s+m[ií]|que\s+sabes\s+de\s+mi)\b/i;

/** Quita saludo inicial para detectar preguntas de identidad. */
export function normalizeIdentityQuery(text: string): string {
  return text
    .trim()
    .replace(/^(?:hola|buenas|hey|buen\s+d[ií]a)[,!\s]+/i, "")
    .trim();
}

export function isIdentityQuestion(text: string): boolean {
  const t = normalizeIdentityQuery(text);
  if (!t) return false;
  if (CORE_IDENTITY.test(t)) return true;
  if (t.length > 90) return false;
  return LOOSE_IDENTITY.test(t);
}

export async function getKnownUserName(user: DbUser): Promise<string | null> {
  const supabase = getSupabase();

  if (supabase) {
    const { data: entities } = await supabase
      .from("user_entities")
      .select("name")
      .eq("user_id", user.id)
      .eq("type", "person")
      .order("updated_at", { ascending: false })
      .limit(5);

    const mainPerson = (entities ?? []).find(
      (e) => !/^(madre|hermana|socio|familia)/i.test(e.name),
    );
    if (mainPerson?.name) return mainPerson.name;

    const { data: facts } = await supabase
      .from("memory_facts")
      .select("fact")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    for (const row of facts ?? []) {
      const m = row.fact.match(
        /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\s+tiene\s+\d+\s+años/i,
      );
      if (m) return m[1];
      const m2 = row.fact.match(/^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\s+es\b/i);
      if (m2) return m2[1];
    }
  }

  const demo = user.profile.demographic;
  const m3 = demo.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\s+tiene\s+\d+/i);
  if (m3) return m3[1];

  return null;
}

export async function answerIdentityQuestion(
  user: DbUser,
  text: string,
): Promise<string | null> {
  if (!isIdentityQuestion(text)) return null;

  const t = normalizeIdentityQuery(text).toLowerCase();

  if (/c[oó]mo\s+se\s+me\s+dice/.test(t)) {
    const name = await getKnownUserName(user);
    if (name) {
      return `A vos te dicen <b>${name}</b>. Yo soy <b>Animus</b>, tu compañero cognitivo.`;
    }
    return "Todavía no sé cómo te llamás. Decime tu nombre y lo guardo.";
  }

  if (/c[oó]mo\s+(?:me\s+)?llamo|cu[aá]l\s+es\s+mi\s+nombre/.test(t)) {
    const name = await getKnownUserName(user);
    if (name) return `Te llamás <b>${name}</b>.`;
    return "Aún no guardé tu nombre. Decime «me llamo …» y lo anoto.";
  }

  if (/qui[eé]n\s+soy|qu[eé]\s+sab[eé]s\s+de\s+m[ií]|que\s+sabes\s+de\s+mi/.test(t)) {
    return buildWhoAmIReply(user);
  }

  return null;
}
