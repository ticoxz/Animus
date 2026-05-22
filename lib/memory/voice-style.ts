import { getSupabase } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types";

const VOICE_LINE_PREFIX = "• Estilo de voz:";

export type VoiceStyleSpec = {
  id: string;
  instruction: string;
};

const KNOWN_STYLES: Array<{ id: string; patterns: RegExp[]; instruction: string }> =
  [
    {
      id: "paraguayo",
      patterns: [
        /paraguay/i,
        /habl[aáeé].*paraguay/i,
        /como\s+paraguay/i,
      ],
      instruction:
        "Español paraguayo (che, nomás, vos, nde, jopara si aplica). " +
        "PROHIBIDO chilenismos (po, cachai, bacán, weón) salvo que el usuario los pida explícitamente. " +
        "Si vive en Chile, igual mantené registro paraguayo.",
    },
    {
      id: "chileno",
      patterns: [/chileno/i, /como\s+chile/i, /habl[aáeé].*chile/i],
      instruction:
        "Español chileno (po, cachai, bacán, al tiro). Sin mezclar paraguayo ni rioplatense.",
    },
    {
      id: "rioplatense",
      patterns: [
        /rioplatense/i,
        /argentino/i,
        /uruguay/i,
        /como\s+argentin/i,
      ],
      instruction:
        "Español rioplatense (vos, che, dale). Sin chilenismos ni paraguayo salvo que lo pida.",
    },
    {
      id: "mexicano",
      patterns: [/mexicano/i, /como\s+méxico|como\s+mexico/i],
      instruction: "Español mexicano. Sin mezclar otros dialectos latinoamericanos.",
    },
    {
      id: "colombiano",
      patterns: [/colombiano/i, /como\s+colombia/i],
      instruction: "Español colombiano. Sin mezclar otros dialectos latinoamericanos.",
    },
  ];

export function detectVoiceStyleSpec(text: string): VoiceStyleSpec | null {
  const t = text.trim();
  if (t.length < 12) return null;

  const wantsStyle =
    /habl[aáeé]|hablar|tono|acento|dialecto|como\s+\w|no\s+como|no\s+me\s+hables/i.test(
      t,
    );
  if (!wantsStyle) return null;

  for (const style of KNOWN_STYLES) {
    if (style.patterns.some((p) => p.test(t))) {
      return { id: style.id, instruction: style.instruction };
    }
  }

  const generic = t.match(
    /(?:habl[aáeé]|hablar)\w*\s+(?:como\s+|en\s+)([a-záéíóúñü]+)/i,
  );
  if (generic?.[1]) {
    const label = generic[1].toLowerCase();
    return {
      id: label,
      instruction: `Español con registro ${label} (solo modismos de esa variante). Sin mezclar otros dialectos.`,
    };
  }

  if (/no\s+como\s+chileno|no\s+chileno|aunque\s+viva\s+en\s+chile/i.test(t)) {
    return KNOWN_STYLES[0];
  }

  return null;
}

function stripOldVoiceLines(instructions: string): string {
  return instructions
    .split("\n")
    .filter((line) => !line.trim().startsWith(VOICE_LINE_PREFIX))
    .join("\n")
    .trim();
}

export async function applyVoiceStyleFromMessage(
  userId: string,
  profile: UserProfile,
  text: string,
): Promise<{ profile: UserProfile; applied: boolean }> {
  const spec = detectVoiceStyleSpec(text);
  if (!spec) return { profile, applied: false };

  const line = `${VOICE_LINE_PREFIX} ${spec.instruction}`;
  const instructions = stripOldVoiceLines(profile.instructions);
  const next: UserProfile = {
    ...profile,
    instructions: instructions ? `${instructions}\n${line}` : line,
  };

  const supabase = getSupabase();
  if (supabase) {
    await supabase
      .from("users")
      .update({ profile: next, updated_at: new Date().toISOString() })
      .eq("id", userId);
  }

  return { profile: next, applied: true };
}

export function buildVoiceStyleBlock(profile: UserProfile): string {
  const voiceLine = profile.instructions
    .split("\n")
    .find((l) => l.trim().startsWith(VOICE_LINE_PREFIX));

  if (voiceLine) {
    const body = voiceLine.replace(VOICE_LINE_PREFIX, "").trim();
    const isParaguayo = /paraguay/i.test(body);
    const banned = isParaguayo
      ? "\n- PROHIBIDO en la respuesta: inglés (great, nice, what, starts, the…), portugués (parabéns), francés (avec), chilenismos (po, cachai, bacán, weón)."
      : "\n- PROHIBIDO mezclar inglés, portugués, francés, chino u otros idiomas.";
    return (
      "### Estilo de voz (PRIORIDAD — solo este usuario)\n" +
      `${body}\n` +
      "- Aplicá SOLO esta variante del español a ESTE usuario.\n" +
      "- Si el usuario pega notas con títulos en inglés (# Screening, Action Items), igual respondé 100% en su estilo; no copies ese idioma." +
      banned +
      "\n- Otros usuarios del bot pueden tener otro estilo; no copies el tuyo a ellos."
    );
  }

  return (
    "### Estilo de voz\n" +
    "Español latinoamericano neutro y cálido hasta que el usuario pida una variante concreta " +
    '(ej. "hablame como paraguayo").'
  );
}
