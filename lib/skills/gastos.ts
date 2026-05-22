import {
  activateSkill,
  getSkillStatus,
  isSkillActive,
  offerSkill,
} from "@/lib/db/skills";
import {
  createPendingTransaction,
  formatAmount,
  type PendingTransaction,
} from "@/lib/db/transactions";
import { sendTelegramMessage } from "@/lib/channels/telegram";
import type { DbUser } from "@/lib/db/users";
import type { SkillDefinition } from "@/lib/skills/base-skill";

const EXPENSE_PATTERN =
  /\b(gast[eé]|pagu[eé]|compr[eé]|salieron?|me cost[oó]|fueron)\b/i;

export function looksLikeExpense(text: string): boolean {
  return EXPENSE_PATTERN.test(text) || /\$\s*\d+|\d+\s*(lucas|mil|pesos)/i.test(text);
}

interface ParsedExpense {
  amount_cents: number;
  currency: string;
  category?: string;
  description?: string;
}

function parseExpenseHeuristic(text: string): ParsedExpense | null {
  const m = text.match(/(\d[\d.,]*)\s*(lucas|mil|pesos)?/i);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  if (/lucas|mil/i.test(m[2] ?? "")) n *= 1000;
  if (!n || n <= 0) return null;
  return {
    amount_cents: Math.round(n * 100),
    currency: "ARS",
    description: text.slice(0, 120),
  };
}

async function parseExpense(text: string): Promise<ParsedExpense | null> {
  const { completeChatJson } = await import("@/lib/llm/client");
  const raw = await completeChatJson({
    system: `Extraé gasto. JSON: {"amount_cents":number,"currency":"ARS","category":"comida|transporte|otro","description":"breve"}
amount_cents en centavos. "50 lucas" = 5000000. Sin monto: amount_cents 0.`,
    user: text,
  });

  if (!raw) return parseExpenseHeuristic(text);

  try {
    const { parseJsonFromLlm } = await import("@/lib/llm/parse-json");
    const parsed = parseJsonFromLlm(raw) as ParsedExpense | null;
    if (!parsed) return parseExpenseHeuristic(text);
    if (!parsed.amount_cents || parsed.amount_cents <= 0) return null;
    return parsed;
  } catch {
    return parseExpenseHeuristic(text);
  }
}

export async function sendExpenseConfirmation(
  chatId: number,
  tx: PendingTransaction,
): Promise<void> {
  const label = formatAmount(tx.amount_cents, tx.currency);
  const detail = tx.description ? ` — ${tx.description}` : "";
  await sendTelegramMessage(
    chatId,
    `¿Confirmo este gasto?\n<b>${label}</b>${detail}`,
    {
      inlineKeyboard: [
        [
          { text: "✅ Sí", callback_data: `gastos:yes:${tx.id}` },
          { text: "❌ No", callback_data: `gastos:no:${tx.id}` },
        ],
      ],
    },
  );
}

async function handleGastos(user: DbUser, text: string, chatId?: number): Promise<string> {
  const status = await getSkillStatus(user.id, "gastos");

  if (status === "locked") {
    await offerSkill(user.id, "gastos");
    if (chatId) {
      await sendTelegramMessage(
        chatId,
        "Puedo anotar gastos cuando me digas cuánto gastaste. ¿Querés activar la skill <b>Gastos</b>?",
        {
          inlineKeyboard: [
            [
              { text: "Sí, activar", callback_data: "skill:activate:gastos" },
              { text: "Ahora no", callback_data: "skill:decline:gastos" },
            ],
          ],
        },
      );
    }
    return "Te pregunté arriba si querés activar Gastos 👆";
  }

  if (status === "offered") {
    return "Activá Gastos con el botón de arriba, o decime «sí, activar gastos».";
  }

  const parsed = await parseExpense(text);
  if (!parsed) {
    return "No entendí el monto. Probá: «gasté 15 lucas en el súper».";
  }

  const tx = await createPendingTransaction({
    userId: user.id,
    amountCents: parsed.amount_cents,
    currency: parsed.currency,
    category: parsed.category,
    description: parsed.description,
    rawMessage: text,
  });

  if (!tx) {
    return "No pude guardar el gasto (revisá Supabase).";
  }

  if (chatId) {
    await sendExpenseConfirmation(chatId, tx);
    return "Revisá el gasto arriba y confirmá con Sí o No 👆";
  }

  return `Gasto: ${formatAmount(tx.amount_cents, tx.currency)}. Confirmá en el chat.`;
}

export const gastosSkill: SkillDefinition = {
  id: "gastos",
  description: "Registrar gastos con confirmación Sí/No",
  matches: (text) => looksLikeExpense(text),
  handle: async ({ user, text, chatId }) => handleGastos(user, text, chatId),
};

export async function handleGastosCallback(
  user: DbUser,
  chatId: number,
  action: "yes" | "no",
  transactionId: string,
): Promise<string> {
  const active = await isSkillActive(user.id, "gastos");
  if (!active) return "Activá la skill Gastos primero.";

  if (action === "no") {
    const { deleteTransaction } = await import("@/lib/db/transactions");
    await deleteTransaction(transactionId, user.id);
    return "Listo, no lo anoté.";
  }

  const { confirmTransaction } = await import("@/lib/db/transactions");
  const ok = await confirmTransaction(transactionId, user.id);
  return ok ? "✅ Gasto guardado." : "No encontré ese gasto.";
}

export async function handleSkillActivateCallback(
  user: DbUser,
  skillId: "gastos" | "plan_dia" | "reuniones",
): Promise<string> {
  await activateSkill(user.id, skillId);
  if (skillId === "gastos") {
    return "✅ Skill <b>Gastos</b> activa. Decime cuánto gastaste y te pido confirmar.";
  }
  if (skillId === "plan_dia") {
    return "✅ Skill <b>Plan del día</b> activa. Preguntame «¿qué hacés hoy?» cuando quieras.";
  }
  return "✅ Skill activada.";
}
