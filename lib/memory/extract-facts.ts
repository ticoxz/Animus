import { getSupabase } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types";
import type { DbUser } from "@/lib/db/users";

type FactCategory = keyof UserProfile | "general";

interface ExtractedFact {
  fact: string;
  category: FactCategory;
}

/**
 * Post-mensaje async (patrón Evva FactExtractionProcessor).
 * Sin Redis: fire-and-forget desde el webhook.
 */
export function enqueueFactExtraction(input: {
  user: DbUser;
  userMessage: string;
  assistantReply: string;
}): void {
  void extractFactsFromTurn(input).catch((err) =>
    console.error("[memory] extractFacts", err),
  );
}

async function extractFactsFromTurn(input: {
  user: DbUser;
  userMessage: string;
  assistantReply: string;
}): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  const supabase = getSupabase();
  if (!apiKey || !supabase) return;

  const skip =
    input.userMessage.startsWith("/") ||
    ["Ayuda", "Qué podés hacer", "Mis skills", "Parar hoy"].includes(
      input.userMessage,
    );
  if (skip || input.userMessage.length < 8) return;

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Extraé hechos NUEVOS y estables sobre el usuario desde este turno de chat.
Respondé JSON: { "facts": [{ "fact": string, "category": "demographic"|"interests"|"relationships"|"dated_plans"|"instructions"|"general" }] }
Si no hay nada nuevo, facts: []. Máximo 3 hechos. Español. Sin inventar.`,
        },
        {
          role: "user",
          content: `Usuario: ${input.userMessage}\nAsistente: ${input.assistantReply}`,
        },
      ],
    }),
  });

  if (!res.ok) return;

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) return;

  let parsed: { facts?: ExtractedFact[] };
  try {
    parsed = JSON.parse(raw) as { facts?: ExtractedFact[] };
  } catch {
    return;
  }

  const facts = (parsed.facts ?? []).filter((f) => f.fact?.trim());
  if (!facts.length) return;

  for (const { fact, category } of facts) {
    await supabase.from("memory_facts").insert({
      user_id: input.user.id,
      fact: fact.trim(),
      category: category ?? "general",
    });
  }

  await mergeFactsIntoProfile(input.user.id, input.user.profile, facts);
}

async function mergeFactsIntoProfile(
  userId: string,
  profile: UserProfile,
  facts: ExtractedFact[],
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const next = { ...profile };
  const profileKeys: (keyof UserProfile)[] = [
    "demographic",
    "interests",
    "relationships",
    "dated_plans",
    "instructions",
  ];
  for (const { fact, category } of facts) {
    if (!profileKeys.includes(category as keyof UserProfile)) continue;
    const key = category as keyof UserProfile;
    const line = `• ${fact}`;
    next[key] = next[key] ? `${next[key]}\n${line}` : line;
  }

  await supabase
    .from("users")
    .update({ profile: next, updated_at: new Date().toISOString() })
    .eq("id", userId);
}
