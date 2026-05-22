import type { DbUser } from "@/lib/db/users";

export type IntegrationId =
  | "google"
  | "spotify"
  | "whatsapp"
  | "weather"
  | "search"
  | "voice"
  | "tts";

export interface IntegrationMeta {
  id: IntegrationId;
  name: string;
  description: string;
  envVars: string[];
  requiresOAuth: boolean;
  telegramKeywords: RegExp;
}

export interface IntegrationContext {
  user: DbUser;
  text: string;
}

export interface IntegrationHandler {
  meta: IntegrationMeta;
  matches: (text: string) => boolean;
  handle: (ctx: IntegrationContext) => Promise<string | null>;
}
