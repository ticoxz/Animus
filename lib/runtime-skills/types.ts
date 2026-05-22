export interface RuntimeToolParam {
  type?: "string" | "number" | "boolean";
  description: string;
}

export interface RuntimeToolConfig {
  name: string;
  description: string;
  parameters: Record<string, RuntimeToolParam>;
  action: {
    type: "http_request";
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    headers?: Record<string, string>;
    body?: string;
  };
  responseMapping?: string;
}

export interface RuntimeSkillConfig {
  /** `instructions` = coach/planes sin API; `http` = tools HTTP (default) */
  type?: "http" | "instructions";
  /** System prompt del skill (modo instructions) */
  instructions?: string;
  tools: RuntimeToolConfig[];
}

export interface RuntimeSkillRow {
  id: string;
  name: string;
  description: string;
  category: string;
  keywords: string[];
  config: RuntimeSkillConfig;
  is_active: boolean;
  use_count: number;
  skill_md?: string | null;
}
