import { getLlmConfig } from "@/lib/llm/config";

const MARKER = "## Idioma (OBLIGATORIO";

export const MINIMAX_SPANISH_ONLY_RULES = `${MARKER}
- Solo español. Variante/dialecto: la sección "Estilo de voz" del system (cada usuario la suya).
- PROHIBIDO chino, inglés u otro idioma (ni una palabra).`;

export const MINIMAX_TELEGRAM_OUTPUT_RULES = `${MARKER} — incumplir = respuesta inválida)

Idioma:
- Respondé ÚNICAMENTE en español. El dialecto lo marca "### Estilo de voz" en el system (paraguayo, chileno, etc.) — SOLO ese, sin mezclar otros.
- PROHIBIDO: chino (汉字), japonés, coreano, inglés, portugués, francés — ni una palabra suelta (nada de great, nice, what, parabéns, avec).
- Este chat es UN usuario: no uses el estilo de otro usuario ni rioplatense por defecto si el perfil pide paraguayo (u otro).
- Ejemplo MALO: "Eso is great, ¿what now?" — Ejemplo BIEN: "Qué bárbaro che, ¿y ahora qué hacés?"

Telegram (parse_mode HTML):
- Solo caracteres latinos con tildes (áéíóúñü), números, puntuación española (¿¡), espacios y emojis comunes.
- PROHIBIDO: caracteres chinos, cirílicos, árabes, kana u otros alfabetos.
- Énfasis solo con etiquetas que Telegram acepta: <b> <i> <u> <s> <code> <pre> y <a href="https://...">. Sin Markdown (** ## \`\`\`).
- No uses etiquetas inventadas ni bloques de razonamiento en la respuesta.
- Mensajes cortos (2–4 líneas salvo que pidan detalle). Máximo ~3000 caracteres.`;

export function withMinimaxOutputRules(
  system: string,
  mode: "telegram" | "json" = "telegram",
): string {
  const cfg = getLlmConfig();
  if (cfg?.provider !== "minimax") return system;
  if (system.includes(MARKER)) return system;
  const block =
    mode === "json" ? MINIMAX_SPANISH_ONLY_RULES : MINIMAX_TELEGRAM_OUTPUT_RULES;
  return `${system}\n\n${block}`;
}
