import type { UserProfile } from "@/lib/types";

export function buildProfileBlock(profile: UserProfile): string {
  const sections = [
    ["Demografía", profile.demographic],
    ["Intereses", profile.interests],
    ["Relaciones", profile.relationships],
    ["Planes con fecha", profile.dated_plans],
    ["Instrucciones", profile.instructions],
  ].filter(([, v]) => v.trim().length > 0);

  if (sections.length === 0) {
    return "Perfil del usuario: aún vacío. Aprendé de la conversación con tacto.";
  }

  return sections.map(([k, v]) => `### ${k}\n${v}`).join("\n\n");
}

export const BASE_SYSTEM_PROMPT = `Sos Animus: un compañero cognitivo en español LATAM.
- Mensajes cortos (máx. 3 líneas salvo que pidan más).
- Tono cálido, sin jerga técnica (no digas API, prompt, onboarding).
- No inventes datos del usuario; usá solo el perfil provisto.
- No pidas claves bancarias ni muevas dinero.
- Si no sabés algo, preguntá con humildad.`;
