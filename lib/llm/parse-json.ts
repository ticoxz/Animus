/** Extrae JSON de respuestas MiniMax (a veces traen  o texto extra). */
export function parseJsonFromLlm(raw: string): unknown | null {
  let text = raw.trim();
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  text = text.replace(/<\/?think>/gi, "");

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1)) as unknown;
    } catch {
      return null;
    }
  }
}
