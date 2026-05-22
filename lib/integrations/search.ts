/**
 * Toolset `web` (Hermes): web_search con proveedor configurable.
 * https://hermes-agent.nousresearch.com/docs/user-guide/features/tools
 */

export type SearchProvider = "brave" | "tavily" | "duckduckgo";

function getSearchProvider(): SearchProvider {
  const p = (process.env.SEARCH_PROVIDER ?? "brave").toLowerCase();
  if (p === "tavily" || p === "duckduckgo") return p;
  return "brave";
}

async function searchViaBrave(query: string): Promise<string> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) {
    return "Web search: configurá BRAVE_SEARCH_API_KEY o cambiá SEARCH_PROVIDER=tavily.";
  }

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "5");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": key,
    },
  });

  if (!res.ok) return "No pude buscar en la web ahora.";

  const data = (await res.json()) as {
    web?: { results?: Array<{ title: string; url: string }> };
  };

  const results = data.web?.results ?? [];
  if (!results.length) return "Sin resultados.";

  return results
    .slice(0, 4)
    .map((r, i) => `${i + 1}. <b>${r.title}</b>\n${r.url}`)
    .join("\n\n");
}

async function tavilySearch(query: string): Promise<string> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) {
    return "Web search: configurá TAVILY_API_KEY (SEARCH_PROVIDER=tavily).";
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: 5,
      search_depth: "basic",
    }),
  });

  if (!res.ok) return "No pude buscar en la web ahora.";

  const data = (await res.json()) as {
    results?: Array<{ title: string; url: string; content?: string }>;
  };

  const results = data.results ?? [];
  if (!results.length) return "Sin resultados.";

  return results
    .slice(0, 4)
    .map((r, i) => `${i + 1}. <b>${r.title}</b>\n${r.url}`)
    .join("\n\n");
}

async function duckDuckGoSearch(query: string): Promise<string> {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_redirect", "1");

  const res = await fetch(url.toString());
  if (!res.ok) return "No pude buscar en la web ahora.";

  const data = (await res.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
  };

  const lines: string[] = [];
  if (data.AbstractText && data.AbstractURL) {
    lines.push(`1. <b>Resumen</b>\n${data.AbstractURL}\n${data.AbstractText.slice(0, 200)}`);
  }

  for (const t of data.RelatedTopics ?? []) {
    if (!t.Text || !t.FirstURL) continue;
    lines.push(`${lines.length + 1}. <b>${t.Text.slice(0, 80)}</b>\n${t.FirstURL}`);
    if (lines.length >= 4) break;
  }

  return lines.length ? lines.join("\n\n") : "Sin resultados (probá brave o tavily).";
}

/** Entrada única para skills y agent tool `web_search`. */
export async function webSearch(query: string): Promise<string> {
  const provider = getSearchProvider();
  switch (provider) {
    case "tavily":
      return tavilySearch(query);
    case "duckduckgo":
      return duckDuckGoSearch(query);
    default:
      return searchViaBrave(query);
  }
}

/** @deprecated Usar webSearch */
export const braveSearch = webSearch;

export function getWebSearchStatus(): string {
  const provider = getSearchProvider();
  if (provider === "tavily") {
    return process.env.TAVILY_API_KEY ? `✅ tavily` : "⚪ falta TAVILY_API_KEY";
  }
  if (provider === "duckduckgo") {
    return "✅ duckduckgo (sin key)";
  }
  return process.env.BRAVE_SEARCH_API_KEY ? "✅ brave" : "⚪ falta BRAVE_SEARCH_API_KEY";
}
