import type { AgentRunResult } from "@/lib/agent/run";

const TTL_MS = 120_000;
const lastRuns = new Map<
  string,
  AgentRunResult & { at: number }
>();

export function recordAgentRun(userId: string, result: AgentRunResult): void {
  lastRuns.set(userId, { ...result, at: Date.now() });
}

/** Lee y borra metadata del último agent run (para nudge post-tarea). */
export function consumeAgentRunMeta(userId: string): AgentRunResult | null {
  const entry = lastRuns.get(userId);
  if (!entry || Date.now() - entry.at > TTL_MS) {
    lastRuns.delete(userId);
    return null;
  }
  lastRuns.delete(userId);
  return { reply: entry.reply, toolsUsed: entry.toolsUsed };
}
