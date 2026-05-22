import { completeChat } from "@/lib/llm/client";
import { buildProfileBlock } from "@/lib/memory/profile-prompt";
import { getKnownUserName } from "@/lib/memory/user-name";
import { getSupabase } from "@/lib/supabase/server";
import type { DbUser } from "@/lib/db/users";
import type { UserProfile } from "@/lib/types";

async function loadFreshProfile(user: DbUser): Promise<UserProfile> {
  const supabase = getSupabase();
  if (!supabase) return user.profile;
  const { data } = await supabase
    .from("users")
    .select("profile")
    .eq("id", user.id)
    .single();
  return (data?.profile as UserProfile) ?? user.profile;
}

/** Quita bullets duplicados o casi iguales del perfil. */
function compactProfileText(block: string): string {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const line of lines) {
    const norm = line
      .replace(/^###\s+/, "")
      .replace(/^•\s*/, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .slice(0, 80);
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(line.startsWith("###") ? line : `• ${line.replace(/^•\s*/, "")}`);
  }
  return out.join("\n");
}

export async function buildWhoAmIReply(user: DbUser): Promise<string> {
  const profile = await loadFreshProfile(user);
  const block = buildProfileBlock(profile);

  if (block.includes("aún vacío")) {
    return "Todavía no tengo mucho de vos, che. Contame algo y lo voy guardando.";
  }

  const name = await getKnownUserName(user);
  const compact = compactProfileText(block);

  const summary = await completeChat({
    system: `El usuario pregunta quién es (o qué sabés de él).
Respondé en español paraguayo (che, vos, nomás), 4–7 líneas máximo.
Formato: texto natural para Telegram (podés usar <b> para 1–2 palabras).
PROHIBIDO: listas enormes, encabezados ###, volcar el perfil entero.
Si hay datos contradictorios en memoria (ej. "lo contrataron" vs solo screening), priorizá lo correcto: screening NO es contratación.
No inventes datos que no estén en el perfil.`,
    user: `Perfil compacto:\n${compact}`,
  });

  const intro = name
    ? `Sos <b>${name}</b>, che. `
    : "";

  return intro + summary;
}
