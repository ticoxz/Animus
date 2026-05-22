import { sanitizeForTelegram } from "@/lib/channels/format";
import { getLlmConfig } from "@/lib/llm/config";
import { withMinimaxOutputRules } from "@/lib/llm/output-rules";
import { getLastLlmError } from "@/lib/llm/client";
import { AGENT_TOOL_SCHEMAS, executeAgentTool } from "@/lib/agent/tools";
import type { DbUser } from "@/lib/db/users";

type Msg = Record<string, unknown>;

const MAX_TOOL_ROUNDS = 5;

function agentEnabled(): boolean {
  return process.env.AGENT_TOOLS_ENABLED !== "false";
}

export type AgentRunResult = {
  reply: string;
  toolsUsed: string[];
};

export async function runAgent(input: {
  user: DbUser;
  system: string;
  userMessage: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<AgentRunResult | null> {
  if (!agentEnabled()) return null;

  const cfg = getLlmConfig();
  if (!cfg) return null;

  const messages: Msg[] = [
    {
      role: "system",
      content: withMinimaxOutputRules(
        input.system +
          "\n\nModo agente: tenés tools (memoria, chats viejos, calendario, clima, web, skills). " +
          "Usalas antes de inventar. Reuniones/fechas → search_memory_facts + get_calendar_events; si pide anotar cita → create_calendar_event. No inventes fechas ni contrataciones.",
      ),
    },
  ];

  for (const h of input.history ?? []) {
    messages.push({ role: h.role, content: h.content });
  }
  messages.push({ role: "user", content: input.userMessage });

  const toolsUsed: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const body: Record<string, unknown> = {
      model: cfg.model,
      messages,
      tools: AGENT_TOOL_SCHEMAS,
      tool_choice: "auto",
      temperature: cfg.provider === "minimax" ? 0.45 : 0.7,
    };
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
      console.error("[agent]", await res.text());
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: Msg;
        finish_reason?: string;
      }>;
    };

    const choice = data.choices?.[0];
    const msg = choice?.message;
    if (!msg) return null;

    const toolCalls = msg.tool_calls as
      | Array<{
          id: string;
          function: { name: string; arguments: string };
        }>
      | undefined;

    if (toolCalls?.length) {
      messages.push(msg);
      for (const tc of toolCalls) {
        if (!toolsUsed.includes(tc.function.name)) {
          toolsUsed.push(tc.function.name);
        }
        const result = await executeAgentTool(
          input.user,
          tc.function.name,
          tc.function.arguments,
        );
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
      continue;
    }

    const content = typeof msg.content === "string" ? msg.content.trim() : "";
    if (content) {
      return { reply: sanitizeForTelegram(content), toolsUsed };
    }
    return null;
  }

  return {
    reply: sanitizeForTelegram(
      "Necesité demasiados pasos; probá una pregunta más concreta.",
    ),
    toolsUsed,
  };
}

export function isAgentModeEnabled(): boolean {
  return agentEnabled();
}

export { getLastLlmError };
