import type { DbUser } from "@/lib/db/users";
import { runExtraction } from "@/lib/memory/extract-facts";

const THROTTLE_MS = 30_000;

interface PendingTurn {
  user: DbUser;
  userMessages: string[];
  assistantReplies: string[];
  timer: ReturnType<typeof setTimeout> | null;
}

const pendingByUser = new Map<string, PendingTurn>();

/**
 * Acumula turnos por usuario y ejecuta una sola extracción tras 30s de silencio.
 */
/** Fuerza guardar memoria pendiente (ej. antes de /memory). */
export async function flushFactExtractionNow(userId: string): Promise<void> {
  await flushExtraction(userId);
}

export function enqueueFactExtraction(input: {
  user: DbUser;
  userMessage: string;
  assistantReply: string;
}): void {
  const key = input.user.id;
  let pending = pendingByUser.get(key);

  if (!pending) {
    pending = {
      user: input.user,
      userMessages: [],
      assistantReplies: [],
      timer: null,
    };
    pendingByUser.set(key, pending);
  }

  pending.user = input.user;
  pending.userMessages.push(input.userMessage);
  pending.assistantReplies.push(input.assistantReply);

  if (pending.timer) clearTimeout(pending.timer);

  const delay =
    input.userMessage.length >= 120 ? 5_000 : THROTTLE_MS;

  pending.timer = setTimeout(() => {
    void flushExtraction(key).catch((err) =>
      console.error("[memory] flushExtraction", err),
    );
  }, delay);
}

async function flushExtraction(userId: string): Promise<void> {
  const pending = pendingByUser.get(userId);
  if (!pending) return;

  pendingByUser.delete(userId);
  if (pending.timer) clearTimeout(pending.timer);

  const userMessage = pending.userMessages.join("\n---\n");
  const assistantReply = pending.assistantReplies.join("\n---\n");

  await runExtraction({
    user: pending.user,
    userMessage,
    assistantReply,
  });
}
