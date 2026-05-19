/**
 * LLM intercambiable. MVP: respuesta simple sin API si no hay key.
 */
export async function completeChat(input: {
  system: string;
  user: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackReply(input.user);
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    console.error("[llm]", await res.text());
    return fallbackReply(input.user);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() ?? fallbackReply(input.user);
}

function fallbackReply(userText: string): string {
  return (
    `Recibí tu mensaje. Todavía no tengo configurada la API del modelo.\n\n` +
    `Dijiste: «${userText.slice(0, 200)}»\n\n` +
    `Configurá <code>OPENAI_API_KEY</code> en <code>.env.local</code> para respuestas con IA.`
  );
}
