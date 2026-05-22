#!/usr/bin/env node
/**
 * Verifica .env.local — core + features opcionales.
 * Uso: npm run check:env
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

const BASE_REQUIRED = [
  { key: "TELEGRAM_BOT_TOKEN", hint: "BotFather → /newbot" },
  { key: "TELEGRAM_WEBHOOK_SECRET", hint: "Cualquier string largo (mismo en setWebhook)" },
  { key: "SUPABASE_URL", hint: "Supabase → Settings → API" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", hint: "service_role (secret)" },
  { key: "MIND_JWT_SECRET", hint: "openssl rand -hex 32 o init-env.sh" },
  { key: "APP_BASE_URL", hint: "ngrok URL cuando pruebes Telegram (no localhost en celular)" },
  { key: "CRON_SECRET", hint: "openssl rand -hex 16 — para test-cron.sh" },
];

const OPTIONAL = [
  { key: "BRAVE_SEARCH_API_KEY", label: "Web search (brave)", alt: "SEARCH_PROVIDER=tavily + TAVILY_API_KEY" },
  { key: "GOOGLE_CLIENT_ID", label: "Google Calendar", pair: "GOOGLE_CLIENT_SECRET" },
  { key: "GROQ_API_KEY", label: "Voz (BACKLOG)", },
  { key: "SPOTIFY_CLIENT_ID", label: "Spotify (stub)", pair: "SPOTIFY_CLIENT_SECRET" },
];

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function isEmpty(val) {
  return !val || val.includes("tu-") || val.endsWith("...");
}

const env = loadEnvFile(envPath);
const provider = env.LLM_PROVIDER ?? "minimax";

const llmRequired =
  provider === "openai"
    ? [{ key: "OPENAI_API_KEY", hint: "platform.openai.com" }]
    : [{ key: "MINIMAX_API_KEY", hint: "platform.minimax.io → API Keys" }];

let ok = true;

console.log("\n🧠 Animus — check de entorno\n");

if (!existsSync(envPath)) {
  console.log("❌ No existe .env.local");
  console.log("   → bash scripts/init-env.sh\n");
  process.exit(1);
}

console.log(`📄 ${envPath}`);
console.log(`🤖 LLM_PROVIDER = ${provider}`);
const agentOn = env.AGENT_TOOLS_ENABLED !== "false";
console.log(`⚙️  Modo agente = ${agentOn ? "✅ activo" : "❌ apagado"}\n`);

console.log("── Requerido (core) ──\n");
for (const { key, hint } of [...BASE_REQUIRED, ...llmRequired]) {
  const val = env[key];
  if (isEmpty(val)) {
    console.log(`❌ ${key}`);
    console.log(`   ${hint}\n`);
    ok = false;
  } else {
    const preview =
      key.includes("KEY") || key.includes("TOKEN") || key.includes("SECRET")
        ? `${val.slice(0, 6)}…${val.slice(-4)}`
        : val;
    console.log(`✅ ${key} = ${preview}`);
  }
}

if (env.APP_BASE_URL?.includes("localhost")) {
  console.log("\n⚠️  APP_BASE_URL=localhost → /mind y OAuth no abren en el celular.");
  console.log("   Usá ngrok y actualizá APP_BASE_URL antes del webhook.\n");
}

console.log("\n── Opcional (features) ──\n");
for (const row of OPTIONAL) {
  const on = !isEmpty(env[row.key]) && (!row.pair || !isEmpty(env[row.pair]));
  const tavily = row.key === "BRAVE_SEARCH_API_KEY" && env.SEARCH_PROVIDER === "tavily" && !isEmpty(env.TAVILY_API_KEY);
  const ddg = row.key === "BRAVE_SEARCH_API_KEY" && env.SEARCH_PROVIDER === "duckduckgo";
  const enabled = on || tavily || ddg;
  console.log(`${enabled ? "✅" : "○"} ${row.label}${row.alt && !enabled ? ` (${row.alt})` : ""}`);
}

console.log("\n── BACKLOG (aún no en producto) ──");
console.log("○ Browser automation");
console.log("○ MCP");
console.log("○ Vision / nutrición");
console.log("○ WhatsApp canal completo\n");

console.log("── Migraciones Supabase ──");
console.log("   npm run verify:db\n");

console.log("");
if (!ok) {
  console.log("Completá lo requerido → npm run check:env\n");
  process.exit(1);
}

console.log("✅ Core listo. Siguiente: bash scripts/local-setup.sh\n");
