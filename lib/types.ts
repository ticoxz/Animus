export type SkillId =
  | "core_chat"
  | "gastos"
  | "reuniones"
  | "nutricion"
  | "wrapup"
  | "contexto_vida";

export type SkillStatus = "locked" | "offered" | "active" | "paused";

export interface UserProfile {
  demographic: string;
  interests: string;
  relationships: string;
  dated_plans: string;
  instructions: string;
}

export const EMPTY_PROFILE: UserProfile = {
  demographic: "",
  interests: "",
  relationships: "",
  dated_plans: "",
  instructions: "",
};

export interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

export interface IncomingMessage {
  telegramUserId: number;
  chatId: number;
  text?: string;
  firstName?: string;
  username?: string;
}
