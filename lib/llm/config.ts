export type LlmProvider = "minimax" | "openai";

export interface LlmConfig {
  provider: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function getLlmConfig(): LlmConfig | null {
  const provider = (process.env.LLM_PROVIDER ?? "minimax") as LlmProvider;

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    return {
      provider: "openai",
      apiKey,
      baseUrl: process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    };
  }

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) return null;
  return {
    provider: "minimax",
    apiKey,
    baseUrl: process.env.MINIMAX_API_BASE ?? "https://api.minimax.io/v1",
    model: process.env.MINIMAX_MODEL ?? "MiniMax-M2.1",
  };
}

export function isLlmConfigured(): boolean {
  return getLlmConfig() !== null;
}
