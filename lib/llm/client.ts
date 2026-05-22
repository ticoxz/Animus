import { sanitizeForTelegram } from "@/lib/channels/format";
import { getLlmConfig } from "@/lib/llm/config";
import { withMinimaxOutputRules } from "@/lib/llm/output-rules";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

let lastLlmError: string | null = null;

export function getLastLlmError(): string | null {
  return lastLlmError;
}

async function chatCompletion(input: {
  messages: ChatMessage[];
  temperature: number;
  jsonMode?: boolean;
  outputMode?: "telegram" | "json";
}): Promise<string | null> {
  const cfg = getLlmConfig();
  if (!cfg) {
    lastLlmError = "no_config";
    return null;
  }

  const temperature =
    cfg.provider === "minimax"
      ? Math.min(1, Math.max(0.01, input.temperature))
      : input.temperature;

  const rulesMode = input.outputMode ?? (input.jsonMode ? "json" : "telegram");
  const messages =
    cfg.provider === "minimax"
      ? input.messages.map((m) =>
          m.role === "system"
            ? { ...m, content: withMinimaxOutputRules(m.content, rulesMode) }
            : m,
        )
      : input.messages;

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages,
    temperature,
  };
  if (input.jsonMode) {
    body.response_format = { type: "json_object" };
  }
  // MiniMax: thinking aparte (necesario también en JSON o el content no es JSON puro)
  if (cfg.provider === "minimax") {
    body.reasoning_split = true;
  }

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[llm/${cfg.provider}]`, res.status, errText);
    if (res.status === 429) {
      lastLlmError = "rate_limit";
    } else {
      lastLlmError = `http_${res.status}`;
    }
    return null;
  }

  lastLlmError = null;

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const msg = data.choices?.[0]?.message;
  const content = msg?.content?.trim();
  if (content) return content;

  // Fallback si solo vino reasoning_details
  const details = (msg as { reasoning_details?: Array<{ text?: string }> })
    ?.reasoning_details;
  return details?.[0]?.text?.trim() ?? null;
}

export async function completeChat(input: {
  system: string;
  user: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<string> {
  const messages: ChatMessage[] = [{ role: "system", content: input.system }];

  for (const turn of input.history ?? []) {
    messages.push({ role: turn.role, content: turn.content });
  }

  messages.push({ role: "user", content: input.user });

  const cfg = getLlmConfig();
  const content = await chatCompletion({
    messages,
    temperature: cfg?.provider === "minimax" ? 0.5 : 0.8,
  });

  const raw = content ?? fallbackReply(input.user);
  return getLlmConfig()?.provider === "minimax"
    ? sanitizeForTelegram(raw)
    : raw;
}

export async function completeChatJson(input: {
  system: string;
  user: string;
}): Promise<string | null> {
  return chatCompletion({
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
    temperature: 0.01,
    jsonMode: true,
    outputMode: "json",
  });
}

function fallbackReply(_userText: string): string {
  const cfg = getLlmConfig();
  const err = getLastLlmError();

  if (!cfg) {
    return (
      "Recibí tu mensaje. Falta configurar la API del modelo.\n\n" +
      "Configurá <code>MINIMAX_API_KEY</code> en <code>.env.local</code> y reiniciá <code>npm run dev</code>."
    );
  }

  if (err === "rate_limit") {
    return (
      "Tu mensaje llegó bien, pero MiniMax me cortó por <b>límite de uso</b> (429).\n\n" +
      "Revisá en platform.minimax.io → Billing / Token Plan si tenés créditos o asiento activo.\n\n" +
      "Cuando se renueve la cuota, probá de nuevo."
    );
  }

  if (err) {
    return (
      "Tu mensaje llegó, pero el modelo no respondió (error " +
      err +
      "). Mirá la terminal de <code>npm run dev</code> para el detalle."
    );
  }

  return (
    "Recibí tu mensaje pero no obtuve respuesta del modelo. Probá de nuevo en un momento."
  );
}
