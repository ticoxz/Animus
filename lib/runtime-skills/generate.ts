import { completeChatJson } from "@/lib/llm/client";
import { parseJsonFromLlm } from "@/lib/llm/parse-json";
import { createRuntimeSkill } from "@/lib/runtime-skills/db";
import type { RuntimeSkillConfig } from "@/lib/runtime-skills/types";

interface GeneratedSkill {
  name: string;
  description: string;
  category?: string;
  keywords: string[];
  config: RuntimeSkillConfig;
}

const CREATE_PATTERN =
  /\b(cre(ar|á)\s+(un\s+)?skill|nueva\s+habilidad|quiero\s+que\s+(puedas|busques|me\s+avis)|personaliz(ar|á)|enséñame\s+a\s+automatizar)\b/i;

export function wantsCreateRuntimeSkill(text: string): boolean {
  return CREATE_PATTERN.test(text);
}

export async function generateAndCreateRuntimeSkill(
  userId: string,
  userRequest: string,
): Promise<string> {
  const raw = await completeChatJson({
    system: `Diseñá un skill DECLARATIVO para un asistente personal.

Dos modos:
1) "instructions" — coaching, dieta, rutinas, planes (SIN API). Incluí instructions con todo el conocimiento del skill.
2) "http" — solo si hay API pública real (GET/POST).

JSON:
{
  "name": "kebab-case",
  "description": "español corto",
  "category": "utility|fitness|nutrition|search",
  "keywords": ["entreno","gym","dieta","comida"],
  "config": {
    "type": "instructions",
    "instructions": "Sos el personal trainer de Marcelo. Objetivo: ... Rutina 5 días: ... Comidas sin contar gramos: ...",
    "tools": []
  }
}

O para HTTP:
{
  "config": {
    "type": "http",
    "tools": [{ "name": "...", "action": { "type": "http_request", "url": "https://...", "method": "GET" }, "parameters": {} }]
  }
}

Keywords: palabras que el usuario diría para activar el skill (español).`,
    user: userRequest,
  });

  if (!raw) {
    return "No pude diseñar el skill (error del modelo). Probá de nuevo.";
  }

  const json = parseJsonFromLlm(raw);
  if (!json || typeof json !== "object") {
    return "No pude interpretar el skill. Sé más específico: qué API o qué querés hacer.";
  }

  const gen = json as GeneratedSkill & {
    config: RuntimeSkillConfig & { instructions?: string };
  };

  const isInstructions =
    gen.config?.type === "instructions" ||
    Boolean(gen.config?.instructions?.trim());

  if (!gen.name) {
    return "Faltan datos del skill. Sé más específico.";
  }

  if (!isInstructions && !gen.config?.tools?.length) {
    return "Faltan tools HTTP o modo instructions. Probá de nuevo.";
  }

  if (isInstructions && !gen.config.instructions?.trim()) {
    return "Modo instructions requiere el campo instructions con el rol del skill.";
  }

  for (const t of gen.config.tools ?? []) {
    const u = t.action?.url ?? "";
    if (
      !u.startsWith("http") &&
      !u.includes("{{")
    ) {
      return `URL inválida en tool ${t.name}. Solo https:// permitido.`;
    }
  }

  const config: RuntimeSkillConfig = isInstructions
    ? {
        type: "instructions",
        instructions: gen.config.instructions!.trim(),
        tools: [],
      }
    : { type: "http", tools: gen.config.tools };

  const defaultKeywords = isInstructions
    ? ["entreno", "gym", "dieta", "comida", "rutina", "personal trainer"]
    : [gen.name.replace(/-/g, " ")];

  const row = await createRuntimeSkill({
    userId,
    name: gen.name,
    description: gen.description ?? gen.name,
    category: gen.category ?? (isInstructions ? "fitness" : "utility"),
    keywords: gen.keywords?.length ? gen.keywords : defaultKeywords,
    config,
    createdBy: "agent",
  });

  if (!row) {
    return "No pude guardar el skill (¿corriste migración 005_runtime_skills.sql?).";
  }

  const kws = row.keywords.join(", ");
  return (
    `✅ Skill <b>${row.name}</b> creado (procedural memory Hermes).\n\n` +
    `${row.description}\n\n` +
    `Palabras clave: ${kws}\n` +
    `Tipo: ${isInstructions ? "instrucciones (coach/plan)" : "HTTP API"}\n` +
    `Probalo: «entreno», «qué como hoy», etc.\n` +
    `Export: <code>/export-skill ${row.name}</code>`
  );
}
