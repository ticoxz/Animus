import type { RuntimeToolConfig } from "@/lib/runtime-skills/types";

function applyTemplate(
  template: string,
  params: Record<string, unknown>,
  encode: boolean,
): string {
  let out = template;
  for (const [key, value] of Object.entries(params)) {
    const v = encode ? encodeURIComponent(String(value)) : String(value);
    out = out.replaceAll(`{{params.${key}}}`, v);
  }
  out = out.replace(/\{\{env\.(\w+)\}\}/g, (_, k) => process.env[k] ?? "");
  return out;
}

export async function executeRuntimeTool(
  tool: RuntimeToolConfig,
  params: Record<string, unknown>,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const url = applyTemplate(tool.action.url, params, true);
  const body = tool.action.body
    ? applyTemplate(tool.action.body, params, false)
    : undefined;

  const headers: Record<string, string> = { ...tool.action.headers };
  for (const [k, v] of Object.entries(headers)) {
    headers[k] = applyTemplate(v, params, false);
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return { success: false, error: "URL inválida (solo http/https)" };
  }

  const method = tool.action.method ?? "GET";
  const init: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(12_000),
  };

  if (body && method !== "GET") {
    init.body = body;
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }

    const ct = res.headers.get("content-type") ?? "";
    let data: unknown = ct.includes("json")
      ? await res.json()
      : (await res.text()).slice(0, 2000);

    if (tool.responseMapping && typeof data === "object" && data) {
      let cur: unknown = data;
      for (const key of tool.responseMapping.split(".")) {
        if (cur && typeof cur === "object") {
          cur = (cur as Record<string, unknown>)[key];
        }
      }
      data = cur;
    }

    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "fetch failed",
    };
  }
}
